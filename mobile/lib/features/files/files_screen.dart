import 'dart:io';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/providers.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/storage_file.dart';
import '../../shared/widgets/async_value_view.dart';
import '../works/works_providers.dart';
import 'files_providers.dart';
import 'file_shares_screen.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_inline_notice.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/gen_section_header.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';

class FilesScreen extends ConsumerStatefulWidget {
  const FilesScreen({super.key, required this.workId});
  final String workId;
  @override
  ConsumerState<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends ConsumerState<FilesScreen> {
  final List<StorageFile> _trail = [];
  String get _path => _trail.lastOrNull?.path ?? '';
  ({String id, String path}) get _key => (id: widget.workId, path: _path);
  Object? _error;
  bool _busy = false;
  CancelToken? _cancel;
  String? _transfer;
  double? _progress;
  @override
  void dispose() {
    _cancel?.cancel();
    super.dispose();
  }

  void _reload() => ref.invalidate(workFilesProvider(_key));
  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) _reload();
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _name(String title, [String initial = '']) async {
    var value = initial;
    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, set) => AlertDialog(
          title: Text(title),
          content: TextFormField(
            key: const ValueKey('file_name'),
            initialValue: initial,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Nombre'),
            onChanged: (v) => set(() => value = v),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed:
                  value.trim().isEmpty ||
                      value.contains('/') ||
                      value == '.' ||
                      value == '..'
                  ? null
                  : () => Navigator.pop(context, value.trim()),
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _confirm(StorageFile f) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Eliminar ${f.name}'),
          content: Text(
            f.isDirectory
                ? 'Se eliminará esta carpeta y todo su contenido. No se puede deshacer.'
                : 'No se puede deshacer.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Eliminar'),
            ),
          ],
        ),
      ) ==
      true;
  void _progressChanged(int sent, int total) {
    if (mounted) {
      setState(() => _progress = total > 0 ? (sent / total).clamp(0, 1) : null);
    }
  }

  Future<void> _upload() async {
    final destination = _path;
    await _run(() async {
      final picked = await FilePicker.pickFiles();
      if (!mounted || picked.isEmpty) return;
      _cancel = CancelToken();
      try {
        for (final f in picked) {
          if (_cancel!.isCancelled) break;
          setState(() {
            _transfer = 'Subiendo ${f.name}';
            _progress = 0;
          });
          final size = await f.length();
          if (size == null) {
            throw const FormatException('No se pudo leer el archivo.');
          }
          await ref
              .read(filesRepositoryProvider)
              .upload(
                widget.workId,
                f.readAsByteStream,
                size,
                f.name,
                destination,
                _cancel!,
                _progressChanged,
              );
        }
      } on DioException catch (e) {
        if (!CancelToken.isCancel(e)) rethrow;
      } finally {
        _cancel = null;
        if (mounted) setState(() => _transfer = null);
      }
    });
  }

  Future<void> _download(StorageFile f) async {
    await _run(() async {
      _cancel = CancelToken();
      Directory? dir;
      try {
        setState(() {
          _transfer = 'Descargando ${f.name}';
          _progress = null;
        });
        dir = await (await getTemporaryDirectory()).createTemp('genwork-');
        final safe = f.name.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
        final destination = '${dir.path}/${safe.isEmpty ? 'archivo' : safe}';
        await ref
            .read(filesRepositoryProvider)
            .download(
              widget.workId,
              f,
              destination,
              _cancel!,
              _progressChanged,
            );
        if (!mounted) return;
        final result = await OpenFilex.open(destination);
        if (result.type != ResultType.done) {
          throw const FormatException(
            'El archivo se descargó, pero no hay una aplicación disponible para abrirlo.',
          );
        }
        // Keep the downloaded file for the receiving app. Android/iOS can clear
        // this cache; files are private and never overwrite user documents.
        dir = null;
      } on DioException catch (e) {
        if (!CancelToken.isCancel(e)) rethrow;
      } finally {
        if (dir != null && await dir.exists()) {
          await dir.delete(recursive: true);
        }
        _cancel = null;
        if (mounted) setState(() => _transfer = null);
      }
    });
  }

  Future<void> _action(String action, StorageFile f) async {
    final repo = ref.read(filesRepositoryProvider);
    if (action == 'download') await _download(f);
    if (action == 'rename') {
      final name = await _name('Renombrar', f.name);
      if (name != null && mounted) {
        await _run(() => repo.rename(widget.workId, f.path, name));
      }
    }
    if (action == 'delete' && await _confirm(f) && mounted) {
      await _run(() => repo.delete(widget.workId, f.path));
    }
    if (action == 'share' && mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute<void>(
          builder: (_) => FileSharesScreen(workId: widget.workId, file: f),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final work = ref.watch(workDetailProvider(widget.workId));
    final files = ref.watch(workFilesProvider(_key));
    final canEdit =
        work.value?.canOperate == true &&
        work.value?.isArchived == false &&
        !work.hasError;
    final ready = files.value?.ready == true && !files.hasError;
    return PopScope(
      canPop: !_busy,
      onPopInvokedWithResult: (p, _) {
        if (!p && _busy) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Esperá a que termine o cancelá la transferencia.'),
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const BrandName(size: 16)),
        body: Column(
          children: [
            GenSectionHeader(
              title: 'Archivos',
              icon: AppIcons.projects,
              actions: [
                IconButton(
                  key: const ValueKey('files_refresh'),
                  tooltip: 'Actualizar archivos',
                  onPressed: _busy ? null : _reload,
                  icon: const Icon(AppIcons.retry),
                ),
              ],
            ),
            if (_trail.isNotEmpty)
              ListTile(
                key: const ValueKey('files_up'),
                leading: const Icon(AppIcons.sortAsc),
                title: Text(_trail.last.name),
                subtitle: const Text('Volver a la carpeta anterior'),
                onTap: _busy ? null : () => setState(() => _trail.removeLast()),
              ),
            if (canEdit && ready)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.md,
                  AppSpacing.md,
                  0,
                ),
                child: Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    FilledButton.icon(
                      key: const ValueKey('files_upload'),
                      onPressed: _busy ? null : _upload,
                      icon: const Icon(AppIcons.upload),
                      label: const Text('Subir archivos'),
                    ),
                    OutlinedButton.icon(
                      key: const ValueKey('files_new_folder'),
                      onPressed: _busy
                          ? null
                          : () async {
                              final name = await _name('Nueva carpeta');
                              if (name != null && mounted) {
                                await _run(
                                  () => ref
                                      .read(filesRepositoryProvider)
                                      .folder(widget.workId, _path, name),
                                );
                              }
                            },
                      icon: const Icon(AppIcons.newFolder),
                      label: const Text('Nueva carpeta'),
                    ),
                  ],
                ),
              ),
            if (_transfer != null)
              ListTile(
                title: Text(_transfer!),
                subtitle: LinearProgressIndicator(value: _progress),
                trailing: IconButton(
                  key: const ValueKey('files_cancel'),
                  tooltip: 'Cancelar transferencia',
                  onPressed: () => _cancel?.cancel(),
                  icon: const Icon(AppIcons.close),
                ),
              ),
            if (_error != null) StorageError(error: _error!),
            Expanded(
              child: AsyncValueView(
                value: files,
                onRetry: _reload,
                data: (data) {
                  if (!data.ready) {
                    return Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              AppIcons.projects,
                              size: AppIconSizes.state,
                              color: context.colors.muted,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Text(
                              data.folderEnabled == true
                                  ? 'La carpeta se está preparando'
                                  : 'Carpeta no habilitada',
                              textAlign: TextAlign.center,
                              style: AppTextStyles.dialogTitle.copyWith(
                                color: context.colors.text,
                              ),
                            ),
                            if (data.folderEnabled != true) ...[
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                'Este proyecto todavía no tiene carpeta de archivos. Habilitala para poder subir, organizar y compartir documentos.',
                                textAlign: TextAlign.center,
                                style: AppTextStyles.body.copyWith(
                                  color: context.colors.muted,
                                ),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.md),
                            if (data.folderEnabled == false && data.canEnable)
                              FilledButton(
                                key: const ValueKey('files_enable'),
                                onPressed: _busy
                                    ? null
                                    : () => _run(
                                        () => ref
                                            .read(filesRepositoryProvider)
                                            .enable(widget.workId),
                                      ),
                                child: const Text('Habilitar carpeta'),
                              ),
                            if (data.folderEnabled == true)
                              TextButton(
                                onPressed: _reload,
                                child: const Text('Reintentar'),
                              ),
                            if (data.folderEnabled == false && !data.canEnable)
                              Text(
                                'Un administrador puede habilitar la carpeta.',
                                textAlign: TextAlign.center,
                                style: AppTextStyles.body.copyWith(
                                  color: context.colors.muted,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }
                  if (data.files.isEmpty) {
                    return const Center(
                      child: EmptyView(
                        icon: AppIcons.projects,
                        message: 'Esta carpeta está vacía',
                      ),
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () async {
                      return ref
                          .refresh(workFilesProvider(_key).future)
                          .then((_) {});
                    },
                    child: ListView(
                      key: const ValueKey('files_list'),
                      padding: const EdgeInsets.all(AppSpacing.md),
                      children: [
                        WorkspaceListPanel(
                          children: [
                            for (final f in data.files)
                              _FileRow(
                                file: f,
                                busy: _busy,
                                canEdit: canEdit,
                                onTap: () => f.isDirectory
                                    ? setState(() => _trail.add(f))
                                    : _download(f),
                                onAction: (v) => _action(v, f),
                              ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Fila de archivo o carpeta: ícono `muted`, nombre y tamaño en Mono, y el menú
/// de opciones (descargar, compartidos, renombrar, eliminar).
class _FileRow extends StatelessWidget {
  const _FileRow({
    required this.file,
    required this.busy,
    required this.canEdit,
    required this.onTap,
    required this.onAction,
  });

  final StorageFile file;
  final bool busy, canEdit;
  final VoidCallback onTap;
  final ValueChanged<String> onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListTile(
      key: ValueKey('file_${file.path}'),
      leading: Icon(
        file.isDirectory ? AppIcons.projects : AppIcons.file,
        color: c.muted,
      ),
      title: Text(
        file.name,
        style: AppTextStyles.itemTitle.copyWith(
          fontWeight: FontWeight.w400,
          color: c.text,
        ),
      ),
      subtitle: Text(
        file.isDirectory ? 'Carpeta' : file.sizeLabel,
        style: file.isDirectory
            ? AppTextStyles.supporting.copyWith(color: c.muted)
            : AppTextStyles.technical.copyWith(color: c.muted),
      ),
      onTap: busy ? null : onTap,
      trailing: PopupMenuButton<String>(
        tooltip: 'Opciones de ${file.name}',
        enabled: !busy,
        onSelected: onAction,
        itemBuilder: (_) => [
          if (!file.isDirectory)
            const PopupMenuItem(
              value: 'download',
              child: Text('Descargar y abrir'),
            ),
          const PopupMenuItem(value: 'share', child: Text('Compartidos')),
          if (canEdit) ...[
            const PopupMenuItem(value: 'rename', child: Text('Renombrar')),
            const PopupMenuDivider(),
            PopupMenuItem(
              value: 'delete',
              child: Text(
                'Eliminar',
                style: AppTextStyles.body.copyWith(color: c.danger),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class StorageError extends ConsumerWidget {
  const StorageError({super.key, required this.error});
  final Object error;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final e = error;
    final identity = e is ApiException && e.code == 'STORAGE_IDENTITY_MISSING';
    final message = e is ApiException
        ? e.message
        : e is FormatException
        ? e.message
        : 'No se pudo completar la operación. Reintentá.';
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppInlineNotice.error(message: message),
          if (identity)
            TextButton(
              onPressed: () async {
                final base = Uri.parse(
                  ref.read(apiClientProvider).dio.options.baseUrl,
                );
                await launchUrl(
                  base.resolve('/settings'),
                  mode: LaunchMode.externalApplication,
                );
              },
              child: const Text('Vincular cuenta en la web'),
            ),
        ],
      ),
    );
  }
}
