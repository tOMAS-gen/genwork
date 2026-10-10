import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/network/api_exception.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import '../works/works_providers.dart';
import '../files/files_providers.dart';
import '../notes/notes_providers.dart';
import 'document_draft.dart';
import 'rich_document_editor.dart';
import '../../shared/widgets/error_text.dart';

final richEditorBuilderProvider = Provider<Widget Function(RichDocumentEditor)>(
  (ref) =>
      (editor) => editor,
);

class WorkDocumentScreen extends ConsumerWidget {
  const WorkDocumentScreen({super.key, required this.workId});
  final String workId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncValueView(
    value: ref.watch(workDetailProvider(workId)),
    onRetry: () => ref.invalidate(workDetailProvider(workId)),
    data: (work) => DocumentScreen(
      key: ValueKey('doc_${work.id}'),
      workId: work.id,
      title: work.name,
      content: work.document,
      editable: work.canOperate && !work.isArchived,
    ),
  );
}

class DocumentScreen extends ConsumerStatefulWidget {
  const DocumentScreen({
    super.key,
    required this.title,
    required this.content,
    this.noteId,
    this.workId,
    this.editable = true,
  });
  final String title;
  final Object? content;
  final String? noteId, workId;
  final bool editable;
  @override
  ConsumerState<DocumentScreen> createState() => _DocumentScreenState();
}

class _DocumentScreenState extends ConsumerState<DocumentScreen>
    with WidgetsBindingObserver {
  late final _title = TextEditingController(text: widget.title);
  late final DocumentDraft _draft;
  final _editor = RichEditorController();
  late Object? _initialContent = widget.content;
  int _editorVersion = 0;
  bool _unsupported = false, _fileBusy = false;
  CancelToken? _cancel;
  double? _progress;
  bool get _editable => widget.editable && !_unsupported;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _draft = DocumentDraft(
      title: widget.title,
      content: widget.content,
      persist: (title, content) async {
        if (widget.noteId != null) {
          await ref
              .read(notesRepositoryProvider)
              .update(widget.noteId!, title: title.trim(), content: content);
          ref.invalidate(notesProvider);
        } else {
          await ref
              .read(filesRepositoryProvider)
              .saveDocument(widget.workId!, content);
        }
      },
    )..addListener(_changed);
  }

  @override
  void didUpdateWidget(covariant DocumentScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_draft.dirty &&
        !_draft.saving &&
        (widget.title != _draft.title ||
            jsonEncode(widget.content) != jsonEncode(_draft.content))) {
      _draft.acceptRemote(widget.title, widget.content);
      _title.text = widget.title;
      _initialContent = widget.content;
      _editorVersion++;
      _unsupported = false;
    }
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) _draft.save();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cancel?.cancel();
    _draft.removeListener(_changed);
    _draft.dispose();
    _title.dispose();
    super.dispose();
  }

  Future<void> _import() async {
    setState(() => _fileBusy = true);
    try {
      final f = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['md', 'markdown'],
      );
      if (f == null || !mounted) return;
      if ((await f.length() ?? 2 * 1024 * 1024 + 1) > 2 * 1024 * 1024) {
        throw const FormatException('El archivo debe pesar menos de 2 MB.');
      }
      final text = utf8.decode(await f.readAsBytes());
      if (mounted) await _editor.command('import', text);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _fileBusy = false);
    }
  }

  Future<void> _export(String text) async {
    try {
      final name = _title.text
          .replaceAll(RegExp(r'[\\/:*?"<>|]'), '-')
          .replaceFirst(RegExp(r'\.md$', caseSensitive: false), '')
          .trim();
      await FilePicker.saveFile(
        fileName: '${name.isEmpty ? 'documento' : name}.md',
        bytes: Uint8List.fromList(utf8.encode(text)),
        mimeType: 'text/markdown',
      );
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _image() async {
    setState(() => _fileBusy = true);
    try {
      final f = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      );
      if (f == null || !mounted) return;
      final size = await f.length();
      if (size == null || size > 10 * 1024 * 1024) {
        throw const FormatException('La imagen debe pesar menos de 10 MB.');
      }
      _cancel = CancelToken();
      if (!mounted) return;
      final src = await ref.read(filesRepositoryProvider).upload(
        widget.workId!,
        f.readAsByteStream,
        size,
        f.name,
        '',
        _cancel!,
        (n, total) {
          if (mounted) setState(() => _progress = total > 0 ? n / total : null);
        },
        attachment: true,
      );
      if (mounted && src != null) await _editor.command('image', src);
    } catch (e) {
      if (mounted && !(e is DioException && CancelToken.isCancel(e))) {
        showErrorSnack(context, e);
      }
    } finally {
      _cancel = null;
      if (mounted) {
        setState(() {
          _fileBusy = false;
          _progress = null;
        });
      }
    }
  }

  Future<void> _delete() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Borrar nota'),
        content: const Text('¿Borrar esta nota? No se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Borrar'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    await _draft.save();
    if (!mounted || _draft.dirty) return;
    try {
      await ref.read(notesRepositoryProvider).delete(widget.noteId!);
      ref.invalidate(notesProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_draft.dirty && !_draft.saving && !_fileBusy,
    onPopInvokedWithResult: (didPop, _) async {
      if (didPop) {
        if (widget.workId != null) {
          ref.invalidate(workDetailProvider(widget.workId!));
        }
        if (widget.noteId != null) ref.invalidate(noteProvider(widget.noteId!));
        return;
      }
      if (_fileBusy) return;
      await _draft.save();
      if (context.mounted && !_draft.dirty) Navigator.pop(context);
    },
    child: Scaffold(
      appBar: AppBar(
        title: Text(widget.noteId != null ? 'Nota' : 'Documentación'),
        actions: [
          if (widget.editable)
            IconButton(
              key: ValueKey(
                widget.noteId != null ? 'note_save' : 'document_save',
              ),
              tooltip:
                  'Guardar ${widget.noteId != null ? 'nota' : 'documento'}',
              onPressed: _draft.dirty && !_draft.saving ? _draft.save : null,
              icon: const Icon(Icons.check),
            ),
          PopupMenuButton<String>(
            key: const ValueKey('document_options'),
            tooltip: 'Opciones del documento',
            onSelected: (v) {
              if (v == 'import') _import();
              if (v == 'export') _editor.command('export');
              if (v == 'image') _image();
              if (v == 'delete') _delete();
            },
            itemBuilder: (_) => [
              if (_editable)
                PopupMenuItem(
                  value: 'import',
                  enabled: !_fileBusy,
                  child: const Text('Importar .md'),
                ),
              PopupMenuItem(
                value: 'export',
                enabled: !_unsupported,
                child: const Text('Exportar .md'),
              ),
              if (_editable && widget.workId != null)
                PopupMenuItem(
                  value: 'image',
                  enabled: !_fileBusy,
                  child: const Text('Adjuntar imagen'),
                ),
              if (widget.noteId != null)
                PopupMenuItem(
                  key: const ValueKey('note_delete'),
                  value: 'delete',
                  enabled: !_draft.saving && !_fileBusy,
                  child: const Text('Borrar nota'),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (widget.noteId != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                key: const ValueKey('note_title'),
                controller: _title,
                readOnly: !widget.editable,
                decoration: const InputDecoration(
                  hintText: 'Título',
                  counterText: '',
                ),
                style: Theme.of(context).textTheme.titleLarge,
                onChanged: (v) => _draft.change(title: v),
              ),
            ),
          if (widget.editable)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _draft.status,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  if (_draft.error != null)
                    TextButton(
                      key: const ValueKey('document_retry'),
                      onPressed: _draft.saving ? null : _draft.save,
                      child: const Text('Reintentar'),
                    ),
                ],
              ),
            ),
          if (_draft.error != null)
            Padding(
              padding: const EdgeInsets.all(8),
              child: ErrorText(
                _draft.error is ApiException
                    ? '${(_draft.error as ApiException).message} Tus cambios siguen acá.'
                    : 'Tus cambios siguen acá. Revisá la conexión y reintentá.',
              ),
            ),
          if (_fileBusy)
            Row(
              children: [
                Expanded(child: LinearProgressIndicator(value: _progress)),
                if (_cancel != null)
                  IconButton(
                    tooltip: 'Cancelar subida',
                    onPressed: () => _cancel?.cancel(),
                    icon: const Icon(Icons.close),
                  ),
              ],
            ),
          Expanded(
            child: ref.watch(richEditorBuilderProvider)(
              RichDocumentEditor(
                key: ValueKey('rich_editor_$_editorVersion'),
                bodyKey: widget.noteId != null ? 'note_body' : 'document_body',
                content: _initialContent,
                editable: widget.editable,
                controller: _editor,
                onChanged: (v) => _draft.change(content: v),
                onMarkdown: _export,
                onUnsupported: () => setState(() => _unsupported = true),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
