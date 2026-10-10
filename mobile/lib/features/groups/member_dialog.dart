import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/group.dart';
import '../../shared/widgets/async_value_view.dart';
import '../../shared/widgets/state_views.dart';
import '../shell/resource_refresh.dart';
import 'groups_providers.dart';
import '../../shared/widgets/error_text.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';

Future<void> showMemberDialog(
  BuildContext context,
  GroupSummary group, {
  GroupMember? member,
}) => showAppFormDialog<void>(
  context,
  barrierDismissible: false,
  builder: (_) => _MemberDialog(group: group, member: member),
);

class _MemberDialog extends ConsumerStatefulWidget {
  const _MemberDialog({required this.group, this.member});
  final GroupSummary group;
  final GroupMember? member;
  @override
  ConsumerState<_MemberDialog> createState() => _MemberDialogState();
}

class _MemberDialogState extends ConsumerState<_MemberDialog> {
  late GroupMember? _selected = widget.member;
  late String _role = widget.member?.role ?? 'MEMBER';
  String _query = '', _typed = '';
  Timer? _debounce;
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || _selected == null || _selected!.id == widget.group.ownerId) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(groupsRepositoryProvider)
          .setMember(widget.group.id, email: _selected!.email, role: _role);
      if (!mounted) return;
      refreshGroups(ref);
      Navigator.pop(context);
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
    final q = (id: widget.group.id, query: _query);
    final group = ref.watch(groupProvider(widget.group.id));
    final allowed =
        !group.hasError &&
        group.value?.canManage(ref.watch(currentUserProvider)) == true;
    return PopScope(
      canPop: !_busy,
      child: AppWorkDialog(
        title: widget.member == null ? 'Agregar miembro' : 'Cambiar rol',
        closeEnabled: !_busy,
        onClose: () => Navigator.pop(context),
        actions: [
          TextButton(
            onPressed: _busy ? null : () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('member_save'),
            onPressed: !_busy && allowed && _selected != null ? _save : null,
            child: Text(_busy ? 'Guardando…' : 'Guardar'),
          ),
        ],
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.member == null) ...[
              TextField(
                key: const ValueKey('member_search'),
                enabled: !_busy,
                decoration: const InputDecoration(labelText: 'Nombre o correo'),
                onChanged: (v) {
                  _debounce?.cancel();
                  setState(() {
                    _typed = v.trim();
                    _selected = null;
                  });
                  _debounce = Timer(const Duration(milliseconds: 300), () {
                    if (mounted) setState(() => _query = _typed);
                  });
                },
              ),
              if (_typed.length < 2)
                const Text('Escribí al menos 2 caracteres')
              else if (_typed != _query)
                const Text('Buscando…')
              else
                AsyncValueView(
                  value: ref.watch(memberSearchProvider(q)),
                  onRetry: () => ref.invalidate(memberSearchProvider(q)),
                  data: (members) => Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (members.isEmpty)
                        const Text(
                          'No hay personas disponibles. Deben haber ingresado al sistema y no ser miembros de este grupo.',
                        ),
                      for (final member in members.where(
                        (m) =>
                            m.id != widget.group.ownerId &&
                            !widget.group.members.any(
                              (existing) => existing.id == m.id,
                            ),
                      ))
                        ListTile(
                          key: ValueKey('member_candidate_${member.id}'),
                          title: Text(member.name),
                          subtitle: Text(member.email),
                          trailing: _selected?.id == member.id
                              ? const Icon(AppIcons.check)
                              : null,
                          onTap: _busy
                              ? null
                              : () => setState(() => _selected = member),
                        ),
                    ],
                  ),
                ),
            ] else
              Text('${_selected!.name}\n${_selected!.email}'),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String>(
              key: const ValueKey('member_role'),
              initialValue: _role,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Rol'),
              items: const [
                DropdownMenuItem(value: 'MEMBER', child: Text('Miembro')),
                DropdownMenuItem(value: 'ADMIN', child: Text('Administrador')),
              ],
              onChanged: _busy ? null : (v) => setState(() => _role = v!),
            ),
            if (!allowed)
              const Text('Ya no tenés permiso para administrar este grupo.'),
            if (_error != null) ErrorText(_error!),
          ],
        ),
      ),
    );
  }
}
