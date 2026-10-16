import '../auth/session.dart';
import '../../data/models/app_user.dart';
import 'routes.dart';

const _publicRoutes = {Routes.splash, Routes.setup};

bool _isServerRoute(String location) =>
    location == Routes.servers || location.startsWith('${Routes.servers}/');

/// Redirección según sesión. Pura para poder testearla.
///
/// - Cargando → splash.
/// - Sin servidor → setup (primer inicio).
/// - Sin sesión → lista de servidores (el login es siempre del navegador).
/// - Con sesión → fuera de splash/setup.
/// - Con o sin sesión → /servers* queda accesible (cambiar de servidor).
String? authRedirect(SessionState? session, String location) {
  // Cambiar de servidor está disponible para todos los roles, con o sin sesión.
  if ((session is SignedOut || session is SignedIn) && _isServerRoute(location)) {
    return null;
  }
  return switch (session) {
    null => location == Routes.splash ? null : Routes.splash,
    NeedsServer() => location == Routes.setup ? null : Routes.setup,
    SignedOut() => Routes.servers,
    SignedIn(:final user) => switch (user.role) {
      GlobalRole.client =>
        location == Routes.portal || location.startsWith('${Routes.portal}/')
            ? null
            : Routes.portal,
      GlobalRole.reader =>
        location == Routes.tv || location == '${Routes.tv}/account'
            ? null
            : Routes.tv,
      GlobalRole.unknown => Routes.servers,
      _ =>
        _publicRoutes.contains(location) ||
                location == Routes.tv ||
                location.startsWith('${Routes.tv}/') ||
                location == Routes.portal ||
                location.startsWith('${Routes.portal}/')
            ? Routes.myDay
            : null,
    },
  };
}
