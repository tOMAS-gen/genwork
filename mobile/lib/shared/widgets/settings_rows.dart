import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import 'workspace_panel.dart';

/// Alto de una fila de ajuste de una línea (PS4).
const double _oneLine = 56;

/// Alto de una fila de ajuste con descripción.
const double _twoLine = 64;

/// Grupo de ajustes (PS4): rótulo 11/700 opcional y una sola card con las
/// filas separadas por divisores de 1 px, en lugar de una card por ítem.
class SettingsGroup extends StatelessWidget {
  const SettingsGroup({super.key, this.label, required this.children});

  final String? label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (label != null)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.xs),
          child: Semantics(
            header: true,
            child: Text(
              label!.toUpperCase(),
              style: AppTextStyles.sectionLabel.copyWith(
                color: context.colors.muted,
              ),
            ),
          ),
        ),
      WorkspaceListPanel(children: children),
    ],
  );
}

/// Fila de un [SettingsGroup]: 56 dp (64 con descripción), ícono de 20 dp gris
/// en una columna de 40 y chevron cuando navega.
class SettingsRow extends StatelessWidget {
  const SettingsRow({
    super.key,
    required this.title,
    this.icon,
    this.leading,
    this.subtitle,
    this.technicalSubtitle = false,
    this.trailing,
    this.onTap,
    this.navigates = true,
  });

  final String title;
  final IconData? icon;

  /// Reemplaza al ícono (por ejemplo, el avatar de la cuenta).
  final Widget? leading;
  final String? subtitle;

  /// Descripción en mono, para valores como una URL.
  final bool technicalSubtitle;

  /// Por defecto, chevron si la fila navega.
  final Widget? trailing;
  final VoidCallback? onTap;

  /// En falso, la fila ejecuta una acción (Cerrar sesión) y no lleva chevron.
  final bool navigates;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lead =
        leading ??
        (icon == null
            ? null
            : Icon(icon, size: AppIconSizes.action, color: c.muted));
    return ListTile(
      minTileHeight: subtitle == null ? _oneLine : _twoLine,
      // Denso: sus líneas base están pensadas para una fila de 64.
      dense: true,
      minVerticalPadding: AppSpacing.xs,
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      minLeadingWidth: AppSpacing.lg,
      horizontalTitleGap: AppSpacing.md,
      // Sin ícono, el texto igual arranca en la columna de los demás.
      leading: lead ?? const SizedBox(width: AppSpacing.lg),
      title: Text(
        title,
        style: AppTextStyles.cardTitle.copyWith(color: c.text),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  (technicalSubtitle
                          ? AppTextStyles.technical
                          : AppTextStyles.supporting)
                      .copyWith(color: c.muted),
            ),
      trailing:
          trailing ??
          (onTap == null || !navigates
              ? null
              : Icon(
                  AppIcons.chevronRight,
                  size: AppIconSizes.action,
                  color: c.muted,
                )),
      onTap: onTap,
    );
  }
}
