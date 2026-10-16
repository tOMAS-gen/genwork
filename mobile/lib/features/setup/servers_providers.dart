import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/token_store.dart';
import '../../core/providers.dart';

/// Sesión guardada de cada servidor (por id de perfil; null = «Sin sesión»).
/// Se recalcula al cambiar la sesión activa o la lista de servidores.
final serverSessionsProvider = FutureProvider<Map<String, StoredSession?>>((
  ref,
) async {
  final profiles = ref.watch(serverListProvider);
  ref.watch(sessionProvider);
  final tokens = ref.watch(tokenStoreProvider);
  return {for (final p in profiles) p.id: await tokens.read(p.id)};
});
