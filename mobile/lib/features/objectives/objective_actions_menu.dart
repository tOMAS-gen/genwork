import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import 'objective_dialog.dart';

class ObjectiveActionsMenu extends ConsumerStatefulWidget {
  const ObjectiveActionsMenu({
    super.key,
    required this.work,
    required this.objective,
  });
  final WorkDetail work;
  final Objective objective;
  @override
  ConsumerState<ObjectiveActionsMenu> createState() =>
      _ObjectiveActionsMenuState();
}

class _ObjectiveActionsMenuState extends ConsumerState<ObjectiveActionsMenu> {
  bool _busy = false;
  Future<void> _act(String action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(objectivesRepositoryProvider);
      final o = widget.objective;
      if (action == 'edit') {
        await showObjectiveDialog(context, widget.work.id, objective: o);
      } else if (action == 'delete') {
        final keep = await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Eliminar objetivo'),
            scrollable: true,
            content: Text(
              '¿Qué hacemos con las tareas de «${o.title}» y sus subtareas?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(c),
                child: const Text('Cancelar'),
              ),
              TextButton(
                key: const ValueKey('objective_delete_tasks'),
                onPressed: () => Navigator.pop(c, false),
                child: const Text('Eliminar también las tareas'),
              ),
              FilledButton(
                key: const ValueKey('objective_keep_tasks'),
                onPressed: () => Navigator.pop(c, true),
                child: const Text('Conservar en Generales'),
              ),
            ],
          ),
        );
        if (keep == null || !mounted) return;
        await confirmAction(
          context,
          title: 'Confirmar eliminación',
          message: keep
              ? 'Se eliminará «${o.title}». Sus tareas pasarán a Generales.'
              : 'Se eliminarán «${o.title}», sus tareas y subtareas. No se puede deshacer.',
          confirmLabel: 'Eliminar objetivo',
          danger: true,
          onConfirm: () => repo.delete(o.id, keepTasks: keep),
        );
      } else if (action == 'template') {
        final template = await repo.saveTemplate(o.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Plantilla «${template.name}» guardada en Personal',
              ),
              action: SnackBarAction(
                label: 'Ver',
                onPressed: () => context.push(Routes.work(template.id)),
              ),
            ),
          );
        }
      } else {
        final ordered = widget.work.sections
            .where((s) => s.objective != null)
            .map((s) => s.objective!.id)
            .toList();
        final from = ordered.indexOf(o.id);
        final to = from + (action == 'up' ? -1 : 1);
        if (from < 0 || to < 0 || to >= ordered.length) return;
        ordered.insert(to, ordered.removeAt(from));
        await repo.reorder(widget.work.id, ordered);
      }
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) {
        refreshResources(ref);
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.work.canManageObjectives) return const SizedBox.shrink();
    final ordered = widget.work.sections
        .where((s) => s.objective != null)
        .toList();
    return PopupMenuButton<String>(
      key: ValueKey('objective_actions_${widget.objective.id}'),
      tooltip: 'Acciones del objetivo',
      enabled: !_busy,
      onSelected: _act,
      itemBuilder: (_) => [
        const PopupMenuItem(value: 'edit', child: Text('Editar objetivo')),
        PopupMenuItem(
          value: 'up',
          enabled: ordered.first.objective!.id != widget.objective.id,
          child: const Text('Subir'),
        ),
        PopupMenuItem(
          value: 'down',
          enabled: ordered.last.objective!.id != widget.objective.id,
          child: const Text('Bajar'),
        ),
        const PopupMenuItem(
          value: 'template',
          child: Text('Guardar como plantilla'),
        ),
        const PopupMenuItem(value: 'delete', child: Text('Eliminar objetivo')),
      ],
    );
  }
}
