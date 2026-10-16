import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/state_views.dart';

class LogoutTile extends ConsumerStatefulWidget {
  const LogoutTile({super.key, required this.actionKey});
  final String actionKey;
  @override
  ConsumerState<LogoutTile> createState() => _LogoutTileState();
}

class _LogoutTileState extends ConsumerState<LogoutTile> {
  bool _busy = false;
  @override
  Widget build(BuildContext context) => ListTile(
    key: ValueKey(widget.actionKey),
    contentPadding: const EdgeInsets.only(
      left: AppSpacing.md,
      right: AppSpacing.xs,
    ),
    minLeadingWidth: AppSpacing.md,
    horizontalTitleGap: AppSpacing.sm,
    leading: Icon(
      AppIcons.logout,
      size: AppIconSizes.drawer,
      color: context.colors.danger,
    ),
    title: Text(
      _busy ? 'Cerrando sesión…' : 'Cerrar sesión',
      style: AppTextStyles.itemTitle.copyWith(color: context.colors.text),
    ),
    onTap: _busy
        ? null
        : () async {
            final notifier = ref.read(sessionProvider.notifier);
            final messenger = ScaffoldMessenger.maybeOf(context);
            setState(() => _busy = true);
            // Primero a la lista de servidores: con la sesión cerrada, /servers
            // sigue accesible y no se pasa por el login nativo.
            context.go(Routes.servers);
            try {
              await notifier.logout();
            } catch (e) {
              messenger?.showSnackBar(SnackBar(content: Text(errorMessage(e))));
            } finally {
              if (mounted) setState(() => _busy = false);
            }
          },
  );
}
