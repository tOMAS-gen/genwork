import '../notifications/notifications_providers.dart';
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
  bool _drawerOpen = false;

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
          ref.read(sessionProvider).value is SignedIn &&
          !ref.read(deliveriesProvider).isLoading) {
        ref.invalidate(deliveriesProvider);
        ref.invalidate(notificationsProvider);
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
    final session = ref.watch(sessionProvider).value;
    // Al cerrar sesión (o 401, o quitar el servidor activo) el shell sigue
    // montado un frame durante la transición a /servers. Sin sesión no se lee
    // nada que dependa de `apiClientProvider` (que falla a propósito sin
    // sesión): ni el live, ni el drawer, ni las ramas, que así se liberan.
    if (session is! SignedIn) return const SizedBox.shrink();
    ref.watch(liveRefresherProvider);
    final colors = context.colors;
    final user = session.user;
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
    final unread =
        ref.watch(notificationsProvider(null)).value?.unreadCount ?? 0;
    final currentBranch = widget.navigationShell.currentIndex;

    // Los ítems de primer nivel, como `.sidebar a.nav` de la web.
    Widget top({
      required String id,
      required IconData icon,
      required String label,
      required bool selected,
      required VoidCallback onTap,
      Widget? trailing,
      String? subtitle,
    }) => Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: AppSpacing.hairline,
      ),
      child: DrawerTile(
        id: id,
        icon: icon,
        label: label,
        subtitle: subtitle,
        selected: selected,
        trailing: trailing,
        onTap: onTap,
      ),
    );

    return AppDrawerScope(
      openDrawer: _openDrawer,
      // Con el menú abierto, atrás lo cierra. Sin esto, en Android 14+ el
      // sistema cierra la app: Flutter solo recibe el atrás si avisa que lo
      // maneja, y el shell es la raíz del navegador (hallazgo 4).
      child: PopScope(
        canPop: !_drawerOpen,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop && _drawerOpen) _closeDrawer();
        },
        child: Scaffold(
          key: _scaffoldKey,
          onDrawerChanged: (open) => setState(() => _drawerOpen = open),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Cabecera del drawer de la web: rótulo y cierre.
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        AppSpacing.xxs,
                        AppSpacing.xxs,
                        0,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'ESPACIO DE TRABAJO',
                              style: AppTextStyles.sectionLabel.copyWith(
                                color: colors.muted,
                              ),
                            ),
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
                    Expanded(
                      child: ListView(
                        key: const ValueKey('drawer_list'),
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        children: [
                          _Profile(
                            name: user.name,
                            email: user.email,
                            image: user.image,
                          ),
                          top(
                            id: 'nav_notes',
                            icon: AppIcons.notes,
                            label: 'Mis notas',
                            selected: currentBranch == 3,
                            onTap: () => _branch(3),
                          ),
                          top(
                            id: 'nav_day',
                            icon: AppIcons.myDay,
                            label: 'Mi día y referencias',
                            selected: currentBranch == 0,
                            onTap: () => _branch(0),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          DrawerResourceSection(
                            id: 'works',
                            title: 'Proyectos',
                            icon: AppIcons.notes,
                            itemIcon: AppIcons.notes,
                            itemLabel: DrawerItemLabel.suffix,
                            expanded: _worksExpanded,
                            onToggle: () => setState(
                              () => _worksExpanded = !_worksExpanded,
                            ),
                            onVisit: () => _branch(1),
                            onViewAll: () => _route(Routes.works),
                            value: works,
                            onRetry: () =>
                                ref.invalidate(worksListProvider(false)),
                            onOpenItem: (id) => _route(Routes.work(id)),
                            selectedItemId: path.startsWith('${Routes.works}/')
                                ? uri.pathSegments.last
                                : null,
                            shortcuts: [
                              for (final view in WorksView.values) ...[
                                // Plantillas va entre Favoritos y Archivados.
                                if (view == WorksView.archived)
                                  DrawerTile(
                                    id: 'nav_templates',
                                    compact: true,
                                    icon: AppIcons.templates,
                                    label: 'Plantillas de objetivo',
                                    selected: currentBranch == 7,
                                    onTap: () => _branch(7),
                                  ),
                                DrawerTile(
                                  id: 'nav_works_${view.name}',
                                  compact: true,
                                  icon: switch (view) {
                                    WorksView.all => AppIcons.gridView,
                                    WorksView.mine => AppIcons.person,
                                    WorksView.favorites => AppIcons.favorite,
                                    WorksView.archived => AppIcons.archived,
                                  },
                                  label: view.label,
                                  selected:
                                      path == Routes.works && worksView == view,
                                  onTap: () => _route(Routes.worksList(view)),
                                ),
                              ],
                            ],
                          ),
                          DrawerResourceSection(
                            id: 'sectors',
                            title: 'Sectores',
                            icon: AppIcons.sectors,
                            itemIcon: AppIcons.sectors,
                            itemLabel: DrawerItemLabel.suffix,
                            expanded: _sectorsExpanded,
                            onToggle: () => setState(
                              () => _sectorsExpanded = !_sectorsExpanded,
                            ),
                            onVisit: () => _branch(2),
                            onViewAll: () => _route(Routes.sectors),
                            value: sectors,
                            onRetry: () => ref.invalidate(sectorsProvider),
                            onOpenItem: (id) => _route(Routes.sector(id)),
                            selectedItemId:
                                path.startsWith('${Routes.sectors}/')
                                ? uri.pathSegments.last
                                : null,
                          ),
                          DrawerResourceSection(
                            id: 'groups',
                            title: 'Grupos',
                            icon: AppIcons.groups,
                            itemIcon: AppIcons.groups,
                            expanded: _groupsExpanded,
                            onToggle: () => setState(
                              () => _groupsExpanded = !_groupsExpanded,
                            ),
                            onVisit: () => _branch(5),
                            onViewAll: () => _route(Routes.groups),
                            value: groups,
                            onRetry: () => ref.invalidate(groupsProvider),
                            onOpenItem: (id) => _route(Routes.group(id)),
                            selectedItemId: path.startsWith('${Routes.groups}/')
                                ? uri.pathSegments[1]
                                : null,
                          ),
                          top(
                            id: 'nav_board',
                            icon: AppIcons.dashboard,
                            label: 'Vista de tareas',
                            selected: currentBranch == 6,
                            onTap: () => _branch(6),
                          ),
                          top(
                            id: 'nav_materials',
                            icon: AppIcons.materials,
                            label: 'Materiales',
                            selected: path == Routes.materials,
                            onTap: () => _route(Routes.materials),
                          ),
                          top(
                            id: 'nav_reminders',
                            icon: AppIcons.calendarToday,
                            label: 'Recordatorios',
                            selected:
                                path == Routes.reminders ||
                                path.startsWith('${Routes.reminders}/'),
                            onTap: () => _route(Routes.reminders),
                          ),
                          // Solo en la app: la bandeja de avisos push.
                          top(
                            id: 'nav_notifications',
                            icon: AppIcons.bell,
                            label: 'Notificaciones',
                            selected: path == Routes.notifications,
                            trailing: unread > 0
                                ? CountBadge(
                                    count: unread,
                                    singular: 'aviso sin leer',
                                    plural: 'avisos sin leer',
                                  )
                                : null,
                            onTap: () => _route(Routes.notifications),
                          ),
                          top(
                            id: 'nav_settings',
                            icon: AppIcons.settings,
                            label: 'Configuración',
                            selected: path.startsWith(Routes.settings),
                            onTap: () => _route(Routes.settings),
                          ),
                          top(
                            id: 'nav_account',
                            icon: AppIcons.person,
                            label: 'Mi cuenta',
                            selected: path == Routes.account,
                            onTap: () => _route(Routes.account),
                          ),
                        ],
                      ),
                    ),
                    // Pie fijo, como `.sidebar-footer`.
                    DecoratedBox(
                      decoration: BoxDecoration(
                        border: Border(top: BorderSide(color: colors.border)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.xxs,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            top(
                              id: 'nav_due_today',
                              icon: AppIcons.bell,
                              label: 'Vence hoy',
                              selected: path == Routes.dueToday,
                              trailing:
                                  deliveries.value != null &&
                                      deliveries.value!.isNotEmpty
                                  ? CountBadge(
                                      key: const ValueKey(
                                        'nav_due_today_total',
                                      ),
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
                            // Solo en la app: abre la lista sin cerrar la
                            // sesión de este servidor.
                            top(
                              id: 'drawer_switch_server',
                              icon: AppIcons.server,
                              label: 'Cambiar de servidor',
                              subtitle: session.serverUrl.host,
                              selected: false,
                              onTap: () {
                                _closeDrawer();
                                context.push(Routes.servers);
                              },
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: AppSpacing.xs,
                              ),
                              child: LogoutTile(
                                actionKey: 'nav_logout',
                                label: 'Salir',
                                plain: true,
                              ),
                            ),
                          ],
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
      ),
    );
  }
}

/// Perfil del drawer, como `.sidebar-profile`: avatar de 32 (foto o dos
/// iniciales sobre `brand`), nombre 14/500 y correo 12 `muted`.
class _Profile extends StatelessWidget {
  const _Profile({required this.name, required this.email, this.image});

  final String name, email;
  final String? image;

  /// Iniciales del nombre (máx. 2 letras), como `getInitials` de la web.
  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    final letters = parts.take(2).map((p) => p[0].toUpperCase()).join();
    return letters.isEmpty ? '?' : letters;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.xs,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          // Decorativo: el nombre se lee al lado.
          ExcludeSemantics(
            child: CircleAvatar(
              radius: AppSpacing.md,
              backgroundColor: colors.brand,
              foregroundColor: colors.onBrand,
              foregroundImage: image == null ? null : NetworkImage(image!),
              onForegroundImageError: image == null ? null : (_, _) {},
              child: Text(
                initials(name),
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
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.itemTitle.copyWith(
                    fontWeight: FontWeight.w500,
                    color: colors.text,
                  ),
                ),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.supporting.copyWith(color: colors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
