import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/tag_suggestion.dart';
import '../../shared/widgets/picker_dialog.dart';
import '../../shared/widgets/state_views.dart';

/// Selector de "+ Asignar" del detalle de tarea (piloto premium P09).
///
/// Lista sectores y personas con la misma API de sugerencias que el campo de
/// texto (`@` trae los dos). Devuelve la etiqueta para agregar al texto: un
/// sector como `#sector` (lo ejecuta) y una persona como `@persona`. En el
/// contexto de un sector no se ofrecen sectores, como en el campo de texto.
Future<String?> showTaskAssignDialog(
  BuildContext context, {
  String? workId,
  String? sectorId,
  bool allowSectors = true,
}) => showPickerDialog<String>(
  context,
  title: 'Asignar',
  builder: (_) => _AssignBody(
    workId: workId,
    sectorId: sectorId,
    allowSectors: allowSectors,
  ),
);

class _AssignBody extends ConsumerStatefulWidget {
  const _AssignBody({
    required this.workId,
    required this.sectorId,
    required this.allowSectors,
  });

  final String? workId, sectorId;
  final bool allowSectors;

  @override
  ConsumerState<_AssignBody> createState() => _AssignBodyState();
}

class _AssignBodyState extends ConsumerState<_AssignBody> {
  late Future<List<TagSuggestion>> _items = _load('');
  Timer? _timer;

  Future<List<TagSuggestion>> _load(String query) => ref
      .read(tasksRepositoryProvider)
      .suggest(
        '@',
        query.trim(),
        workId: widget.workId,
        sectorId: widget.sectorId,
      );

  void _search(String query) {
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 200), () {
      if (!mounted) return;
      setState(() {
        _items = _load(query);
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: TextField(
            key: const ValueKey('task_assign_search'),
            autofocus: true,
            onChanged: _search,
            decoration: const InputDecoration(
              hintText: 'Buscar sector o persona…',
              prefixIcon: Icon(AppIcons.search),
            ),
          ),
        ),
        Flexible(
          child: FutureBuilder<List<TagSuggestion>>(
            future: _items,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Text(errorMessage(snapshot.error!)),
                );
              }
              if (!snapshot.hasData) return const LinearProgressIndicator();
              final sectors = widget.allowSectors
                  ? snapshot.data!.where((s) => s.type == 'sector').toList()
                  : const <TagSuggestion>[];
              final users = snapshot.data!
                  .where((s) => s.type == 'user')
                  .toList();
              if (sectors.isEmpty && users.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Text(
                    'Sin resultados.',
                    style: AppTextStyles.body.copyWith(color: c.muted),
                  ),
                );
              }
              Widget header(String label) => Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.md,
                  AppSpacing.xs,
                ),
                child: Text(
                  label,
                  style: AppTextStyles.sectionLabel.copyWith(color: c.muted),
                ),
              );
              Widget item(TagSuggestion s, String symbol, IconData icon) =>
                  ListTile(
                    key: ValueKey('task_assign_${s.type}_${s.id}'),
                    leading: Icon(icon, color: c.muted),
                    title: Text(s.name),
                    onTap: () =>
                        Navigator.of(context).pop('$symbol${s.insertText}'),
                  );
              return ListView(
                shrinkWrap: true,
                children: [
                  if (sectors.isNotEmpty) ...[
                    header('SECTORES'),
                    for (final s in sectors) item(s, '#', AppIcons.sectors),
                  ],
                  if (users.isNotEmpty) ...[
                    header('PERSONAS'),
                    for (final s in users) item(s, '@', AppIcons.person),
                  ],
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}
