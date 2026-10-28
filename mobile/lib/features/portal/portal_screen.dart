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
import '../../shared/widgets/entity_card_title.dart';
import '../../shared/widgets/gen_tab_bar.dart';
import '../works/works_dashboard.dart';
import '../../shared/widgets/progress_bar.dart';
import '../../shared/widgets/status_chip.dart';
import '../../shared/widgets/workspace_panel.dart';

/// Portal del cliente, como `/portal` de la web: una card por proyecto con el
/// nombre, el avance, las tareas y la entrega.
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => GenPageScaffold(
    title: 'Mis proyectos',
    // Una línea (P33-M4).
    subtitle: 'Avance y entregas de tus proyectos.',
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
                child: EntityCardTitle(
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
              // Pie: la fecha en mono y el plazo como chip (P33-M3).
              if (due != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Icon(
                      AppIcons.calendarToday,
                      size: AppIconSizes.compact,
                      color: c.muted,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        formatDueDate(work.dueDate!),
                        style: AppTextStyles.technical.copyWith(color: c.muted),
                      ),
                    ),
                    DueChip(dueDate: work.dueDate!),
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
    return GenPageScaffold(
      title: value.value?.name ?? 'Proyecto',
      showBack: true,
      // Sin miga: la flecha ya vuelve a «Mis proyectos» (P34-M1).
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
                  _Description(text: work.description!),
                  const SizedBox(height: AppSpacing.sm),
                ],
                // Entrega y avance en una card de dos columnas (P34-M3).
                _Summary(work: work, pct: pct),
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
                      single: work.objectives.isEmpty,
                      title: 'Tareas generales',
                      done: work.tasks.where(_isDone).length,
                      total: work.tasks.length,
                      tasks: work.tasks,
                    ),
                  for (final objective in work.objectives)
                    _Section(
                      single: work.objectives.length == 1 && work.tasks.isEmpty,
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
    this.compact = false,
  });
  final int done, total, pct;

  /// Solo «1/3»: el porcentaje ya está arriba.
  final bool compact;

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
            compact ? '$done/$total' : '$done/$total · $pct%',
            style: AppTextStyles.technical.copyWith(
              color: c.muted,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
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
    this.single = false,
  });

  /// Única sección: sin su barra, que repetiría el resumen (P34-M3).
  final bool single;
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
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: AppTextStyles.dialogTitle.copyWith(color: c.text),
                ),
              ),
              if (single)
                Text(
                  '$done/$total · ${total == 0 ? 0 : (done * 100 / total).round()}%',
                  style: AppTextStyles.technical.copyWith(color: c.muted),
                ),
            ],
          ),
          if (!single) ...[
            const SizedBox(height: AppSpacing.xxs),
            _ProgressRow(
              done: done,
              total: total,
              pct: total == 0 ? 0 : (done * 100 / total).round(),
            ),
          ],
          if (description?.isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              description!,
              style: AppTextStyles.body.copyWith(color: c.muted),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          // Una superficie con filas; las subtareas, con sangría (P34-M4).
          WorkspaceListPanel(
            children: [
              for (final task in tasks) ...[
                _TaskRow(task: task),
                for (final child in task.subtasks)
                  _TaskRow(task: child, nested: true),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

/// Tarea del portal como fila: texto, su detalle y el estado como chip a la
/// derecha (P34-M4, P34-M5).
class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task, this.nested = false});
  final PortalTask task;
  final bool nested;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final done = _isDone(task);
    return Padding(
      key: ValueKey('portal_task_${task.id}'),
      padding: EdgeInsets.fromLTRB(
        nested ? AppSpacing.md + AppSpacing.md : AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.text,
                  style: AppTextStyles.body.copyWith(
                    color: done ? c.muted : c.text,
                    decoration: done ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (task.labels.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xxs),
                  Wrap(
                    spacing: AppSpacing.xs,
                    runSpacing: AppSpacing.xxs,
                    children: [
                      for (final l in task.labels)
                        ColorPill(label: l.valueName, hex: l.color),
                    ],
                  ),
                ],
                if (task.description?.isNotEmpty == true) ...[
                  const SizedBox(height: AppSpacing.xxs),
                  Text(
                    task.description!,
                    style: AppTextStyles.supporting.copyWith(color: c.muted),
                  ),
                ],
                if (task.dueDate != null) ...[
                  const SizedBox(height: AppSpacing.xxs),
                  Text(
                    formatDueDate(task.dueDate!),
                    style: AppTextStyles.technical.copyWith(color: c.muted),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          TaskStatusChip(
            name: task.status['name'] as String? ?? '',
            done: done,
          ),
        ],
      ),
    );
  }
}

/// Descripción en tres líneas con «Ver más» (P34-M2).
class _Description extends StatefulWidget {
  const _Description({required this.text});
  final String text;
  @override
  State<_Description> createState() => _DescriptionState();
}

class _DescriptionState extends State<_Description> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = AppTextStyles.body.copyWith(color: c.muted);
    return LayoutBuilder(
      builder: (context, constraints) {
        final painter = TextPainter(
          text: TextSpan(text: widget.text, style: style),
          textDirection: Directionality.of(context),
          textScaler: MediaQuery.textScalerOf(context),
          maxLines: 3,
        )..layout(maxWidth: constraints.maxWidth);
        final long = painter.didExceedMaxLines;
        painter.dispose();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.text,
              key: const ValueKey('portal_description'),
              maxLines: _open ? null : 3,
              overflow: _open ? null : TextOverflow.ellipsis,
              style: style,
            ),
            if (long)
              TextButton(
                key: const ValueKey('portal_description_more'),
                style: TextButton.styleFrom(padding: EdgeInsets.zero),
                onPressed: () => setState(() => _open = !_open),
                child: Text(_open ? 'Ver menos' : 'Ver más'),
              ),
          ],
        );
      },
    );
  }
}

/// Resumen del proyecto: ENTREGA (fecha en mono y el plazo) y AVANCE
/// (porcentaje en mono 20 y la barra), separados por un divisor (P34-M3).
class _Summary extends StatelessWidget {
  const _Summary({required this.work, required this.pct});
  final PortalWork work;
  final int pct;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = AppTextStyles.sectionLabel.copyWith(color: c.muted);
    final progress = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('AVANCE', style: label),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          '$pct%',
          style: AppTextStyles.technical.copyWith(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: c.text,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        _ProgressRow(
          done: work.progress.done,
          total: work.progress.total,
          pct: pct,
          compact: true,
        ),
      ],
    );
    return Container(
      key: const ValueKey('portal_summary'),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.border),
        borderRadius: AppGeometry.card,
      ),
      child: work.dueDate == null
          ? progress
          : IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ENTREGA', style: label),
                        const SizedBox(height: AppSpacing.xxs),
                        Text(
                          formatDueDate(work.dueDate!),
                          style: AppTextStyles.technical.copyWith(
                            fontSize: 15,
                            color: c.text,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        DueChip(dueDate: work.dueDate!),
                      ],
                    ),
                  ),
                  VerticalDivider(
                    width: AppSpacing.lg,
                    thickness: 1,
                    color: c.border,
                  ),
                  Expanded(child: progress),
                ],
              ),
            ),
    );
  }
}

/// Plazo como chip: neutro, ámbar o rojo al 12 % (P33-M2).
class DueChip extends StatelessWidget {
  const DueChip({super.key, required this.dueDate});
  final DateTime dueDate;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final due = dueUrgency(dueDate, DateTime.now());
    final color = dueToneColor(c, due.tone);
    return StatusChip(
      key: const ValueKey('due_chip'),
      label: due.label,
      color: color,
      fill: due.tone == DueTone.neutral
          ? c.hover
          : color.withValues(alpha: .12),
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
