import 'package:flutter/material.dart';

import '../../core/theme/gen_colors.dart';
import '../../data/models/reminder.dart';

/// Color de un recordatorio según su alcance: individual `success`, grupo
/// `info` y global `danger`, como en el calendario de la web.
Color reminderScopeColor(BuildContext context, ReminderScope scope) {
  final c = context.colors;
  return switch (scope) {
    ReminderScope.individual => c.success,
    ReminderScope.group => c.info,
    ReminderScope.global => c.danger,
  };
}

String reminderScopeLabel(ReminderScope scope) => switch (scope) {
  ReminderScope.individual => 'Individual',
  ReminderScope.group => 'Grupo',
  ReminderScope.global => 'Global',
};
