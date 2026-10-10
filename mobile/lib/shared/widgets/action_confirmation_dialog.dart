import 'package:flutter/material.dart';
import 'state_views.dart';

/// Mantiene la confirmación y el error visibles hasta que la operación termina.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  required Future<void> Function() onConfirm,
  String? exactName,
  bool danger = false,
}) async =>
    await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _Confirmation(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        onConfirm: onConfirm,
        exactName: exactName,
        danger: danger,
      ),
    ) ??
    false;

class _Confirmation extends StatefulWidget {
  const _Confirmation({
    required this.title,
    required this.message,
    required this.confirmLabel,
    required this.onConfirm,
    this.exactName,
    required this.danger,
  });
  final String title, message, confirmLabel;
  final String? exactName;
  final bool danger;
  final Future<void> Function() onConfirm;
  @override
  State<_Confirmation> createState() => _ConfirmationState();
}

class _ConfirmationState extends State<_Confirmation> {
  final _name = TextEditingController();
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onConfirm();
      if (mounted) Navigator.pop(context, true);
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
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: Text(widget.title),
      scrollable: true,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.message),
          if (widget.exactName != null) ...[
            const SizedBox(height: 16),
            Text('Escribí «${widget.exactName}» para confirmar:'),
            TextField(
              key: const ValueKey('confirm_name'),
              controller: _name,
              enabled: !_busy,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Nombre exacto'),
            ),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
        ],
      ),
      actions: [
        TextButton(
          key: const ValueKey('action_cancel'),
          onPressed: _busy ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('action_confirm'),
          style: widget.danger
              ? FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error,
                  foregroundColor: Theme.of(context).colorScheme.onError,
                )
              : null,
          onPressed:
              _busy ||
                  (widget.exactName != null &&
                      _name.text.trim() != widget.exactName)
              ? null
              : _confirm,
          child: Text(_busy ? 'Guardando…' : widget.confirmLabel),
        ),
      ],
    ),
  );
}
