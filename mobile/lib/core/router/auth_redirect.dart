import '../auth/session.dart';
import '../../data/models/app_user.dart';
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
