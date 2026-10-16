import '../data/repositories/objectives_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/repositories/me_repository.dart';
import '../data/repositories/board_repository.dart';
import '../data/repositories/groups_repository.dart';
import '../data/repositories/notes_repository.dart';
import '../data/repositories/reminders_repository.dart';
import '../data/repositories/sectors_repository.dart';
import '../data/repositories/tasks_repository.dart';
import '../data/repositories/works_repository.dart';
import 'auth/session.dart';
import 'auth/session_controller.dart';
import 'auth/token_store.dart';
import 'network/api_client.dart';
import 'servers/server_profile.dart';
import 'servers/server_registry.dart';
import '../data/repositories/auth_repository.dart';

/// Se sobreescribe en `main()` con la instancia ya cargada.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider sin override'),
);

final serverRegistryProvider = Provider<ServerRegistry>(
  (ref) => ServerRegistry(ref.watch(sharedPreferencesProvider)),
);

/// Servidores guardados. `SessionController` lo invalida cada vez que cambia la
/// lista, así las pantallas se reconstruyen.
final serverListProvider = Provider<List<ServerProfile>>(
  (ref) => ref.watch(serverRegistryProvider).profiles(),
);

/// Repositorio de login/verificación de un servidor. Se puede sobreescribir en tests.
final authRepositoryProvider = Provider.family<AuthRepository, Uri>(
  (ref, url) => AuthRepository(serverUrl: url),
);

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

/// Reloj de la sesión (se sobreescribe en tests).
final authClockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

final sessionProvider = AsyncNotifierProvider<SessionController, SessionState>(
  SessionController.new,
);

/// Usuario logueado. Solo usar debajo del shell (sesión iniciada).
final currentUserProvider = Provider((ref) {
  final session = ref.watch(sessionProvider).value;
  return session is SignedIn ? session.user : null;
});

/// Cliente de la API autenticado. Lanza si no hay sesión: las pantallas que lo
/// usan solo existen dentro del shell.
final apiClientProvider = Provider<ApiClient>((ref) {
  final session = ref.watch(sessionProvider).value;
  if (session is! SignedIn) throw StateError('apiClientProvider sin sesión');
  final token = session.token;
  return ApiClient(
    baseUrl: session.serverUrl,
    token: token,
    onUnauthorized: () =>
        ref.read(sessionProvider.notifier).handleUnauthorized(token),
  );
});

final meRepositoryProvider = Provider(
  (ref) => MeRepository(ref.watch(apiClientProvider)),
);
final worksRepositoryProvider = Provider(
  (ref) => WorksRepository(ref.watch(apiClientProvider)),
);
final tasksRepositoryProvider = Provider(
  (ref) => TasksRepository(ref.watch(apiClientProvider)),
);
final sectorsRepositoryProvider = Provider(
  (ref) => SectorsRepository(ref.watch(apiClientProvider)),
);
final notesRepositoryProvider = Provider(
  (ref) => NotesRepository(ref.watch(apiClientProvider)),
);
final remindersRepositoryProvider = Provider(
  (ref) => RemindersRepository(ref.watch(apiClientProvider)),
);

final groupsRepositoryProvider = Provider(
  (ref) => GroupsRepository(ref.watch(apiClientProvider)),
);

final boardRepositoryProvider = Provider(
  (ref) => BoardRepository(ref.watch(apiClientProvider)),
);

final objectivesRepositoryProvider = Provider(
  (ref) => ObjectivesRepository(ref.watch(apiClientProvider)),
);
