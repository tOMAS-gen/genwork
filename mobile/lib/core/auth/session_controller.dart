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

/// Si un 401 llega antes de este tiempo desde un login exitoso, el servidor está
/// rechazando tokens recién emitidos: no se vuelve a abrir el navegador solo.
const kFreshLoginWindow = Duration(seconds: 30);

/// Resultado de entrar a un servidor: con sesión, o el usuario cerró el navegador.
enum ConnectResult { signedIn, cancelled }

/// Dueño del ciclo servidor → login → sesión, con **varios servidores
/// guardados**: uno activo a la vez, cada uno con su propio token. Las pantallas
/// solo llaman a estos métodos; el router redirige según el estado.
class SessionController extends AsyncNotifier<SessionState> {
  DateTime? _lastLoginAt;

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
    // Sin token guardado al arrancar: se va directo al login del navegador.
    return _stateFor(active, autoLogin: true);
  }

  Future<SessionState> _stateFor(
    ServerProfile profile, {
    bool autoLogin = false,
  }) async {
    final stored = await ref.read(tokenStoreProvider).read(profile.id);
    if (stored == null) return SignedOut(profile.url, autoLogin: autoLogin);
    return SignedIn(
      serverUrl: profile.url,
      token: stored.token,
      user: stored.user,
    );
  }

  String _idOf(Uri url) => ServerProfile.idFor(url);

  /// Valida la URL contra `/api/auth/mobile/info`, la guarda en el acto (o la
  /// actualiza si ya estaba) y entra: con token guardado directo, sin token por
  /// el login del navegador. Lanza [ApiException] si no es un genwork, o el error
  /// del login (el servidor queda guardado igual). [onBrowser] avisa justo antes
  /// de abrir el navegador.
  Future<ConnectResult> connect(String input, {VoidCallback? onBrowser}) async {
    final url = normalizeServerUrl(input);
    if (url == null) {
      throw const ApiException(
        code: 'INVALID_URL',
        message: 'Ingresá una dirección válida, ej. work.empresa.com',
      );
    }
    final info = await ref.read(authRepositoryProvider(url)).checkServer();
    final profile = await ref
        .read(serverRegistryProvider)
        .upsert(url, name: info.name);
    ref.invalidate(serverListProvider);
    return _enter(profile, onBrowser: onBrowser);
  }

  /// Entra a un servidor ya guardado: con token directo, sin token por el
  /// navegador. Mismos resultados y errores que [connect].
  Future<ConnectResult> select(String id, {VoidCallback? onBrowser}) async {
    final profile = ref.read(serverRegistryProvider).byId(id);
    if (profile == null) return ConnectResult.cancelled;
    return _enter(profile, onBrowser: onBrowser);
  }

  /// Login del navegador para el servidor activo sin sesión (arranque o 401,
  /// tras [consumeAutoLogin]). Cancelar o fallar lo deja como estaba.
  Future<ConnectResult> loginActive() async {
    final current = state.value;
    if (current is! SignedOut) return ConnectResult.cancelled;
    final profile = ref
        .read(serverRegistryProvider)
        .byId(_idOf(current.serverUrl));
    if (profile == null) return ConnectResult.cancelled;
    return _enter(profile);
  }

  /// El login corre "en el lugar": el estado no cambia mientras el navegador
  /// está abierto, así la pantalla que lo pidió sigue montada.
  Future<ConnectResult> _enter(
    ServerProfile profile, {
    VoidCallback? onBrowser,
  }) async {
    final tokens = ref.read(tokenStoreProvider);
    if (await tokens.read(profile.id) != null) {
      await _activate(profile);
      return ConnectResult.signedIn;
    }
    final before = state.value;
    final StoredSession stored;
    try {
      onBrowser?.call();
      stored = await ref.read(authRepositoryProvider(profile.url)).login();
    } on LoginCancelled {
      await _afterFailedLogin(profile, before);
      return ConnectResult.cancelled;
    } catch (_) {
      await _afterFailedLogin(profile, before);
      rethrow;
    }
    // El token queda en su perfil aunque mientras tanto haya cambiado el estado.
    await tokens.write(profile.id, stored);
    _lastLoginAt = ref.read(authClockProvider)();
    if (!ref.mounted) return ConnectResult.signedIn;
    ref.invalidate(serverListProvider);
    if (!identical(state.value, before)) return ConnectResult.signedIn;
    state = AsyncData(
      SignedIn(serverUrl: profile.url, token: stored.token, user: stored.user),
    );
    await ref.read(serverRegistryProvider).setActive(profile.id);
    return ConnectResult.signedIn;
  }

  /// Navegador cancelado o fallido: el servidor sigue guardado. Una sesión
  /// iniciada en otro servidor no se toca; si no había, este queda activo y
  /// sin sesión (sin login automático).
  Future<void> _afterFailedLogin(
    ServerProfile profile,
    SessionState? before,
  ) async {
    if (!ref.mounted || !identical(state.value, before) || before is SignedIn) {
      return;
    }
    state = AsyncData(SignedOut(profile.url));
    await ref.read(serverRegistryProvider).setActive(profile.id);
    if (ref.mounted) ref.invalidate(serverListProvider);
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

  /// Consume el pedido de login automático (una sola vez, arranque o 401):
  /// devuelve true si el estado era [SignedOut] con `autoLogin` y lo deja sin el
  /// flag. Después la lista de servidores llama a [loginActive].
  bool consumeAutoLogin() {
    final current = state.value;
    if (current is! SignedOut || !current.autoLogin) return false;
    state = AsyncData(SignedOut(current.serverUrl));
    return true;
  }

  Future<void> logout() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref
        .read(authRepositoryProvider(current.serverUrl))
        .logout(current.token);
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
    // Token vencido o revocado: no hay login vigente → al navegador, salvo que
    // el servidor rechace tokens recién emitidos (evita el bucle).
    final last = _lastLoginAt;
    final fresh =
        last != null &&
        ref.read(authClockProvider)().difference(last) < kFreshLoginWindow;
    state = AsyncData(SignedOut(current.serverUrl, autoLogin: !fresh));
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
      SignedIn(
        serverUrl: current.serverUrl,
        token: session.token,
        user: session.user,
      ),
    );
  }
}
