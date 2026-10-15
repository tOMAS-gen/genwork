import '../auth/session.dart';
import '../../data/models/app_user.dart';
import 'routes.dart';

const _publicRoutes = {Routes.splash, Routes.setup, Routes.login};

bool _isServerRoute(String location) =>
    location == Routes.servers || location.startsWith('${Routes.servers}/');

/// Redirección según sesión. Pura para poder testearla.
///
/// - Cargando → splash.
/// - Sin servidor → setup (primer inicio).
/// - Sin sesión → login.
/// - Con sesión → fuera de splash/setup/login.
/// - Con o sin sesión → /servers* queda accesible (cambiar de servidor).
String? authRedirect(SessionState? session, String location) {
  // Cambiar de servidor está disponible para todos los roles, con o sin sesión.
  if ((session is SignedOut || session is SignedIn) && _isServerRoute(location)) {
    return null;
  }
  return switch (session) {
    null => location == Routes.splash ? null : Routes.splash,
    NeedsServer() => location == Routes.setup ? null : Routes.setup,
    SignedOut() => location == Routes.login ? null : Routes.login,
    SignedIn(:final user) => switch (user.role) {
      GlobalRole.client =>
        location == Routes.portal || location.startsWith('${Routes.portal}/')
            ? null
            : Routes.portal,
      GlobalRole.reader =>
        location == Routes.tv || location == '${Routes.tv}/account'
            ? null
            : Routes.tv,
      GlobalRole.unknown => location == Routes.login ? null : Routes.login,
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
