import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/features/settings/settings_screen.dart';
import 'package:genwork_mobile/features/settings/catalog_settings_screen.dart';
import 'package:genwork_mobile/data/repositories/settings_repository.dart';
import 'package:genwork_mobile/data/repositories/catalogs_repository.dart';
import 'settings_parity_test.dart' show Fixture, mount;

void main() {
  for (final dark in [false, true]) {
    testWidgets('QA10 controles con nombre y tamaño accesible, oscuro=$dark', (
      t,
    ) async {
      final handle = t.ensureSemantics();

      try {
        for (final screen in [
          const SettingsHomeScreen(),
          const CatalogSettingsScreen(kind: CatalogKind.labels),
          const CatalogSettingsScreen(kind: CatalogKind.statuses),
          const SettingsScreen(section: SettingsSection.users),
          const SettingsScreen(section: SettingsSection.mcp),
        ]) {
          await mount(t, Fixture(), screen, compact: true, dark: dark);
          await expectLater(t, meetsGuideline(androidTapTargetGuideline));
          await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
          await t.pumpWidget(const SizedBox.shrink());
        }
      } finally {
        handle.dispose();
      }
    });
  }
}
