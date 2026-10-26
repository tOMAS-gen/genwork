// Resumen del sector como el de la web (P12).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/data/models/sector.dart';
import 'package:genwork_mobile/features/sectors/sector_summary.dart';

Map<String, Object?> _task(String id, {String type = 'IN_PROGRESS'}) => {
  'id': id,
  'displayText': id,
  'status': {'id': type, 'type': type},
};

void main() {
  testWidgets('ámbito "Grupo X" y avance contando subtareas', (t) async {
    final board = SectorBoard.fromJson({
      'sector': {
        'id': 's',
        'name': 'Impresión',
        'scope': {'type': 'GROUP', 'groupName': 'QA produccion'},
      },
      'level': 'operate',
      // La API cuenta tareas de primer nivel (0 de 2); la web cuenta hojas.
      'metrics': {'total': 2, 'done': 0},
      'loose': [],
      'byWork': [
        {
          'work': {'id': 'w', 'name': 'Cartelería del local'},
          'tasks': [
            {
              ..._task('preparar'),
              'subtaskCount': 2,
              'subtaskDone': 1,
            },
            _task('imprimir'),
          ],
        },
      ],
      'refs': [],
    });
    await t.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(body: SectorSummaryPanel(board: board)),
      ),
    );
    expect(find.text('Grupo QA produccion'), findsOneWidget);
    expect(find.text('33%'), findsOneWidget);
    expect(find.text('1 de 3 completadas'), findsOneWidget);
  });
}
