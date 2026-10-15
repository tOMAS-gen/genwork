import '../../data/models/app_user.dart';

/// Estado de sesión de la app. Flujo: [NeedsServer] (primer inicio) →
/// [SignedOut] (URL guardada) → [SignedIn].
sealed class SessionState {
  const SessionState();
}

class NeedsServer extends SessionState {
  const NeedsServer();
}

class SignedOut extends SessionState {
  const SignedOut(this.serverUrl, {this.autoLogin = false});

  final Uri serverUrl;

  /// De un solo uso: se agregó o eligió este servidor y el login del navegador
  /// debe abrirse solo. Lo consume la pantalla de login.
  final bool autoLogin;
}

class SignedIn extends SessionState {
  const SignedIn({required this.serverUrl, required this.token, required this.user});

  final Uri serverUrl;
  final String token;
  final AppUser user;
}
