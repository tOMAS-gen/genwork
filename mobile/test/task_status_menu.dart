import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Si el estado [id] se puede elegir en el detalle de tarea: el estado es un
/// desplegable «● Pendiente ⌄» (boceto P09). Sin permiso, el desplegable no
/// abre; con permiso, cada opción dice si está habilitada. Cierra el menú.
Future<bool> statusOptionEnabled(WidgetTester tester, String id) async {
  final menu = find.byKey(const ValueKey('task_status'));
  if (!tester.widget<PopupMenuButton<String>>(menu).enabled) return false;
  await tester.ensureVisible(menu);
  await tester.pumpAndSettle();
  await tester.tap(menu);
  await tester.pumpAndSettle();
  final enabled = tester
      .widget<PopupMenuItem<String>>(find.byKey(ValueKey('task_status_$id')))
      .enabled;
  await tester.tapAt(const Offset(1, 1));
  await tester.pumpAndSettle();
  return enabled;
}
