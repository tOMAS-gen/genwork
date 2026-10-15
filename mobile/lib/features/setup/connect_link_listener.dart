import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/servers/connect_payload.dart';
import '../../shared/widgets/state_views.dart';

/// Links entrantes mientras la app está abierta. Se puede reemplazar en tests.
final incomingLinksProvider = Provider<Stream<Uri>>(
  (ref) => AppLinks().uriLinkStream,
);

/// Link con el que se abrió la app (arranque en frío).
final initialLinkProvider = FutureProvider<Uri?>(
  (ref) => AppLinks().getInitialLink(),
);

/// Escucha `genwork://connect?server=…` (el QR leído con la cámara nativa) y
/// agrega ese servidor. Ignora el callback del login (`genwork://auth`) y todo
/// lo demás.
class ConnectLinkListener extends ConsumerStatefulWidget {
  const ConnectLinkListener({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ConnectLinkListener> createState() => _ConnectLinkListenerState();
}

/// En arranque en frío el link llega por el stream y por `getInitialLink()`;
/// un mismo link dentro de esta ventana (o mientras sigue en curso) se ignora.
const _dedupeWindow = Duration(seconds: 5);

class _ConnectLinkListenerState extends ConsumerState<ConnectLinkListener> {
  StreamSubscription<Uri>? _sub;
  String? _lastHandled;
  DateTime? _lastHandledAt;
  bool _inFlight = false;

  @override
  void initState() {
    super.initState();
    _sub = ref.read(incomingLinksProvider).listen(_handle);
    ref.read(initialLinkProvider.future).then((uri) {
      if (uri != null) _handle(uri);
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _handle(Uri uri) async {
    if (!mounted) return;
    if (uri.scheme != 'genwork' || uri.host != 'connect') return;
    final url = parseConnectPayload(uri.toString());
    if (url == null) return;
    final key = uri.toString();
    final at = _lastHandledAt;
    if (key == _lastHandled &&
        (_inFlight || (at != null && DateTime.now().difference(at) < _dedupeWindow))) {
      return;
    }
    _lastHandled = key;
    _lastHandledAt = DateTime.now();
    _inFlight = true;
    try {
      await ref.read(sessionProvider.notifier).addServer(url.toString());
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      _inFlight = false;
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
