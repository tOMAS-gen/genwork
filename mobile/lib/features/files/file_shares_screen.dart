import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../data/models/storage_file.dart';
import '../../shared/widgets/async_value_view.dart';
import '../works/works_providers.dart';
import 'files_providers.dart';
import 'files_screen.dart';

class FileSharesScreen extends ConsumerStatefulWidget {
  const FileSharesScreen({super.key, required this.workId, required this.file});
  final String workId;
  final StorageFile file;
  @override
  ConsumerState<FileSharesScreen> createState() => _FileSharesScreenState();
}

class _FileSharesScreenState extends ConsumerState<FileSharesScreen> {
  final _email = TextEditingController(), _password = TextEditingController();
  bool _internal = false, _busy = false;
  DateTime? _expires;
  Object? _error;
  ({String id, String path}) get _key =>
      (id: widget.workId, path: widget.file.path);
  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) ref.invalidate(fileSharesProvider(_key));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copy(String link) async {
    await Clipboard.setData(ClipboardData(text: link));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enlace copiado')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final work = ref.watch(workDetailProvider(widget.workId));
    final edit =
        work.value?.canOperate == true &&
        work.value?.isArchived == false &&
        !work.hasError;
    return PopScope(
      canPop: !_busy,
      child: Scaffold(
        appBar: AppBar(title: const Text('Compartidos')),
        body: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Text(
              widget.file.name,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (edit) ...[
              SwitchListTile(
                key: const ValueKey('share_internal'),
                title: const Text('Compartir con un usuario'),
                subtitle: Text(
                  _internal
                      ? 'Por correo de genwork'
                      : 'Crear un enlace público',
                ),
                value: _internal,
                onChanged: _busy ? null : (v) => setState(() => _internal = v),
              ),
              if (_internal)
                TextField(
                  key: const ValueKey('share_email'),
                  controller: _email,
                  enabled: !_busy,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo del destinatario',
                  ),
                )
              else ...[
                TextField(
                  key: const ValueKey('share_password'),
                  controller: _password,
                  enabled: !_busy,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Contraseña opcional',
                  ),
                ),
                Wrap(
                  children: [
                    TextButton(
                      key: const ValueKey('share_expiry'),
                      onPressed: _busy
                          ? null
                          : () async {
                              final now = DateTime.now();
                              final date = await showDatePicker(
                                context: context,
                                initialDate:
                                    _expires ??
                                    now.add(const Duration(days: 7)),
                                firstDate: now,
                                lastDate: now.add(const Duration(days: 3650)),
                              );
                              if (date != null && mounted) {
                                setState(
                                  () => _expires = DateTime(
                                    date.year,
                                    date.month,
                                    date.day,
                                    23,
                                    59,
                                  ),
                                );
                              }
                            },
                      child: Text(
                        _expires == null
                            ? 'Agregar vencimiento'
                            : 'Vence ${_expires!.day}/${_expires!.month}/${_expires!.year}',
                      ),
                    ),
                    if (_expires != null)
                      IconButton(
                        tooltip: 'Quitar vencimiento',
                        onPressed: _busy
                            ? null
                            : () => setState(() => _expires = null),
                        icon: const Icon(AppIcons.close),
                      ),
                  ],
                ),
              ],
              FilledButton(
                key: const ValueKey('share_create'),
                onPressed: _busy
                    ? null
                    : () => _run(() async {
                        if (_internal && _email.text.trim().isEmpty) {
                          throw const FormatException(
                            'Ingresá el correo del destinatario.',
                          );
                        }
                        await ref
                            .read(filesRepositoryProvider)
                            .share(
                              widget.workId,
                              widget.file.path,
                              email: _internal ? _email.text.trim() : null,
                              password: !_internal && _password.text.isNotEmpty
                                  ? _password.text
                                  : null,
                              expires: _internal ? null : _expires,
                            );
                        if (mounted) _password.clear();
                      }),
                child: Text(
                  _busy
                      ? 'Guardando…'
                      : _internal
                      ? 'Compartir'
                      : 'Crear enlace',
                ),
              ),
              const Text(
                'Las opciones disponibles dependen del proveedor de almacenamiento.',
              ),
            ],
            if (_error != null) StorageError(error: _error!),
            const Divider(),
            AsyncValueView(
              value: ref.watch(fileSharesProvider(_key)),
              onRetry: () => ref.invalidate(fileSharesProvider(_key)),
              data: (shares) => Column(
                children: [
                  if (shares.isEmpty)
                    const ListTile(title: Text('Sin accesos compartidos')),
                  for (final s in shares)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s.mode == 'LINK'
                                  ? 'Enlace público'
                                  : s.recipient ?? 'Usuario',
                            ),
                            if (s.expires != null)
                              Text(
                                'Vence ${s.expires!.toLocal().day}/${s.expires!.toLocal().month}/${s.expires!.toLocal().year}',
                              ),
                            if (s.link != null) SelectableText(s.link!),
                            Wrap(
                              children: [
                                if (s.link != null)
                                  TextButton.icon(
                                    key: ValueKey('share_copy_${s.id}'),
                                    onPressed: () => _copy(s.link!),
                                    icon: const Icon(AppIcons.copy),
                                    label: const Text('Copiar enlace'),
                                  ),
                                if (edit)
                                  TextButton(
                                    key: ValueKey('share_revoke_${s.id}'),
                                    onPressed: _busy
                                        ? null
                                        : () async {
                                            final yes = await showDialog<bool>(
                                              context: context,
                                              builder: (context) => AlertDialog(
                                                title: const Text(
                                                  'Revocar acceso',
                                                ),
                                                content: const Text(
                                                  'Este acceso compartido dejará de estar disponible.',
                                                ),
                                                actions: [
                                                  TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(context),
                                                    child: const Text(
                                                      'Cancelar',
                                                    ),
                                                  ),
                                                  FilledButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                          context,
                                                          true,
                                                        ),
                                                    child: const Text(
                                                      'Revocar',
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            );
                                            if (yes == true && mounted) {
                                              await _run(
                                                () => ref
                                                    .read(
                                                      filesRepositoryProvider,
                                                    )
                                                    .revoke(
                                                      widget.workId,
                                                      s.id,
                                                    ),
                                              );
                                            }
                                          },
                                    child: const Text('Revocar'),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
