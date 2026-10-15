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
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/brand_name.dart';
import '../../shared/widgets/count_badge.dart';
import 'live_refresher.dart';
import 'drawer_items.dart';
import 'drawer_resource_section.dart';
import 'drawer_tile.dart';
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
    final colors = context.colors;
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
      bool compact = false,
    }) => Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: AppSpacing.hairline,
      ),
      child: DrawerTile(
        id: id,
        icon: icon,
        label: label,
        selected: selected,
        trailing: trailing,
        compact: compact,
        onTap: onTap,
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
            AppGeometry.drawerWidth,
            MediaQuery.sizeOf(context).width - AppSpacing.xxxl,
          ),
          semanticLabel: 'Menú principal',
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(right: BorderSide(color: colors.border)),
            ),
            child: SafeArea(
              child: ListView(
                key: const ValueKey('drawer_list'),
                padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      AppSpacing.xs,
                      AppSpacing.xs,
                      AppSpacing.xs,
                    ),
                    child: Row(
                      children: [
                        const Expanded(
                          child: BrandName(size: 16, scaleDownToFit: true),
                        ),
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
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Decorativo: el nombre se lee al lado.
                          ExcludeSemantics(
                            child: CircleAvatar(
                              radius: AppSpacing.md,
                              backgroundColor: colors.brand,
                              foregroundColor: colors.onBrand,
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
                                style: AppTextStyles.supporting.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: colors.onBrand,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user.name,
                                  style: AppTextStyles.itemTitle.copyWith(
                                    color: colors.text,
                                  ),
                                ),
                                Text(
                                  user.email,
                                  style: AppTextStyles.supporting.copyWith(
                                    color: colors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  const Divider(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      AppSpacing.sm,
                      AppSpacing.md,
                      AppSpacing.xs,
                    ),
                    child: Text(
                      'ESPACIO DE TRABAJO',
                      style: AppTextStyles.sectionLabel.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ),
                  destination(
                    id: 'nav_notes',
                    icon: AppIcons.notes,
                    label: 'Mis notas',
                    selected: currentBranch == 3,
                    onTap: () => _branch(3),
                  ),
                  destination(
                    id: 'nav_day',
                    icon: AppIcons.myDay,
                    label: 'Mi día y referencias',
                    selected: currentBranch == 0,
                    onTap: () => _branch(0),
                  ),
                  DrawerResourceSection(
                    id: 'works',
                    title: 'Proyectos',
                    icon: AppIcons.projects,
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
                        compact: true,
                        icon: AppIcons.templates,
                        label: 'Plantillas de objetivo',
                        selected: currentBranch == 7,
                        onTap: () => _branch(7),
                      ),
                      for (final view in WorksView.values)
                        destination(
                          id: 'nav_works_${view.name}',
                          compact: true,
                          icon: switch (view) {
                            WorksView.all => AppIcons.gridView,
                            WorksView.mine => AppIcons.person,
                            WorksView.favorites => AppIcons.favorite,
                            WorksView.archived => AppIcons.archived,
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
                    icon: AppIcons.sectors,
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
                        compact: true,
                        icon: AppIcons.gridView,
                        label: 'Todos los sectores',
                        selected: path == Routes.sectors,
                        onTap: () => _route(Routes.sectors),
                      ),
                    ],
                  ),
                  DrawerResourceSection(
                    id: 'groups',
                    title: 'Grupos',
                    icon: AppIcons.groups,
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
                        compact: true,
                        icon: AppIcons.gridView,
                        label: 'Todos los grupos',
                        selected: path == Routes.groups,
                        onTap: () => _route(Routes.groups),
                      ),
                    ],
                  ),
                  destination(
                    id: 'nav_board',
                    icon: AppIcons.dashboard,
                    label: 'Vista de tareas',
                    selected: currentBranch == 6,
                    onTap: () => _branch(6),
                  ),
                  destination(
                    id: 'nav_reminders',
                    icon: AppIcons.reminders,
                    label: 'Recordatorios',
                    selected:
                        path == Routes.reminders ||
                        path.startsWith('${Routes.reminders}/'),
                    onTap: () => _route(Routes.reminders),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  const Divider(),
                  const SizedBox(height: AppSpacing.xs),
                  destination(
                    id: 'nav_account',
                    icon: AppIcons.person,
                    label: 'Mi cuenta',
                    selected: path == Routes.account,
                    onTap: () => _route(Routes.account),
                  ),
                  destination(
                    id: 'nav_settings',
                    icon: AppIcons.settings,
                    label: 'Configuración',
                    selected: path.startsWith(Routes.settings),
                    onTap: () => _route(Routes.settings),
                  ),
                  destination(
                    id: 'nav_due_today',
                    icon: AppIcons.bell,
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
                            AppIcons.error,
                            semanticLabel:
                                'No se pudieron actualizar los avisos',
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
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Text(
                        session.serverUrl.host,
                        style: AppTextStyles.supporting.copyWith(
                          color: colors.muted,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        body: widget.navigationShell,
      ),
    );
  }
}
