import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_geometry.dart';
import 'package:genwork_mobile/core/theme/app_icons.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/core/theme/gen_colors.dart';
import 'package:genwork_mobile/shared/widgets/app_drawer_scope.dart';
import 'package:genwork_mobile/shared/widgets/app_work_section.dart';
import 'package:genwork_mobile/shared/widgets/brand_name.dart';
import 'package:genwork_mobile/shared/widgets/gen_page_scaffold.dart';
import 'package:genwork_mobile/shared/widgets/gen_section_header.dart';
import 'package:genwork_mobile/shared/widgets/kpi_tile.dart';
import 'package:genwork_mobile/shared/widgets/page_intro.dart';
import 'package:genwork_mobile/shared/widgets/section_card.dart';
import 'package:genwork_mobile/shared/widgets/workspace_panel.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:genwork_mobile/core/providers.dart';

Future<void> _mount(
  WidgetTester t,
  Widget home, {
  bool dark = false,
  double scale = 1,
}) async {
  t.view.physicalSize = const Size(360, 720);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  await t.pumpWidget(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: MaterialApp(
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: home,
      ),
    ),
  );
}

void main() {
  for (final dark in [false, true]) {
    for (final scale in [1.0, 1.5]) {
      testWidgets('GenPageScaffold sin overflow (dark=$dark, $scale×)', (
        t,
      ) async {
        await _mount(
          t,
          GenPageScaffold(
            title: 'Un título de pantalla bastante largo',
            subtitle: 'Un subtítulo explicativo que también es largo.',
            icon: AppIcons.myDay,
            actions: [
              TextButton(onPressed: () {}, child: const Text('Acción uno')),
              TextButton(onPressed: () {}, child: const Text('Acción dos')),
            ],
            showThemeToggle: true,
            fab: FloatingActionButton(
              onPressed: () {},
              child: const Icon(AppIcons.add),
            ),
            body: ListView(
              children: [
                WorkspaceListPanel(
                  children: [
                    for (var i = 0; i < 3; i++)
                      ListTile(title: Text('Fila $i')),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                const KpiTile(label: 'Pendientes', value: r'$ 154.300,00'),
                const SizedBox(height: AppSpacing.md),
                const AppWorkSection(
                  title: 'Sección',
                  icon: AppIcons.notes,
                  child: Text('contenido'),
                ),
                const SectionCard(title: 'Datos', child: Text('campos')),
              ],
            ),
          ),
          dark: dark,
          scale: scale,
        );
        expect(t.takeException(), isNull);
        expect(find.byType(BrandName), findsOneWidget);
        expect(find.byType(GenSectionHeader), findsOneWidget);
        expect(find.byKey(const ValueKey('drawer_open')), findsOneWidget);
      });
    }
  }

  testWidgets('GenPageScaffold: showBack usa BackButton y AppBar de 48', (
    t,
  ) async {
    await _mount(
      t,
      const GenPageScaffold(title: 'Detalle', showBack: true, body: Text('x')),
    );
    expect(find.byType(BackButton), findsOneWidget);
    expect(find.byKey(const ValueKey('drawer_open')), findsNothing);
    expect(t.getSize(find.byType(AppBar)).height, 48);
  });

  testWidgets('GenPageScaffold: botón del drawer abre el menú del scope', (
    t,
  ) async {
    var opened = 0;
    await _mount(
      t,
      AppDrawerScope(
        openDrawer: () => opened++,
        child: const GenPageScaffold(title: 'Inicio', body: Text('x')),
      ),
    );
    await t.tap(find.byKey(const ValueKey('drawer_open')));
    expect(opened, 1);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('GenPageScaffold: onRefresh con pull-to-refresh', (t) async {
    var refreshed = 0;
    await _mount(
      t,
      GenPageScaffold(
        title: 'Lista',
        onRefresh: () async => refreshed++,
        body: ListView(children: [for (var i = 0; i < 3; i++) Text('$i')]),
      ),
    );
    await t.drag(find.byType(ListView), const Offset(0, 300));
    await t.pumpAndSettle();
    expect(refreshed, 1);
  });

  testWidgets('BrandName: ›gen en brand 600 y work en text 400', (t) async {
    await _mount(t, const Scaffold(body: BrandName(size: 28)));
    final span =
        t.widget<RichText>(find.byType(RichText).first).text as TextSpan;
    final parts = span.children!.cast<TextSpan>();
    expect(parts[0].text, '›gen');
    expect(parts[0].style!.fontWeight, FontWeight.w600);
    expect(parts[0].style!.color, GenColors.light.brand);
    expect(parts[1].text, 'work');
    expect(parts[1].style!.fontWeight, FontWeight.w400);
    expect(parts[1].style!.color, GenColors.light.text);
  });

  testWidgets('PageIntro: caja de ícono 38 brandFill, título 24/700', (
    t,
  ) async {
    await _mount(
      t,
      const Scaffold(
        body: PageIntro(title: 'Mi día', subtitle: 'Hoy', icon: AppIcons.myDay),
      ),
    );
    expect(find.text('Mi día'), findsOneWidget);
    expect(find.text('Hoy'), findsOneWidget);
    final style = t.widget<Text>(find.text('Mi día')).style!;
    expect(style.fontSize, 24);
    expect(style.fontWeight, FontWeight.w700);
    final box = t.widget<Container>(
      find.ancestor(
        of: find.byIcon(AppIcons.myDay),
        matching: find.byType(Container),
      ),
    );
    expect((box.decoration as BoxDecoration).color, GenColors.light.brandFill);
    expect(
      t.getSize(
        find.ancestor(
          of: find.byIcon(AppIcons.myDay),
          matching: find.byType(Container),
        ),
      ),
      const Size.square(38),
    );
  });

  testWidgets('WorkspaceListPanel separa filas con línea border', (t) async {
    await _mount(
      t,
      const Scaffold(
        body: WorkspaceListPanel(children: [Text('a'), Text('b'), Text('c')]),
      ),
    );
    expect(find.byType(Divider), findsNWidgets(2));
    expect(
      t.widget<Divider>(find.byType(Divider).first).color,
      GenColors.light.border,
    );
  });

  testWidgets('SectionCard colapsa su contenido con enabled=false', (t) async {
    await _mount(
      t,
      const Scaffold(
        body: SectionCard(
          title: 'Precios',
          enabled: false,
          child: Text('adentro'),
        ),
      ),
    );
    expect(find.text('adentro'), findsNothing);
    expect(find.text('PRECIOS'), findsOneWidget);
  });

  testWidgets('KpiTile shrinkValueToFit entra en un ancho chico', (t) async {
    await _mount(
      t,
      const Scaffold(
        body: SizedBox(
          width: 140,
          child: KpiTile(
            label: 'Total',
            value: r'$ 1.154.300,00',
            shrinkValueToFit: true,
          ),
        ),
      ),
      scale: 1.5,
    );
    expect(t.takeException(), isNull);
    expect(find.textContaining('1.154.300'), findsOneWidget);
  });
}
