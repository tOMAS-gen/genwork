import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/servers/connect_payload.dart';
import '../../core/router/app_router.dart';
import '../../core/router/routes.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';

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
// Frames que se dejan pasar tras el arranque: el router todavía reconstruye
// sus páginas y un diálogo abierto en medio se cierra solo.
const _settleFrames = 3;
const _maxWaitFrames = 600; // ~10 s a 60 fps

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

  /// Contexto del Navigator de la app. El listener está por encima del
  /// Navigator (builder de `MaterialApp.router`), así que el suyo no puede
  /// mostrar diálogos. En arranque en frío hay que esperar a que exista y a que
  /// el router salga del splash: un diálogo abierto antes se pierde cuando la
  /// redirección reemplaza esa página.
  Future<BuildContext?> _navigatorContext() async {
    BuildContext? ready() {
      final delegate = ref.read(routerProvider).routerDelegate;
      final onSplash = delegate.currentConfiguration.uri.path == Routes.splash;
      final loading = !ref.read(sessionProvider).hasValue;
      return (onSplash || loading) ? null : delegate.navigatorKey.currentContext;
    }

    for (var frames = 0; frames < _maxWaitFrames; frames++) {
      final context = ready();
      if (context != null && frames >= _settleFrames) return context;
      final frame = Completer<void>();
      WidgetsBinding.instance.addPostFrameCallback((_) => frame.complete());
      WidgetsBinding.instance.scheduleFrame();
      await frame.future;
      if (!mounted) return null;
    }
    return ready();
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
    var done = false;
    try {
      // Un link puede venir de afuera (BROWSABLE): nunca vincula sin preguntar.
      final navigator = await _navigatorContext();
      if (navigator == null || !navigator.mounted) return;
      done = await confirmAction(
        navigator,
        title: 'Vincular servidor',
        message:
            'Una aplicación o página pidió vincular «${url.host}». '
            'Vinculá solo servidores que reconozcas.',
        confirmLabel: 'Vincular',
        onConfirm: () => ref.read(sessionProvider.notifier).addServer(url.toString()),
      );
    } finally {
      _inFlight = false;
      // Cancelado o fallido: un reenvío del mismo link debe volver a preguntar.
      if (!done) {
        _lastHandled = null;
        _lastHandledAt = null;
      }
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
