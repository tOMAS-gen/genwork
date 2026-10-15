import 'package:flutter/material.dart';
import 'package:genwork_mobile/core/util/tiptap.dart';
import 'package:genwork_mobile/features/documents/rich_document_editor.dart';

// Simulates the bridge in widget tests; the real TipTap asset is exercised on Android.
Widget fakeRichEditor(RichDocumentEditor editor) =>
    _FakeEditor(key: editor.key, editor: editor);

class _FakeEditor extends StatefulWidget {
  const _FakeEditor({super.key, required this.editor});
  final RichDocumentEditor editor;
  @override
  State<_FakeEditor> createState() => _FakeEditorState();
}

class _FakeEditorState extends State<_FakeEditor> {
  late final controller = TextEditingController(
    text: docToPlainText(widget.editor.content),
  );
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    key: const ValueKey('note_body'),
    controller: controller,
    readOnly: !widget.editor.editable,
    maxLines: null,
    onChanged: (v) => widget.editor.onChanged(plainTextToDoc(v)),
  );
}
