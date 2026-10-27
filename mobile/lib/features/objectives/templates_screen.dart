import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../core/util/format.dart';
import '../../core/util/name_order.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/list_toolbar.dart';
import '../../shared/widgets/stat_cards.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../works/create_work_dialog.dart';
import 'objectives_providers.dart';

class TemplatesScreen extends ConsumerStatefulWidget {
  const TemplatesScreen({super.key});
  @override
  ConsumerState<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends ConsumerState<TemplatesScreen> {
  String _query = '';
  bool _byName = false;
  Future<void> _create({String? templateId, bool template = false}) async {
    final id = await showCreateWorkDialog(
      context,
      isTemplate: template,
      templateId: templateId,
    );
    if (id != null && mounted) context.push(Routes.work(id));
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(templatesProvider);
    final c = context.colors;
    return GenPageScaffold(
      title: 'Plantillas de objetivo',
      // Como la web: la misma página que Proyectos, con "Nueva plantilla".
      actions: [
        FilledButton(
          key: const ValueKey('template_create'),
          onPressed: () => _create(template: true),
          child: const Text('Nueva plantilla'),
        ),
      ],
      onRefresh: () => ref.refresh(templatesProvider.future),
      bodyPadding: EdgeInsets.zero,
      body: AsyncValueView(
        value: value,
        onRetry: () => ref.invalidate(templatesProvider),
        data: (items) {
          final visible = items
              .where(
                (t) => '${t.name} ${t.description ?? ''} ${t.groupName ?? ''}'
                    .toLowerCase()
                    .contains(_query),
              )
              .toList();
          // "Más recientes" conserva el orden de la API.
          if (_byName) visible.sort((a, b) => compareNamesEs(a.name, b.name));
          // Una plantilla no avanza: todas cuentan como pendientes, como en
          // el tablero de la web.
          final total = items.length;
          return ListView(
            key: const ValueKey('templates_list'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppSpace.page,
            children: [
              StatCards(
                items: [
                  (label: 'Total', value: total, pct: total > 0 ? 100 : 0),
                  (label: 'En progreso', value: 0, pct: 0),
                  (label: 'Completados', value: 0, pct: 0),
                  (label: 'Pendientes', value: total, pct: total > 0 ? 100 : 0),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              ListToolbar<bool>(
                keyPrefix: 'templates',
                searchHint: 'Buscar proyectos…',
                onSearch: (s) =>
                    setState(() => _query = s.trim().toLowerCase()),
                sort: _byName,
                sortOptions: const {
                  false: 'Más recientes',
                  true: 'Nombre · A–Z',
                },
                onSort: (v) => setState(() => _byName = v),
                count: countLabel(visible.length, 'proyecto', 'proyectos'),
              ),
              const SizedBox(height: AppSpace.md),
              if (items.isEmpty)
                EmptyView(
                  icon: AppIcons.projectOpen,
                  title: 'Sin plantillas de objetivo todavía',
                  message:
                      'Una plantilla es un objetivo reutilizable: sus tareas se copian en cada proyecto donde la insertes. Creá una acá o guardá un objetivo como plantilla desde su menú ⋮.',
                  actionLabel: 'Nueva plantilla',
                  onAction: () => _create(template: true),
                )
              else if (visible.isEmpty)
                Text(
                  'Sin proyectos que coincidan con el filtro.',
                  style: AppTextStyles.body.copyWith(color: c.muted),
                ),
              if (visible.isNotEmpty)
                WorkspaceListPanel(
                  children: [
                    for (final item in visible)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ListTile(
                            key: ValueKey('template_${item.id}'),
                            title: Text(item.name),
                            subtitle: Text(
                              '${item.groupName ?? 'Personal'} · ${item.copyableTaskCount} ${item.copyableTaskCount == 1 ? 'tarea para copiar' : 'tareas para copiar'}${item.description == null ? '' : '\n${item.description}'}',
                            ),
                            trailing: Icon(
                              AppIcons.chevronRight,
                              size: AppIconSizes.action,
                              color: c.muted,
                            ),
                            onTap: () => context.push(Routes.work(item.id)),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(
                              left: AppSpacing.md,
                              bottom: AppSpacing.xs,
                            ),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: OutlinedButton.icon(
                                key: ValueKey('template_use_${item.id}'),
                                onPressed: () => _create(templateId: item.id),
                                icon: const Icon(
                                  AppIcons.add,
                                  size: AppIconSizes.field,
                                ),
                                label: const Text('Crear proyecto'),
                              ),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              const SizedBox(height: AppSpace.bottomClearance),
            ],
          );
        },
      ),
    );
  }
}
