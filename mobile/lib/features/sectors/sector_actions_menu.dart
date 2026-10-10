import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/repositories/sectors_repository.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/async_value_view.dart';
import 'sector_form_dialog.dart';

final sectorDeletionImpactProvider = FutureProvider.autoDispose
    .family<SectorDeleteImpact, String>(
      (ref, id) => ref.watch(sectorsRepositoryProvider).deletionImpact(id),
    );

class SectorActionsMenu extends ConsumerWidget {
  const SectorActionsMenu({
    super.key,
    required this.id,
    required this.name,
    required this.onDeleted,
    this.color,
  });
  final String id, name;
  final VoidCallback onDeleted;
  final String? color;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(currentUserProvider)?.isSuperAdmin != true) {
      return const SizedBox.shrink();
    }
    return PopupMenuButton<String>(
      key: const ValueKey('sector_actions'),
      tooltip: 'Acciones del sector',
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'edit', child: Text('Editar sector')),
        PopupMenuItem(value: 'delete', child: Text('Eliminar sector')),
      ],
      onSelected: (value) async {
        final repository = ref.read(sectorsRepositoryProvider);
        if (value == 'edit') {
          await showSectorForm(context, id: id, name: name, color: color);
          return;
        }
        ref.invalidate(sectorDeletionImpactProvider(id));
        final impact = await showDialog<SectorDeleteImpact>(
          context: context,
          builder: (_) => Consumer(
            builder: (context, ref, _) => AlertDialog(
              title: const Text('Impacto de eliminar el sector'),
              scrollable: true,
              content: AsyncValueView(
                value: ref.watch(sectorDeletionImpactProvider(id)),
                onRetry: () => ref.invalidate(sectorDeletionImpactProvider(id)),
                data: (impact) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '«$name»\nVínculos de tareas a desvincular: ${impact.links}.\nTareas sueltas a eliminar: ${impact.looseTasks}.\nLas tareas de proyectos se conservan.',
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      key: const ValueKey('sector_delete_continue'),
                      onPressed: () => Navigator.pop(context, impact),
                      child: const Text('Continuar'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancelar'),
                ),
              ],
            ),
          ),
        );
        if (impact == null || !context.mounted) return;
        final deleted = await confirmAction(
          context,
          title: 'Eliminar sector',
          message:
              'Se eliminará «$name».\nTareas sueltas a eliminar: ${impact.looseTasks}.\nVínculos a quitar: ${impact.links}.\nNo se puede deshacer.',
          confirmLabel: 'Eliminar sector',
          danger: true,
          onConfirm: () => repository.delete(id),
        );
        if (deleted) onDeleted();
      },
    );
  }
}
