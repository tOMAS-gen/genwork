import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/json.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/labeled_field.dart';
import '../../shared/widgets/panel_section.dart';
import '../../shared/widgets/state_views.dart';
import 'settings_providers.dart';
import 'settings_tabs.dart';

/// Integración con Genstock, como `/admin/genstock` de la web: la URL del
/// servidor, de dónde sale (guardada o variable de entorno), Guardar y Probar
/// conexión. Solo para quien administra el sistema.
class GenstockSettingsScreen extends ConsumerStatefulWidget {
  const GenstockSettingsScreen({super.key});

  @override
  ConsumerState<GenstockSettingsScreen> createState() =>
      _GenstockSettingsScreenState();
}

class _GenstockSettingsScreenState
    extends ConsumerState<GenstockSettingsScreen> {
  final _url = TextEditingController();
  Json? _config;
  String _status = '';
  bool _saving = false, _testing = false, _loaded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  bool get _admin => ref.read(currentUserProvider)?.isSuperAdmin == true;

  Future<void> _load() async {
    if (!_admin) return;
    try {
      _apply(await ref.read(settingsRepositoryProvider).genstock());
    } catch (e) {
      if (mounted) setState(() => _status = errorMessage(e));
    } finally {
      if (mounted) setState(() => _loaded = true);
    }
  }

  void _apply(Json config) {
    if (!mounted) return;
    setState(() {
      _config = config;
      _url.text = config['baseUrl'] as String? ?? '';
    });
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _status = '';
    });
    try {
      _apply(
        await ref.read(settingsRepositoryProvider).saveGenstock(_url.text),
      );
      if (mounted) setState(() => _status = 'Configuración guardada');
    } catch (e) {
      if (mounted) setState(() => _status = errorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _test() async {
    setState(() {
      _testing = true;
      _status = 'Probando conexión...';
    });
    try {
      final result = await ref.read(settingsRepositoryProvider).testGenstock();
      if (mounted) {
        setState(
          () => _status =
              '${result['ok'] == true ? '✓' : '✗'} ${result['detail'] ?? ''}',
        );
      }
    } catch (e) {
      if (mounted) setState(() => _status = '✗ ${errorMessage(e)}');
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final admin = ref.watch(currentUserProvider)?.isSuperAdmin == true;
    final config = _config;
    return GenPageScaffold(
      title: 'Integración con Genstock',
      subtitle:
          'URL del backend que Genwork usa para buscar productos y armar materiales.',
      showBack: true,
      top: const SettingsTabs(current: 'genstock'),
      body: !admin
          ? const EmptyView(
              message:
                  'Esta sección requiere permiso de administrador del sistema.',
            )
          : ListView(
              children: [
                if (!_loaded) const LoadingView(),
                if (_loaded)
                  PanelSection(
                    title: 'Servidor',
                    children: [
                      LabeledField(
                        label: 'URL del server Genstock',
                        child: TextField(
                          key: const ValueKey('genstock_url'),
                          controller: _url,
                          keyboardType: TextInputType.url,
                          onChanged: (_) => setState(() {}),
                          decoration: const InputDecoration(
                            hintText: 'Ej.: http://127.0.0.1:8110',
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          Icon(
                            AppIcons.success,
                            size: AppIconSizes.notice,
                            color: c.muted,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              config?['configured'] == true
                                  ? 'Usando ${config?['source'] == 'env' ? 'variable de entorno' : 'configuración guardada'}'
                                  : 'Sin URL configurada',
                              style: AppTextStyles.body.copyWith(
                                color: c.muted,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.xs,
                        runSpacing: AppSpacing.xs,
                        children: [
                          FilledButton(
                            key: const ValueKey('genstock_save'),
                            onPressed: _saving ? null : _save,
                            child: const Text('Guardar'),
                          ),
                          OutlinedButton(
                            key: const ValueKey('genstock_test'),
                            onPressed: _testing || _url.text.trim().isEmpty
                                ? null
                                : _test,
                            child: const Text('Probar conexión'),
                          ),
                        ],
                      ),
                    ],
                  ),
                if (_status.isNotEmpty)
                  Text(
                    _status,
                    key: const ValueKey('genstock_status'),
                    style: AppTextStyles.body.copyWith(color: c.muted),
                  ),
              ],
            ),
    );
  }
}
