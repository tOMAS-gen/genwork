import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/json.dart';
import '../../data/repositories/settings_repository.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_button_styles.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/theme_toggle.dart';
import '../works/works_providers.dart';
import 'settings_providers.dart';
import 'settings_form_dialog.dart';
import 'storage_settings.dart';
import '../../core/theme/app_geometry.dart';

class SettingsHomeScreen extends ConsumerWidget {
  const SettingsHomeScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final admin = ref.watch(currentUserProvider)?.isSuperAdmin == true;
    final c = context.colors;
    Widget label(String text) => Padding(
      padding: const EdgeInsets.only(top: AppSpacing.md, bottom: AppSpacing.xs),
      child: Semantics(
        header: true,
        child: Text(
          text.toUpperCase(),
          style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
        ),
      ),
    );
    Widget links(List<Widget> children) =>
        WorkspaceListPanel(children: children);

    return GenPageScaffold(
      title: 'Configuración',
      subtitle: 'Tu cuenta, preferencias y catálogos.',
      icon: AppIcons.settings,
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        key: const ValueKey('settings_home'),
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md,
        ),
        children: [
          label('Tu cuenta y preferencias'),
          links([
            const ThemeToggleTile(key: ValueKey('settings_theme')),
            for (final section in [
              SettingsSection.system,
              SettingsSection.storageLink,
              SettingsSection.mcp,
            ])
              _link(
                context,
                section.title,
                Routes.setting(section.name),
                section.name,
              ),
          ]),
          label('Catálogos por ámbito'),
          links([
            _link(
              context,
              'Etiquetas y colores',
              Routes.catalog('labels'),
              'labels',
            ),
            _link(
              context,
              'Etapas de producción',
              Routes.catalog('stages'),
              'stages',
            ),
            _link(
              context,
              'Estados de tarea',
              Routes.catalog('statuses'),
              'statuses',
            ),
          ]),
          if (admin) ...[
            label('Administración del sistema'),
            links([
              for (final section in [
                SettingsSection.access,
                SettingsSection.users,
                SettingsSection.clients,
                SettingsSection.storage,
                SettingsSection.reminders,
                SettingsSection.errors,
              ])
                _link(
                  context,
                  section.title,
                  Routes.setting(section.name),
                  section.name,
                ),
            ]),
          ],
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Widget _link(BuildContext context, String title, String route, String key) =>
      ListTile(
        key: ValueKey('settings_$key'),
        title: Text(title),
        trailing: Icon(
          AppIcons.chevronRight,
          size: AppIconSizes.action,
          color: context.colors.muted,
        ),
        onTap: () => context.push(route),
      );
}

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key, required this.section});
  final SettingsSection section;
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _busy = false;
  String? _filter = 'PENDING';
  SettingsQuery get query => (
    section: widget.section,
    filter: widget.section == SettingsSection.errors ? _filter : null,
  );
  SettingsRepository get repo => ref.read(settingsRepositoryProvider);
  void refresh() => refreshSettings(ref);
  Future<void> run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (mounted) refresh();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> edit(
    String title,
    List<SettingsField> fields,
    Future<void> Function(Json) save, {
    String? description,
  }) async {
    final done = await settingsForm(
      context,
      title: title,
      fields: fields,
      description: description,
      save: save,
    );
    if (done == true && mounted) refresh();
  }

  Widget button(
    String key,
    String text,
    VoidCallback action, {
    IconData icon = AppIcons.edit,
    bool destructive = false,
  }) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxs),
    child: OutlinedButton.icon(
      key: ValueKey('settings_$key'),
      style: destructive ? AppButtonStyles.destructiveOutlined(context) : null,
      onPressed: _busy ? null : action,
      icon: Icon(icon, size: AppIconSizes.field),
      label: Text(text),
    ),
  );
  Widget tile(
    String title,
    String subtitle, {
    Widget? trailing,
    VoidCallback? onTap,
    String? key,
    int? titleLines,
  }) => ListTile(
    key: key == null ? null : ValueKey(key),
    contentPadding: EdgeInsets.zero,
    title: Text(
      title,
      maxLines: titleLines,
      overflow: titleLines == null ? null : TextOverflow.ellipsis,
    ),
    subtitle: Text(subtitle),
    trailing: trailing,
    onTap: onTap,
  );
  @override
  Widget build(BuildContext context) {
    if (widget.section.adminOnly &&
        ref.watch(currentUserProvider)?.isSuperAdmin != true) {
      return GenPageScaffold(
        title: widget.section.title,
        showBack: true,
        bodyPadding: EdgeInsets.zero,
        body: const EmptyView(
          message:
              'Esta sección requiere permiso de administrador del sistema.',
        ),
      );
    }
    final data = ref.watch(settingsDataProvider(query));
    // Usuarios y clientes ya traen una tarjeta por persona; el resto se agrupa
    // en un único panel.
    final cards =
        widget.section == SettingsSection.users ||
        widget.section == SettingsSection.clients;
    final body = data.hasValue ? content(data.value) : const <Widget>[];
    return GenPageScaffold(
      title: widget.section.title,
      icon: AppIcons.settings,
      showBack: true,
      bodyPadding: EdgeInsets.zero,
      onRefresh: () async {
        ref.invalidate(settingsDataProvider(query));
        await ref.read(settingsDataProvider(query).future);
      },
      body: ListView(
        key: ValueKey('settings_list_${widget.section.name}'),
        padding: const EdgeInsets.all(AppSpacing.md),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          if (_busy) const LinearProgressIndicator(),
          if (widget.section == SettingsSection.errors) ...[
            DropdownButtonFormField<String>(
              key: const ValueKey('settings_error_filter'),
              initialValue: _filter ?? 'ALL',
              decoration: const InputDecoration(labelText: 'Estado'),
              items: const [
                DropdownMenuItem(value: 'ALL', child: Text('Todos')),
                DropdownMenuItem(value: 'PENDING', child: Text('Abiertos')),
                DropdownMenuItem(value: 'RESOLVED', child: Text('Resueltos')),
              ],
              onChanged: (v) => setState(() => _filter = v == 'ALL' ? null : v),
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          if (data.hasError)
            ErrorView(
              error: data.error!,
              onRetry: () => ref.invalidate(settingsDataProvider(query)),
            ),
          if (data.isLoading && !data.hasValue) const LoadingView(),
          if (data.hasValue && cards) ...body,
          if (data.hasValue && !cards)
            WorkspacePanel(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: body,
              ),
            ),
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  List<Widget> content(Object? value) {
    final json = asJson(value) ?? <String, dynamic>{};
    final list = value is List ? value : const [];
    switch (widget.section) {
      case SettingsSection.system:
        final storage = asJson(json['storage']) ?? {};
        return [
          tile(
            'Servidor genwork ${json['version'] ?? ''}',
            '${json['environment'] == 'development' ? 'Desarrollo' : 'Producción'}${json['commit'] == null ? '' : ' · ${json['commit']}'}',
          ),
          tile(
            storage['provider'] == 'GDRIVE' ? 'Google Drive' : 'Nextcloud',
            '${storage['configured'] == true ? 'Configurado' : 'Sin configurar'}${storage['account'] == null ? '' : ' · ${storage['account']}'}',
          ),
          if (ref.watch(currentUserProvider)?.isSuperAdmin == true)
            button(
              'test_connection',
              'Probar conexión',
              () => run(testConnection),
              icon: AppIcons.retry,
            ),
        ];
      case SettingsSection.storageLink:
        return [StorageAccountPanel(status: json, onChanged: refresh)];
      case SettingsSection.access:
        return [
          tile(
            'Modo de acceso',
            json['mode'] == 'DOMAIN'
                ? 'Dominio: ${json['domain'] ?? 'sin definir'}'
                : 'Lista de correos permitidos',
          ),
          button(
            'edit_access',
            'Editar acceso',
            () => edit(
              'Acceso al sistema',
              [
                SettingsField(
                  'mode',
                  'Modo',
                  initial: json['mode'] ?? 'LIST',
                  options: const {
                    'LIST': 'Lista de correos',
                    'DOMAIN': 'Dominio',
                  },
                ),
                SettingsField(
                  'domain',
                  'Dominio (sin https://)',
                  initial: json['domain'] ?? '',
                  required: false,
                  validate: (v) =>
                      v.isNotEmpty &&
                          !RegExp(
                            r'^@?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                          ).hasMatch(v)
                      ? 'Ingresá un dominio válido.'
                      : null,
                ),
              ],
              (input) async {
                if (input['mode'] == 'DOMAIN' && input['domain'] == '') {
                  throw const ApiException(
                    code: 'INVALID_INPUT',
                    message: 'Ingresá el dominio permitido.',
                  );
                }
                await repo.saveAccess({
                  ...input,
                  'domain': input['domain'] == '' ? null : input['domain'],
                });
              },
              description:
                  'Este cambio afecta quién puede ingresar al sistema.',
            ),
          ),
          tile(
            'Correos permitidos',
            'Agregar o quitar acceso por correo',
            trailing: const Icon(AppIcons.chevronRight),
            onTap: () => context.push(Routes.setting('emails')),
            key: 'settings_open_emails',
          ),
        ];
      case SettingsSection.emails:
        return [
          button(
            'add_email',
            'Agregar correo',
            () => edit('Permitir correo', [
              SettingsField(
                'email',
                'Correo',
                maxLength: 254,
                validate: emailError,
              ),
            ], (v) => repo.allowEmail(v['email'])),
            icon: AppIcons.add,
          ),
          if (list.isEmpty) const Text('No hay correos en la lista.'),
          for (final email in list)
            tile(
              '$email',
              'Correo permitido',
              trailing: IconButton(
                key: ValueKey('settings_remove_email_$email'),
                tooltip: 'Quitar correo',
                onPressed: _busy
                    ? null
                    : () async {
                        if (await settingsConfirm(
                          context,
                          '¿Quitar acceso?',
                          'El correo $email dejará de estar en la lista de acceso.',
                          action: 'Quitar',
                        )) {
                          await run(() => repo.removeEmail('$email'));
                        }
                      },
                icon: const Icon(AppIcons.personRemove),
              ),
            ),
        ];
      case SettingsSection.users:
        return [
          if (list.isEmpty) const Text('No hay usuarios internos.'),
          for (final raw in list) userCard(Json.from(raw as Map)),
        ];
      case SettingsSection.clients:
        return [
          button(
            'add_client',
            'Agregar cliente',
            addClient,
            icon: AppIcons.personAdd,
          ),
          if (list.isEmpty) const Text('No hay clientes externos.'),
          for (final raw in list) clientCard(Json.from(raw as Map)),
        ];
      case SettingsSection.errors:
        return [
          if (list.isEmpty)
            const Padding(
              padding: EdgeInsets.all(AppSpacing.lg),
              child: Text('No hay errores en este estado.'),
            ),
          for (final raw in list)
            tile(
              '${raw['message']}',
              '${raw['route'] ?? 'Sin ruta'} · ${raw['occurrences']} veces\n${raw['lastSeenAt']}',
              key: 'settings_error_${raw['id']}',
              titleLines: 3,
              trailing: const Icon(AppIcons.chevronRight),
              onTap: () => context.push(Routes.settingsError(raw['id'])),
            ),
        ];
      case SettingsSection.mcp:
        final connections = (json['connections'] as List?) ?? [];
        return [
          const Text(
            'Cada conexión permite que un asistente opere con los permisos de tu cuenta.',
          ),
          button('add_mcp', 'Crear conexión', createMcp, icon: AppIcons.add),
          tile(
            'Actividad reciente',
            'Operaciones de tus asistentes',
            key: 'settings_mcp_activity',
            trailing: const Icon(AppIcons.chevronRight),
            onTap: () => context.push(Routes.setting('activity')),
          ),
          if (connections.isEmpty) const Text('No tenés conexiones.'),
          for (final c in connections)
            tile(
              '${c['label']}',
              '${c['revokedAt'] != null ? 'Revocada' : 'Activa'} · Último uso: ${c['lastUsedAt'] ?? 'sin uso'}',
              trailing: c['revokedAt'] != null
                  ? null
                  : IconButton(
                      key: ValueKey('settings_revoke_mcp_${c['id']}'),
                      tooltip: 'Revocar conexión',
                      onPressed: _busy
                          ? null
                          : () async {
                              if (await settingsConfirm(
                                context,
                                '¿Revocar conexión?',
                                'El asistente perderá el acceso inmediatamente.',
                                action: 'Revocar',
                              )) {
                                await run(() => repo.revokeMcp(c['id']));
                              }
                            },
                      icon: const Icon(AppIcons.unlink),
                    ),
            ),
        ];
      case SettingsSection.activity:
        final entries = (json['entries'] as List?) ?? [];
        return [
          const Text(
            'Últimas 50 operaciones sin proyecto. La actividad de un proyecto se consulta en su detalle.',
          ),
          if (entries.isEmpty) const Text('Sin actividad reciente.'),
          for (final e in entries)
            tile('${e['summary']}', '${e['toolName']} · ${e['createdAt']}'),
        ];
      case SettingsSection.storage:
        return [
          SystemStoragePanel(config: json, onChanged: refresh),
          button(
            'test_connection',
            'Probar conexión guardada',
            () => run(testConnection),
            icon: AppIcons.retry,
          ),
          tile(
            'Trabajos de almacenamiento',
            'Pendientes, fallidos y reintentos',
            key: 'settings_open_jobs',
            trailing: const Icon(AppIcons.chevronRight),
            onTap: () => context.push(Routes.setting('jobs')),
          ),
        ];
      case SettingsSection.jobs:
        return [
          if (list.isEmpty)
            const Text('No hay trabajos pendientes ni fallidos.'),
          for (final j in list)
            tile(
              storageJobLabel(j['kind']),
              '${j['status'] == 'FAILED' ? 'Falló' : 'Pendiente'} · Intentos: ${j['attempts'] ?? 0}\n${j['lastError'] ?? ''}',
              trailing: j['status'] == 'FAILED'
                  ? IconButton(
                      key: ValueKey('settings_retry_job_${j['id']}'),
                      tooltip: 'Reintentar trabajo',
                      onPressed: _busy
                          ? null
                          : () => run(() => repo.retryJob(j['id'])),
                      icon: const Icon(AppIcons.retry),
                    )
                  : null,
            ),
        ];
      case SettingsSection.reminders:
        return [
          tile('Zona horaria del sistema', '${json['timezone']}'),
          button(
            'timezone',
            'Cambiar zona horaria',
            () => edit(
              'Zona horaria',
              [
                SettingsField(
                  'timezone',
                  'Zona IANA',
                  initial: json['timezone'] ?? '',
                  maxLength: 64,
                ),
              ],
              (v) => repo.saveReminders(v),
              description:
                  'La zona rige los días y horarios de todos los recordatorios.',
            ),
          ),
          GoogleIntegrationButton(
            purpose: 'gmail',
            label: json['emailConnected'] == true
                ? 'Reconectar Gmail'
                : 'Conectar Gmail',
            onChanged: refresh,
          ),
          tile(
            'Correo de avisos',
            json['emailConnected'] == true
                ? 'Conectado${json['emailFrom'] == null ? '' : ' · ${json['emailFrom']}'}'
                : 'Sin conectar',
          ),
          if (json['emailConnected'] == true)
            button(
              'disconnect_gmail',
              'Desconectar Gmail',
              () async {
                if (await settingsConfirm(
                  context,
                  '¿Desconectar Gmail?',
                  'Se dejarán de enviar los avisos por correo.',
                  action: 'Desconectar',
                )) {
                  await run(
                    () => repo.saveReminders({'disconnectEmail': true}),
                  );
                }
              },
              icon: AppIcons.unlink,
              destructive: true,
            ),
        ];
    }
  }

  Future<void> testConnection() async {
    final result = await repo.testStorage();
    if (!mounted) return;
    await showAppFormDialog<void>(
      context,
      builder: (context) => AppWorkDialog(
        title: result['ok'] == true
            ? 'Conexión correcta'
            : 'No se pudo conectar',
        onClose: () => Navigator.pop(context),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
        child: Text(
          result['detail'] ??
              (result['ok'] == true
                  ? 'La nube respondió correctamente.'
                  : 'Revisá la configuración del proveedor.'),
        ),
      ),
    );
  }

  Widget userCard(Json u) {
    final editable =
        u['globalRole'] != 'SUPERADMIN' &&
        u['id'] != ref.watch(currentUserProvider)?.id;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: WorkspacePanel(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            tile(
              u['name'] ?? u['email'],
              '${u['email']} · ${roleLabel(u['globalRole'])}',
            ),
            if (editable)
              button(
                'role_${u['id']}',
                'Cambiar rol',
                () => edit('Rol de ${u['name']}', [
                  SettingsField(
                    'role',
                    'Rol',
                    initial: u['globalRole'],
                    options: const {'MEMBER': 'Miembro', 'READER': 'Lector'},
                  ),
                ], (v) => repo.setRole(u['id'], v['role'])),
              ),
            if (u['globalRole'] == 'READER')
              button(
                'grants_${u['id']}',
                'Grupos con permiso de lectura',
                () async {
                  await showAppFormDialog<void>(
                    context,
                    builder: (_) => ReaderGrantsDialog(user: u),
                  );
                  if (mounted) refresh();
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget clientCard(Json c) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
    child: WorkspacePanel(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          tile(
            c['name'] ?? '',
            '${c['email']}\n${c['firstLoginAt'] == null ? 'Todavía no ingresó' : 'Ya ingresó al portal'}',
          ),
          for (final work in (c['works'] as List?) ?? [])
            Text('• ${work['name']}'),
          button(
            'delete_client_${c['id']}',
            'Dar de baja',
            () async {
              if (await settingsConfirm(
                context,
                '¿Dar de baja al cliente?',
                'Se eliminará ${c['email']} y sus permisos de consulta en proyectos.',
                action: 'Dar de baja',
              )) {
                await run(() => repo.deleteClient(c['id']));
              }
            },
            icon: AppIcons.personRemove,
            destructive: true,
          ),
        ],
      ),
    ),
  );
  Future<void> addClient() async {
    final done = await showAppFormDialog<bool>(
      context,
      barrierDismissible: false,
      builder: (_) => const AddClientDialog(),
    );
    if (done == true && mounted) refresh();
  }

  Future<void> createMcp() async {
    Json? created;
    await edit(
      'Crear conexión MCP',
      [const SettingsField('label', 'Nombre del asistente', maxLength: 100)],
      (v) async {
        created = await repo.createMcp(v['label']);
      },
    );
    if (!mounted || created == null) return;
    final token = created!['token'] as String;
    await showAppFormDialog<void>(
      context,
      barrierDismissible: false,
      builder: (context) => AppWorkDialog(
        title: 'Guardá esta clave',
        actions: [
          FilledButton(
            key: const ValueKey('settings_mcp_done'),
            onPressed: () => Navigator.pop(context),
            child: const Text('Listo'),
          ),
        ],
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Solo se muestra una vez. Usala como token Bearer en la conexión de tu asistente.',
            ),
            const SizedBox(height: AppSpacing.sm),
            SelectableText(
              Uri.parse(
                ref.read(apiClientProvider).dio.options.baseUrl,
              ).resolve('/api/mcp').toString(),
              style: AppTextStyles.technical,
            ),
            const SizedBox(height: AppSpacing.sm),
            SelectableText(token, style: AppTextStyles.technical),
            TextButton.icon(
              key: const ValueKey('settings_copy_mcp'),
              onPressed: () => Clipboard.setData(ClipboardData(text: token)),
              icon: const Icon(AppIcons.copy, size: AppIconSizes.field),
              label: const Text('Copiar clave'),
            ),
          ],
        ),
      ),
    );
  }
}

String? emailError(String value) =>
    RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)
    ? null
    : 'Ingresá un correo válido.';
String roleLabel(Object? role) => switch (role) {
  'SUPERADMIN' => 'Administrador del sistema',
  'READER' => 'Lector',
  _ => 'Miembro',
};

class ReaderGrantsDialog extends ConsumerStatefulWidget {
  const ReaderGrantsDialog({super.key, required this.user});
  final Json user;
  @override
  ConsumerState<ReaderGrantsDialog> createState() => _ReaderGrantsDialogState();
}

class _ReaderGrantsDialogState extends ConsumerState<ReaderGrantsDialog> {
  late final selected = {
    for (final grant in widget.user['readerGrants'] as List? ?? [])
      grant['groupId'] as String,
  };
  bool busy = false;
  @override
  Widget build(BuildContext context) {
    final groups = ref.watch(groupsProvider);
    return PopScope(
      canPop: !busy,
      child: AppWorkDialog(
        title: 'Grupos habilitados',
        closeEnabled: !busy,
        onClose: () => Navigator.pop(context),
        actions: [
          TextButton(
            onPressed: busy ? null : () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
        child: SizedBox(
          width: AppGeometry.dialogNarrow,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (groups.isLoading) const LoadingView(),
                if (groups.hasError)
                  ErrorView(
                    error: groups.error!,
                    onRetry: () => ref.invalidate(groupsProvider),
                  ),
                for (final g in groups.value ?? [])
                  CheckboxListTile(
                    key: ValueKey('settings_reader_${g.id}'),
                    title: Text(g.name),
                    value: selected.contains(g.id),
                    onChanged: busy
                        ? null
                        : (v) async {
                            setState(() => busy = true);
                            try {
                              await ref
                                  .read(settingsRepositoryProvider)
                                  .grantReader(
                                    widget.user['id'],
                                    g.id,
                                    v == true,
                                  );
                              if (mounted) {
                                setState(
                                  () => v == true
                                      ? selected.add(g.id)
                                      : selected.remove(g.id),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) showErrorSnack(context, e);
                            } finally {
                              if (mounted) setState(() => busy = false);
                            }
                          },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AddClientDialog extends ConsumerStatefulWidget {
  const AddClientDialog({super.key});
  @override
  ConsumerState<AddClientDialog> createState() => _AddClientDialogState();
}

class _AddClientDialogState extends ConsumerState<AddClientDialog> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(), email = TextEditingController();
  final selected = <String>{};
  bool busy = false;
  @override
  void dispose() {
    name.dispose();
    email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final works = ref.watch(worksListProvider(false));
    return PopScope(
      canPop: !busy,
      child: AppWorkDialog(
        title: 'Agregar cliente',
        closeEnabled: !busy,
        onClose: () => Navigator.pop(context),
        actions: [
          TextButton(
            onPressed: busy ? null : () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('settings_client_save'),
            onPressed: busy
                ? null
                : () async {
                    if (!form.currentState!.validate()) return;
                    setState(() => busy = true);
                    try {
                      await ref.read(settingsRepositoryProvider).createClient({
                        'name': name.text.trim(),
                        'email': email.text.trim(),
                        'workIds': selected.toList(),
                      });
                      if (context.mounted) Navigator.pop(context, true);
                    } catch (e) {
                      if (context.mounted) showErrorSnack(context, e);
                    } finally {
                      if (mounted) setState(() => busy = false);
                    }
                  },
            child: Text(busy ? 'Guardando…' : 'Crear cliente'),
          ),
        ],
        child: SizedBox(
          width: AppGeometry.dialogNarrow,
          child: SingleChildScrollView(
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    key: const ValueKey('settings_client_name'),
                    controller: name,
                    enabled: !busy,
                    decoration: const InputDecoration(labelText: 'Nombre'),
                    maxLength: 120,
                    validator: (v) => v == null || v.trim().isEmpty
                        ? 'Ingresá el nombre.'
                        : null,
                  ),
                  TextFormField(
                    key: const ValueKey('settings_client_email'),
                    controller: email,
                    enabled: !busy,
                    decoration: const InputDecoration(labelText: 'Correo'),
                    validator: (v) => emailError(v?.trim() ?? ''),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  const Text('Proyectos autorizados (opcional)'),
                  if (works.hasError)
                    ErrorView(
                      error: works.error!,
                      onRetry: () => ref.invalidate(worksListProvider(false)),
                    ),
                  if (works.isLoading) const LoadingView(),
                  for (final w in works.value ?? [])
                    CheckboxListTile(
                      key: ValueKey('settings_client_work_${w.id}'),
                      title: Text(w.name),
                      value: selected.contains(w.id),
                      onChanged: busy
                          ? null
                          : (v) => setState(
                              () => v == true
                                  ? selected.add(w.id)
                                  : selected.remove(w.id),
                            ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class SettingsErrorScreen extends ConsumerStatefulWidget {
  const SettingsErrorScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<SettingsErrorScreen> createState() =>
      _SettingsErrorScreenState();
}

class _SettingsErrorScreenState extends ConsumerState<SettingsErrorScreen> {
  bool busy = false;
  @override
  Widget build(BuildContext context) {
    final value = ref.watch(settingsErrorProvider(widget.id));
    final c = context.colors;
    return GenPageScaffold(
      title: 'Detalle del error',
      icon: AppIcons.settings,
      showBack: true,
      bodyPadding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          if (value.hasError)
            ErrorView(
              error: value.error!,
              onRetry: () => ref.invalidate(settingsErrorProvider(widget.id)),
            ),
          if (value.isLoading && !value.hasValue) const LoadingView(),
          if (value.hasValue) ...[
            Text(
              '${value.requireValue['message']}',
              style: AppTextStyles.dialogTitle.copyWith(color: c.text),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '${value.requireValue['route'] ?? 'Sin ruta'}\n${value.requireValue['occurrences']} veces · ${value.requireValue['lastSeenAt']}',
            ),
            Text(
              'Primera ocurrencia: ${value.requireValue['firstSeenAt'] ?? 'sin fecha'}',
            ),
            if (value.requireValue['method'] != null)
              Text('Método: ${value.requireValue['method']}'),
            if (value.requireValue['userId'] != null)
              Text('Usuario: ${value.requireValue['userId']}'),
            if (value.requireValue['context'] != null)
              SelectableText(
                const JsonEncoder.withIndent(
                  '  ',
                ).convert(value.requireValue['context']),
              ),
            SelectableText('${value.requireValue['stack'] ?? 'Sin traza'}'),
            FilledButton(
              key: const ValueKey('settings_error_toggle'),
              onPressed: busy
                  ? null
                  : () async {
                      setState(() => busy = true);
                      try {
                        await ref
                            .read(settingsRepositoryProvider)
                            .setErrorStatus(
                              widget.id,
                              value.requireValue['status'] == 'RESOLVED'
                                  ? 'PENDING'
                                  : 'RESOLVED',
                            );
                        if (mounted) refreshSettings(ref);
                      } catch (e) {
                        if (context.mounted) showErrorSnack(context, e);
                      } finally {
                        if (mounted) setState(() => busy = false);
                      }
                    },
              child: Text(
                value.requireValue['status'] == 'RESOLVED'
                    ? 'Reabrir error'
                    : 'Marcar como resuelto',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

String storageJobLabel(Object? kind) => switch (kind) {
  'CREATE_USER' => 'Crear cuenta de almacenamiento',
  'CREATE_GROUP_FOLDER' => 'Crear carpeta de grupo',
  'ADD_MEMBER' => 'Dar acceso a un miembro',
  'REMOVE_MEMBER' => 'Quitar acceso a un miembro',
  'CREATE_WORK_FOLDER' => 'Crear carpeta de proyecto',
  'DELETE_WORK_FOLDER' => 'Eliminar carpeta de proyecto',
  'MOVE_WORK_FOLDER' => 'Mover carpeta de proyecto',
  'RENAME_WORK_FOLDER' => 'Renombrar carpeta de proyecto',
  'AUDIT_GROUP_PERMISSIONS' => 'Revisar permisos del grupo',
  _ => 'Trabajo de almacenamiento',
};
