import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../config/server_url.dart';
import '../network/api_exception.dart';
import '../../data/repositories/auth_repository.dart';
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
    if (registry.hasInvalidLegacy) {
      // La URL vieja no sirve: su token no se puede atribuir a ningún servidor
      // (ni a uno que se agregue después). Se descarta antes de borrar la clave.
      await ref.read(tokenStoreProvider).discardLegacy();
      await registry.dropLegacyUrl();
    } else {
      await registry.migrateLegacy();
    }
    final active = registry.active();
    if (active == null) return const NeedsServer();
    // Siempre: si la app murió entre migrar la URL y mover el token, el token
    // viejo quedaría huérfano. Es no-op si no hay nada que adoptar.
    await ref.read(tokenStoreProvider).adoptLegacy(active.id);
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
    final repo = ref.read(authRepositoryProvider(profile.url));
    await tokens.clear(id);
    final wasActive = registry.active()?.id == id;
    await registry.remove(id);
    ref.invalidate(serverListProvider);
    if (wasActive) {
      final next = registry.active();
      if (next == null) {
        state = const AsyncData(NeedsServer());
      } else {
        await _activate(next);
      }
    }
    // Revocar en el servidor es de mejor esfuerzo: sin red no bloquea nada.
    if (stored != null) unawaited(_revoke(repo, stored.token));
  }

  Future<void> _revoke(AuthRepository repo, String token) async {
    try {
      await repo.logout(token);
    } catch (_) {}
  }

  Future<void> _activate(ServerProfile profile) async {
    await ref.read(serverRegistryProvider).setActive(profile.id);
    ref.invalidate(serverListProvider);
    final next = await _stateFor(profile);
    if (!ref.mounted) return;
    state = AsyncData(next);
  }

  /// Login con el navegador del sistema. Lanza [LoginCancelled] o [ApiException].
  Future<void> login() async {
    final current = state.value;
    if (current is! SignedOut) return;
    final stored = await ref.read(authRepositoryProvider(current.serverUrl)).login();
    await ref.read(tokenStoreProvider).write(_idOf(current.serverUrl), stored);
    // Si mientras tanto se cambió de servidor, el token queda guardado en su
    // perfil pero no se pisa la sesión activa.
    if (!ref.mounted || !identical(state.value, current)) return;
    state = AsyncData(
      SignedIn(serverUrl: current.serverUrl, token: stored.token, user: stored.user),
    );
  }

  Future<void> logout() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref.read(authRepositoryProvider(current.serverUrl)).logout(current.token);
    await ref.read(tokenStoreProvider).clear(_idOf(current.serverUrl));
    if (!ref.mounted || !identical(state.value, current)) return;
    state = AsyncData(SignedOut(current.serverUrl));
  }

  /// Un 401 de la API: el token fue revocado → sesión local fuera, al login.
  /// [token] es el del cliente que recibió el 401: si ya no es el de la sesión
  /// actual (cambio de servidor), se ignora.
  Future<void> handleUnauthorized(String token) async {
    final current = state.value;
    if (current is! SignedIn || current.token != token) return;
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
