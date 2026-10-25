import '../../data/models/task.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_button_styles.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/app_work_section.dart';
import '../../core/util/format.dart';
import '../../data/models/reminder.dart';
import '../../data/repositories/reminders_repository.dart';
import '../../shared/widgets/state_views.dart';
import '../works/works_providers.dart';
import '../sectors/sectors_providers.dart';
import 'reminders_providers.dart';

class ReminderFormScreen extends ConsumerStatefulWidget {
  const ReminderFormScreen({
    super.key,
    this.reminderId,
    this.initialDate,
    this.initialTask,
    this.recipientCount,
  });
  final Task? initialTask;
  final int? recipientCount;
  final String? reminderId;
  final DateTime? initialDate;
  @override
  ConsumerState<ReminderFormScreen> createState() => _ReminderFormScreenState();
}

const _recurrences = {
  'ONCE': 'Una vez',
  'DAILY': 'Todos los días',
  'WEEKLY': 'Todas las semanas',
  'MONTHLY': 'Todos los meses',
  'YEARLY': 'Todos los años',
  'EVERY_N': 'Cada N días, semanas o meses',
};

class _LeadDraft {
  _LeadDraft(ReminderLead lead)
    : days = TextEditingController(text: '${lead.daysBefore}'),
      minute = lead.minuteOfDay;
  final TextEditingController days;
  int minute;
  ReminderLead get value => ReminderLead(
    daysBefore: int.tryParse(days.text) ?? -1,
    minuteOfDay: minute,
  );
}

class _ReminderFormScreenState extends ConsumerState<ReminderFormScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _everyN = TextEditingController(text: '1');
  final _count = TextEditingController(text: '1');
  final _leads = <_LeadDraft>[];
  late DateTime _date;
  DateTime? _until;
  String _recurrence = 'ONCE',
      _scope = 'INDIVIDUAL',
      _unit = 'WEEK',
      _end = 'never';
  String? _groupId, _linkType, _linkId, _snapshot;
  Set<int> _weekdays = {};
  bool _canMutate = true, _loading = true, _saving = false, _allowPop = false;
  Object? _loadError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final timezone = await ref.read(reminderTimezoneProvider.future);
      if (!mounted) return;
      _date =
          widget.initialDate ??
          timezone.today(ref.read(reminderClockProvider)());
      _weekdays = {_date.weekday - 1};
      var leads = const [ReminderLead(daysBefore: 0, minuteOfDay: 540)];
      if (widget.reminderId != null) {
        final (r, canMutate) = await ref
            .read(remindersRepositoryProvider)
            .get(widget.reminderId!);
        if (!mounted) return;
        _canMutate = canMutate;
        _title.text = r.title;
        _description.text = r.description ?? '';
        _date = r.date;
        _scope = r.scope.name.toUpperCase();
        _groupId = r.groupId;
        _recurrence = r.recurrence == RecurrenceType.everyN
            ? 'EVERY_N'
            : r.recurrence.name.toUpperCase();
        _weekdays = r.weekdays.toSet();
        _everyN.text = '${r.everyN ?? 1}';
        _unit = r.everyUnit ?? 'WEEK';
        _until = r.untilDate;
        _count.text = '${r.maxOccurrences ?? 1}';
        _end = r.untilDate != null && r.maxOccurrences != null
            ? 'both'
            : r.untilDate != null
            ? 'date'
            : r.maxOccurrences != null
            ? 'count'
            : 'never';
        _linkType = r.linkType;
        _linkId = r.linkId;
        leads = r.leads.isEmpty ? leads : r.leads;
      }
      if (widget.reminderId == null && widget.initialTask != null) {
        _linkType = 'TASK';
        _linkId = widget.initialTask!.id;
        _title.text = widget.initialTask!.displayText;
      }
      for (final lead in _leads) {
        lead.days.dispose();
      }
      _leads
        ..clear()
        ..addAll(leads.map(_LeadDraft.new));
      _snapshot = _fingerprint();
    } catch (e) {
      if (mounted) _loadError = e;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    for (final c in [
      _title,
      _description,
      _everyN,
      _count,
      ..._leads.map((l) => l.days),
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  ReminderInput _input() => ReminderInput(
    title: _title.text.trim(),
    description: _description.text.trim().isEmpty
        ? null
        : _description.text.trim(),
    scope: _scope,
    groupId: _scope == 'GROUP' ? _groupId : null,
    date: _date,
    recurrenceType: _recurrence,
    weekdays: _recurrence == 'WEEKLY' ? (_weekdays.toList()..sort()) : [],
    everyN: _recurrence == 'EVERY_N' ? int.tryParse(_everyN.text) : null,
    everyUnit: _recurrence == 'EVERY_N' ? _unit : null,
    untilDate: _recurrence != 'ONCE' && (_end == 'date' || _end == 'both')
        ? _until
        : null,
    maxOccurrences: _recurrence != 'ONCE' && (_end == 'count' || _end == 'both')
        ? int.tryParse(_count.text)
        : null,
    linkType: _linkType,
    linkId: _linkId,
    leads: _leads.map((l) => l.value).toList(),
  );
  String _fingerprint() => jsonEncode([
    _input().toJson(),
    _everyN.text,
    _count.text,
    _leads.map((l) => l.days.text).toList(),
  ]);

  Future<bool> _confirm(String title, String message, String action) async =>
      await showAppFormDialog<bool>(
        context,
        builder: (context) => AppWorkDialog(
          title: title,
          onClose: () => Navigator.pop(context, false),
          actions: [
            TextButton(
              key: const ValueKey('reminder_confirm_cancel'),
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              key: const ValueKey('reminder_confirm_accept'),
              style: action == 'Borrar'
                  ? AppButtonStyles.destructiveFilled(context)
                  : null,
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
          child: Text(message),
        ),
      ) ??
      false;

  Future<void> _leave() async {
    if (_saving) return;
    if (_snapshot != null &&
        _canMutate &&
        _snapshot != _fingerprint() &&
        !await _confirm(
          '¿Descartar cambios?',
          'Tenés cambios sin guardar en este recordatorio.',
          'Descartar',
        )) {
      return;
    }
    if (!mounted) return;
    setState(() => _allowPop = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  String? _validation() {
    final input = _input();
    if (input.title.isEmpty || input.title.length > 200) {
      return 'Ingresá un título de hasta 200 caracteres.';
    }
    if ((input.description?.length ?? 0) > 2000) {
      return 'La descripción admite hasta 2000 caracteres.';
    }
    if (_scope == 'GROUP' && _groupId == null) return 'Elegí un grupo.';
    if (_recurrence == 'WEEKLY' && _weekdays.isEmpty) {
      return 'Elegí al menos un día de la semana.';
    }
    if (_recurrence == 'EVERY_N' &&
        (input.everyN == null || input.everyN! < 1 || input.everyN! > 365)) {
      return 'El intervalo debe estar entre 1 y 365.';
    }
    if (_recurrence != 'ONCE') {
      if ((_end == 'date' || _end == 'both') &&
          (_until == null ||
              DateUtils.dateOnly(
                _until!,
              ).isBefore(DateUtils.dateOnly(_date)))) {
        return 'Elegí una fecha de fin igual o posterior al inicio.';
      }
      if ((_end == 'count' || _end == 'both') &&
          (input.maxOccurrences == null ||
              input.maxOccurrences! < 1 ||
              input.maxOccurrences! > 10000)) {
        return 'Ingresá entre 1 y 10000 repeticiones.';
      }
    }
    if (_linkType != null && _linkId == null) {
      return 'Elegí el proyecto o sector que querés vincular.';
    }
    if (input.leads.any((l) => l.daysBefore < 0 || l.daysBefore > 3650)) {
      return 'Cada aviso admite entre 0 y 3650 días de anticipación.';
    }
    if (input.leads
            .map((l) => '${l.daysBefore}:${l.minuteOfDay}')
            .toSet()
            .length !=
        input.leads.length) {
      return 'Hay avisos repetidos. Cambiá su anticipación u hora.';
    }
    return null;
  }

  void _invalidate() {
    ref.invalidate(upcomingRemindersProvider);
    ref.invalidate(monthRemindersProvider);
    ref.invalidate(deliveriesProvider);
  }

  Future<void> _save() async {
    if (_saving) return;
    final error = _validation();
    if (error != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    setState(() => _saving = true);
    try {
      final repo = ref.read(remindersRepositoryProvider);
      if (widget.reminderId == null) {
        await repo.create(_input());
      } else {
        await repo.update(widget.reminderId!, _input());
      }
      _invalidate();
      if (mounted) {
        _snapshot = _fingerprint();
        _saving = false;
        await _leave();
      }
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    if (_saving ||
        !await _confirm(
          '¿Borrar recordatorio?',
          'Se eliminará el recordatorio y sus próximos avisos.',
          'Borrar',
        ) ||
        !mounted) {
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(remindersRepositoryProvider).delete(widget.reminderId!);
      _invalidate();
      if (mounted) {
        _snapshot = _fingerprint();
        _saving = false;
        await _leave();
      }
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _select(
    String key,
    String label,
    String? value,
    Map<String, String> items,
    bool enabled,
    void Function(String) change,
  ) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
    child: DropdownButtonFormField<String>(
      key: ValueKey(key),
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      items: items.entries
          .map(
            (e) => DropdownMenuItem(
              value: e.key,
              child: Text(
                e.value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          )
          .toList(),
      onChanged: enabled
          ? (v) {
              if (v != null) setState(() => change(v));
            }
          : null,
    ),
  );
  Widget _number(
    String key,
    String label,
    TextEditingController c,
    bool editable,
  ) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
    child: TextField(
      key: ValueKey(key),
      controller: c,
      enabled: editable,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(labelText: label),
    ),
  );
  Future<DateTime?> _pickDate(DateTime initial, DateTime? today) =>
      showDatePicker(
        context: context,
        initialDate: initial,
        currentDate: today,
        firstDate: DateTime(initial.year < 2020 ? initial.year : 2020),
        lastDate: DateTime(initial.year > 2100 ? initial.year : 2100, 12, 31),
      );

  Widget _catalog(
    AsyncValue<Map<String, String>> catalog,
    String key,
    String label,
    String? id,
    bool editable,
    void Function(String) change,
    VoidCallback retry,
  ) {
    if (catalog.isLoading) return const LinearProgressIndicator();
    if (catalog.hasError) {
      return ErrorView(error: catalog.error!, onRetry: retry);
    }
    final items = {...?catalog.value};
    if (id != null && !items.containsKey(id)) {
      items[id] = 'Vínculo existente (no disponible)';
    }
    if (items.isEmpty) {
      return Text('No hay ${label.toLowerCase()} disponibles.');
    }
    return _select(key, label, id, items, editable, change);
  }

  @override
  Widget build(BuildContext context) {
    final timezone = ref.watch(reminderTimezoneProvider);
    final today = timezone.value?.today(ref.watch(reminderClockProvider)());
    final editable =
        _canMutate &&
        !_saving &&
        !_loading &&
        _loadError == null &&
        timezone.hasValue &&
        !timezone.hasError;
    final user = ref.watch(currentUserProvider);
    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.reminderId == null ? 'Nuevo recordatorio' : 'Recordatorio',
          ),
          actions: [
            if (widget.reminderId != null &&
                _canMutate &&
                !_loading &&
                _loadError == null)
              IconButton(
                key: const ValueKey('reminder_delete'),
                tooltip: 'Borrar recordatorio',
                onPressed: editable ? _delete : null,
                icon: const Icon(AppIcons.delete),
              ),
          ],
        ),
        bottomNavigationBar: _loading || _loadError != null || !_canMutate
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.lg),
                  child: FilledButton(
                    key: const ValueKey('reminder_save'),
                    onPressed: editable ? _save : null,
                    child: Text(
                      _saving ? 'Guardando…' : 'Guardar recordatorio',
                    ),
                  ),
                ),
              ),
        body: _loading
            ? const LoadingView()
            : _loadError != null
            ? ErrorView(
                error: _loadError!,
                onRetry: () {
                  ref.invalidate(reminderTimezoneProvider);
                  _load();
                },
              )
            : ListView(
                key: const ValueKey('reminder_form'),
                padding: const EdgeInsets.all(AppSpace.lg),
                children: [
                  if (!_canMutate)
                    const Text(
                      'Solo lectura: no tenés permiso para modificar este recordatorio.',
                    ),
                  if (timezone.hasError)
                    ErrorView(
                      error: timezone.error!,
                      onRetry: () => ref.invalidate(reminderTimezoneProvider),
                    ),
                  if (timezone.hasValue)
                    Text(
                      'Zona horaria del sistema: ${timezone.requireValue.name}',
                      key: const ValueKey('reminder_timezone'),
                    ),
                  const SizedBox(height: AppSpacing.md),
                  AppWorkSection(
                    title: 'Datos',
                    icon: AppIcons.edit,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          key: const ValueKey('reminder_title'),
                          controller: _title,
                          enabled: editable,
                          decoration: const InputDecoration(
                            labelText: 'Título',
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        TextField(
                          key: const ValueKey('reminder_description'),
                          controller: _description,
                          enabled: editable,
                          minLines: 1,
                          maxLines: 5,
                          decoration: const InputDecoration(
                            labelText: 'Descripción (opcional)',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppWorkSection(
                    title: 'Cuándo',
                    icon: AppIcons.calendarToday,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ListTile(
                          key: const ValueKey('reminder_date'),
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(AppIcons.date),
                          title: Text(formatDay(_date, now: today)),
                          subtitle: const Text('Fecha de inicio'),
                          enabled: editable,
                          onTap: () async {
                            final d = await _pickDate(_date, today);
                            if (d != null && mounted) setState(() => _date = d);
                          },
                        ),
                        for (var i = 0; i < _leads.length; i++) ...[
                          ListTile(
                            key: ValueKey(
                              i == 0 ? 'reminder_time' : 'reminder_time_$i',
                            ),
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(AppIcons.schedule),
                            title: Text(formatMinuteOfDay(_leads[i].minute)),
                            subtitle: Text('Hora del aviso ${i + 1}'),
                            enabled: editable,
                            trailing: _leads.length > 1
                                ? IconButton(
                                    key: ValueKey('reminder_remove_lead_$i'),
                                    tooltip: 'Quitar aviso ${i + 1}',
                                    onPressed: editable
                                        ? () {
                                            final l = _leads[i];
                                            setState(() => _leads.removeAt(i));
                                            l.days.dispose();
                                          }
                                        : null,
                                    icon: const Icon(AppIcons.close),
                                  )
                                : null,
                            onTap: () async {
                              final l = _leads[i];
                              final t = await showTimePicker(
                                context: context,
                                initialTime: TimeOfDay(
                                  hour: l.minute ~/ 60,
                                  minute: l.minute % 60,
                                ),
                              );
                              if (t != null && mounted) {
                                setState(
                                  () => l.minute = t.hour * 60 + t.minute,
                                );
                              }
                            },
                          ),
                          _number(
                            'reminder_lead_days_$i',
                            'Días antes (0 = ese día)',
                            _leads[i].days,
                            editable,
                          ),
                        ],
                        TextButton.icon(
                          key: const ValueKey('reminder_add_lead'),
                          onPressed: editable && _leads.length < 20
                              ? () => setState(() {
                                  var days = 0;
                                  while (_leads.any(
                                    (l) =>
                                        l.value.daysBefore == days &&
                                        l.minute == 540,
                                  )) {
                                    days++;
                                  }
                                  _leads.add(
                                    _LeadDraft(
                                      ReminderLead(
                                        daysBefore: days,
                                        minuteOfDay: 540,
                                      ),
                                    ),
                                  );
                                })
                              : null,
                          icon: const Icon(AppIcons.reminderAdd),
                          label: Text('Agregar aviso (${_leads.length}/20)'),
                        ),
                        _select(
                          'reminder_recurrence',
                          'Repetición',
                          _recurrence,
                          _recurrences,
                          editable,
                          (v) {
                            _recurrence = v;
                            if (v == 'WEEKLY' && _weekdays.isEmpty) {
                              _weekdays = {_date.weekday - 1};
                            }
                          },
                        ),
                        if (_recurrence == 'WEEKLY')
                          Wrap(
                            spacing: AppSpacing.xs,
                            children: [
                              for (var i = 0; i < 7; i++)
                                FilterChip(
                                  key: ValueKey('reminder_weekday_$i'),
                                  label: Text(
                                    const [
                                      'Lun',
                                      'Mar',
                                      'Mié',
                                      'Jue',
                                      'Vie',
                                      'Sáb',
                                      'Dom',
                                    ][i],
                                  ),
                                  selected: _weekdays.contains(i),
                                  onSelected: editable
                                      ? (v) => setState(() {
                                          v
                                              ? _weekdays.add(i)
                                              : _weekdays.remove(i);
                                        })
                                      : null,
                                ),
                            ],
                          ),
                        if (_recurrence == 'EVERY_N') ...[
                          _number(
                            'reminder_every_n',
                            'Repetir cada',
                            _everyN,
                            editable,
                          ),
                          _select(
                            'reminder_every_unit',
                            'Unidad',
                            _unit,
                            const {
                              'DAY': 'Días',
                              'WEEK': 'Semanas',
                              'MONTH': 'Meses',
                            },
                            editable,
                            (v) => _unit = v,
                          ),
                        ],
                        if (_recurrence != 'ONCE') ...[
                          _select(
                            'reminder_end',
                            'Finaliza',
                            _end,
                            {
                              'never': 'Sin fecha de fin',
                              'date': 'En una fecha',
                              'count': 'Después de N repeticiones',
                              if (_end == 'both')
                                'both': 'Por fecha o cantidad (existente)',
                            },
                            editable,
                            (v) => _end = v,
                          ),
                          if (_end == 'date' || _end == 'both')
                            ListTile(
                              key: const ValueKey('reminder_until'),
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                _until == null
                                    ? 'Elegí la fecha de fin'
                                    : formatDay(_until!, now: today),
                              ),
                              leading: const Icon(AppIcons.date),
                              enabled: editable,
                              onTap: () async {
                                final d = await _pickDate(
                                  _until ?? _date,
                                  today,
                                );
                                if (d != null && mounted) {
                                  setState(() => _until = d);
                                }
                              },
                            ),
                          if (_end == 'count' || _end == 'both')
                            _number(
                              'reminder_count',
                              'Cantidad de repeticiones',
                              _count,
                              editable,
                            ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppWorkSection(
                    title: _linkType == 'TASK'
                        ? 'Destinatarios de la tarea'
                        : 'Alcance y vínculo',
                    icon: AppIcons.link,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _select(
                          'reminder_scope',
                          'Alcance',
                          _scope,
                          {
                            'INDIVIDUAL': 'Individual',
                            'GROUP': 'Grupo',
                            if (user?.isSuperAdmin == true ||
                                _scope == 'GLOBAL')
                              'GLOBAL': 'Global',
                          },
                          editable && widget.reminderId == null,
                          (v) {
                            _scope = v;
                            _groupId = null;
                          },
                        ),
                        if (widget.reminderId != null)
                          const Text(
                            'El alcance y el grupo se conservan al editar.',
                          ),
                        if (_scope == 'GROUP')
                          _catalog(
                            ref
                                .watch(groupsProvider)
                                .whenData(
                                  (groups) => {
                                    for (final g in groups.where(
                                      (g) =>
                                          widget.reminderId != null ||
                                          g.canOperate(user),
                                    ))
                                      g.id: g.name,
                                  },
                                ),
                            'reminder_group',
                            'Grupos',
                            _groupId,
                            editable && widget.reminderId == null,
                            (v) => _groupId = v,
                            () => ref.invalidate(groupsProvider),
                          ),
                        _select(
                          'reminder_link_type',
                          'Vincular con',
                          _linkType ?? 'NONE',
                          {
                            'NONE': 'Sin vínculo',
                            'WORK': 'Proyecto',
                            'SECTOR': 'Sector',
                            if (_linkType == 'TASK')
                              'TASK': 'Tarea (vínculo existente)',
                          },
                          editable,
                          (v) {
                            if (v == (_linkType ?? 'NONE')) return;
                            _linkType = v == 'NONE' ? null : v;
                            _linkId = null;
                          },
                        ),
                        if (_linkType == 'TASK')
                          Text(
                            widget.recipientCount == 0
                                ? 'Esta tarea todavía no tiene destinatarios. Agregá una mención o un sector ejecutor.'
                                : 'Se avisará a las personas mencionadas y a quienes operan los sectores mencionados o ejecutores de la tarea. El alcance no amplía esos destinatarios.',
                          ),
                        if (_linkType == 'WORK')
                          _catalog(
                            ref
                                .watch(worksListProvider(false))
                                .whenData(
                                  (works) => {
                                    for (final w in works) w.id: w.name,
                                  },
                                ),
                            'reminder_link_work',
                            'Proyectos',
                            _linkId,
                            editable,
                            (v) => _linkId = v,
                            () => ref.invalidate(worksListProvider(false)),
                          ),
                        if (_linkType == 'SECTOR')
                          _catalog(
                            ref
                                .watch(sectorsProvider)
                                .whenData(
                                  (sectors) => {
                                    for (final s in sectors) s.id: s.name,
                                  },
                                ),
                            'reminder_link_sector',
                            'Sectores',
                            _linkId,
                            editable,
                            (v) => _linkId = v,
                            () => ref.invalidate(sectorsProvider),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],
              ),
      ),
    );
  }
}
