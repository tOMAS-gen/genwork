import '../notifications/notifications_providers.dart';
import '../notifications/task_notification_controls.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/task_text_field.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../works/works_providers.dart';
import 'task_move_dialog.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/util/format.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/app_button_styles.dart';
import '../../shared/widgets/app_work_box.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/dashed_border.dart';
import '../../core/theme/app_geometry.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/status_chip.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_composer.dart';
import 'task_actions.dart';
import 'task_assign_dialog.dart';
import 'task_detail_provider.dart';

/// Abre el detalle de una tarea en pantalla completa.
///
/// [canEdit]: permiso de modificar (si el endpoint no trae `canToggle`, lo decide
/// el contenedor: acceso `operate` al proyecto/sector). [fromSector]: la edición de
/// texto se hace en contexto sector (reglas distintas en el servidor).
Future<void> showTaskDetail(
  BuildContext context,
  Task task, {
  required bool canEdit,
  bool canManageMyDay = false,
  bool fromSector = false,
  bool readOnly = false,
  bool notificationContext = false,
  String? workId,
  String? sectorId,
}) {
  return Navigator.of(context, rootNavigator: true).push<void>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => TaskDetailSheet(
        task: task,
        notificationContext: notificationContext,
        canEdit: !readOnly && canEdit && task.canToggle != false,
        canManageMyDay: !readOnly && (task.canManageMyDay ?? canManageMyDay),
        fromSector: fromSector,
        workId: workId,
        sectorId: sectorId,
      ),
    ),
  );
}

class TaskDetailSheet extends ConsumerStatefulWidget {
  const TaskDetailSheet({
    super.key,
    required this.task,
    required this.canEdit,
    required this.canManageMyDay,
    required this.fromSector,
    this.notificationContext = false,
    this.workId,
    this.sectorId,
  });

  final Task task;
  final bool notificationContext;
  final bool canEdit;
  final bool canManageMyDay;
  final bool fromSector;
  final String? workId;
  final String? sectorId;

  @override
  ConsumerState<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends ConsumerState<TaskDetailSheet> {
  late Task _task = widget.task;
  late final _textController = TaskTextController(text: widget.task.rawText);
  late final _descriptionController = TextEditingController(
    text: widget.task.description ?? '',
  );
  bool _busy = false;
  Task? _receivedTask;

  /// Orden de las subtareas mientras se guarda el que se arrastró.
  List<Task>? _subtaskOrder;

  List<Task> get _subtasks => _subtaskOrder ?? _task.subtasks;

  TaskDetailQuery get _query =>
      (id: widget.task.id, workId: widget.workId, sectorId: widget.sectorId);

  void _acceptTask(Task task) {
    if (identical(task, _receivedTask)) return;
    _receivedTask = task;
    // Una recarga nunca pisa un borrador escrito en esta hoja.
    if (_textController.text == _task.rawText) {
      _textController.text = task.rawText;
    }
    if (_descriptionController.text == (_task.description ?? '')) {
      _descriptionController.text = task.description ?? '';
    }
    _task = task;
    _subtaskOrder = null;
  }

  /// Soltar una subtarea en otro lugar guarda el orden nuevo (manijas del
  /// boceto P09); si falla, vuelve el anterior.
  Future<void> _reorderSubtasks(int from, int to) async {
    final list = [..._subtasks];
    final moved = list.removeAt(from);
    list.insert(to, moved);
    setState(() => _subtaskOrder = list);
    try {
      await ref.read(taskActionsProvider).reorderSubtasks(_task, [
        for (final t in list) t.id,
      ]);
    } catch (e) {
      if (!mounted) return;
      setState(() => _subtaskOrder = null);
      showErrorSnack(context, e);
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _run(
    Future<void> Function(TaskActions actions) action, {
    bool close = false,
  }) async {
    setState(() => _busy = true);
    try {
      await action(ref.read(taskActionsProvider));
      if (close && mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Contexto de la tarea para la barra: `proyecto › objetivo`, o `#sector`
  /// si la tarea no es de un proyecto.
  String? get _contextLabel {
    final work = _task.work?.name;
    if (work != null) return [work, ?_task.objectiveTitle].join(' › ');
    if (_task.homeSector case final sector?) return '#${sector.name}';
    return null;
  }

  Future<void> _onMore(_MoreAction action) async {
    switch (action) {
      case _MoreAction.moveToObjective || _MoreAction.moveUnder:
        final moved = await showTaskMove(
          context,
          _task,
          objective: action == _MoreAction.moveToObjective,
        );
        if (moved && mounted) Navigator.pop(context);
      case _MoreAction.promote:
        await _run((a) => a.setParent(_task, null), close: true);
      case _MoreAction.history:
        await showAppFormDialog<void>(
          context,
          builder: (context) => AppWorkDialog(
            title: 'Historial de estados',
            onClose: () => Navigator.pop(context),
            actions: const [],
            child: _StatusHistory(taskId: _task.id),
          ),
        );
      case _MoreAction.delete:
        await _confirmDelete();
    }
  }

  bool _descriptionDirty(String text) =>
      text.trim() != (_task.description ?? '').trim();

  /// "+ Asignar": agrega `#sector` o `@persona` al texto y lo guarda.
  Future<void> _assign() async {
    final inSector = widget.fromSector && widget.sectorId != null;
    final tag = await showTaskAssignDialog(
      context,
      workId: _task.workId ?? widget.workId,
      sectorId: inSector ? widget.sectorId : null,
      allowSectors: !inSector,
    );
    if (tag == null || !mounted) return;
    final text = '${_textController.text.trim()} $tag';
    _textController.text = text;
    await _run((a) => a.updateText(_task, text, fromSector: widget.fromSector));
  }

  Future<void> _confirmDelete() async {
    final ok = await showAppFormDialog<bool>(
      context,
      builder: (context) => AppWorkDialog(
        title: 'Borrar tarea',
        onClose: () => Navigator.pop(context, false),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('task_delete_confirm'),
            style: AppButtonStyles.destructiveFilled(context),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Borrar'),
          ),
        ],
        child: Text(
          _task.subtaskCount > 0
              ? 'Se borrará la tarea y sus ${_task.subtaskCount} subtareas.'
              : '¿Borrar esta tarea?',
        ),
      ),
    );
    if (ok == true) await _run((a) => a.delete(_task), close: true);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final detail = widget.notificationContext
        ? ref.watch(notificationTaskDetailProvider(widget.task.id))
        : ref.watch(taskDetailProvider(_query));
    final latest = detail.value;
    if (latest?.task case final Task task) _acceptTask(task);
    final unavailable =
        detail.hasError || (detail.hasValue && latest?.task == null);
    final canEdit =
        widget.canEdit &&
        !_busy &&
        !unavailable &&
        (latest?.canOperate ?? true) &&
        _task.canToggle != false;
    final workContext = widget.workId == null
        ? null
        : ref.watch(workDetailProvider(widget.workId!)).value;
    final canEditText =
        canEdit && _task.canEditText(fromSector: widget.fromSector);
    final canManageMyDay =
        widget.canManageMyDay &&
        !unavailable &&
        (latest?.canManageMyDay ?? true);

    final contextLabel = _contextLabel;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const ValueKey('task_close'),
          tooltip: 'Cerrar detalle',
          onPressed: () => Navigator.pop(context),
          icon: const Icon(AppIcons.close),
        ),
        // La marca y, debajo, de dónde es la tarea; el título va en el
        // cuerpo (D1, boceto P09).
        centerTitle: true,
        // Más alta que la de las listas: la marca y la miga respiran.
        toolbarHeight: AppSpace.hero,
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandName(size: BrandName.headerSize),
            const SizedBox(height: AppSpace.xxs),
            if (contextLabel != null)
              Text(
                contextLabel,
                key: const ValueKey('task_context'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.supporting.copyWith(color: c.muted),
              ),
          ],
        ),
        actions: [
          _MoreMenu(
            canMoveToObjective:
                canEdit &&
                _task.parentId == null &&
                workContext?.canManageObjectives == true,
            canMoveUnder: canEdit && !_task.isContainer,
            canPromote: canEdit && _task.parentId != null,
            showDelete: widget.canEdit,
            canDelete: canEdit,
            onSelected: (action) => _onMore(action),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          key: const ValueKey('task_detail_list'),
          padding: AppSpace.page,
          children: [
            if (_busy || detail.isLoading) const LinearProgressIndicator(),
            if (detail.hasError)
              ErrorView(
                error: detail.error!,
                onRetry: () {
                  ref.invalidate(taskDetailProvider(_query));
                  ref.invalidate(taskNotificationInfoProvider(widget.task.id));
                },
              ),
            if (detail.hasValue && latest?.task == null)
              const Text('La tarea ya no está disponible en esta vista.'),
            // Título editable en el lugar, sin caja; el tilde lo guarda.
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TaskTextField(
                    fieldKey: 'task_text_field',
                    workId: _task.workId ?? widget.workId,
                    sectorId: widget.fromSector ? widget.sectorId : null,
                    controller: _textController,
                    enabled: canEditText,
                    maxLines: null,
                    style: AppTextStyles.entityTitle.copyWith(color: c.text),
                    decoration: const InputDecoration(
                      hintText: 'Tarea',
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      disabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                    onSubmitted: (value) => _run(
                      (a) => a.updateText(
                        _task,
                        value.trim(),
                        fromSector: widget.fromSector,
                      ),
                    ),
                  ),
                ),
                // El tilde aparece al cambiar el texto (boceto P09).
                if (canEditText)
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: _textController,
                    builder: (context, value, _) =>
                        value.text.trim() == _task.rawText.trim()
                        ? const SizedBox.shrink()
                        : IconButton(
                            key: const ValueKey('task_text_save'),
                            tooltip: 'Guardar tarea',
                            onPressed: () => _run(
                              (a) => a.updateText(
                                _task,
                                _textController.text.trim(),
                                fromSector: widget.fromSector,
                              ),
                            ),
                            icon: Icon(AppIcons.check, color: c.brand),
                          ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            // Estado, Mi día, Urgente y Recordatorio como chips chicos en una
            // fila, en lugar de filas con interruptor (decisión del usuario, P09).
            ChipTheme(
              data: _detailChipTheme(context),
              child: TaskNotificationControls(
                key: const ValueKey('task_chip_row'),
                task: _task,
                canEdit: canEditText,
                fromSector: widget.fromSector,
                leading: [
                  // El estado es un desplegable con el vigente a la vista
                  // (boceto P09): «● Pendiente ⌄».
                  _StatusMenu(
                    task: _task,
                    canEdit: canEdit,
                    onSelected: (id) =>
                        _run((a) => a.setStatus(_task, id), close: true),
                  ),
                  if (canManageMyDay)
                    FilterChip(
                      key: const ValueKey('task_my_day'),
                      avatar: Icon(
                        _task.isInMyDay ? AppIcons.myDayFilled : AppIcons.myDay,
                        size: AppIconSizes.notice,
                        color: _task.isInMyDay ? c.brand : c.text,
                      ),
                      showCheckmark: false,
                      label: const Text('Mi día'),
                      tooltip: 'Tenela a mano para hoy',
                      selected: _task.isInMyDay,
                      onSelected: _busy
                          ? null
                          : (value) => _run((a) async {
                              await a.setMyDay(_task, value);
                              _task = _task.withMyDay(value);
                            }),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.md),
            // Asignación: proyecto, sector, personas, objetivo, vencimiento y
            // etiquetas, con "+ Asignar" (decisión del usuario, P09).
            _DetailCard(
              key: const ValueKey('task_assigned'),
              label: 'Asignada a',
              child: Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.sm,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  // Con los colores de las etiquetas de la web: /proyecto en
                  // `tag-work`, #sector en `tag-exec`, @persona en `tag-user`.
                  if (_task.homeSector != null)
                    ActionChip(
                      key: const ValueKey('task_origin_sector'),
                      backgroundColor: c.tagExecFill,
                      side: BorderSide.none,
                      labelStyle: AppTextStyles.chip.copyWith(
                        color: c.tagExecText,
                      ),
                      label: Text('#${_task.homeSector!.name}'),
                      onPressed: () {
                        final router = GoRouter.of(context);
                        Navigator.pop(context);
                        router.push(Routes.sector(_task.homeSector!.id));
                      },
                    ),
                  if (_task.work != null)
                    ActionChip(
                      key: const ValueKey('task_origin_work'),
                      backgroundColor: c.tagWorkFill,
                      side: BorderSide.none,
                      labelStyle: AppTextStyles.chip.copyWith(
                        color: c.tagWorkText,
                      ),
                      label: Text('/${_task.work!.name}'),
                      onPressed: () {
                        final router = GoRouter.of(context);
                        Navigator.pop(context);
                        router.push(Routes.work(_task.work!.id));
                      },
                    ),
                  // El objetivo ya va en la miga de la barra (boceto P09).
                  if (_task.effectiveDueDate != null)
                    StatusChip(
                      label:
                          'Vence ${formatDay(_task.effectiveDueDate!)}${_task.dueDate == null ? ' · subtareas' : ''}',
                      color: c.dueText,
                      fill: c.dueFill,
                      mono: true,
                    ),
                  for (final link in _task.links)
                    ActionChip(
                      key: ValueKey('task_link_${link.targetId}'),
                      backgroundColor: link.kind == LinkKind.exec
                          ? c.tagExecFill
                          : link.isUser
                          ? c.tagUserFill
                          : c.tagRefFill,
                      side: BorderSide.none,
                      labelStyle: AppTextStyles.chip.copyWith(
                        color: link.kind == LinkKind.exec
                            ? c.tagExecText
                            : link.isUser
                            ? c.tagUserText
                            : c.tagRefText,
                      ),
                      label: Text(
                        '${link.kind == LinkKind.exec ? '#' : '@'}${link.name}',
                      ),
                      onPressed: link.isUser || link.targetId == null
                          ? null
                          : () {
                              final router = GoRouter.of(context);
                              Navigator.pop(context);
                              router.push(Routes.sector(link.targetId!));
                            },
                    ),
                  for (final label in _task.labels)
                    ColorPill(
                      label: '${label.keyName}: ${label.valueName}',
                      hex: label.color,
                    ),
                  if (canEditText)
                    // El borde punteado va en lo visible y el área táctil de
                    // 48 alrededor: queda del alto de los otros chips.
                    Tooltip(
                      message: 'Asignar a un sector o una persona',
                      child: Semantics(
                        button: true,
                        child: InkWell(
                          key: const ValueKey('task_assign'),
                          onTap: _assign,
                          borderRadius: AppGeometry.chip,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(
                              minHeight: AppSpace.touch,
                            ),
                            child: Center(
                              widthFactor: 1,
                              child: DashedBorder(
                                color: c.border,
                                radius: AppGeometry.chip,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: AppSpace.sm,
                                    vertical: AppSpace.xs,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        AppIcons.add,
                                        size: AppIconSizes.notice,
                                        color: c.muted,
                                      ),
                                      const SizedBox(width: AppSpace.xs),
                                      Text(
                                        'Asignar',
                                        style: AppTextStyles.chip.copyWith(
                                          color: c.text,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.md),
            // La descripción es el bloque principal (decisión del usuario, P09).
            _DetailCard(
              key: const ValueKey('task_description'),
              label: 'Descripción',
              trailing: ValueListenableBuilder<TextEditingValue>(
                valueListenable: _descriptionController,
                builder: (context, value, _) =>
                    !canEdit || _descriptionDirty(value.text)
                    ? const SizedBox.shrink()
                    : Row(
                        key: const ValueKey('task_description_saved'),
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Guardado',
                            style: AppTextStyles.supporting.copyWith(
                              color: c.muted,
                            ),
                          ),
                          const SizedBox(width: AppSpace.xs),
                          Icon(
                            AppIcons.check,
                            size: AppIconSizes.notice,
                            color: c.muted,
                          ),
                        ],
                      ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    key: const ValueKey('task_description_field'),
                    controller: _descriptionController,
                    enabled: canEdit,
                    minLines: 5,
                    maxLines: 12,
                    decoration: const InputDecoration(
                      hintText: 'Agregá detalles, medidas o instrucciones…',
                    ),
                  ),
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: _descriptionController,
                    builder: (context, value, _) =>
                        canEdit && _descriptionDirty(value.text)
                        ? Padding(
                            padding: const EdgeInsets.only(top: AppSpace.sm),
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: FilledButton.tonal(
                                key: const ValueKey('task_description_save'),
                                style: AppButtonStyles.tonal(context),
                                onPressed: () {
                                  final text = value.text.trim();
                                  _run(
                                    (a) => a.updateDescription(
                                      _task,
                                      text.isEmpty ? null : text,
                                    ),
                                  );
                                },
                                child: const Text('Guardar'),
                              ),
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
            if (_task.parentId == null) ...[
              const SizedBox(height: AppSpace.md),
              _DetailCard(
                key: const ValueKey('task_subtasks'),
                label: 'Subtareas',
                trailing: _subtasks.isEmpty
                    ? null
                    : Text(
                        '${_subtasks.where((s) => s.isDone).length}/${_subtasks.length}',
                        style: AppTextStyles.technical.copyWith(color: c.muted),
                      ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Cada fila con su manija: se ordena arrastrando (boceto
                    // P09); TalkBack ofrece mover arriba y abajo.
                    if (_subtasks.isNotEmpty)
                      ReorderableListView(
                        key: const ValueKey('subtask_list'),
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        buildDefaultDragHandles: false,
                        padding: EdgeInsets.zero,
                        onReorderItem: _reorderSubtasks,
                        children: [
                          for (final (i, sub) in _subtasks.indexed)
                            Column(
                              key: ValueKey('subtask_item_${sub.id}'),
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (i > 0) Divider(height: 1, color: c.border),
                                Row(
                                  children: [
                                    if (canEdit && _subtasks.length > 1)
                                      ReorderableDragStartListener(
                                        index: i,
                                        child: Tooltip(
                                          message: 'Arrastrar para ordenar',
                                          child: SizedBox(
                                            key: ValueKey(
                                              'subtask_handle_${sub.id}',
                                            ),
                                            width: AppSpace.xxl,
                                            height: AppSpace.touch,
                                            child: Icon(
                                              AppIcons.dragHandle,
                                              size: AppIconSizes.action,
                                              color: c.muted,
                                            ),
                                          ),
                                        ),
                                      ),
                                    Expanded(
                                      child: CheckboxListTile(
                                        key: ValueKey('task_subtask_${sub.id}'),
                                        contentPadding: EdgeInsets.zero,
                                        controlAffinity:
                                            ListTileControlAffinity.leading,
                                        value: sub.isDone,
                                        title: Text(
                                          sub.displayText,
                                          style: AppTextStyles.body.copyWith(
                                            color: sub.isDone
                                                ? c.muted
                                                : c.text,
                                            decoration: sub.isDone
                                                ? TextDecoration.lineThrough
                                                : null,
                                          ),
                                        ),
                                        onChanged:
                                            canEdit &&
                                                sub.canToggle != false &&
                                                !sub.isContainer
                                            ? (_) =>
                                                  _run((a) => a.toggleDone(sub))
                                            : null,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                        ],
                      ),
                    if (canEdit && _subtasks.isNotEmpty)
                      Divider(height: 1, color: c.border),
                    if (canEdit)
                      TaskComposer(
                        key: const ValueKey('subtask_composer'),
                        parentId: _task.id,
                        workId: _task.workId,
                        sectorId: _task.workId == null
                            ? _task.homeSector?.id
                            : null,
                        hint: 'Nueva subtarea…',
                        inline: true,
                        onSubmit: (text) async {
                          try {
                            await ref
                                .read(taskActionsProvider)
                                .create(text, parentId: _task.id);
                            return true;
                          } catch (e) {
                            if (context.mounted) showErrorSnack(context, e);
                            return false;
                          }
                        },
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Chips del detalle con borde, como el boceto P09: borde estructural claro,
/// curva de control y, si está activo (Mi día, Urgente), el relleno de marca
/// con la marca aclarada en el borde. El rótulo identifica al chip, así que
/// el borde no necesita el 3:1 de `control` (pedido del usuario).
ChipThemeData _detailChipTheme(BuildContext context) {
  final c = context.colors;
  return ChipTheme.of(context).copyWith(
    shape: const RoundedRectangleBorder(borderRadius: AppGeometry.control),
    side: WidgetStateBorderSide.resolveWith(
      (states) => BorderSide(
        color: states.contains(WidgetState.selected)
            ? c.brand.withValues(alpha: .5)
            : c.border,
      ),
    ),
    backgroundColor: c.surface,
    selectedColor: c.brandFill,
    // Activo, el rótulo va en la marca como el ícono (boceto P09).
    labelStyle: AppTextStyles.chipCompact.copyWith(
      color: WidgetStateColor.resolveWith(
        (states) => states.contains(WidgetState.selected) ? c.brand : c.text,
      ),
    ),
    secondaryLabelStyle: AppTextStyles.chipCompact.copyWith(color: c.brand),
    // Ícono de 16 sin la caja del alto del rótulo y márgenes cortos: así los
    // cuatro chips entran en un renglón a 360 dp (boceto P09).
    avatarBoxConstraints: const BoxConstraints.tightFor(
      width: AppIconSizes.notice,
      height: AppIconSizes.notice,
    ),
    padding: const EdgeInsets.only(
      left: AppSpace.xs + AppSpace.xxs,
      right: AppSpace.xxs,
    ),
    labelPadding: const EdgeInsets.only(left: AppSpace.xs, right: AppSpace.xxs),
  );
}

/// «● Pendiente ⌄»: el estado vigente y, al tocarlo, los demás. En una tarea
/// con subtareas el estado sale de las hijas: el menú se abre pero solo el
/// vigente queda habilitado (P09-M3).
class _StatusMenu extends StatelessWidget {
  const _StatusMenu({
    required this.task,
    required this.canEdit,
    required this.onSelected,
  });

  final Task task;
  final bool canEdit;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final options = task.statusOptions.isEmpty
        ? [task.status]
        : task.statusOptions;
    return PopupMenuButton<String>(
      key: const ValueKey('task_status'),
      tooltip: 'Cambiar estado',
      enabled: canEdit && options.length > 1,
      position: PopupMenuPosition.under,
      onSelected: (id) {
        if (id != task.status.id) onSelected(id);
      },
      itemBuilder: (_) => [
        for (final option in options)
          PopupMenuItem(
            key: ValueKey('task_status_${option.id}'),
            value: option.id,
            enabled: option.id == task.status.id || !task.isContainer,
            child: Row(
              children: [
                ColorDot(hex: option.color),
                const SizedBox(width: AppSpace.sm),
                Expanded(child: Text(option.name)),
                if (option.id == task.status.id)
                  Icon(
                    AppIcons.check,
                    size: AppIconSizes.notice,
                    color: c.brand,
                  ),
              ],
            ),
          ),
      ],
      // Se ve igual con o sin permiso: el estado se lee siempre.
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSpace.touch),
        child: Center(
          widthFactor: 1,
          child: Container(
            // El chevron trae aire propio: el margen derecho es corto.
            padding: const EdgeInsets.only(
              left: AppSpace.xs + AppSpace.xxs,
              right: AppSpace.xxs,
              top: AppSpace.sm,
              bottom: AppSpace.sm,
            ),
            decoration: BoxDecoration(
              color: c.surface,
              border: Border.all(color: c.border),
              borderRadius: AppGeometry.control,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ColorDot(hex: task.status.color),
                const SizedBox(width: AppSpace.xs),
                Text(
                  task.status.name,
                  style: AppTextStyles.chipCompact.copyWith(color: c.text),
                ),
                if (canEdit && options.length > 1) ...[
                  Icon(
                    AppIcons.expandMore,
                    size: AppIconSizes.notice,
                    color: c.muted,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Card de un bloque del detalle: rótulo 11/700 en mayúsculas y contenido
/// (D7 de la dirección premium).
class _DetailCard extends StatelessWidget {
  const _DetailCard({
    super.key,
    required this.label,
    required this.child,
    this.trailing,
  });

  final String label;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppWorkBox(
      backgroundColor: c.surface,
      padding: const EdgeInsets.all(AppSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label.toUpperCase(),
                  style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: AppSpace.md),
          child,
        ],
      ),
    );
  }
}

enum _MoreAction { moveToObjective, moveUnder, promote, history, delete }

/// Menú "⋯" de la barra: lo secundario de la tarea (mover, historial y borrar)
/// sale del cuerpo, que queda para la descripción y las subtareas.
class _MoreMenu extends StatelessWidget {
  const _MoreMenu({
    required this.canMoveToObjective,
    required this.canMoveUnder,
    required this.canPromote,
    required this.showDelete,
    required this.canDelete,
    required this.onSelected,
  });

  final bool canMoveToObjective, canMoveUnder, canPromote;
  final bool showDelete, canDelete;
  final ValueChanged<_MoreAction> onSelected;

  @override
  Widget build(BuildContext context) => PopupMenuButton<_MoreAction>(
    key: const ValueKey('task_more'),
    tooltip: 'Más acciones',
    icon: const Icon(AppIcons.moreVertical),
    onSelected: onSelected,
    itemBuilder: (context) => [
      if (canMoveToObjective)
        const PopupMenuItem(
          key: ValueKey('task_move_objective'),
          value: _MoreAction.moveToObjective,
          child: Text('Mover a objetivo'),
        ),
      if (canMoveUnder)
        const PopupMenuItem(
          key: ValueKey('task_move_parent'),
          value: _MoreAction.moveUnder,
          child: Text('Mover bajo otra tarea'),
        ),
      if (canPromote)
        const PopupMenuItem(
          key: ValueKey('task_promote'),
          value: _MoreAction.promote,
          child: Text('Separar del padre'),
        ),
      const PopupMenuItem(
        key: ValueKey('task_history'),
        value: _MoreAction.history,
        child: Text('Historial de estados'),
      ),
      if (showDelete) ...[
        // La acción peligrosa va en `danger`, separada de las demás.
        const PopupMenuDivider(),
        PopupMenuItem(
          key: const ValueKey('task_delete'),
          value: _MoreAction.delete,
          enabled: canDelete,
          child: Text(
            'Borrar tarea',
            style: AppTextStyles.body.copyWith(color: context.colors.danger),
          ),
        ),
      ],
    ],
  );
}

class _StatusHistory extends ConsumerStatefulWidget {
  const _StatusHistory({required this.taskId});

  final String taskId;

  @override
  ConsumerState<_StatusHistory> createState() => _StatusHistoryState();
}

class _StatusHistoryState extends ConsumerState<_StatusHistory> {
  late final Future<List<StatusChange>> _history = ref
      .read(tasksRepositoryProvider)
      .statusChanges(widget.taskId);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<StatusChange>>(
      future: _history,
      builder: (context, snapshot) {
        if (snapshot.hasError) return Text(errorMessage(snapshot.error!));
        if (!snapshot.hasData) return const LinearProgressIndicator();
        final changes = snapshot.data!;
        if (changes.isEmpty) {
          return const ListTile(title: Text('Sin cambios todavía'));
        }
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final c in changes)
              ListTile(
                dense: true,
                leading: ColorDot(hex: c.toColor),
                title: Text('${c.fromName ?? '—'} → ${c.toName ?? '—'}'),
                subtitle: Text(
                  '${c.byName ?? 'Alguien'} · ${formatDay(c.changedAt)}',
                ),
              ),
          ],
        );
      },
    );
  }
}
