import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/common.dart';
import '../../data/models/task.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/progress_bar.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_tile.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../reminders/deliveries_button.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'merge_my_day_and_references.dart';
import 'my_day_progress.dart';
import 'my_day_providers.dart';
import '../tasks/task_row_actions.dart';

/// Mi día: tareas marcadas para hoy (pendientes y completadas hoy) y las
/// menciones abiertas.
class MyDayScreen extends ConsumerWidget {
  const MyDayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myDay = ref.watch(myDayProvider);
    final references = ref.watch(openReferencesProvider);
    final today = ref.watch(myDayTodayProvider);

    Future<void> refresh() async {
      ref.invalidate(myDayProvider);
      ref.invalidate(openReferencesProvider);
      await Future.wait([
        ref.read(myDayProvider.future),
        ref.read(openReferencesProvider.future),
      ]);
    }

    Future<void> toggle(Task task) async {
      try {
        await ref.read(taskActionsProvider).toggleDone(task);
      } catch (e) {
        if (context.mounted) showErrorSnack(context, e);
      }
    }

    Future<void> toggleDay(Task task) async {
      try {
        await ref.read(taskActionsProvider).setMyDay(task, !task.isInMyDay);
      } catch (e) {
        if (context.mounted) showErrorSnack(context, e);
      }
    }

    return GenPageScaffold(
      title: 'Mi día y referencias',
      subtitle:
          'Primero lo que hay que hacer hoy, después las tareas que necesitan tu aporte.',
      appBarActions: const [DeliveriesButton()],
      onRefresh: refresh,
      bodyPadding: EdgeInsets.zero,
      body: AsyncValueView(
        value: myDay,
        onRetry: refresh,
        data: (tasks) {
          final progress = myDayProgress(tasks);
          final pending = tasks.where((t) => !t.isDone).toList();
          final done = tasks.where((t) => t.isDone).toList();
          final merged = mergeMyDayAndReferences(
            tasks,
            references.value ?? const <Task>[],
          );
          final refs = merged.references;

          if (tasks.isEmpty &&
              refs.isEmpty &&
              !references.hasError &&
              !references.isLoading) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                EmptyView(
                  icon: AppIcons.myDay,
                  title: 'No tenés tareas para hoy ni referencias pendientes',
                  message:
                      'Las tareas que agreguen a Mi día y las que te mencionen con @ aparecerán juntas acá.',
                ),
              ],
            );
          }

          Widget tile(Task t) {
            final isRef = merged.referenceIds.contains(t.id);
            final route = t.work != null
                ? Routes.work(t.work!.id)
                : t.homeSector != null
                ? Routes.sector(t.homeSector!.id)
                : null;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _RowMeta(
                  taskId: t.id,
                  isReference: isRef,
                  task: t,
                  onSource: route == null ? null : () => context.push(route),
                ),
                TaskTile(
                  task: t,
                  flat: true,
                  referenceIds: merged.referenceIds,
                  showWork: false,
                  onTap: () =>
                      showTaskDetail(context, t, canEdit: t.canToggle ?? false),
                  onToggleDone: t.canToggle == true ? () => toggle(t) : null,
                  onToggleMyDay: t.canManageMyDay == true
                      ? () => toggleDay(t)
                      : null,
                  onSubtaskTap: (s) =>
                      showTaskDetail(context, s, canEdit: s.canToggle ?? false),
                  onSubtaskToggle: (s) {
                    if (s.canToggle == true) toggle(s);
                  },
                  onAddSubtask: t.canToggle == true && t.parentId == null
                      ? () => promptSubtask(context, t)
                      : null,
                  onDelete: t.canToggle == true
                      ? () => confirmDeleteTask(context, ref, t)
                      : null,
                  onSubtaskMyDay: (s) {
                    if (s.canManageMyDay == true) toggleDay(s);
                  },
                  onSubtaskDelete: (s) => confirmDeleteTask(context, ref, s),
                ),
              ],
            );
          }

          return ListView(
            key: const ValueKey('my_day_list'),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              // Fecha y avance en una línea, con la barra debajo (P04-M3).
              Padding(
                key: const ValueKey('my_day_progress'),
                padding: AppSpace.page,
                child: _ProgressText(
                  today: today,
                  progress: tasks.isEmpty ? null : progress,
                ),
              ),
              if (pending.isNotEmpty || refs.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpace.gutter,
                  ),
                  child: WorkspaceListPanel(
                    children: [...pending.map(tile), ...refs.map(tile)],
                  ),
                ),
              if (references.isLoading && !references.hasValue)
                const LoadingView(),
              if (references.hasError)
                ErrorView(
                  error: references.error!,
                  onRetry: () => ref.invalidate(openReferencesProvider),
                ),
              if (done.isNotEmpty)
                ExpansionTile(
                  key: const ValueKey('my_day_completed'),
                  title: Text('Completadas hoy (${done.length})'),
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpace.gutter,
                      ),
                      child: WorkspaceListPanel(
                        children: done.map(tile).toList(),
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: AppSpace.xxl),
            ],
          );
        },
      ),
    );
  }
}

/// «Lunes 26 de octubre · **3 de 9** completadas» en 13/500 con las cifras en
/// mono tabular y, debajo, la barra de avance (P04-M3).
class _ProgressText extends StatelessWidget {
  const _ProgressText({required this.today, required this.progress});

  final DateTime today;
  final Progress? progress;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final base = AppTextStyles.body.copyWith(
      color: c.muted,
      fontWeight: FontWeight.w500,
    );
    final date = DateFormat("EEEE d 'de' MMMM", 'es').format(today);
    final digits = AppTextStyles.technical.copyWith(
      fontWeight: FontWeight.w700,
      color: c.text,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    final p = progress;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(
          TextSpan(
            style: base,
            children: [
              TextSpan(text: date[0].toUpperCase() + date.substring(1)),
              if (p != null) ...[
                const TextSpan(text: ' · '),
                // Solo las cifras en mono: el espacio mono separa de más.
                TextSpan(text: '${p.done}', style: digits),
                const TextSpan(text: ' de '),
                TextSpan(text: '${p.total}', style: digits),
                const TextSpan(text: ' completadas'),
              ],
            ],
          ),
        ),
        if (p != null) ...[
          const SizedBox(height: AppSpacing.xs),
          ProgressBar(value: p.ratio),
        ],
      ],
    );
  }
}

/// Encabezado de cada tarea: de dónde viene, con el proyecto o sector en
/// 13/600 y el resto («› Preparación y entrega») en gris (P04-M4). El título de
/// la página ya dice «Mi día»; una referencia lleva «@ Referencia».
class _RowMeta extends StatelessWidget {
  const _RowMeta({
    required this.taskId,
    required this.isReference,
    required this.task,
    required this.onSource,
  });

  final String taskId;
  final bool isReference;
  final Task task;
  final VoidCallback? onSource;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final owner = task.work?.name ?? task.homeSector?.name;
    final rest = [
      task.objectiveTitle,
      task.parentText,
    ].whereType<String>().where((s) => s.isNotEmpty).join(' › ');
    final source = Text.rich(
      TextSpan(
        children: [
          if (owner != null)
            TextSpan(
              text: owner,
              style: AppTextStyles.body.copyWith(
                fontWeight: FontWeight.w600,
                color: c.text,
              ),
            ),
          if (rest.isNotEmpty)
            TextSpan(
              text: '${owner == null ? '' : '  '}› $rest',
              style: AppTextStyles.body.copyWith(color: c.muted),
            ),
        ],
      ),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
      child: Row(
        children: [
          if (isReference) ...[
            Icon(AppIcons.mention, size: AppIconSizes.compact, color: c.text),
            const SizedBox(width: AppSpacing.xxs),
            Text(
              'Referencia',
              style: AppTextStyles.supporting.copyWith(
                fontWeight: FontWeight.w600,
                color: c.text,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          if (owner != null || rest.isNotEmpty)
            Expanded(
              child: onSource == null
                  ? Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.sm,
                      ),
                      child: source,
                    )
                  // El origen se toca: 48 dp (T4).
                  : InkWell(
                      key: ValueKey('my_day_source_$taskId'),
                      onTap: onSource,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(
                          minHeight: kMinInteractiveDimension,
                        ),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: source,
                        ),
                      ),
                    ),
            ),
        ],
      ),
    );
  }
}
