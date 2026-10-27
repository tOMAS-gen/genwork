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
import '../documents/document_screen.dart';
import 'portal_providers.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/card_progress.dart';
import '../../shared/widgets/name_pill.dart';
import '../../shared/widgets/gen_tab_bar.dart';
import '../works/works_dashboard.dart';
import '../../shared/widgets/progress_bar.dart';

/// Portal del cliente, como `/portal` de la web: una card por proyecto con el
/// nombre, el avance, las tareas y la entrega.
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => GenPageScaffold(
    title: 'Mis proyectos',
    subtitle: 'Seguimiento del avance y las entregas de tus proyectos.',
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
                icon: AppIcons.projectOpen,
                title: 'Todavía no hay proyectos para ver',
                message:
                    'Cuando te den acceso a un proyecto, va a aparecer acá con su avance.',
              )
            : Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: _PortalWorkCard(work: works[i]),
              ),
      ),
    ),
  );
}

/// Card de proyecto del portal, como `PortalProjectCard` de la web.
class _PortalWorkCard extends StatelessWidget {
  const _PortalWorkCard({required this.work});
  final PortalWork work;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final primary = work.labels.where((l) => l.isPrimary).firstOrNull;
    final due = work.dueDate == null
        ? null
        : dueUrgency(work.dueDate!, DateTime.now());
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('portal_work_${work.id}'),
        onTap: () => context.push(Routes.portalWork(work.id)),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: NamePill(
                  name: work.name,
                  color: primary == null ? null : colorFromHex(primary.color),
                ),
              ),
              if (work.stage != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Etapa: ${work.stage!['name'] ?? ''}',
                  style: AppTextStyles.body.copyWith(color: c.muted),
                ),
              ],
              if (work.labels.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    for (final l in work.labels)
                      ColorPill(label: l.valueName, hex: l.color),
                  ],
                ),
              ],
              if (work.progress.total > 0) ...[
                const SizedBox(height: AppSpacing.sm),
                CardProgress(
                  done: work.progress.done,
                  total: work.progress.total,
                ),
              ],
              if (due != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  spacing: AppSpacing.sm,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Entrega: ${formatDueDate(work.dueDate!)}',
                      style: AppTextStyles.body.copyWith(color: c.muted),
                    ),
                    Text(
                      due.label,
                      style: AppTextStyles.body.copyWith(
                        color: dueToneColor(c, due.tone),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Proyecto en el portal, como `/portal/works/[id]` de la web: volver a "Mis
/// proyectos", nombre, descripción, entrega, avance y las pestañas Tareas,
/// Documentos y Actividad. El documento se abre en su pantalla (decisión 1).
class PortalWorkScreen extends ConsumerStatefulWidget {
  const PortalWorkScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<PortalWorkScreen> createState() => _PortalWorkScreenState();
}

class _PortalWorkScreenState extends ConsumerState<PortalWorkScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final id = widget.id;
    final value = ref.watch(portalWorkProvider(id));
    final c = context.colors;
    return GenPageScaffold(
      title: value.value?.name ?? 'Proyecto',
      showBack: true,
      top: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.xxs,
          AppSpacing.sm,
          AppSpacing.sm,
          0,
        ),
        child: Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            key: const ValueKey('portal_back'),
            style: TextButton.styleFrom(foregroundColor: c.text),
            onPressed: () => context.pop(),
            icon: const Icon(AppIcons.back, size: AppIconSizes.notice),
            label: const Text('Mis proyectos'),
          ),
        ),
      ),
      onRefresh: () async {
        ref.invalidate(portalActivityProvider);
        ref.invalidate(portalWorkProvider(id));
        await ref.read(portalWorkProvider(id).future);
      },
      body: AsyncValueView(
        value: value,
        onRetry: () => ref.invalidate(portalWorkProvider(id)),
        data: (work) {
          final pct = work.progress.total == 0
              ? 0
              : (work.progress.done * 100 / work.progress.total).round();
          // Contenido acotado: se arma entero (las tareas siempre en el árbol).
          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (work.description?.isNotEmpty == true) ...[
                  Text(
                    work.description!,
                    key: const ValueKey('portal_description'),
                    style: AppTextStyles.body.copyWith(color: c.muted),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
                if (work.dueDate != null) ...[
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: c.surface,
                      border: Border.all(color: c.border),
                      borderRadius: AppGeometry.card,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          AppIcons.calendarToday,
                          size: AppIconSizes.compact,
                          color: c.muted,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          'Entrega: ${formatDueDate(work.dueDate!)}',
                          style: AppTextStyles.body.copyWith(color: c.muted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
                _ProgressRow(
                  done: work.progress.done,
                  total: work.progress.total,
                  pct: pct,
                ),
                const SizedBox(height: AppSpacing.sm),
                GenTabBar(
                  showIcons: true,
                  activeIndex: _tab,
                  tabs: const [
                    GenTabItem(label: 'Tareas', icon: AppIcons.check),
                    GenTabItem(label: 'Documentos', icon: AppIcons.document),
                    GenTabItem(label: 'Actividad', icon: AppIcons.schedule),
                  ],
                  onSelect: (i) {
                    if (i == 1) {
                      if (work.document != null) {
                        context.push('${Routes.portalWork(id)}/document');
                      }
                      return;
                    }
                    setState(() => _tab = i);
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                if (_tab == 0) ...[
                  if (work.tasks.isNotEmpty)
                    _Section(
                      title: 'Tareas generales',
                      done: work.tasks.where(_isDone).length,
                      total: work.tasks.length,
                      tasks: work.tasks,
                    ),
                  for (final objective in work.objectives)
                    _Section(
                      title: objective.title,
                      description: objective.description,
                      done: objective.progress.done,
                      total: objective.progress.total,
                      tasks: objective.tasks,
                    ),
                ] else
                  PortalActivityView(
                    key: ValueKey('portal_activity_$id'),
                    id: id,
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

bool _isDone(PortalTask task) => task.status['type'] == 'FINAL';

class _ProgressRow extends StatelessWidget {
  const _ProgressRow({
    required this.done,
    required this.total,
    required this.pct,
  });
  final int done, total, pct;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: '$done de $total tareas completadas',
      excludeSemantics: true,
      child: Row(
        children: [
          Expanded(child: ProgressBar(value: total == 0 ? 0 : done / total)),
          const SizedBox(width: AppSpacing.xs),
          Text(
            '$done/$total · $pct%',
            style: AppTextStyles.supporting.copyWith(color: c.muted),
          ),
        ],
      ),
    );
  }
}

/// Un objetivo (o las tareas generales): título 16/600, su avance y las
/// tareas en una card, como la web.
class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.done,
    required this.total,
    required this.tasks,
    this.description,
  });
  final String title;
  final String? description;
  final int done, total;
  final List<PortalTask> tasks;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: AppTextStyles.dialogTitle.copyWith(color: c.text)),
          const SizedBox(height: AppSpacing.xxs),
          _ProgressRow(
            done: done,
            total: total,
            pct: total == 0 ? 0 : (done * 100 / total).round(),
          ),
          if (description?.isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              description!,
              style: AppTextStyles.body.copyWith(color: c.muted),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          for (final task in tasks)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: _TaskCard(task: task),
            ),
        ],
      ),
    );
  }
}

/// Tarea del portal en una card; sus subtareas, en una card anidada.
class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task, this.nested = false});
  final PortalTask task;
  final bool nested;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final done = _isDone(task);
    return Container(
      key: ValueKey('portal_task_${task.id}'),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.border),
        borderRadius: AppGeometry.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                task.text,
                style: AppTextStyles.body.copyWith(
                  color: done ? c.muted : c.text,
                  decoration: done ? TextDecoration.lineThrough : null,
                ),
              ),
              ColorPill(
                label: task.status['name'] as String? ?? '',
                hex: task.status['color'] as String?,
              ),
              for (final l in task.labels)
                ColorPill(label: l.valueName, hex: l.color),
            ],
          ),
          if (task.description?.isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.xxs),
            Text(
              task.description!,
              style: AppTextStyles.body.copyWith(color: c.muted),
            ),
          ],
          if (task.dueDate != null) ...[
            const SizedBox(height: AppSpacing.xxs),
            Text(
              'Entrega: ${formatDueDate(task.dueDate!)}',
              style: AppTextStyles.supporting.copyWith(color: c.muted),
            ),
          ],
          if (task.subtasks.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            for (final child in task.subtasks)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: _TaskCard(task: child, nested: true),
              ),
          ],
        ],
      ),
    );
  }
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
                const EmptyView(
                  icon: AppIcons.schedule,
                  title: 'Todavía no hay movimientos',
                  message:
                      'Acá vas a ver cada vez que una tarea cambie de estado.',
                ),
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
