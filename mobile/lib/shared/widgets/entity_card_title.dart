import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Diámetro del punto de color de la entidad.
const double _dot = 8;

/// Nombre de un proyecto, sector o grupo como título de su card (D4): 15/600
/// en su caja original y hasta dos líneas. El color del recurso va como un
/// punto de 8 dp, no como fondo; los chips quedan para los metadatos.
class EntityCardTitle extends StatelessWidget {
  const EntityCardTitle({super.key, required this.name, this.color});

  final String name;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = AppTextStyles.cardTitle.copyWith(color: c.text);
    // Centra el punto en la primera línea.
    final lineHeight = style.fontSize! * style.height!;
    return Semantics(
      header: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (color != null) ...[
            Padding(
              padding: EdgeInsets.only(top: (lineHeight - _dot) / 2),
              child: Container(
                key: const ValueKey('entity_dot'),
                width: _dot,
                height: _dot,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
            ),
            const SizedBox(width: AppSpacing.xs),
          ],
          Flexible(
            child: Text(
              name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: style,
            ),
          ),
        ],
      ),
    );
  }
}
