import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/network/api_exception.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/task.dart';
import '../../features/tasks/task_actions.dart';
import '../../features/shell/resource_refresh.dart';
import 'state_views.dart';
import 'task_text_field.dart';
import 'error_text.dart';
import 'labeled_field.dart';

class TaskComposer extends ConsumerStatefulWidget {
  const TaskComposer({
    super.key,
    required this.onSubmit,
    this.hint = 'Nueva tarea…',
    this.workId,
    this.sectorId,
    this.parentId,
    this.objectiveId,
    this.destination,
    this.inline = false,
  });

  /// Compatibilidad con compositores sin contexto. El alta contextual usa TaskActions.
  final Future<bool> Function(String text) onSubmit;
  final String hint;
  final String? workId, sectorId, parentId, objectiveId;

  /// Selector del destino (p. ej. "Generales" u un objetivo), como chip dentro
  /// del campo (P07-M1).
  final Widget? destination;

  /// Fila «+ Nueva subtarea…» dentro de una card (boceto P09): el + al frente,
  /// sin ayuda y con el envío dentro del campo solo cuando hay texto; Enter
  /// también crea.
  final bool inline;
  @override
  ConsumerState<TaskComposer> createState() => _TaskComposerState();
}

class _TaskComposerState extends ConsumerState<TaskComposer> {
  final _controller = TaskTextController();
  final _description = TextEditingController();
  bool _sending = false, _showDescription = false;
  Object? _error;
  List<({String symbol, String name})> _unresolved = [];
  Task? _needsDescription;
  bool get _managed =>
      widget.workId != null ||
      widget.sectorId != null ||
      widget.parentId != null;
  @override
  void dispose() {
    _controller.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _sending = true;
      _error = null;
      _unresolved = [];
    });
    try {
      final lines = text
          .split(RegExp(r'\r?\n'))
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      Task? moved;
      for (var i = 0; i < lines.length; i++) {
        if (_managed) {
          final actions = ref.read(taskActionsProvider);
          final task =
              _needsDescription ??
              await actions.create(
                lines[i],
                workId: widget.workId,
                sectorId: widget.sectorId,
                parentId: widget.parentId,
                objectiveId: widget.objectiveId,
              );
          _needsDescription = task;
          if (_description.text.trim().isNotEmpty) {
            await actions.updateDescription(task, _description.text.trim());
          }
          _needsDescription = null;
          if (task.workId != null &&
              task.workId != widget.workId &&
              widget.parentId == null) {
            moved = task;
          }
        } else {
          final ok = await widget.onSubmit(lines[i]);
          if (!ok) return;
        }
        if (!mounted) return;
        // Consumir solo líneas confirmadas; el reintento no repite éxitos anteriores.
        _controller.text = lines.skip(i + 1).join('\n');
      }
      if (mounted) {
        _description.clear();
        setState(() => _showDescription = false);
        if (moved != null) {
          final task = moved;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Tarea enviada a ${task.work?.name ?? 'otro proyecto'}',
              ),
              action: task.work == null
                  ? null
                  : SnackBarAction(
                      label: 'Ver',
                      onPressed: () => context.push(Routes.work(task.work!.id)),
                    ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          if (e is ApiException && e.extra['unresolvedTags'] is List) {
            _unresolved = (e.extra['unresolvedTags'] as List)
                .whereType<Map>()
                .map(
                  (t) => (
                    symbol: t['symbol'] as String,
                    name: t['name'] as String,
                  ),
                )
                .toList();
          }
        });
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _createMissing(String symbol, String name) async {
    if (_sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      String? groupId;
      if (widget.workId != null) {
        groupId =
            (await ref.read(worksRepositoryProvider).detail(widget.workId!))
                .groupId;
      }
      if (symbol == '/') {
        await ref
            .read(worksRepositoryProvider)
            .create(name: name, groupId: groupId);
      } else {
        await ref
            .read(sectorsRepositoryProvider)
            .create(name: name, groupId: groupId);
      }
      if (mounted) {
        refreshResources(ref);
        setState(
          () => _unresolved.removeWhere(
            (t) => t.symbol == symbol && t.name == name,
          ),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// Lo que deja el teclado: el `Scaffold` puede haber quitado el inset de
  /// su cuerpo, así que también se lee el de la vista (T8).
  double _availableHeight(BuildContext context) {
    final keyboard = [
      MediaQuery.viewInsetsOf(context).bottom,
      MediaQueryData.fromView(View.of(context)).viewInsets.bottom,
    ].reduce((a, b) => a > b ? a : b);
    final height = MediaQuery.sizeOf(context).height - keyboard;
    return height < 0 ? 0 : height;
  }

  @override
  Widget build(BuildContext context) => widget.inline
      ? _inlineField(context)
      : SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: _availableHeight(context) * .42,
            ),
            child: SingleChildScrollView(
              child: Padding(
                // Una sola barra de 56 dp (P07-M1).
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.md,
                  vertical: AppSpace.xxs,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: TaskTextField(
                            fieldKey: 'task_composer_field',
                            controller: _controller,
                            enabled: !_sending && _needsDescription == null,
                            workId: widget.workId,
                            sectorId: widget.sectorId,
                            decoration: InputDecoration(
                              hintText: widget.hint,
                              hintMaxLines: 1,
                              prefixIcon: widget.destination == null
                                  ? null
                                  : Padding(
                                      padding: const EdgeInsets.only(
                                        left: AppSpace.xs,
                                        right: AppSpace.xxs,
                                      ),
                                      child: widget.destination,
                                    ),
                              prefixIconConstraints: const BoxConstraints(),
                              // Descripción y ayuda, como "?" dentro del campo.
                              suffixIcon: _managed
                                  ? IconButton(
                                      key: const ValueKey(
                                        'task_composer_details',
                                      ),
                                      tooltip: 'Descripción y ayuda',
                                      onPressed: _sending
                                          ? null
                                          : () => setState(
                                              () => _showDescription =
                                                  !_showDescription,
                                            ),
                                      icon: Icon(
                                        AppIcons.help,
                                        size: AppIconSizes.action,
                                        color: _showDescription
                                            ? context.colors.brand
                                            : context.colors.muted,
                                      ),
                                    )
                                  : null,
                            ),
                            onSubmitted: (_) => _submit(),
                          ),
                        ),
                        const SizedBox(width: AppSpace.xs),
                        IconButton.filled(
                          key: const ValueKey('task_composer_send'),
                          style: IconButton.styleFrom(
                            minimumSize: const Size.square(AppSpacing.xxl),
                          ),
                          tooltip: _needsDescription == null
                              ? 'Crear tarea'
                              : 'Guardar descripción pendiente',
                          onPressed: _sending ? null : _submit,
                          icon: _sending
                              ? SizedBox.square(
                                  dimension: AppIconSizes.field,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: context.colors.brand,
                                  ),
                                )
                              : const Icon(AppIcons.send),
                        ),
                      ],
                    ),
                    if (_showDescription) ...[
                      const Text(
                        r'Una tarea por línea. Usá /proyecto, #sector, @referencia, $etiqueta y fechas DD/MM/AAAA.',
                      ),
                      LabeledField(
                        label: 'Descripción para las tareas nuevas',
                        child: TextField(
                          key: const ValueKey('task_composer_description'),
                          controller: _description,
                          enabled: !_sending,
                          maxLength: 2000,
                          minLines: 1,
                          maxLines: 3,
                        ),
                      ),
                    ],
                    if (_needsDescription != null)
                      const Text(
                        'La tarea ya se creó. Falta guardar la descripción; reintentá para completarla.',
                      ),
                    if (_error != null) ErrorText(errorMessage(_error!)),
                    for (final tag in _unresolved)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpace.sm),
                        child: Column(
                          children: [
                            Text(
                              '${tag.symbol}${tag.name}: no se pudo resolver. ${tag.symbol == r'$' ? 'Elegí un valor con nombre único entre las claves del ámbito o corregí el texto.' : 'Corregí el nombre o creá el recurso.'}',
                            ),
                            if (tag.symbol != r'$')
                              TextButton(
                                key: ValueKey(
                                  'task_create_missing_${tag.symbol}_${tag.name}',
                                ),
                                onPressed: _sending
                                    ? null
                                    : () =>
                                          _createMissing(tag.symbol, tag.name),
                                child: Text(
                                  tag.symbol == '/'
                                      ? 'Crear proyecto «${tag.name}»'
                                      : 'Crear sector «${tag.name}»',
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );

  Widget _inlineField(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        ValueListenableBuilder<TextEditingValue>(
          valueListenable: _controller,
          builder: (context, value, _) => TaskTextField(
            fieldKey: 'task_composer_field',
            controller: _controller,
            enabled: !_sending && _needsDescription == null,
            workId: widget.workId,
            sectorId: widget.sectorId,
            decoration: InputDecoration(
              hintText: widget.hint,
              hintMaxLines: 1,
              prefixIcon: Icon(
                AppIcons.add,
                size: AppIconSizes.action,
                color: c.muted,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              suffixIcon: value.text.trim().isEmpty && !_sending
                  ? null
                  : IconButton(
                      key: const ValueKey('task_composer_send'),
                      tooltip: 'Crear subtarea',
                      onPressed: _sending ? null : _submit,
                      icon: _sending
                          ? SizedBox.square(
                              dimension: AppIconSizes.field,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: c.brand,
                              ),
                            )
                          : Icon(AppIcons.send, color: c.brand),
                    ),
            ),
            onSubmitted: (_) => _submit(),
          ),
        ),
        if (_needsDescription != null)
          const Text(
            'La tarea ya se creó. Falta guardar la descripción; reintentá para completarla.',
          ),
        if (_error != null) ErrorText(errorMessage(_error!)),
        for (final tag in _unresolved)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.sm),
            child: Text(
              '${tag.symbol}${tag.name}: no se pudo resolver. Corregí el nombre o creá el recurso.',
            ),
          ),
      ],
    );
  }
}

/// Destino del compositor como chip dentro del campo (P07-M1): "Generales" o
/// un objetivo, 12/600 sobre `brandFill`, con 48 dp táctiles.
class ComposerTarget extends StatelessWidget {
  const ComposerTarget({
    super.key,
    required this.selected,
    required this.options,
    required this.onSelected,
  });

  final String selected;

  /// Valor → nombre, en el orden del menú.
  final Map<String, String> options;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = options[selected] ?? options.values.first;
    return PopupMenuButton<String>(
      tooltip: 'Agregar tarea en $label',
      onSelected: onSelected,
      itemBuilder: (_) => [
        for (final e in options.entries)
          PopupMenuItem(
            value: e.key,
            child: Text(e.value, overflow: TextOverflow.ellipsis),
          ),
      ],
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
        child: Center(
          widthFactor: 1,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpace.xs,
              vertical: AppSpace.xxs,
            ),
            decoration: BoxDecoration(
              color: c.brandFill,
              borderRadius: AppGeometry.chip,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: _targetLabelMaxWidth,
                  ),
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.chip.copyWith(
                      fontWeight: FontWeight.w600,
                      color: c.brand,
                    ),
                  ),
                ),
                Icon(
                  AppIcons.expandMore,
                  size: AppIconSizes.notice,
                  color: c.brand,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Ancho máximo del nombre del destino: deja lugar para escribir.
const double _targetLabelMaxWidth = 104;
