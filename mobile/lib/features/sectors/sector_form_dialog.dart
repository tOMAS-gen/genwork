import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/app_user.dart';
import '../../data/models/group.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/color_palette.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import '../works/works_providers.dart';
import '../../shared/widgets/error_text.dart';

List<GroupSummary> sectorCreationGroups(
  AppUser? user,
  List<GroupSummary> groups,
) => user == null
    ? []
    : groups
          .where((g) => user.isSuperAdmin || g.adminUserIds.contains(user.id))
          .toList();
bool canCreateSector(AppUser? user) =>
    user?.role == GlobalRole.member || user?.role == GlobalRole.superadmin;

Future<String?> showSectorForm(
  BuildContext context, {
  String? id,
  String? name,
  String? color,
}) => showAppFormDialog<String>(
  context,
  barrierDismissible: false,
  builder: (_) => _SectorForm(id: id, name: name, color: color),
);

class _SectorForm extends ConsumerStatefulWidget {
  const _SectorForm({this.id, this.name, this.color});
  final String? id, name, color;
  @override
  ConsumerState<_SectorForm> createState() => _SectorFormState();
}

class _SectorFormState extends ConsumerState<_SectorForm> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.name);
  late String? _color = widget.color;
  String _scope = 'personal';
  bool _busy = false;
  String? _error;
  bool get _creating => widget.id == null;
  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    final user = ref.read(currentUserProvider);
    if (_creating ? !canCreateSector(user) : user?.isSuperAdmin != true) return;
    final allowedGroups = sectorCreationGroups(
      user,
      ref.read(groupsProvider).value ?? [],
    );
    if (_creating &&
        _scope != 'personal' &&
        _scope != 'global' &&
        !allowedGroups.any((g) => g.id == _scope)) {
      return;
    }
    if (_creating && _scope == 'global' && user?.isSuperAdmin != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repository = ref.read(sectorsRepositoryProvider);
      String id;
      if (_creating) {
        id = await repository.create(
          name: _name.text.trim(),
          color: _color,
          groupId: _scope == 'personal' || _scope == 'global' ? null : _scope,
          global: _scope == 'global',
        );
      } else {
        id = widget.id!;
        await repository.update(id, name: _name.text.trim(), color: _color);
      }
      if (!mounted) return;
      refreshResources(ref);
      Navigator.pop(context, id);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = errorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final groups = ref.watch(groupsProvider);
    final allowedGroups = sectorCreationGroups(user, groups.value ?? []);
    final selectedScope =
        _scope == 'personal' ||
            (_scope == 'global' && user?.isSuperAdmin == true) ||
            allowedGroups.any((g) => g.id == _scope)
        ? _scope
        : null;
    return PopScope(
      canPop: !_busy,
      child: AppWorkDialog(
        title: _creating ? 'Nuevo sector' : 'Editar sector',
        closeEnabled: !_busy,
        actions: [
          TextButton(
            onPressed: _busy ? null : () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('sector_form_save'),
            onPressed: _busy ? null : _save,
            child: Text(
              _busy
                  ? 'Guardando…'
                  : _creating
                  ? 'Crear sector'
                  : 'Guardar',
            ),
          ),
        ],
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                key: const ValueKey('sector_form_name'),
                controller: _name,
                enabled: !_busy,
                maxLength: 80,
                decoration: const InputDecoration(labelText: 'Nombre'),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Ingresá un nombre' : null,
              ),
              const SizedBox(height: 16),
              ColorPalette(
                value: _color,
                creating: _creating,
                onChanged: _busy ? null : (v) => setState(() => _color = v),
              ),
              if (_creating) ...[
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  key: ValueKey('sector_form_scope_$selectedScope'),
                  isExpanded: true,
                  initialValue: selectedScope,
                  decoration: const InputDecoration(labelText: 'Ámbito'),
                  items: [
                    const DropdownMenuItem(
                      value: 'personal',
                      child: Text('Personal'),
                    ),
                    for (final group in allowedGroups)
                      DropdownMenuItem(
                        value: group.id,
                        child: Text(
                          group.name,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    if (user?.isSuperAdmin == true)
                      const DropdownMenuItem(
                        value: 'global',
                        child: Text('Global'),
                      ),
                  ],
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _scope = value!),
                  validator: (_) => selectedScope == null
                      ? 'Volvé a elegir un ámbito disponible'
                      : null,
                ),
                if (groups.isLoading)
                  const Padding(
                    padding: EdgeInsets.all(8),
                    child: Text('Cargando grupos…'),
                  ),
                if (groups.hasError) ...[
                  ErrorText(errorMessage(groups.error!)),
                  TextButton(
                    onPressed: () => ref.invalidate(groupsProvider),
                    child: const Text('Reintentar grupos'),
                  ),
                ],
              ],
              if (_error != null) ErrorText(_error!),
            ],
          ),
        ),
      ),
    );
  }
}
