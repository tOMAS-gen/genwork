import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../core/util/tiptap.dart';
import '../../data/models/note.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import 'notes_providers.dart';

/// Mis notas: encabezado como el de la web («Mis notas» + «Tu espacio para
/// escribir, organizar ideas y documentar.») y una card por nota con su fecha
/// (Mono) y un extracto de dos líneas.
class NotesListScreen extends ConsumerWidget {
  const NotesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(notesProvider);
    return GenPageScaffold(
      title: 'Mis notas',
      subtitle: 'Tu espacio para escribir, organizar ideas y documentar.',
      icon: AppIcons.notes,
      actions: [
        IconButton.filled(
          key: const ValueKey('notes_create'),
          tooltip: 'Crear nota',
          icon: const Icon(AppIcons.add),
          onPressed: () async {
            try {
              final note = await ref.read(notesRepositoryProvider).create();
              ref.invalidate(notesProvider);
              if (context.mounted) context.push(Routes.note(note.id));
            } catch (e) {
              if (context.mounted) showErrorSnack(context, e);
            }
          },
        ),
      ],
      onRefresh: () => ref.refresh(notesProvider.future),
      bodyPadding: EdgeInsets.zero,
      body: AsyncValueView(
        value: notes,
        onRetry: () => ref.invalidate(notesProvider),
        data: (list) => list.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  EmptyView(
                    icon: AppIcons.notes,
                    message: 'Todavía no tenés notas',
                  ),
                ],
              )
            : ListView.separated(
                key: const ValueKey('notes_list'),
                padding: AppSpace.page,
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
                itemBuilder: (context, i) => _NoteCard(
                  note: list[i],
                  onTap: () => context.push(Routes.note(list[i].id)),
                ),
              ),
      ),
    );
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({required this.note, required this.onTap});

  final Note note;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final preview = docToPlainText(note.content);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('note_${note.id}'),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(
                    AppIcons.notes,
                    size: AppIconSizes.field,
                    color: c.muted,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      note.title.isEmpty ? 'Sin título' : note.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.itemTitle.copyWith(color: c.text),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                formatDay(note.updatedAt),
                style: AppTextStyles.technical.copyWith(color: c.muted),
              ),
              if (preview.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  preview,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.body.copyWith(color: c.muted),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
