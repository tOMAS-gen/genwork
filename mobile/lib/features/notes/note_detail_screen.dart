import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/widgets/async_value_view.dart';
import '../documents/document_screen.dart';
import 'notes_providers.dart';

class NoteDetailScreen extends ConsumerWidget {
  const NoteDetailScreen({super.key, required this.noteId});
  final String noteId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncValueView(
    value: ref.watch(noteProvider(noteId)),
    onRetry: () => ref.invalidate(noteProvider(noteId)),
    data: (note) => DocumentScreen(
      key: ValueKey(note.id),
      noteId: note.id,
      title: note.title,
      content: note.content,
    ),
  );
}
