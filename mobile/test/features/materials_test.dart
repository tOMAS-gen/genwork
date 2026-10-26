// Materiales del proyecto (P07, pestaña) y totales (P20), como la web.
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/material.dart';
import 'package:genwork_mobile/data/models/work.dart';
import 'package:genwork_mobile/data/repositories/materials_repository.dart';
import 'package:genwork_mobile/features/materials/materials_providers.dart';
import 'package:genwork_mobile/features/materials/materials_screen.dart';
import 'package:genwork_mobile/features/materials/work_materials_screen.dart';
import 'package:genwork_mobile/features/works/works_providers.dart';

import 'resource_operations_test.dart' show user;

class _FakeRepo extends MaterialsRepository {
  _FakeRepo(this.items) : super(ApiClient(baseUrl: Uri.parse('https://x.invalid')));
  List<WorkMaterial> items;
  final added = <String>[];
  final removed = <String>[];

  @override
  Future<List<WorkMaterial>> forWork(String workId) async => items;

  @override
  Future<GenstockSearch> search(String query, {required bool supplyOnly}) async => (
    items: [
      GenstockProduct.fromJson({
        'id': 'p2',
        'name': 'Lona front',
        'product_code': 'LON-1',
        'human_code': '',
      }),
    ],
    fallback: false,
  );

  @override
  Future<void> add(
    String workId, {
    required String productId,
    required String quantityRequired,
    String? notes,
  }) async => added.add('$productId:$quantityRequired');

  @override
  Future<void> remove(String workId, String materialId) async =>
      removed.add(materialId);
}

WorkMaterial _material() => WorkMaterial.fromJson({
  'id': 'm1',
  'genstockProductId': 'p1',
  'productName': 'Vinilo blanco',
  'productCode': 'VIN-001',
  'humanCode': '',
  'unitAbbreviation': 'm',
  'quantityRequired': '12.5',
  'notes': null,
});

Future<_FakeRepo> _mount(
  WidgetTester t, {
  List<WorkMaterial> items = const [],
  String access = 'operate',
}) async {
  final repo = _FakeRepo([...items]);
  await t.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        materialsRepositoryProvider.overrideWithValue(repo),
        currentUserProvider.overrideWithValue(user('MEMBER')),
        workDetailProvider('w').overrideWith(
          (ref) async => WorkDetail.fromJson({
            'id': 'w',
            'name': 'Cartelería',
            'status': 'ACTIVE',
            'access': access,
          }),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: const WorkMaterialsScreen(workId: 'w'),
      ),
    ),
  );
  await t.pumpAndSettle();
  return repo;
}

void main() {
  testWidgets('vacío como la web', (t) async {
    await _mount(t);
    expect(find.text('Sin materiales asignados'), findsOneWidget);
    expect(
      find.text(
        'Agregá productos de Genstock para calcular lo necesario en este proyecto.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('lista con cantidad y "Sin notas"; quitar', (t) async {
    final repo = await _mount(t, items: [_material()]);
    expect(find.text('Vinilo blanco'), findsOneWidget);
    expect(find.text('12,5 m'), findsOneWidget);
    expect(find.text('Sin notas'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('material_remove_m1')));
    await t.pumpAndSettle();
    expect(repo.removed, ['m1']);
  });

  testWidgets('solo lectura: sin búsqueda ni acciones', (t) async {
    await _mount(t, items: [_material()], access: 'read');
    expect(find.byKey(const ValueKey('materials_search')), findsNothing);
    expect(find.byKey(const ValueKey('material_remove_m1')), findsNothing);
  });

  testWidgets('buscar en Genstock y agregar con cantidad', (t) async {
    final repo = await _mount(t);
    expect(find.text('Solo insumos'), findsOneWidget);
    await t.enterText(find.byKey(const ValueKey('materials_search')), 'lona');
    await t.pump(const Duration(milliseconds: 300));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('materials_result_p2')));
    await t.pumpAndSettle();
    await t.enterText(find.byKey(const ValueKey('materials_quantity')), '3,5');
    await t.tap(find.byKey(const ValueKey('materials_add')));
    await t.pumpAndSettle();
    expect(repo.added, ['p2:3.5']);
  });

  testWidgets('P20 totales: vacío, lista por proyecto y filtro', (t) async {
    Future<void> pump(List<MaterialTotal> rows) async {
      await t.pumpWidget(
        ProviderScope(
          // Un contenedor nuevo por caso: cambia lo que devuelve la API.
          key: UniqueKey(),
          retry: (_, _) => null,
          overrides: [materialTotalsProvider.overrideWith((ref) async => rows)],
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('es'),
            supportedLocales: const [Locale('es')],
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            home: const MaterialsScreen(),
          ),
        ),
      );
      await t.pumpAndSettle();
    }

    await pump(const []);
    expect(find.text('No hay materiales cargados'), findsOneWidget);
    await pump([
      MaterialTotal.fromJson({
        'genstockProductId': 'p1',
        'productName': 'Vinilo blanco',
        'productCode': 'VIN-001',
        'humanCode': '',
        'unitAbbreviation': 'm',
        'totalQuantityRequired': '20',
        'projects': [
          {
            'workId': 'w',
            'workName': 'Cartelería',
            'groupName': 'QA produccion',
            'quantityRequired': '20',
          },
        ],
      }),
    ]);
    expect(find.text('Vinilo blanco'), findsOneWidget);
    expect(find.text('20 m'), findsWidgets);
    await t.enterText(find.byKey(const ValueKey('materials_filter')), 'lona');
    await t.pumpAndSettle();
    expect(find.text('Sin materiales que coincidan.'), findsOneWidget);
  });
}
