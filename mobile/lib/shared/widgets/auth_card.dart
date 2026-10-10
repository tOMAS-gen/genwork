import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/gen_colors.dart';
import 'brand_name.dart';
import 'workspace_panel.dart';

/// Marco de las pantallas previas al ingreso (servidor y login), igual que el
/// login web a 390 px: una card `surface` centrada, con borde `border`, radio 8
/// y padding 16, sobre una página con padding 24; arriba la marca «›genwork»
/// centrada y su bajada en 13 `muted`.
class AuthCard extends StatelessWidget {
  const AuthCard({
    super.key,
    required this.children,
    this.tagline = 'Gestión de proyectos por cliente y sector',
  });

  final String tagline;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppSpace.contentMax),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: WorkspacePanel(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: BrandName(size: 24)),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      tagline,
                      textAlign: TextAlign.center,
                      style: AppTextStyles.body.copyWith(color: c.muted),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    ...children,
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
