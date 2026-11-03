import 'dart:async';
import 'dart:io';

import 'core/notifications/push_service.dart';
import 'core/auth/token_store.dart';
import 'core/servers/server_registry.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:marionette_flutter/marionette_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/providers.dart';

Future<void> main() async {
  // Marionette (navegar y tocar la app desde un agente) solo en debug: en
  // release y en los tests queda el binding de siempre.
  if (kDebugMode &&
      !kIsWeb &&
      !Platform.environment.containsKey('FLUTTER_TEST')) {
    MarionetteBinding.ensureInitialized();
  } else {
    WidgetsFlutterBinding.ensureInitialized();
  }
  await initializeDateFormatting('es');
  final prefs = await SharedPreferences.getInstance();

  final push = PushService(prefs, ServerRegistry(prefs), SecureTokenStore());

  runApp(
    ProviderScope(
      // Sin reintentos automáticos de Riverpod 3: los errores se muestran con
      // "Reintentar" y un 401 tiene que cortar en el acto.
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        pushServiceProvider.overrideWithValue(push),
      ],
      child: const GenworkApp(),
    ),
  );
  // Firebase y el aviso inicial no demoran el primer cuadro (T13): el aviso
  // se atiende cuando el servicio está listo (PushListener).
  unawaited(push.initialize());
}
