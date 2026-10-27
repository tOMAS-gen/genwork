import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/breadcrumb.dart';
import 'works_providers.dart';

/// Miga de las subpantallas del proyecto (Documento, Archivos, Actividad,
/// Acceso cliente y Materiales): dice de qué proyecto son y vuelve al detalle
/// (PS13 de la auditoría premium). Mientras el proyecto carga, no ocupa lugar.
class ProjectBreadcrumb extends ConsumerWidget {
  const ProjectBreadcrumb({super.key, required this.workId, this.current});

  final String workId;

  /// La subpantalla, después del proyecto: «Cartelería del local / Documento».
  final String? current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final work = ref.watch(workDetailProvider(workId)).value;
    if (work == null) return const SizedBox.shrink();
    return Breadcrumb(
      rootKey: const ValueKey('project_breadcrumb'),
      rootLabel: work.name,
      current: current,
      onRoot: () => Navigator.maybePop(context),
    );
  }
}
