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
import '../../data/models/reminder.dart';
import 'reminder_scope_color.dart';
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
    // Mes y grilla en una sola card, separados por un divisor (P21-M3).
    final header = Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.sm,
        AppSpacing.xxs,
        AppSpacing.xxs,
        AppSpacing.xxs,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextButton(
                  key: const ValueKey('reminders_choose_month'),
                  // 48 dp de alto: es un control (T4).
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    alignment: Alignment.centerLeft,
                    minimumSize: const Size(0, kMinInteractiveDimension),
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
                    style: AppTextStyles.dialogTitle.copyWith(color: c.text),
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
    );
    void retry() {
      ref.invalidate(reminderTimezoneProvider);
      ref.invalidate(monthRemindersProvider(_month));
    }

    // Mientras carga el mes (o si falla sin datos) la card conserva la
    // cabecera, para no perder la navegación.
    if (!page.hasValue) {
      return WorkspacePanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            Divider(height: 1, thickness: 1, color: c.border),
            AsyncValueView(
              value: page,
              onRetry: retry,
              data: (_) => const SizedBox.shrink(),
            ),
          ],
        ),
      );
    }
    final data = page.requireValue;
    final days = DateTime.utc(_month.year, _month.month + 1, 0).day;
    final offset = _month.weekday - 1;
    final counts = <int, int>{};
    final scopes = <int, Set<ReminderScope>>{};
    for (final o in data.occurrences) {
      counts.update(o.date.day, (n) => n + 1, ifAbsent: () => 1);
      (scopes[o.date.day] ??= {}).add(o.scope);
    }
    final occurrences =
        data.occurrences
            .where(
              (o) =>
                  _selected == null || DateUtils.isSameDay(o.date, _selected),
            )
            .toList()
          ..sort((a, b) => a.date.compareTo(b.date));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        WorkspacePanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Divider(height: 1, thickness: 1, color: c.border),
              if (page.hasError)
                ErrorView(
                  error: page.error!,
                  onRetry: () => ref.invalidate(monthRemindersProvider(_month)),
                ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.xxs),
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
                          // 44 dp de celda; nunca menos que el
                          // área táctil mínima (P21-M1).
                          height: math.max(
                            kMinInteractiveDimension,
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
                                  scopes: scopes[i - offset + 1] ?? const {},
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
                                    () => _selected = selected ? null : date,
                                  ),
                                ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        if (_selected != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: Column(
              children: [
                Text(
                  DateFormat('EEEE d MMMM', 'es').format(_selected!),
                  style: AppTextStyles.dialogTitle.copyWith(color: c.text),
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
                  // Ícono neutro y el alcance como chip (P21-M2).
                  leading: Icon(
                    AppIcons.reminders,
                    size: AppIconSizes.action,
                    color: context.colors.muted,
                  ),
                  trailing: ReminderScopeChip(scope: o.scope),
                  title: Text(o.title),
                  subtitle: Text(DateFormat('d MMM y', 'es').format(o.date)),
                  onTap: () => context.push(Routes.reminder(o.reminderId)),
                ),
            ],
          ),
      ],
    );
  }
}

/// Celda del mes, sin líneas (P21-M1): número 13/500, hoy en un círculo
/// `brand` de 28 dp, el seleccionado en `brandFill` y un punto de marca si hay
/// recordatorios.
class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.date,
    required this.count,
    required this.scopes,
    required this.selected,
    required this.today,
    required this.onSelect,
  });
  final DateTime date;
  final int count;
  final Set<ReminderScope> scopes;
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
      child: InkWell(
        key: ValueKey('reminders_day_$day'),
        customBorder: const CircleBorder(),
        onTap: () => onSelect(date, selected),
        child: ExcludeSemantics(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                key: today ? const ValueKey('reminders_today_mark') : null,
                constraints: const BoxConstraints(
                  minWidth: _todayMark,
                  minHeight: _todayMark,
                ),
                decoration: BoxDecoration(
                  color: today
                      ? c.brand
                      : selected
                      ? c.brandFill
                      : null,
                  shape: BoxShape.circle,
                ),
                // Ajustado al número: el círculo no se estira con la celda.
                child: Center(
                  widthFactor: 1,
                  heightFactor: 1,
                  child: Text(
                    '$day',
                    style: AppTextStyles.body.copyWith(
                      color: today
                          ? c.onBrand
                          : selected
                          ? c.brand
                          : c.text,
                      fontWeight: today || selected
                          ? FontWeight.w700
                          : FontWeight.w500,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ),
              SizedBox(
                height: AppSpacing.xxs + AppSpacing.hairline,
                child: count == 0
                    // Un punto de marca: el alcance se lee en la lista.
                    ? null
                    : Icon(AppIcons.dot, size: 5, color: c.brand),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Lado del círculo de hoy.
const double _todayMark = 28;
