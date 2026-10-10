// Portado de genstock: frontend/lib/shared/widgets/app_dropdown_decoration.dart
import 'package:flutter/material.dart';

import '../../core/theme/app_geometry.dart';

/// Iguala el cuerpo de un dropdown al campo de texto del tema.
///
/// `DropdownButtonFormField` reserva 24 px para su contenido y necesita aire
/// vertical; no se impone una altura: texto ampliado, ayuda y validación
/// conservan el espacio que necesiten. Un padding explícito del consumidor se
/// respeta.
InputDecoration appDropdownDecoration([
  InputDecoration decoration = const InputDecoration(),
]) => decoration.copyWith(
  contentPadding:
      decoration.contentPadding ??
      const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
);
