import 'package:url_launcher/url_launcher.dart';
import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../auth/token_store.dart';
import '../network/api_client.dart';
import '../servers/server_registry.dart';
import '../config/server_url.dart';
import '../servers/server_profile.dart';

const _project = String.fromEnvironment('FIREBASE_PROJECT_ID');
FirebaseOptions get pushFirebaseOptions => FirebaseOptions(
  apiKey: const String.fromEnvironment('FIREBASE_API_KEY'),
  appId: const String.fromEnvironment('FIREBASE_APP_ID'),
  messagingSenderId: const String.fromEnvironment('FIREBASE_SENDER_ID'),
  projectId: _project,
  iosBundleId: 'ar.net.gen.genworkMobile',
);

@pragma('vm:entry-point')
Future<void> handleBackgroundPush(RemoteMessage message) async {
  if (_project.isNotEmpty) {
    await Firebase.initializeApp(options: pushFirebaseOptions);
  }
  // The OS presents the notification. No navigation or session changes here.
}

class PushEvent {
  const PushEvent(
    this.serverId,
    this.userId,
    this.notificationId,
    this.eventId,
    this.open,
  );
  final String serverId, userId, notificationId, eventId;
  final bool open;
}

final pushServiceProvider = Provider<PushService?>((ref) => null);

class PushService {
  PushService(this.prefs, this.registry, this.tokens);
  final SharedPreferences prefs;
  final ServerRegistry registry;
  final TokenStore tokens;
  final _events = StreamController<PushEvent>.broadcast();
  Stream<PushEvent> get events => _events.stream;
  PushEvent? initialEvent;
  bool available = false;
  bool _syncing = false;
  bool _syncAgain = false;
  static const _channel = MethodChannel('genwork/notifications');

  Future<void> initialize() async {
    if (_project.isEmpty || !(Platform.isAndroid || Platform.isIOS)) return;
    try {
      await Firebase.initializeApp(options: pushFirebaseOptions);
      FirebaseMessaging.onBackgroundMessage(handleBackgroundPush);
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
            alert: false,
            badge: false,
            sound: false,
          );
      available = true;
      // Keep registration tokens for Firebase Admin send(token:), not installation IDs.
      // ignore: deprecated_member_use
      FirebaseMessaging.instance.onTokenRefresh.listen(
        (_) => unawaited(sync()),
      );
      FirebaseMessaging.onMessage.listen((m) => unawaited(_receive(m, false)));
      FirebaseMessaging.onMessageOpenedApp.listen(
        (m) => unawaited(_receive(m, true)),
      );
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        initialEvent = await validatePayload(initial.data, true);
      }
      unawaited(sync());
    } catch (_) {
      available = false;
    }
  }

  Future<PushEvent?> validatePayload(
    Map<String, dynamic> data,
    bool open,
  ) async {
    final url = normalizeServerUrl(data['serverUrl']?.toString() ?? '');
    if (url == null) return null;
    final profile = registry.byId(ServerProfile.idFor(url));
    if (profile == null) return null;
    final stored = await tokens.read(profile.id);
    final id = data['notificationId']?.toString();
    if (stored == null ||
        stored.user.id != data['userId'] ||
        id == null ||
        !RegExp(r'^[a-fA-F0-9-]{36}$').hasMatch(id)) {
      return null;
    }
    return PushEvent(
      profile.id,
      stored.user.id,
      id,
      data['eventId']?.toString() ?? id,
      open,
    );
  }

  Future<void> _receive(RemoteMessage m, bool open) async {
    final event = await validatePayload(m.data, open);
    if (event != null) _events.add(event);
  }

  Future<bool> permitted() async {
    if (!available) return false;
    final s = await FirebaseMessaging.instance.getNotificationSettings();
    return [
      AuthorizationStatus.authorized,
      AuthorizationStatus.provisional,
    ].contains(s.authorizationStatus);
  }

  bool get hasAsked => prefs.getBool('push_permission_asked') ?? false;
  Future<void> requestPermission() async {
    if (!available) return;
    await prefs.setBool('push_permission_asked', true);
    await FirebaseMessaging.instance.requestPermission();
    await sync();
  }

  Future<void> openSettings() async {
    if (Platform.isIOS) {
      await launchUrl(Uri.parse('app-settings:'));
    } else {
      await _channel.invokeMethod<void>('openSettings');
    }
  }

  String get installationId {
    final saved = prefs.getString('push_installation_id');
    if (saved != null) return saved;
    final r = Random.secure();
    final bytes = List<int>.generate(16, (_) => r.nextInt(256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    final h = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    final id =
        '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
    unawaited(prefs.setString('push_installation_id', id));
    return id;
  }

  Future<void> sync() async {
    if (!available) return;
    if (_syncing) {
      _syncAgain = true;
      return;
    }
    _syncing = true;
    try {
      final enabled = await permitted();
      // APNs token must exist before asking Firebase for its token on iOS.
      if (Platform.isIOS &&
          await FirebaseMessaging.instance.getAPNSToken() == null) {
        return;
      }
      // Firebase Admin uses the legacy registration token contract.
      // ignore: deprecated_member_use
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      for (final profile in registry.profiles()) {
        final stored = await tokens.read(profile.id);
        if (stored == null || stored.user.isClient || stored.user.isReader) {
          continue;
        }
        final api = ApiClient(baseUrl: profile.url, token: stored.token);
        try {
          await api.put<Object?>(
            '/api/mobile/push-device',
            body: {
              'installationId': installationId,
              'token': token,
              'platform': Platform.isIOS ? 'ios' : 'android',
              'enabled': enabled,
            },
          );
        } catch (_) {
          /* Retry on resume, token change or next session. */
        } finally {
          api.dio.close();
        }
      }
    } catch (_) {
      /* Network/APNs startup failures must not break login. */
    } finally {
      _syncing = false;
      if (_syncAgain) {
        _syncAgain = false;
        unawaited(sync());
      }
    }
  }
}
