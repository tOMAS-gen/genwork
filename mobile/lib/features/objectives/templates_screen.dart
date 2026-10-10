import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
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
    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Plantillas de objetivo'),
      ),
      floatingActionButton: FloatingActionButton(
        key: const ValueKey('template_create'),
        tooltip: 'Nueva plantilla',
        onPressed: () => _create(template: true),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: AppSpace.page,
            child: TextField(
              key: const ValueKey('templates_search'),
              decoration: const InputDecoration(
                labelText: 'Buscar plantillas',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (s) => setState(() => _query = s.trim().toLowerCase()),
            ),
          ),
          Expanded(
            child: AsyncValueView(
              value: value,
              onRetry: () => ref.invalidate(templatesProvider),
              data: (items) {
                final visible = items
                    .where(
                      (t) =>
                          '${t.name} ${t.description ?? ''} ${t.groupName ?? ''}'
                              .toLowerCase()
                              .contains(_query),
                    )
                    .toList();
                return RefreshIndicator(
                  onRefresh: () => ref.refresh(templatesProvider.future),
                  child: ListView(
                    key: const ValueKey('templates_list'),
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: AppSpace.list,
                    children: [
                      const Text(
                        'Cada plantilla representa un objetivo. Al usarla se copian sus tareas pendientes.',
                      ),
                      if (visible.isEmpty)
                        const EmptyView(
                          message: 'No hay plantillas para mostrar.',
                        ),
                      for (final item in visible)
                        Card(
                          semanticContainer: false,
                          child: Column(
                            children: [
                              ListTile(
                                key: ValueKey('template_${item.id}'),
                                title: Text(item.name),
                                subtitle: Text(
                                  '${item.groupName ?? 'Personal'} · ${item.copyableTaskCount} ${item.copyableTaskCount == 1 ? 'tarea para copiar' : 'tareas para copiar'}${item.description == null ? '' : '\n${item.description}'}',
                                ),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => context.push(Routes.work(item.id)),
                              ),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton.icon(
                                  key: ValueKey('template_use_${item.id}'),
                                  onPressed: () => _create(templateId: item.id),
                                  icon: const Icon(Icons.add),
                                  label: const Text('Crear proyecto'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: AppSpace.bottomClearance),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
