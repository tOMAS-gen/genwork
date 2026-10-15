import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/network/api_exception.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/task.dart';
import '../../features/tasks/task_actions.dart';
import '../../features/shell/resource_refresh.dart';
import 'state_views.dart';
import 'task_text_field.dart';
import 'error_text.dart';

class TaskComposer extends ConsumerStatefulWidget {
  const TaskComposer({
    super.key,
    required this.onSubmit,
    this.hint = 'Nueva tarea…',
    this.workId,
    this.sectorId,
    this.parentId,
    this.objectiveId,
  });

  /// Compatibilidad con compositores sin contexto. El alta contextual usa TaskActions.
  final Future<bool> Function(String text) onSubmit;
  final String hint;
  final String? workId, sectorId, parentId, objectiveId;
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

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .42,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.sm),
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
                      decoration: InputDecoration(hintText: widget.hint),
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
              if (_managed)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    key: const ValueKey('task_composer_details'),
                    onPressed: _sending
                        ? null
                        : () => setState(
                            () => _showDescription = !_showDescription,
                          ),
                    child: const Text('Descripción y ayuda'),
                  ),
                ),
              if (_showDescription) ...[
                const Text(
                  r'Una tarea por línea. Usá /proyecto, #sector, @referencia, $etiqueta y fechas DD/MM/AAAA.',
                ),
                TextField(
                  key: const ValueKey('task_composer_description'),
                  controller: _description,
                  enabled: !_sending,
                  maxLength: 2000,
                  minLines: 1,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Descripción para las tareas nuevas',
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
                              : () => _createMissing(tag.symbol, tag.name),
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
}
