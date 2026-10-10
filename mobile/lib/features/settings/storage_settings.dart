import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/auth/pkce.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/json.dart';
import '../../shared/widgets/state_views.dart';
import 'settings_form_dialog.dart';
import 'settings_providers.dart';
import '../../core/theme/app_geometry.dart';

/// Se puede sustituir en tests sin abrir un navegador ni compartir credenciales.
final integrationBrowserProvider = Provider<Future<String> Function(String)>(
  (ref) =>
      (url) =>
          FlutterWebAuth2.authenticate(url: url, callbackUrlScheme: 'genwork'),
);
final externalBrowserProvider = Provider<Future<bool> Function(Uri)>(
  (ref) =>
      (uri) => launchUrl(uri, mode: LaunchMode.externalApplication),
);

class GoogleIntegrationButton extends ConsumerStatefulWidget {
  const GoogleIntegrationButton({
    super.key,
    required this.purpose,
    required this.label,
    required this.onChanged,
  });
  final String purpose, label;
  final VoidCallback onChanged;
  @override
  ConsumerState<GoogleIntegrationButton> createState() =>
      _GoogleIntegrationButtonState();
}

class _GoogleIntegrationButtonState
    extends ConsumerState<GoogleIntegrationButton> {
  bool busy = false;
  Future<void> connect() async {
    setState(() => busy = true);
    final repo = ref.read(settingsRepositoryProvider);
    String? flowId;
    var completed = false;
    try {
      final browser = ref.read(integrationBrowserProvider);
      final pkce = Pkce.generate();
      final start = await repo.startGoogle(widget.purpose, pkce.challenge);
      flowId = start['flowId'] as String;
      if (!mounted) return;
      final url = Uri.parse(start['url'] as String);
      if (url.scheme != 'https' || url.host != 'accounts.google.com') {
        throw const ApiException(
          code: 'INVALID_URL',
          message:
              'El servidor devolvió una dirección de autorización inválida.',
        );
      }
      final result = Uri.parse(await browser(url.toString()));
      if (result.scheme != 'genwork' ||
          result.host != 'integration' ||
          result.queryParameters['flowId'] != start['flowId']) {
        throw const ApiException(
          code: 'INVALID_STATE',
          message:
              'La autorización no coincide con esta solicitud. Volvé a intentar.',
        );
      }
      if (result.queryParameters['error'] != null) {
        throw const ApiException(
          code: 'OAUTH_ERROR',
          message:
              'No se completó la autorización de Google. Podés reintentar.',
        );
      }
      if (!mounted) return;
      await repo.finishGoogle(start['flowId'], pkce.verifier);
      completed = true;
      if (mounted) {
        widget.onChanged();
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Cuenta conectada.')));
      }
    } on PlatformException catch (e) {
      if (mounted && e.code != 'CANCELED') showErrorSnack(context, e);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (flowId != null && !completed) {
        try {
          await repo.cancelGoogle(flowId);
        } catch (_) {
          /* El servidor también vence el flujo. */
        }
      }
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    key: ValueKey('settings_google_${widget.purpose}'),
    onPressed: busy ? null : connect,
    icon: const Icon(Icons.link),
    label: Text(busy ? 'Esperando autorización…' : widget.label),
  );
}

class StorageAccountPanel extends ConsumerStatefulWidget {
  const StorageAccountPanel({
    super.key,
    required this.status,
    required this.onChanged,
  });
  final Json status;
  final VoidCallback onChanged;
  @override
  ConsumerState<StorageAccountPanel> createState() =>
      _StorageAccountPanelState();
}

class _StorageAccountPanelState extends ConsumerState<StorageAccountPanel> {
  Timer? timer;
  bool busy = false;
  String? token;
  DateTime? deadline;
  int generation = 0;
  @override
  void dispose() {
    generation++;
    timer?.cancel();
    super.dispose();
  }

  void cancel() {
    generation++;
    timer?.cancel();
    token = null;
    if (mounted) setState(() => busy = false);
  }

  Future<void> poll(int version) async {
    if (!mounted || version != generation || token == null) return;
    try {
      if (DateTime.now().isAfter(deadline!)) {
        throw const ApiException(
          code: 'EXPIRED',
          message: 'La autorización expiró. Volvé a vincular tu cuenta.',
        );
      }
      final result = await ref
          .read(settingsRepositoryProvider)
          .pollNextcloud(token!);
      if (!mounted || version != generation) return;
      if (result['status'] == 'LINKED') {
        cancel();
        widget.onChanged();
        return;
      }
      timer = Timer(const Duration(seconds: 3), () => poll(version));
    } catch (e) {
      if (mounted && version == generation) {
        cancel();
        showErrorSnack(context, e);
      }
    }
  }

  Future<void> link() async {
    setState(() => busy = true);
    final version = ++generation;
    try {
      final start = await ref.read(settingsRepositoryProvider).startNextcloud();
      if (!mounted || version != generation) return;
      final uri = Uri.parse(start['loginUrl']);
      if (!['http', 'https'].contains(uri.scheme) ||
          !await ref.read(externalBrowserProvider)(uri)) {
        throw const ApiException(
          code: 'BROWSER',
          message: 'No se pudo abrir la autorización.',
        );
      }
      if (!mounted || version != generation) return;
      token = start['pollToken'];
      deadline = DateTime.now().add(const Duration(minutes: 20));
      await poll(version);
    } catch (e) {
      if (mounted && version == generation) {
        cancel();
        showErrorSnack(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.status;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (s['provider'] == 'GDRIVE')
          const Text(
            'Google Drive usa la cuenta principal de la organización. El administrador gestiona su conexión en Almacenamiento del sistema.',
          )
        else ...[
          Text(
            s['linked'] == true
                ? 'Tu cuenta Nextcloud está vinculada.'
                : 'Vinculá tu cuenta Nextcloud para acceder a tus archivos con tus permisos.',
          ),
          if (s['linkedAt'] != null) Text('Vinculada desde ${s['linkedAt']}'),
          if (s['linked'] == true)
            OutlinedButton.icon(
              key: const ValueKey('settings_unlink_storage'),
              onPressed: busy
                  ? null
                  : () async {
                      if (!await settingsConfirm(
                            context,
                            '¿Desvincular Nextcloud?',
                            'Tendrás que volver a autorizar el acceso a tus archivos.',
                            action: 'Desvincular',
                          ) ||
                          !mounted) {
                        return;
                      }
                      setState(() => busy = true);
                      try {
                        await ref
                            .read(settingsRepositoryProvider)
                            .unlinkStorage('NEXTCLOUD');
                        if (mounted) widget.onChanged();
                      } catch (e) {
                        if (context.mounted) showErrorSnack(context, e);
                      } finally {
                        if (mounted) setState(() => busy = false);
                      }
                    },
              icon: const Icon(Icons.link_off),
              label: const Text('Desvincular'),
            )
          else
            FilledButton(
              key: const ValueKey('settings_link_nextcloud'),
              onPressed: busy ? null : link,
              child: Text(
                busy ? 'Esperando autorización…' : 'Vincular Nextcloud',
              ),
            ),
          if (busy && s['linked'] != true) ...[
            const Text(
              'Completá la autorización en el navegador y volvé a la app.',
            ),
            TextButton(
              key: const ValueKey('settings_cancel_link'),
              onPressed: cancel,
              child: const Text('Cancelar vinculación'),
            ),
          ],
        ],
      ],
    );
  }
}

class SystemStoragePanel extends ConsumerStatefulWidget {
  const SystemStoragePanel({
    super.key,
    required this.config,
    required this.onChanged,
  });
  final Json config;
  final VoidCallback onChanged;
  @override
  ConsumerState<SystemStoragePanel> createState() => _SystemStoragePanelState();
}

class _SystemStoragePanelState extends ConsumerState<SystemStoragePanel> {
  bool savingFolder = false;
  Json get config => widget.config;
  void onChanged() => widget.onChanged();
  Future<void> edit(
    BuildContext context,
    WidgetRef ref,
    String provider,
  ) async {
    final current = config['provider'] == provider;
    final fields = provider == 'NEXTCLOUD'
        ? [
            SettingsField(
              'url',
              'Dirección de Nextcloud',
              initial: current ? config['url'] ?? '' : '',
              maxLength: 2048,
              validate: (v) {
                final uri = Uri.tryParse(v);
                return uri == null ||
                        !['https', 'http'].contains(uri.scheme) ||
                        uri.host.isEmpty
                    ? 'Ingresá una dirección http o https.'
                    : null;
              },
            ),
            SettingsField(
              'adminUser',
              'Usuario administrador',
              initial: current ? config['adminUser'] ?? '' : '',
            ),
            SettingsField(
              'adminPassword',
              'Contraseña de aplicación',
              required: !current,
              secret: true,
              maxLength: 2000,
            ),
          ]
        : [
            SettingsField(
              'sharedDriveId',
              'ID de unidad compartida (opcional)',
              initial: current ? config['sharedDriveId'] ?? '' : '',
              required: false,
            ),
            SettingsField(
              'orgName',
              'Nombre de la empresa',
              initial: current ? config['orgName'] ?? '' : '',
              required: false,
              maxLength: 80,
            ),
          ];
    final done = await settingsForm(
      context,
      title: provider == 'NEXTCLOUD'
          ? 'Configurar Nextcloud'
          : 'Configurar Google Drive',
      description: provider == 'NEXTCLOUD'
          ? 'Dejá la contraseña vacía para conservar la existente.'
          : 'Cambiar la empresa puede renombrar la carpeta de genwork.',
      fields: fields,
      save: (v) => ref
          .read(settingsRepositoryProvider)
          .saveStorage(
            {
              'provider': provider,
              ...v,
              if (provider == 'NEXTCLOUD' && v['adminPassword'] == '')
                'adminPassword': null,
            }..removeWhere(
              (key, value) => key == 'adminPassword' && value == null,
            ),
          ),
    );
    if (done == true) onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final google = config['provider'] == 'GDRIVE';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Proveedor activo: ${google ? 'Google Drive' : 'Nextcloud'}'),
        if (google) ...[
          Text(
            config['connected'] == true
                ? 'Cuenta conectada: ${config['connectedEmail'] ?? 'Google'}'
                : 'Cuenta sin conectar',
          ),
          Text(
            'Empresa: ${config['orgName'] ?? config['defaultOrgName'] ?? ''}',
          ),
          Text(
            'Carpeta raíz: ${config['rootFolderId'] == '' ? 'Mi unidad' : config['rootFolderId'] ?? 'Mi unidad'}',
          ),
          GoogleIntegrationButton(
            purpose: 'drive',
            label: config['connected'] == true
                ? 'Reconectar Google Drive'
                : 'Conectar Google Drive',
            onChanged: onChanged,
          ),
          OutlinedButton.icon(
            key: const ValueKey('settings_drive_folder'),
            onPressed: savingFolder || config['connected'] != true
                ? null
                : () async {
                    final picked = await showDialog<String>(
                      context: context,
                      builder: (_) => DriveFolderDialog(
                        initial: config['rootFolderId'],
                        sharedDriveId: config['sharedDriveId'],
                      ),
                    );
                    if (picked == null || !context.mounted) return;
                    if (!await settingsConfirm(
                      context,
                      '¿Cambiar carpeta raíz?',
                      'La carpeta de genwork y su contenido pueden moverse a la ubicación elegida.',
                    )) {
                      return;
                    }
                    if (!mounted) return;
                    setState(() => savingFolder = true);
                    try {
                      await ref.read(settingsRepositoryProvider).saveStorage({
                        'provider': 'GDRIVE',
                        'sharedDriveId': config['sharedDriveId'],
                        'rootFolderId': picked.isEmpty ? null : picked,
                      });
                      if (mounted) onChanged();
                    } catch (e) {
                      if (context.mounted) showErrorSnack(context, e);
                    } finally {
                      if (mounted) setState(() => savingFolder = false);
                    }
                  },
            icon: const Icon(Icons.folder_open),
            label: const Text('Elegir carpeta raíz'),
          ),
        ] else ...[
          Text('${config['url'] ?? ''}'),
          Text('Usuario: ${config['adminUser'] ?? ''}'),
        ],
        OutlinedButton(
          key: const ValueKey('settings_edit_storage'),
          onPressed: () => edit(context, ref, google ? 'GDRIVE' : 'NEXTCLOUD'),
          child: const Text('Editar configuración'),
        ),
        OutlinedButton(
          key: const ValueKey('settings_change_provider'),
          onPressed: () async {
            final provider = google ? 'NEXTCLOUD' : 'GDRIVE';
            if (await settingsConfirm(
                  context,
                  '¿Cambiar proveedor?',
                  'Cambiar el proveedor afecta el acceso a los archivos del sistema. Revisá la configuración antes de guardar.',
                ) &&
                context.mounted) {
              await edit(context, ref, provider);
            }
          },
          child: Text(
            google ? 'Cambiar a Nextcloud' : 'Cambiar a Google Drive',
          ),
        ),
      ],
    );
  }
}

class DriveFolderDialog extends ConsumerStatefulWidget {
  const DriveFolderDialog({super.key, this.initial, this.sharedDriveId});
  final String? initial, sharedDriveId;
  @override
  ConsumerState<DriveFolderDialog> createState() => _DriveFolderDialogState();
}

class _DriveFolderDialogState extends ConsumerState<DriveFolderDialog> {
  Json? data;
  Object? error;
  bool loading = true;
  int version = 0;
  String? parent;
  @override
  void initState() {
    super.initState();
    load(widget.initial);
  }

  Future<void> load(String? id) async {
    final request = ++version;
    setState(() {
      loading = true;
      error = null;
      parent = id;
    });
    try {
      final result = await ref
          .read(settingsRepositoryProvider)
          .folders(parent: id, sharedDriveId: widget.sharedDriveId ?? '');
      if (mounted && request == version) setState(() => data = result);
    } catch (e) {
      if (mounted && request == version) setState(() => error = e);
    } finally {
      if (mounted && request == version) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final path = (data?['path'] as List?) ?? [];
    return AlertDialog(
      title: const Text('Carpeta raíz de genwork'),
      content: SizedBox(
        width: AppGeometry.dialogNarrow,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextButton(
                key: const ValueKey('settings_drive_root'),
                onPressed: loading ? null : () => load(null),
                child: const Text('Mi unidad / raíz'),
              ),
              for (final crumb in path)
                TextButton(
                  key: ValueKey('settings_drive_path_${crumb['id']}'),
                  onPressed: loading ? null : () => load(crumb['id']),
                  child: Text(crumb['name']),
                ),
              if (loading) const LoadingView(),
              if (error != null)
                ErrorView(error: error!, onRetry: () => load(parent)),
              if (!loading && error == null)
                for (final folder in (data?['folders'] as List?) ?? [])
                  ListTile(
                    key: ValueKey('settings_drive_child_${folder['id']}'),
                    leading: const Icon(Icons.folder_outlined),
                    title: Text(folder['name']),
                    onTap: () => load(folder['id']),
                  ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('settings_drive_pick'),
          onPressed: loading || error != null || data == null
              ? null
              : () => Navigator.pop(
                  context,
                  path.length <= 1 ? '' : path.last['id'],
                ),
          child: const Text('Elegir esta carpeta'),
        ),
      ],
    );
  }
}
