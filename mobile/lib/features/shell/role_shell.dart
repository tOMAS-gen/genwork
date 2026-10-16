import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_icons.dart';
import '../../shared/widgets/app_drawer_scope.dart';
import '../../shared/widgets/brand_name.dart';
import '../account/logout_tile.dart';
import 'live_refresher.dart';

/// Los roles de consulta nunca montan el shell ni los providers internos.
class RoleShell extends ConsumerStatefulWidget {
  const RoleShell({super.key, required this.child});
  final Widget child;
  @override
  ConsumerState<RoleShell> createState() => _RoleShellState();
}

class _RoleShellState extends ConsumerState<RoleShell> {
  final _key = GlobalKey<ScaffoldState>();
  late final AppLifecycleListener _lifecycle;
  late final Timer _poll;
  void _refresh() =>
      unawaited(ref.read(sessionProvider.notifier).refreshUser());
  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onResume: _refresh);
    _poll = Timer.periodic(const Duration(minutes: 1), (_) {
      if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        _refresh();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _refresh();
    });
  }

  @override
  void dispose() {
    _poll.cancel();
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(liveRefresherProvider);
    final user = ref.watch(currentUserProvider);
    final session = ref.watch(sessionProvider).value;
    final serverHost = session is SignedIn ? session.serverUrl.host : null;
    final home = user?.isClient == true ? Routes.portal : Routes.tv;
    final location = GoRouterState.of(context).uri.path;
    void go(String path) {
      _key.currentState?.closeDrawer();
      context.go(path);
    }

    return AppDrawerScope(
      openDrawer: () => _key.currentState?.openDrawer(),
      child: Scaffold(
        key: _key,
        drawer: Drawer(
          key: const ValueKey('role_navigation'),
          child: SafeArea(
            child: ListView(
              children: [
                const ListTile(title: BrandName()),
                ListTile(
                  title: Text(user?.name ?? ''),
                  subtitle: Text(user?.email ?? ''),
                ),
                const Divider(),
                ListTile(
                  key: const ValueKey('role_home'),
                  leading: Icon(
                    user?.isClient == true
                        ? AppIcons.projects
                        : AppIcons.dashboard,
                  ),
                  title: Text(
                    user?.isClient == true
                        ? 'Mis proyectos'
                        : 'Vista de tareas',
                  ),
                  selected: location == home,
                  onTap: () => go(home),
                ),
                ListTile(
                  key: const ValueKey('role_account'),
                  leading: const Icon(AppIcons.person),
                  title: const Text('Mi cuenta'),
                  selected: location == '$home/account',
                  onTap: () => go('$home/account'),
                ),
                ListTile(
                  key: const ValueKey('drawer_switch_server'),
                  leading: const Icon(AppIcons.server),
                  title: const Text('Cambiar de servidor'),
                  subtitle: Text(serverHost ?? ''),
                  onTap: () {
                    // Abre la lista sin cerrar la sesión de este servidor.
                    _key.currentState?.closeDrawer();
                    context.push(Routes.servers);
                  },
                ),
                const LogoutTile(actionKey: 'role_logout'),
              ],
            ),
          ),
        ),
        body: widget.child,
      ),
    );
  }
}
