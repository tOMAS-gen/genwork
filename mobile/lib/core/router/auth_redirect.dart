import '../auth/session.dart';
import 'routes.dart';

const _publicRoutes = {Routes.splash, Routes.setup, Routes.login};

/// Redirección según sesión. Pura para poder testearla.
///
/// - Cargando → splash.
/// - Sin servidor → setup (primer inicio).
/// - Sin sesión → login.
/// - Con sesión → fuera de splash/setup/login.
String? authRedirect(SessionState? session, String location) {
  return switch (session) {
    null => location == Routes.splash ? null : Routes.splash,
    NeedsServer() => location == Routes.setup ? null : Routes.setup,
    SignedOut() => location == Routes.login ? null : Routes.login,
    SignedIn() => _publicRoutes.contains(location) ? Routes.myDay : null,
  };
}
