import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import 'reminders_providers.dart';

class ReminderCalendar extends ConsumerStatefulWidget {
  const ReminderCalendar({super.key, required this.today});
  final DateTime today;
  @override
  ConsumerState<ReminderCalendar> createState() => _ReminderCalendarState();
}

class _ReminderCalendarState extends ConsumerState<ReminderCalendar> {
  late DateTime _month = DateTime.utc(widget.today.year, widget.today.month);
  DateTime? _selected;
  void _move(int delta) => setState(() {
    _month = DateTime.utc(_month.year, _month.month + delta);
    _selected = null;
  });
  @override
  Widget build(BuildContext context) {
    final page = ref.watch(monthRemindersProvider(_month));
    final c = context.colors;
    final count0 = page.value?.occurrences.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        WorkspacePanel(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextButton(
                      key: const ValueKey('reminders_choose_month'),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        alignment: Alignment.centerLeft,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: () async {
                        final d = await showDatePicker(
                          context: context,
                          initialDate: _month,
                          currentDate: widget.today,
                          firstDate: DateTime(
                            _month.year < 1900 ? _month.year : 1900,
                          ),
                          lastDate: DateTime(
                            _month.year > 2200 ? _month.year : 2200,
                            12,
                            31,
                          ),
                        );
                        if (d != null && mounted) {
                          setState(() {
                            _month = DateTime.utc(d.year, d.month);
                            _selected = DateTime.utc(d.year, d.month, d.day);
                          });
                        }
                      },
                      child: Text(
                        toBeginningOfSentenceCase(
                          DateFormat('MMMM y', 'es').format(_month),
                        )!,
                        style: AppTextStyles.dialogTitle.copyWith(
                          color: c.text,
                        ),
                      ),
                    ),
                    if (count0 != null)
                      Text(
                        countLabel(count0, 'recordatorio', 'recordatorios'),
                        style: AppTextStyles.body.copyWith(color: c.muted),
                      ),
                  ],
                ),
              ),
              IconButton(
                key: const ValueKey('reminders_previous_month'),
                tooltip: 'Mes anterior',
                onPressed: () => _move(-1),
                icon: const Icon(AppIcons.chevronLeft),
              ),
              TextButton(
                key: const ValueKey('reminders_today'),
                onPressed: () => setState(() {
                  _month = DateTime.utc(widget.today.year, widget.today.month);
                  _selected = widget.today;
                }),
                child: const Text('Ir a hoy'),
              ),
              IconButton(
                key: const ValueKey('reminders_next_month'),
                tooltip: 'Mes siguiente',
                onPressed: () => _move(1),
                icon: const Icon(AppIcons.chevronRight),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        if (page.hasError && page.hasValue)
          ErrorView(
            error: page.error!,
            onRetry: () => ref.invalidate(monthRemindersProvider(_month)),
          ),
        AsyncValueView(
          value: page,
          onRetry: () {
            ref.invalidate(reminderTimezoneProvider);
            ref.invalidate(monthRemindersProvider(_month));
          },
          data: (data) {
            final days = DateTime.utc(_month.year, _month.month + 1, 0).day;
            final offset = _month.weekday - 1;
            final counts = <int, int>{};
            for (final o in data.occurrences) {
              counts.update(o.date.day, (n) => n + 1, ifAbsent: () => 1);
            }
            final occurrences =
                data.occurrences
                    .where(
                      (o) =>
                          _selected == null ||
                          DateUtils.isSameDay(o.date, _selected),
                    )
                    .toList()
                  ..sort((a, b) => a.date.compareTo(b.date));
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                WorkspacePanel(
                  child: ClipRRect(
                    borderRadius: AppGeometry.card,
                    child: LayoutBuilder(
                      builder: (context, constraints) => Wrap(
                        children: [
                          for (final name in const [
                            'L',
                            'M',
                            'X',
                            'J',
                            'V',
                            'S',
                            'D',
                          ])
                            SizedBox(
                              width: constraints.maxWidth / 7,
                              height: 32,
                              // Cada día ya dice su día de semana; las iniciales
                              // sueltas solo agregaban "L, M, X…" a TalkBack.
                              child: ExcludeSemantics(
                                child: Center(
                                  child: Text(
                                    name,
                                    style: AppTextStyles.sectionLabel.copyWith(
                                      color: c.muted,
                                      letterSpacing: 0,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          for (var i = 0; i < offset + days; i++)
                            SizedBox(
                              width: constraints.maxWidth / 7,
                              height: math.max(
                                64,
                                44 * MediaQuery.textScalerOf(context).scale(1),
                              ),
                              child: i < offset
                                  ? null
                                  : _DayCell(
                                      date: DateTime.utc(
                                        _month.year,
                                        _month.month,
                                        i - offset + 1,
                                      ),
                                      count: counts[i - offset + 1] ?? 0,
                                      selected: DateUtils.isSameDay(
                                        DateTime.utc(
                                          _month.year,
                                          _month.month,
                                          i - offset + 1,
                                        ),
                                        _selected,
                                      ),
                                      today: DateUtils.isSameDay(
                                        DateTime.utc(
                                          _month.year,
                                          _month.month,
                                          i - offset + 1,
                                        ),
                                        widget.today,
                                      ),
                                      onSelect: (date, selected) => setState(
                                        () =>
                                            _selected = selected ? null : date,
                                      ),
                                    ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_selected != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: AppSpacing.md,
                    ),
                    child: Column(
                      children: [
                        Text(
                          DateFormat('EEEE d MMMM', 'es').format(_selected!),
                          style: AppTextStyles.dialogTitle.copyWith(
                            color: c.text,
                          ),
                        ),
                        TextButton.icon(
                          key: const ValueKey('reminders_create_on_day'),
                          onPressed: () => context.push(
                            '${Routes.newReminder}?date=${DateFormat('yyyy-MM-dd').format(_selected!)}',
                          ),
                          icon: const Icon(AppIcons.reminderAdd),
                          label: const Text('Crear en este día'),
                        ),
                        TextButton(
                          key: const ValueKey('reminders_show_month'),
                          onPressed: () => setState(() => _selected = null),
                          child: const Text('Ver todo el mes'),
                        ),
                      ],
                    ),
                  ),
                if (occurrences.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Center(
                      child: Text(
                        _selected == null
                            ? 'Sin recordatorios este mes'
                            : 'Sin recordatorios este día',
                        style: AppTextStyles.body.copyWith(color: c.muted),
                      ),
                    ),
                  ),
                if (occurrences.isNotEmpty)
                  WorkspaceListPanel(
                    children: [
                      for (final o in occurrences)
                        ListTile(
                          key: ValueKey(
                            'calendar_occurrence_${o.reminderId}_${o.date.toIso8601String()}',
                          ),
                          leading: const Icon(AppIcons.reminders),
                          title: Text(o.title),
                          subtitle: Text(
                            DateFormat('d MMM y', 'es').format(o.date),
                          ),
                          onTap: () =>
                              context.push(Routes.reminder(o.reminderId)),
                        ),
                    ],
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

/// Celda del mes: borde `border`, hoy con el número en píldora `brand`,
/// seleccionado con fondo `brand` suave y punto si hay recordatorios.
class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.date,
    required this.count,
    required this.selected,
    required this.today,
    required this.onSelect,
  });
  final DateTime date;
  final int count;
  final bool selected, today;
  final void Function(DateTime date, bool selected) onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final day = date.day;
    return Semantics(
      button: true,
      excludeSemantics: true,
      onTap: () => onSelect(date, selected),
      label:
          '${DateFormat('EEEE d MMMM y', 'es').format(date)}, ${countLabel(count, 'recordatorio', 'recordatorios')}${today ? ', hoy' : ''}',
      selected: selected,
      child: Material(
        color: selected ? c.brandFill : Colors.transparent,
        shape: Border.all(color: c.border, width: 0.5),
        child: InkWell(
          key: ValueKey('reminders_day_$day'),
          onTap: () => onSelect(date, selected),
          child: ExcludeSemantics(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xxs,
                    vertical: AppSpacing.xxs,
                  ),
                  decoration: BoxDecoration(
                    color: today ? c.brand : null,
                    borderRadius: AppGeometry.chip,
                  ),
                  child: Text(
                    '$day',
                    style: AppTextStyles.body.copyWith(
                      color: today ? c.onBrand : c.text,
                      fontWeight: today ? FontWeight.w700 : null,
                    ),
                  ),
                ),
                SizedBox(
                  height: AppSpacing.xs,
                  child: count == 0
                      ? null
                      : Icon(AppIcons.dot, size: 5, color: c.brand),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
