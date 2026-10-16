import '../../data/models/app_user.dart';

/// Estado de sesión de la app. Flujo: [NeedsServer] (primer inicio) →
/// [SignedOut] (servidor guardado sin sesión: lista de servidores) → [SignedIn].
sealed class SessionState {
  const SessionState();
}

class NeedsServer extends SessionState {
  const NeedsServer();
}

class SignedOut extends SessionState {
  const SignedOut(this.serverUrl, {this.autoLogin = false});

  final Uri serverUrl;

  /// De un solo uso: al arrancar sin token o tras un 401, el login del
  /// navegador debe abrirse solo. Lo consume la lista de servidores.
  final bool autoLogin;
}

class SignedIn extends SessionState {
  const SignedIn({required this.serverUrl, required this.token, required this.user});

  final Uri serverUrl;
  final String token;
  final AppUser user;
}
