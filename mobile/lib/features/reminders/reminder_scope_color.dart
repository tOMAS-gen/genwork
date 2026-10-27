import 'package:flutter/material.dart';

import '../../core/theme/gen_colors.dart';
import '../../data/models/reminder.dart';
import '../../shared/widgets/status_chip.dart';

/// Color del chip de alcance de un recordatorio: individual neutro, grupo
/// `info` y global `danger`. El verde queda para "completado" (P21-M2).
Color reminderScopeColor(BuildContext context, ReminderScope scope) {
  final c = context.colors;
  return switch (scope) {
    ReminderScope.individual => c.muted,
    ReminderScope.group => c.info,
    ReminderScope.global => c.danger,
  };
}

String reminderScopeLabel(ReminderScope scope) => switch (scope) {
  ReminderScope.individual => 'Individual',
  ReminderScope.group => 'Grupo',
  ReminderScope.global => 'Global',
};

/// Alcance de un recordatorio como chip de texto, con su color (P21-M2).
class ReminderScopeChip extends StatelessWidget {
  const ReminderScopeChip({super.key, required this.scope});

  final ReminderScope scope;

  @override
  Widget build(BuildContext context) {
    final color = reminderScopeColor(context, scope);
    return StatusChip(
      label: reminderScopeLabel(scope),
      color: color,
      fill: context.colors.statusFill(color),
    );
  }
}
