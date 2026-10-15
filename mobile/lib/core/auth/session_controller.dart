import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../config/server_url.dart';
import '../network/api_exception.dart';
import '../providers.dart';
import '../servers/server_profile.dart';
import 'session.dart';
import 'token_store.dart';

/// Dueño del ciclo servidor → login → sesión, con **varios servidores
/// guardados**: uno activo a la vez, cada uno con su propio token. Las pantallas
/// solo llaman a estos métodos; el router redirige según el estado.
class SessionController extends AsyncNotifier<SessionState> {
  @override
  Future<SessionState> build() async {
    final registry = ref.read(serverRegistryProvider);
    final migrated = await registry.migrateLegacy();
    if (migrated != null) {
      await ref.read(tokenStoreProvider).adoptLegacy(migrated.id);
    }
    final active = registry.active();
    if (active == null) return const NeedsServer();
    return _stateFor(active);
  }

  Future<SessionState> _stateFor(ServerProfile profile) async {
    final stored = await ref.read(tokenStoreProvider).read(profile.id);
    if (stored == null) return SignedOut(profile.url);
    return SignedIn(serverUrl: profile.url, token: stored.token, user: stored.user);
  }

  String _idOf(Uri url) => ServerProfile.idFor(url);

  /// Valida la URL contra `/api/auth/mobile/info`, la guarda (o actualiza si ya
  /// estaba) y pasa a ese servidor. Lanza [ApiException] si no es un genwork.
  Future<void> addServer(String input) async {
    final url = normalizeServerUrl(input);
    if (url == null) {
      throw const ApiException(
        code: 'INVALID_URL',
        message: 'Ingresá una dirección válida, ej. work.empresa.com',
      );
    }
    final info = await ref.read(authRepositoryProvider(url)).checkServer();
    final profile = await ref.read(serverRegistryProvider).upsert(url, name: info.name);
    await _activate(profile);
  }

  /// Pasa a un servidor ya guardado: con token entra directo, sin token pide login.
  Future<void> switchServer(String id) async {
    final profile = ref.read(serverRegistryProvider).byId(id);
    if (profile == null) return;
    await _activate(profile);
  }

  /// Olvida un servidor: borra su token local (y lo revoca en el servidor si hay
  /// red). Si era el activo, pasa a otro; si era el último, vuelve al primer inicio.
  Future<void> removeServer(String id) async {
    final registry = ref.read(serverRegistryProvider);
    final profile = registry.byId(id);
    if (profile == null) return;
    final tokens = ref.read(tokenStoreProvider);
    final stored = await tokens.read(id);
    if (stored != null) {
      await ref.read(authRepositoryProvider(profile.url)).logout(stored.token);
    }
    await tokens.clear(id);
    final wasActive = registry.active()?.id == id;
    await registry.remove(id);
    ref.invalidate(serverListProvider);
    if (!wasActive) return;
    final next = registry.active();
    if (next == null) {
      state = const AsyncData(NeedsServer());
    } else {
      await _activate(next);
    }
  }

  Future<void> _activate(ServerProfile profile) async {
    await ref.read(serverRegistryProvider).setActive(profile.id);
    ref.invalidate(serverListProvider);
    final next = await _stateFor(profile);
    if (!ref.mounted) return;
    state = AsyncData(next);
  }

  /// TEMPORAL: se elimina en la tarea de la lista de servidores. Solo muestra la
  /// pantalla de alta sin borrar nada.
  Future<void> changeServer() async {
    state = const AsyncData(NeedsServer());
  }

  /// Login con el navegador del sistema. Lanza [LoginCancelled] o [ApiException].
  Future<void> login() async {
    final current = state.value;
    if (current is! SignedOut) return;
    final stored = await ref.read(authRepositoryProvider(current.serverUrl)).login();
    await ref.read(tokenStoreProvider).write(_idOf(current.serverUrl), stored);
    state = AsyncData(
      SignedIn(serverUrl: current.serverUrl, token: stored.token, user: stored.user),
    );
  }

  Future<void> logout() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref.read(authRepositoryProvider(current.serverUrl)).logout(current.token);
    await ref.read(tokenStoreProvider).clear(_idOf(current.serverUrl));
    state = AsyncData(SignedOut(current.serverUrl));
  }

  /// Un 401 de la API: el token fue revocado → sesión local fuera, al login.
  Future<void> handleUnauthorized() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref.read(tokenStoreProvider).clear(_idOf(current.serverUrl));
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
    await ref.read(tokenStoreProvider).write(_idOf(current.serverUrl), session);
    if (!ref.mounted || !identical(state.value, current)) return;
    state = AsyncData(
      SignedIn(serverUrl: current.serverUrl, token: session.token, user: session.user),
    );
  }
}
