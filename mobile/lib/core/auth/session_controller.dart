import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../../data/repositories/auth_repository.dart';
import '../config/server_url.dart';
import '../network/api_exception.dart';
import '../providers.dart';
import 'session.dart';
import 'token_store.dart';

/// Dueño del ciclo servidor → login → sesión. Las pantallas de setup/login solo
/// llaman a estos métodos; el router redirige según el estado.
class SessionController extends AsyncNotifier<SessionState> {
  @override
  Future<SessionState> build() async {
    final server = ref.read(serverConfigStoreProvider).read();
    if (server == null) return const NeedsServer();
    final stored = await ref.read(tokenStoreProvider).read();
    if (stored == null) return SignedOut(server);
    return SignedIn(serverUrl: server, token: stored.token, user: stored.user);
  }

  /// Valida y guarda la URL del sistema. Lanza [ApiException] si no es un genwork.
  Future<void> setServer(String input) async {
    final url = normalizeServerUrl(input);
    if (url == null) {
      throw const ApiException(
        code: 'INVALID_URL',
        message: 'Ingresá una dirección válida, ej. work.empresa.com',
      );
    }
    await AuthRepository(serverUrl: url).checkServer();
    await ref.read(serverConfigStoreProvider).write(url);
    state = AsyncData(SignedOut(url));
  }

  /// Vuelve a la pantalla de URL (borra servidor y sesión local).
  Future<void> changeServer() async {
    await ref.read(tokenStoreProvider).clear();
    await ref.read(serverConfigStoreProvider).clear();
    state = const AsyncData(NeedsServer());
  }

  /// Login con el navegador del sistema. Lanza [LoginCancelled] o [ApiException].
  Future<void> login() async {
    final current = state.value;
    if (current is! SignedOut) return;
    final stored = await AuthRepository(serverUrl: current.serverUrl).login();
    await ref.read(tokenStoreProvider).write(stored);
    state = AsyncData(
      SignedIn(
        serverUrl: current.serverUrl,
        token: stored.token,
        user: stored.user,
      ),
    );
  }

  Future<void> logout() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await AuthRepository(serverUrl: current.serverUrl).logout(current.token);
    await ref.read(tokenStoreProvider).clear();
    state = AsyncData(SignedOut(current.serverUrl));
  }

  /// Un 401 de la API: el token fue revocado → sesión local fuera, al login.
  Future<void> handleUnauthorized() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref.read(tokenStoreProvider).clear();
    state = AsyncData(SignedOut(current.serverUrl));
  }

  /// Revalida los permisos visibles sin cerrar la sesión por una caída de red.
  Future<void> refreshUser() async {
    final current = state.value;
    if (current is! SignedIn) return;
    try {
      final user = await ref.read(meRepositoryProvider).me();
      if (!ref.mounted ||
          !identical(state.value, current) ||
          user.id != current.user.id ||
          mapEquals(user.toJson(), current.user.toJson())) {
        return;
      }
      await updateStoredUser(StoredSession(token: current.token, user: user));
    } catch (_) {
      // El cliente HTTP gestiona el 401; un error de red conserva la sesión.
    }
  }

  /// Actualiza el usuario guardado (ej. tras refrescar `/api/me`).
  Future<void> updateStoredUser(StoredSession session) async {
    final current = state.value;
    if (current is! SignedIn ||
        current.token != session.token ||
        current.user.id != session.user.id) {
      return;
    }
    await ref.read(tokenStoreProvider).write(session);
    if (!ref.mounted || !identical(state.value, current)) return;
    state = AsyncData(
      SignedIn(
        serverUrl: current.serverUrl,
        token: session.token,
        user: session.user,
      ),
    );
  }
}
