import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/util/format.dart';
import '../../data/models/portal.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/color_dot.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../documents/document_screen.dart';
import 'portal_providers.dart';

class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => GenPageScaffold(
    title: 'Mis proyectos',
    icon: AppIcons.projects,
    subtitle: 'Consultá el avance de tus trabajos.',
    showThemeToggle: true,
    onRefresh: () => ref.refresh(portalWorksProvider.future),
    body: AsyncValueView(
      value: ref.watch(portalWorksProvider),
      onRetry: () => ref.invalidate(portalWorksProvider),
      data: (works) => ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: works.isEmpty ? 1 : works.length,
        itemBuilder: (context, i) => works.isEmpty
            ? const EmptyView(
                message: 'Todavía no tenés proyectos compartidos.',
              )
            : Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: WorkspaceListPanel(
                  children: [
                    ListTile(
                      key: ValueKey('portal_work_${works[i].id}'),
                      title: Text(works[i].name),
                      subtitle: Text(
                        '${works[i].progress.done} de ${works[i].progress.total} tareas completadas',
                      ),
                      trailing: const Icon(AppIcons.chevronRight),
                      onTap: () => context.push(Routes.portalWork(works[i].id)),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: _Summary(work: works[i]),
                    ),
                  ],
                ),
              ),
      ),
    ),
  );
}

class PortalWorkScreen extends ConsumerWidget {
  const PortalWorkScreen({super.key, required this.id});
  final String id;
  @override
  Widget build(BuildContext context, WidgetRef ref) => GenPageScaffold(
    title: 'Proyecto',
    icon: AppIcons.projects,
    showBack: true,
    onRefresh: () async {
      ref.invalidate(portalActivityProvider);
      ref.invalidate(portalWorkProvider(id));
      await ref.read(portalWorkProvider(id).future);
    },
    body: AsyncValueView(
      value: ref.watch(portalWorkProvider(id)),
      onRetry: () => ref.invalidate(portalWorkProvider(id)),
      data: (work) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Text(work.name, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.sm),
          _Summary(work: work),
          if (work.description?.isNotEmpty == true)
            ExpansionTile(
              key: const ValueKey('portal_description'),
              title: const Text('Descripción'),
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  child: Text(work.description!),
                ),
              ],
            ),
          if (work.document != null)
            ListTile(
              key: const ValueKey('portal_document'),
              title: const Text('Documento'),
              leading: const Icon(AppIcons.document),
              trailing: const Icon(AppIcons.chevronRight),
              onTap: () => context.push('${Routes.portalWork(id)}/document'),
            ),
          if (work.tasks.isNotEmpty)
            _Tasks(title: 'Tareas generales', tasks: work.tasks),
          for (final objective in work.objectives)
            _Tasks(
              title:
                  '${objective.title} · ${objective.progress.done}/${objective.progress.total}',
              description: objective.description,
              tasks: objective.tasks,
            ),
          const SizedBox(height: AppSpacing.md),
          PortalActivityView(key: ValueKey('portal_activity_$id'), id: id),
        ],
      ),
    ),
  );
}

class PortalDocumentScreen extends ConsumerWidget {
  const PortalDocumentScreen({super.key, required this.id});
  final String id;
  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncValueView(
    value: ref.watch(portalWorkProvider(id)),
    onRetry: () => ref.invalidate(portalWorkProvider(id)),
    data: (work) => DocumentScreen(
      title: work.name,
      content: work.document,
      editable: false,
    ),
  );
}

class _Summary extends StatelessWidget {
  const _Summary({required this.work});
  final PortalWork work;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Semantics(
        label:
            '${work.progress.done} de ${work.progress.total} tareas completadas',
        excludeSemantics: true,
        child: LinearProgressIndicator(value: work.progress.ratio),
      ),
      const SizedBox(height: AppSpacing.sm),
      Wrap(
        spacing: AppSpacing.xs,
        runSpacing: AppSpacing.xs,
        children: [
          if (work.stage != null)
            ColorPill(
              label: work.stage!['name'] as String? ?? '',
              hex: work.stage!['color'] as String?,
            ),
          for (final label in work.labels)
            ColorPill(label: label.valueName, hex: label.color),
          if (work.dueDate != null)
            Text('Entrega: ${formatDay(work.dueDate!)}'),
        ],
      ),
    ],
  );
}

class _Tasks extends StatelessWidget {
  const _Tasks({required this.title, required this.tasks, this.description});
  final String title;
  final String? description;
  final List<PortalTask> tasks;
  @override
  Widget build(BuildContext context) => ExpansionTile(
    title: Text(title),
    initiallyExpanded: true,
    children: [
      if (description?.isNotEmpty == true)
        Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Text(description!),
        ),
      for (final task in tasks) _Task(task: task),
    ],
  );
}

class _Task extends StatelessWidget {
  const _Task({required this.task});
  final PortalTask task;
  @override
  Widget build(BuildContext context) => Padding(
    key: ValueKey('portal_task_${task.id}'),
    padding: const EdgeInsets.all(AppSpacing.sm),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(task.text, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: [
            ColorPill(
              label: task.status['name'] as String? ?? '',
              hex: task.status['color'] as String?,
            ),
            for (final l in task.labels)
              ColorPill(label: l.valueName, hex: l.color),
            for (final l in task.links)
              ColorPill(
                label: l['name'] as String? ?? '',
                hex: l['color'] as String?,
              ),
          ],
        ),
        if (task.description?.isNotEmpty == true) Text(task.description!),
        if (task.dueDate != null) Text('Vence: ${formatDay(task.dueDate!)}'),
        for (final child in task.subtasks) _Task(task: child),
      ],
    ),
  );
}

class PortalActivityView extends ConsumerStatefulWidget {
  const PortalActivityView({super.key, required this.id});
  final String id;
  @override
  ConsumerState<PortalActivityView> createState() => _PortalActivityViewState();
}

class _PortalActivityViewState extends ConsumerState<PortalActivityView> {
  final List<String?> _cursors = [null];
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text('Actividad', style: Theme.of(context).textTheme.titleMedium),
      for (final cursor in _cursors)
        AsyncValueView(
          value: ref.watch(
            portalActivityProvider((id: widget.id, cursor: cursor)),
          ),
          onRetry: () => ref.invalidate(
            portalActivityProvider((id: widget.id, cursor: cursor)),
          ),
          data: (page) => Column(
            children: [
              if ((page['entries'] as List).isEmpty && cursor == null)
                const Text('Todavía no hay cambios de estado.'),
              for (final entry in page['entries'] as List)
                ListTile(
                  title: Text(entry['taskText'] as String),
                  subtitle: Text(
                    '${entry['from']?['name'] ?? 'Sin estado'} → ${entry['to']?['name'] ?? 'Sin estado'}\n${formatDateTime(DateTime.parse(entry['at'] as String))}',
                  ),
                ),
              if (cursor == _cursors.last && page['nextCursor'] != null)
                TextButton(
                  key: const ValueKey('portal_activity_more'),
                  onPressed: () => setState(
                    () => _cursors.add(page['nextCursor'] as String),
                  ),
                  child: const Text('Ver más actividad'),
                ),
            ],
          ),
        ),
    ],
  );
}
