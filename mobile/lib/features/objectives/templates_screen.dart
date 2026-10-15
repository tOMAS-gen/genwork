import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
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
      subtitle:
          'Cada plantilla representa un objetivo. Al usarla se copian sus tareas pendientes.',
      icon: AppIcons.templates,
      actions: [
        IconButton.filled(
          key: const ValueKey('template_create'),
          tooltip: 'Nueva plantilla',
          icon: const Icon(AppIcons.add),
          onPressed: () => _create(template: true),
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
          return ListView(
            key: const ValueKey('templates_list'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppSpace.page,
            children: [
              TextField(
                key: const ValueKey('templates_search'),
                decoration: const InputDecoration(
                  hintText: 'Buscar plantillas…',
                  prefixIcon: Icon(AppIcons.search),
                ),
                onChanged: (s) =>
                    setState(() => _query = s.trim().toLowerCase()),
              ),
              const SizedBox(height: AppSpace.md),
              if (visible.isEmpty)
                const EmptyView(message: 'No hay plantillas para mostrar.'),
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
