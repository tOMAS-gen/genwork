import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/routes.dart';
import '../../shared/widgets/progress_line.dart';
import 'my_day_progress.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/task.dart';
import 'package:intl/intl.dart';
import '../../shared/widgets/page_intro.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/task_tile.dart';
import '../reminders/deliveries_button.dart';
import '../tasks/task_actions.dart';
import '../tasks/task_detail_sheet.dart';
import 'my_day_providers.dart';
import 'merge_my_day_and_references.dart';

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

    return Scaffold(
      appBar: AppBar(
        leading: const AppDrawerButton(),
        title: const Text('Mi día'),
        actions: const [DeliveriesButton()],
      ),
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
            return RefreshIndicator(
              onRefresh: refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  PageIntro(
                    title: DateFormat(
                      'EEEE d \'de\' MMMM',
                      'es',
                    ).format(today),
                    subtitle: 'Tu día, despejado.',
                    icon: Icons.wb_sunny_outlined,
                  ),
                  const SizedBox(height: AppSpace.xl),
                  const EmptyView(
                    icon: Icons.wb_sunny_outlined,
                    message:
                        'Nada para hoy.\nMarcá tareas con "Mi día" desde un proyecto o sector.',
                  ),
                ],
              ),
            );
          }

          Widget tile(Task t) {
            final source = myDaySourceLabel(t);
            final route = t.work != null
                ? Routes.work(t.work!.id)
                : t.homeSector != null
                ? Routes.sector(t.homeSector!.id)
                : null;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (source != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.lg,
                    ),
                    child: route == null
                        ? Text(source)
                        : TextButton.icon(
                            key: ValueKey('my_day_source_${t.id}'),
                            style: TextButton.styleFrom(
                              alignment: Alignment.centerLeft,
                            ),
                            onPressed: () => context.push(route),
                            icon: Icon(
                              t.work != null
                                  ? Icons.folder_outlined
                                  : Icons.view_column_outlined,
                            ),
                            label: Text(source),
                          ),
                  ),
                TaskTile(
                  task: t,
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

          return RefreshIndicator(
            onRefresh: refresh,
            child: ListView(
              key: const ValueKey('my_day_list'),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                PageIntro(
                  title: DateFormat(
                    'EEEE d \'de\' MMMM',
                    'es',
                  ).format(today),
                  subtitle:
                      '${progress.pending} ${progress.pending == 1 ? 'tarea pendiente' : 'tareas pendientes'} para enfocar tu día.',
                  icon: Icons.wb_sunny_outlined,
                ),
                if (tasks.isNotEmpty)
                  Padding(
                    key: const ValueKey('my_day_progress'),
                    padding: AppSpace.page,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mi día: ${progress.done} de ${progress.total} completadas hoy',
                        ),
                        const SizedBox(height: AppSpace.sm),
                        ProgressLine(progress: progress),
                      ],
                    ),
                  ),
                const _SectionHeader('Pendientes'),
                ...pending.map(tile),
                if (references.isLoading && !references.hasValue)
                  const LoadingView(),
                if (references.hasError)
                  ErrorView(
                    error: references.error!,
                    onRetry: () => ref.invalidate(openReferencesProvider),
                  ),
                if (refs.isNotEmpty) ...[
                  const _SectionHeader('Te mencionan'),
                  ...refs.map(tile),
                ],
                if (done.isNotEmpty) ...[
                  ExpansionTile(
                    key: const ValueKey('my_day_completed'),
                    title: Text('Completadas hoy (${done.length})'),
                    children: done.map(tile).toList(),
                  ),
                ],
                const SizedBox(height: AppSpace.xxl),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      AppSpace.lg,
      AppSpace.icon,
      AppSpace.lg,
      AppSpace.xs,
    ),
    child: Semantics(
      header: true,
      child: Text(title, style: Theme.of(context).textTheme.titleSmall),
    ),
  );
}
