import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/work.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../shell/resource_refresh.dart';
import 'edit_work_dialog.dart';
import 'work_metadata_dialog.dart';

class WorkActionsMenu extends ConsumerWidget {
  const WorkActionsMenu({
    super.key,
    required this.work,
    required this.onDeleted,
  });
  final WorkDetail work;
  final VoidCallback onDeleted;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!work.canOperate) return const SizedBox.shrink();
    return PopupMenuButton<String>(
      key: const ValueKey('work_actions'),
      tooltip: work.isTemplate
          ? 'Acciones de la plantilla'
          : 'Acciones del proyecto',
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'edit',
          child: Text(
            work.isArchived
                ? 'Renombrar'
                : work.isTemplate
                ? 'Editar plantilla'
                : 'Editar proyecto',
          ),
        ),
        if (!work.isArchived)
          const PopupMenuItem(
            value: 'stage',
            child: Text('Etapa de producción'),
          ),
        const PopupMenuItem(value: 'labels', child: Text('Etiquetas')),
        PopupMenuItem(
          value: 'archive',
          child: Text(work.isArchived ? 'Restaurar' : 'Archivar'),
        ),
        // La acción peligrosa va en `danger`, separada de las demás.
        const PopupMenuDivider(),
        PopupMenuItem(
          value: 'delete',
          child: Text(
            work.isTemplate ? 'Eliminar plantilla' : 'Eliminar proyecto',
            style: AppTextStyles.body.copyWith(color: context.colors.danger),
          ),
        ),
      ],
      onSelected: (action) async {
        final repository = ref.read(worksRepositoryProvider);
        switch (action) {
          case 'edit':
            await showEditWorkDialog(context, work);
          case 'stage':
            await showWorkMetadata(context, work, labels: false);
          case 'labels':
            await showWorkMetadata(context, work, labels: true);
          case 'archive':
            final changed = await confirmAction(
              context,
              title: work.isArchived
                  ? 'Restaurar proyecto'
                  : 'Archivar proyecto',
              message: work.isArchived
                  ? '«${work.name}» volverá a las vistas activas.'
                  : '«${work.name}» pasará a Archivados y dejará de verse en las vistas activas.',
              confirmLabel: work.isArchived ? 'Restaurar' : 'Archivar',
              onConfirm: () =>
                  repository.setArchived(work.id, !work.isArchived),
            );
            if (changed && context.mounted) refreshResources(ref);
          case 'delete':
            final deleted = await confirmAction(
              context,
              title: work.isTemplate
                  ? 'Eliminar plantilla'
                  : 'Eliminar proyecto',
              message:
                  'Se eliminará «${work.name}» con todas sus tareas, documentos y archivos. No se puede deshacer.',
              confirmLabel: work.isTemplate
                  ? 'Eliminar plantilla'
                  : 'Eliminar proyecto',
              danger: true,
              exactName: work.name,
              onConfirm: () => repository.delete(work.id, work.name),
            );
            if (deleted) onDeleted();
        }
      },
    );
  }
}
