import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/routes.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/material.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/gen_page_scaffold.dart';
import '../../shared/widgets/state_views.dart';
import 'materials_providers.dart';

/// Materiales, como `/materials` de la web: los totales de cada material en
/// los proyectos activos visibles, con el detalle por proyecto.
class MaterialsScreen extends ConsumerStatefulWidget {
  const MaterialsScreen({super.key});

  @override
  ConsumerState<MaterialsScreen> createState() => _MaterialsScreenState();
}

class _MaterialsScreenState extends ConsumerState<MaterialsScreen> {
  String _query = '';

  bool _matches(MaterialTotal row) {
    final q = _query.trim().toLowerCase();
    return q.isEmpty ||
        '${row.productName} ${row.productCode} ${row.humanCode}'
            .toLowerCase()
            .contains(q);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GenPageScaffold(
      title: 'Materiales',
      subtitle: 'Totales consolidados de proyectos activos visibles.',
      onRefresh: () => ref.refresh(materialTotalsProvider.future),
      body: AsyncValueView(
        value: ref.watch(materialTotalsProvider),
        onRetry: () => ref.invalidate(materialTotalsProvider),
        data: (rows) {
          final visible = rows.where(_matches).toList();
          return ListView(
            key: const ValueKey('materials_totals'),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              // Sin materiales no hay nada que filtrar (P20-M2).
              if (rows.isEmpty)
                const EmptyView(
                  icon: AppIcons.materialsEmpty,
                  title: 'No hay materiales cargados',
                  message:
                      'Los materiales que agregues en cada proyecto aparecerán consolidados acá.',
                )
              else ...[
                TextField(
                  key: const ValueKey('materials_filter'),
                  onChanged: (v) => setState(() => _query = v),
                  decoration: const InputDecoration(
                    hintText: 'Filtrar por material o código',
                    prefixIcon: Icon(
                      AppIcons.search,
                      size: AppIconSizes.notice,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                if (visible.isEmpty)
                  Text(
                    'Sin materiales que coincidan.',
                    style: AppTextStyles.body.copyWith(color: c.muted),
                  )
                else
                  for (final row in visible) _TotalCard(row: row),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _TotalCard extends StatelessWidget {
  const _TotalCard({required this.row});
  final MaterialTotal row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Card(
        key: ValueKey('material_total_${row.productId}'),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.productName,
                          style: AppTextStyles.itemTitle.copyWith(
                            fontWeight: FontWeight.w700,
                            color: c.text,
                          ),
                        ),
                        Text(
                          row.code,
                          style: AppTextStyles.supporting.copyWith(
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    row.totalLabel,
                    style: AppTextStyles.itemTitle.copyWith(
                      fontWeight: FontWeight.w700,
                      color: c.text,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              for (final p in row.projects)
                InkWell(
                  key: ValueKey('material_total_work_${p.workId}'),
                  borderRadius: AppGeometry.control,
                  onTap: () => context.push(Routes.work(p.workId)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: AppSpacing.xs,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: p.workName,
                              style: AppTextStyles.body.copyWith(
                                color: c.brand,
                              ),
                              children: [
                                if (p.groupName != null)
                                  TextSpan(
                                    text: '  ${p.groupName}',
                                    style: AppTextStyles.supporting.copyWith(
                                      color: c.muted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        Text(
                          formatQuantity(p.quantityRequired, row.unit),
                          style: AppTextStyles.body.copyWith(
                            fontWeight: FontWeight.w600,
                            color: c.text,
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
    );
  }
}
