import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
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
            setState(() => _busy = true);
            try {
              await ref.read(sessionProvider.notifier).logout();
            } catch (e) {
              if (context.mounted) showErrorSnack(context, e);
            } finally {
              if (mounted) setState(() => _busy = false);
            }
          },
  );
}
