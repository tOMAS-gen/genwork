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
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_tile.dart';
import '../../shared/widgets/workspace_panel.dart';
import '../reminders/deliveries_button.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'merge_my_day_and_references.dart';
import 'my_day_progress.dart';
import 'my_day_providers.dart';

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
      icon: AppIcons.myDay,
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
                  message:
                      'No tenés tareas para hoy ni referencias pendientes.\nLas tareas que agreguen a Mi día y las que te mencionen con @ aparecerán juntas acá.',
                ),
              ],
            );
          }

          Widget tile(Task t) {
            final source = myDaySourceLabel(t);
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
                  isMyDay: t.isInMyDay,
                  isReference: isRef,
                  source: source,
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
                ),
              ],
            );
          }

          return ListView(
            key: const ValueKey('my_day_list'),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.lg,
                  AppSpace.lg,
                  AppSpace.lg,
                  0,
                ),
                child: Text(
                  DateFormat("EEEE d 'de' MMMM", 'es').format(today),
                  style: AppTextStyles.technical.copyWith(
                    color: context.colors.muted,
                  ),
                ),
              ),
              if (tasks.isNotEmpty)
                Padding(
                  key: const ValueKey('my_day_progress'),
                  padding: AppSpace.page,
                  child: _ProgressText(progress: progress),
                ),
              if (pending.isNotEmpty || refs.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
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
                        horizontal: AppSpace.lg,
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

/// «☼ Mi día: **0 de 1** completadas hoy», como la línea de progreso de la web
/// (sin barra).
class _ProgressText extends StatelessWidget {
  const _ProgressText({required this.progress});

  final Progress progress;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final base = AppTextStyles.body.copyWith(color: c.muted);
    return Row(
      children: [
        Icon(AppIcons.myDay, size: AppIconSizes.compact, color: c.muted),
        const SizedBox(width: AppSpacing.xs),
        Expanded(
          child: Text.rich(
            TextSpan(
              style: base,
              children: [
                const TextSpan(text: 'Mi día: '),
                TextSpan(
                  text: '${progress.done} de ${progress.total}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const TextSpan(text: ' completadas hoy'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Línea sobre cada tarea: «☼ Mi día» o «@ Referencia» (+ «· Referencia» si es
/// ambas) y el origen como enlace `muted`.
class _RowMeta extends StatelessWidget {
  const _RowMeta({
    required this.taskId,
    required this.isMyDay,
    required this.isReference,
    required this.source,
    required this.onSource,
  });

  final String taskId;
  final bool isMyDay, isReference;
  final String? source;
  final VoidCallback? onSource;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = AppTextStyles.supporting.copyWith(
      fontWeight: FontWeight.w600,
      color: c.text,
    );
    final muted = AppTextStyles.supporting.copyWith(color: c.muted);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        AppSpace.sm,
        AppSpace.md,
        0,
      ),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: AppSpacing.sm,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isMyDay ? AppIcons.myDay : AppIcons.mention,
                size: AppIconSizes.compact,
                color: c.text,
              ),
              const SizedBox(width: AppSpacing.xxs),
              Text(isMyDay ? 'Mi día' : 'Referencia', style: label),
              if (isMyDay && isReference) ...[
                const SizedBox(width: AppSpacing.xxs),
                Text('· Referencia', style: muted),
              ],
            ],
          ),
          if (source != null)
            onSource == null
                ? Text(source!, style: muted)
                : InkWell(
                    key: ValueKey('my_day_source_$taskId'),
                    onTap: onSource,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.xs,
                      ),
                      child: Text(source!, style: muted),
                    ),
                  ),
        ],
      ),
    );
  }
}
