import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/router/routes.dart';
import '../../core/util/format.dart';
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
    return Column(
      children: [
        Row(
          children: [
            IconButton(
              key: const ValueKey('reminders_previous_month'),
              tooltip: 'Mes anterior',
              onPressed: () => _move(-1),
              icon: const Icon(Icons.chevron_left),
            ),
            Expanded(
              child: TextButton(
                key: const ValueKey('reminders_choose_month'),
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
                  DateFormat('MMMM y', 'es').format(_month),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            IconButton(
              key: const ValueKey('reminders_next_month'),
              tooltip: 'Mes siguiente',
              onPressed: () => _move(1),
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
        TextButton(
          key: const ValueKey('reminders_today'),
          onPressed: () => setState(() {
            _month = DateTime.utc(widget.today.year, widget.today.month);
            _selected = widget.today;
          }),
          child: const Text('Ir a hoy'),
        ),
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
              children: [
                LayoutBuilder(
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
                                style: Theme.of(context).textTheme.labelLarge,
                              ),
                            ),
                          ),
                        ),
                      for (var i = 0; i < offset + days; i++)
                        SizedBox(
                          width: constraints.maxWidth / 7,
                          height: 64,
                          child: i < offset
                              ? null
                              : Builder(
                                  builder: (context) {
                                    final day = i - offset + 1;
                                    final date = DateTime.utc(
                                      _month.year,
                                      _month.month,
                                      day,
                                    );
                                    final selected = DateUtils.isSameDay(
                                      date,
                                      _selected,
                                    );
                                    final today = DateUtils.isSameDay(
                                      date,
                                      widget.today,
                                    );
                                    final count = counts[day] ?? 0;
                                    void selectDay() => setState(
                                      () => _selected = selected ? null : date,
                                    );
                                    return Semantics(
                                      button: true,
                                      excludeSemantics: true,
                                      onTap: selectDay,
                                      label:
                                          '${DateFormat('EEEE d MMMM y', 'es').format(date)}, ${countLabel(count, 'recordatorio', 'recordatorios')}${today ? ', hoy' : ''}',
                                      selected: selected,
                                      child: TextButton(
                                        key: ValueKey('reminders_day_$day'),
                                        style: TextButton.styleFrom(
                                          padding: EdgeInsets.zero,
                                          backgroundColor: selected
                                              ? Theme.of(
                                                  context,
                                                ).colorScheme.primaryContainer
                                              : null,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            side: today
                                                ? BorderSide(
                                                    color: Theme.of(
                                                      context,
                                                    ).colorScheme.primary,
                                                  )
                                                : BorderSide.none,
                                          ),
                                        ),
                                        onPressed: selectDay,
                                        child: ExcludeSemantics(
                                          child: Column(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text('$day'),
                                              SizedBox(
                                                height: 8,
                                                child: count == 0
                                                    ? null
                                                    : Icon(
                                                        Icons.circle,
                                                        size: 5,
                                                        color: Theme.of(
                                                          context,
                                                        ).colorScheme.primary,
                                                      ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ),
                    ],
                  ),
                ),
                if (_selected != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Text(
                          DateFormat('EEEE d MMMM', 'es').format(_selected!),
                        ),
                        TextButton.icon(
                          key: const ValueKey('reminders_create_on_day'),
                          onPressed: () => context.push(
                            '${Routes.newReminder}?date=${DateFormat('yyyy-MM-dd').format(_selected!)}',
                          ),
                          icon: const Icon(Icons.add_alarm),
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
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _selected == null
                          ? 'Sin recordatorios este mes'
                          : 'Sin recordatorios este día',
                    ),
                  ),
                for (final o in occurrences)
                  ListTile(
                    key: ValueKey(
                      'calendar_occurrence_${o.reminderId}_${o.date.toIso8601String()}',
                    ),
                    leading: const Icon(Icons.event_outlined),
                    title: Text(o.title),
                    subtitle: Text(DateFormat('d MMM y', 'es').format(o.date)),
                    onTap: () => context.push(Routes.reminder(o.reminderId)),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
