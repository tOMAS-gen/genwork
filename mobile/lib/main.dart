import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');
  final prefs = await SharedPreferences.getInstance();

  runApp(ProviderScope(
    // Sin reintentos automáticos de Riverpod 3: los errores se muestran con
    // "Reintentar" y un 401 tiene que cortar en el acto.
    retry: (_, _) => null,
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    child: const GenworkApp(),
  ));
}
