import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';

final themePreferenceProvider = NotifierProvider<ThemePreference, ThemeMode>(
  ThemePreference.new,
);

class ThemePreference extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final saved = ref.watch(sharedPreferencesProvider).getString('themeMode');
    return ThemeMode.values.where((mode) => mode.name == saved).firstOrNull ??
        ThemeMode.system;
  }

  Future<void> setMode(ThemeMode mode) async {
    final stored = await ref
        .read(sharedPreferencesProvider)
        .setString('themeMode', mode.name);
    if (!stored) throw StateError('No se pudo guardar el tema.');
    state = mode;
  }
}
