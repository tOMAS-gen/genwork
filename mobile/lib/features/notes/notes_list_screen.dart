import 'package:flutter/material.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/format.dart';
import '../../core/util/tiptap.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import 'notes_providers.dart';

class NotesListScreen extends ConsumerWidget {
  const NotesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(notesProvider);
    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Notas'),
      ),
      floatingActionButton: FloatingActionButton(
        key: const ValueKey('notes_create'),
        tooltip: 'Crear nota',
        onPressed: () async {
          try {
            final note = await ref.read(notesRepositoryProvider).create();
            ref.invalidate(notesProvider);
            if (context.mounted) context.push(Routes.note(note.id));
          } catch (e) {
            if (context.mounted) showErrorSnack(context, e);
          }
        },
        child: const Icon(Icons.add),
      ),
      body: AsyncValueView(
        value: notes,
        onRetry: () => ref.invalidate(notesProvider),
        data: (list) => RefreshIndicator(
          onRefresh: () => ref.refresh(notesProvider.future),
          child: list.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: AppSpace.emptyLead),
                    EmptyView(message: 'Todavía no tenés notas'),
                  ],
                )
              : ListView.separated(
                  key: const ValueKey('notes_list'),
                  padding: AppSpace.list,
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: list.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: AppSpace.md),
                  itemBuilder: (context, i) {
                    final note = list[i];
                    final preview = docToPlainText(note.content);
                    return Card(
                      child: ListTile(
                        key: ValueKey('note_${note.id}'),
                        leading: const Icon(Icons.description_outlined),
                        title: Text(
                          note.title.isEmpty ? 'Sin título' : note.title,
                        ),
                        subtitle: Text(
                          [
                            formatDay(note.updatedAt),
                            if (preview.isNotEmpty) preview,
                          ].join(' · '),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => context.push(Routes.note(note.id)),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
