import 'dart:async';
import '../reminders/reminders_providers.dart';
import '../account/logout_tile.dart';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/count_badge.dart';
import 'live_refresher.dart';
import 'drawer_items.dart';
import 'drawer_resource_section.dart';
import '../works/works_providers.dart';
import '../works/works_filter.dart';
import '../sectors/sectors_providers.dart';

/// Drawer compartido; las ramas siguen vivas al cambiar de sección.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _worksExpanded = true;
  bool _sectorsExpanded = false;
  bool _groupsExpanded = false;

  late final Timer _deliveriesPoll;
  late final AppLifecycleListener _sessionLifecycle;
  @override
  void initState() {
    super.initState();
    void refreshUser() =>
        unawaited(ref.read(sessionProvider.notifier).refreshUser());
    _sessionLifecycle = AppLifecycleListener(onResume: refreshUser);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) refreshUser();
    });
    // La campana web también consulta cada minuto: los avisos no emiten SSE.
    _deliveriesPoll = Timer.periodic(const Duration(minutes: 1), (_) {
      final lifecycle = WidgetsBinding.instance.lifecycleState;
      if ((lifecycle == null || lifecycle == AppLifecycleState.resumed) &&
          !ref.read(deliveriesProvider).isLoading) {
        ref.invalidate(deliveriesProvider);
        refreshUser();
      }
    });
  }

  @override
  void dispose() {
    _deliveriesPoll.cancel();
    _sessionLifecycle.dispose();
    super.dispose();
  }

  void _openDrawer() {
    FocusManager.instance.primaryFocus?.unfocus();
    _scaffoldKey.currentState?.openDrawer();
  }

  void _closeDrawer() => _scaffoldKey.currentState?.closeDrawer();

  void _branch(int index) {
    _closeDrawer();
    // No reiniciar la sección activa: conserva búsqueda, scroll y detalle.
    widget.navigationShell.goBranch(index);
  }

  void _route(String route) {
    _closeDrawer();
    if (GoRouterState.of(context).uri.toString() != route) context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(liveRefresherProvider);
    final theme = Theme.of(context);
    final session = ref.watch(sessionProvider).value;
    final user = session is SignedIn ? session.user : null;
    final uri = GoRouterState.of(context).uri;
    final path = uri.path;
    final worksView = WorksView.fromUri(uri);
    final works = ref
        .watch(worksListProvider(false))
        .whenData(
          (items) => items
              .where((work) => !work.isArchived && !work.isTemplate)
              .map(DrawerItem.work)
              .toList(),
        );
    final sectors = ref
        .watch(sectorsProvider)
        .whenData((items) => items.map(DrawerItem.sector).toList());
    final groups = ref
        .watch(groupsProvider)
        .whenData((items) => items.map(DrawerItem.group).toList());
    final deliveries = ref.watch(deliveriesProvider);
    final currentBranch = widget.navigationShell.currentIndex;

    Widget destination({
      required String id,
      required IconData icon,
      required String label,
      required bool selected,
      required VoidCallback onTap,
      Widget? trailing,
    }) => Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.sm,
        vertical: AppSpace.xxs,
      ),
      child: Material(
        color: selected
            ? theme.colorScheme.primaryContainer
            : Colors.transparent,
        borderRadius: AppTokens.of(context).controlRadius,
        child: ListTile(
          key: ValueKey(id),
          selected: selected,
          contentPadding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
          minVerticalPadding: AppSpace.sm,
          minTileHeight: AppSpace.touch + AppSpace.sm,
          selectedColor: theme.colorScheme.onPrimaryContainer,
          shape: RoundedRectangleBorder(
            borderRadius: AppTokens.of(context).controlRadius,
          ),
          leading: Icon(icon),
          title: Text(
            label,
            style: theme.textTheme.titleSmall?.copyWith(
              color: selected ? theme.colorScheme.onPrimaryContainer : null,
            ),
          ),
          trailing: trailing,
          onTap: onTap,
        ),
      ),
    );

    return AppDrawerScope(
      openDrawer: _openDrawer,
      child: Scaffold(
        key: _scaffoldKey,
        // Los editores conservan su salida con guardado/retroceso.
        drawerEnableOpenDragGesture:
            !path.startsWith('${Routes.notes}/') &&
            !path.startsWith('${Routes.reminders}/'),
        drawer: Drawer(
          key: const ValueKey('main_navigation'),
          width: math.min(
            360,
            MediaQuery.sizeOf(context).width - AppSpace.touch,
          ),
          backgroundColor: theme.colorScheme.surface,
          shape: const RoundedRectangleBorder(),
          semanticLabel: 'Menú principal',
          child: SafeArea(
            child: ListView(
              key: const ValueKey('drawer_list'),
              padding: const EdgeInsets.only(bottom: AppSpace.lg),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpace.lg,
                    AppSpace.sm,
                    AppSpace.sm,
                    AppSpace.sm,
                  ),
                  child: Row(
                    children: [
                      const Expanded(child: BrandName(size: 20)),
                      IconButton(
                        key: const ValueKey('drawer_close'),
                        tooltip: 'Cerrar menú',
                        onPressed: _closeDrawer,
                        icon: const Icon(AppIcons.close),
                      ),
                    ],
                  ),
                ),
                if (user != null)
                  Padding(
                    padding: AppSpace.page,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Decorativo: el nombre se lee al lado.
                        ExcludeSemantics(
                          child: CircleAvatar(
                            foregroundImage: user.image == null
                                ? null
                                : NetworkImage(user.image!),
                            onForegroundImageError: user.image == null
                                ? null
                                : (_, _) {},
                            child: Text(
                              user.name.isEmpty
                                  ? '?'
                                  : user.name[0].toUpperCase(),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpace.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.name,
                                style: theme.textTheme.titleSmall,
                              ),
                              Text(
                                user.email,
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                const Divider(),
                const SizedBox(height: AppSpace.sm),
                destination(
                  id: 'nav_notes',
                  icon: Icons.sticky_note_2_outlined,
                  label: 'Mis notas',
                  selected: currentBranch == 3,
                  onTap: () => _branch(3),
                ),
                destination(
                  id: 'nav_day',
                  icon: Icons.wb_sunny_outlined,
                  label: 'Mi día y referencias',
                  selected: currentBranch == 0,
                  onTap: () => _branch(0),
                ),
                DrawerResourceSection(
                  id: 'works',
                  title: 'Proyectos',
                  icon: Icons.folder_outlined,
                  selected: currentBranch == 1,
                  expanded: _worksExpanded,
                  onToggle: () =>
                      setState(() => _worksExpanded = !_worksExpanded),
                  onVisit: () => _branch(1),
                  onViewAll: () => _route(Routes.works),
                  value: works,
                  onRetry: () => ref.invalidate(worksListProvider(false)),
                  onOpenItem: (id) => _route(Routes.work(id)),
                  selectedItemId: path.startsWith('${Routes.works}/')
                      ? uri.pathSegments.last
                      : null,
                  shortcuts: [
                    destination(
                      id: 'nav_templates',
                      icon: Icons.library_books_outlined,
                      label: 'Plantillas de objetivo',
                      selected: currentBranch == 7,
                      onTap: () => _branch(7),
                    ),
                    for (final view in WorksView.values)
                      destination(
                        id: 'nav_works_${view.name}',
                        icon: switch (view) {
                          WorksView.all => Icons.grid_view,
                          WorksView.mine => Icons.person_outline,
                          WorksView.favorites => Icons.star_border,
                          WorksView.archived => Icons.archive_outlined,
                        },
                        label: view.label,
                        selected: path == Routes.works && worksView == view,
                        onTap: () => _route(Routes.worksList(view)),
                      ),
                  ],
                ),
                DrawerResourceSection(
                  id: 'sectors',
                  title: 'Sectores',
                  icon: Icons.view_column_outlined,
                  selected: currentBranch == 2,
                  expanded: _sectorsExpanded,
                  onToggle: () =>
                      setState(() => _sectorsExpanded = !_sectorsExpanded),
                  onVisit: () => _branch(2),
                  onViewAll: () => _route(Routes.sectors),
                  value: sectors,
                  onRetry: () => ref.invalidate(sectorsProvider),
                  onOpenItem: (id) => _route(Routes.sector(id)),
                  selectedItemId: path.startsWith('${Routes.sectors}/')
                      ? uri.pathSegments.last
                      : null,
                  shortcuts: [
                    destination(
                      id: 'nav_sectors_all',
                      icon: Icons.grid_view,
                      label: 'Todos los sectores',
                      selected: path == Routes.sectors,
                      onTap: () => _route(Routes.sectors),
                    ),
                  ],
                ),
                DrawerResourceSection(
                  id: 'groups',
                  title: 'Grupos',
                  icon: Icons.groups_outlined,
                  selected: currentBranch == 5,
                  expanded: _groupsExpanded,
                  onToggle: () =>
                      setState(() => _groupsExpanded = !_groupsExpanded),
                  onVisit: () => _branch(5),
                  onViewAll: () => _route(Routes.groups),
                  value: groups,
                  onRetry: () => ref.invalidate(groupsProvider),
                  onOpenItem: (id) => _route(Routes.group(id)),
                  selectedItemId: path.startsWith('${Routes.groups}/')
                      ? uri.pathSegments[1]
                      : null,
                  shortcuts: [
                    destination(
                      id: 'nav_groups_all',
                      icon: Icons.grid_view,
                      label: 'Todos los grupos',
                      selected: path == Routes.groups,
                      onTap: () => _route(Routes.groups),
                    ),
                  ],
                ),
                destination(
                  id: 'nav_board',
                  icon: Icons.dashboard_outlined,
                  label: 'Vista de tareas',
                  selected: currentBranch == 6,
                  onTap: () => _branch(6),
                ),
                destination(
                  id: 'nav_reminders',
                  icon: Icons.event_outlined,
                  label: 'Recordatorios',
                  selected:
                      path == Routes.reminders ||
                      path.startsWith('${Routes.reminders}/'),
                  onTap: () => _route(Routes.reminders),
                ),
                const SizedBox(height: AppSpace.sm),
                const Divider(),
                const SizedBox(height: AppSpace.sm),
                destination(
                  id: 'nav_account',
                  icon: Icons.person_outline,
                  label: 'Mi cuenta',
                  selected: path == Routes.account,
                  onTap: () => _route(Routes.account),
                ),
                destination(
                  id: 'nav_settings',
                  icon: Icons.settings_outlined,
                  label: 'Configuración',
                  selected: path.startsWith(Routes.settings),
                  onTap: () => _route(Routes.settings),
                ),
                destination(
                  id: 'nav_due_today',
                  icon: Icons.notifications_outlined,
                  label: 'Vence hoy',
                  selected: path == Routes.dueToday,
                  trailing:
                      deliveries.value != null && deliveries.value!.isNotEmpty
                      ? CountBadge(
                          key: const ValueKey('nav_due_today_total'),
                          count: deliveries.value!.length,
                          singular: 'aviso pendiente',
                          plural: 'avisos pendientes',
                        )
                      : deliveries.hasError
                      ? const Icon(
                          Icons.error_outline,
                          semanticLabel: 'No se pudieron actualizar los avisos',
                        )
                      : null,
                  onTap: () {
                    ref.invalidate(deliveriesProvider);
                    _route(Routes.dueToday);
                  },
                ),
                if (session is SignedIn)
                  const LogoutTile(actionKey: 'nav_logout'),
                if (session is SignedIn)
                  Padding(
                    padding: AppSpace.page,
                    child: Text(
                      session.serverUrl.host,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
              ],
            ),
          ),
        ),
        body: widget.navigationShell,
      ),
    );
  }
}
