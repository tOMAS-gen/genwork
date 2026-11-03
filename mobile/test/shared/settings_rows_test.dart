// Filas de ajustes agrupadas (spec 066, tarea 11, PS4): una card por grupo con
// rótulo 11/700, filas de 56 dp (64 con dos líneas) separadas por divisores de
// 1 px, íconos de 20 dp en gris y chevron en las filas que navegan.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/session_controller.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/core/theme/app_text_styles.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/settings_repository.dart';
import 'package:genwork_mobile/features/account/account_screen.dart';
import 'package:genwork_mobile/features/settings/settings_screen.dart';
import 'package:genwork_mobile/shared/widgets/settings_rows.dart';
import '../features/settings_parity_test.dart' as settings;

class _Session extends SessionController {
  @override
  Future<SessionState> build() async => SignedIn(
    serverUrl: Uri.parse('http://localhost:3010'),
    token: 'test',
    user: AppUser.fromJson({
      'id': 'u1',
      'name': 'admin de prueba',
      'email': 'admin@test.local',
      'globalRole': 'SUPERADMIN',
    }),
  );
}

Future<void> _mount(WidgetTester t, Widget child) {
  t.view.physicalSize = const Size(360, 720);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  return t.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      home: Scaffold(
        body: Padding(padding: const EdgeInsets.all(16), child: child),
      ),
    ),
  );
}

void main() {
  // Con Montserrat: con la fuente de test los títulos ocupan dos líneas.
  setUpAll(() async {
    await (FontLoader(
      'Montserrat',
    )..addFont(rootBundle.load('assets/fonts/Montserrat.ttf'))).load();
  });

  testWidgets('ListTile del tema: mínimo de 48 dp (T4)', (t) async {
    expect(AppTheme.light().listTileTheme.minTileHeight, 48);
  });

  testWidgets('SettingsRow: 56 dp con una línea y 64 con dos', (t) async {
    await _mount(
      t,
      SettingsGroup(
        children: [
          SettingsRow(
            key: const ValueKey('una'),
            icon: AppIcons.bell,
            title: 'Notificaciones',
            onTap: () {},
          ),
          SettingsRow(
            key: const ValueKey('dos'),
            icon: AppIcons.lock,
            // Corto: la fuente de test es más ancha que Montserrat.
            title: 'Acceso',
            subtitle: 'Quién puede ingresar: dominio corporativo o lista',
            onTap: () {},
          ),
        ],
      ),
    );
    expect(t.getSize(find.byKey(const ValueKey('una'))).height, 56);
    expect(t.getSize(find.byKey(const ValueKey('dos'))).height, 64);
    // Un solo divisor de 1 px entre las dos filas.
    expect(find.byType(Divider), findsOneWidget);
    expect(t.widget<Divider>(find.byType(Divider)).thickness, 1);
  });

  testWidgets('SettingsRow: ícono de 20 dp gris, título 15/600 en x=72 y '
      'chevron solo si navega', (t) async {
    await _mount(
      t,
      SettingsGroup(
        children: [
          SettingsRow(icon: AppIcons.bell, title: 'Navega', onTap: () {}),
          const SettingsRow(icon: AppIcons.info, title: 'Fija'),
        ],
      ),
    );
    final icon = t.widget<Icon>(find.byIcon(AppIcons.bell));
    expect(icon.size, AppIconSizes.action);
    expect(icon.color, GenColors.light.muted);
    final title = t.widget<Text>(find.text('Navega'));
    expect(title.style!.fontSize, AppTextStyles.cardTitle.fontSize);
    expect(title.style!.fontWeight, FontWeight.w600);
    // Margen de 16 + padding de 16 + columna de ícono de 40.
    expect(t.getTopLeft(find.text('Navega')).dx, 72);
    expect(t.getTopLeft(find.text('Fija')).dx, 72);
    expect(find.byIcon(AppIcons.chevronRight), findsOneWidget);
  });

  testWidgets('SettingsGroup: rótulo 11/700 gris anunciado como encabezado', (
    t,
  ) async {
    await _mount(
      t,
      const SettingsGroup(
        label: 'Administración',
        children: [SettingsRow(title: 'Usuarios')],
      ),
    );
    final label = t.widget<Text>(find.text('ADMINISTRACIÓN'));
    expect(label.style!.fontSize, 11);
    expect(label.style!.fontWeight, FontWeight.w700);
    expect(label.style!.color, GenColors.light.muted);
    expect(
      find.ancestor(
        of: find.text('ADMINISTRACIÓN'),
        matching: find.byWidgetPredicate(
          (w) => w is Semantics && w.properties.header == true,
        ),
      ),
      findsOneWidget,
    );
    expect(
      t.getTopLeft(find.text('ADMINISTRACIÓN')).dy,
      lessThan(t.getTopLeft(find.text('Usuarios')).dy),
    );
  });

  testWidgets('las filas que navegan miden ≥48 dp y tienen nombre', (t) async {
    final handle = t.ensureSemantics();
    await _mount(
      t,
      SettingsGroup(
        children: [
          SettingsRow(icon: AppIcons.bell, title: 'Uno', onTap: () {}),
          SettingsRow(title: 'Dos', subtitle: 'Detalle', onTap: () {}),
        ],
      ),
    );
    await expectLater(t, meetsGuideline(androidTapTargetGuideline));
    await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
    handle.dispose();
  });

  // P23-M1: perfil, servidores, sistema, almacenamiento, Configuración y
  // Cerrar sesión entran en una pantalla de 390 × 844.
  testWidgets('Cuenta entra en una pantalla, con filas agrupadas', (t) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWith(_Session.new),
          serverListProvider.overrideWithValue(const []),
        ],
        child: MaterialApp(
          theme: AppTheme.light(),
          home: const AccountScreen(),
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.byType(SettingsRow), findsAtLeastNWidgets(6));
    final logout = t.getRect(find.byKey(const ValueKey('account_logout')));
    expect(logout.bottom, lessThanOrEqualTo(844));
    // La versión aparece una sola vez (P23-M4).
    expect(find.textContaining('1.0.0'), findsOneWidget);
    for (final row in t.widgetList<SettingsRow>(find.byType(SettingsRow))) {
      expect(row.title, isNotEmpty);
    }
  });

  // P25-M1: una card por grupo con rótulo; entran ~9 filas por pantalla.
  testWidgets('Configuración: grupos con rótulo y ≥9 filas en 390 × 844', (
    t,
  ) async {
    await settings.mount(t, settings.Fixture(), const SettingsHomeScreen());
    t.view.physicalSize = const Size(390, 844);
    await t.pumpAndSettle();
    expect(find.byType(SettingsGroup), findsAtLeastNWidgets(3));
    final visible = find.byType(SettingsRow).evaluate().where((e) {
      final box = e.renderObject! as RenderBox;
      return box.localToGlobal(Offset(0, box.size.height)).dy <= 844;
    });
    expect(visible.length, greaterThanOrEqualTo(9));
    for (final key in [
      'settings_theme',
      'settings_notifications',
      'settings_account',
      'settings_${SettingsSection.access.name}',
    ]) {
      expect(find.byKey(ValueKey(key)), findsOneWidget, reason: key);
    }
  });
}
