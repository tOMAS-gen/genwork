import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'state_views.dart';

typedef OrderItem = ({String id, String label});
Future<bool> showReorderDialog(
  BuildContext context, {
  required String title,
  required Future<List<OrderItem>> Function() load,
  required Future<void> Function(List<String>) save,
}) async =>
    await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _ReorderDialog(title: title, load: load, save: save),
    ) ??
    false;

class _ReorderDialog extends StatefulWidget {
  const _ReorderDialog({
    required this.title,
    required this.load,
    required this.save,
  });
  final String title;
  final Future<List<OrderItem>> Function() load;
  final Future<void> Function(List<String>) save;
  @override
  State<_ReorderDialog> createState() => _ReorderDialogState();
}

class _ReorderDialogState extends State<_ReorderDialog> {
  List<OrderItem>? _items;
  Object? _error;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final items = await widget.load();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (_busy || _items == null || _items!.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.save(_items!.map((i) => i.id).toList());
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _move(int from, int to) =>
      setState(() => _items!.insert(to, _items!.removeAt(from)));
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: Text(widget.title),
      scrollable: true,
      content: SizedBox(
        width: AppSpace.contentMax,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_busy) const LinearProgressIndicator(),
            if (_error != null) ...[
              Text(
                errorMessage(_error!),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              TextButton(
                key: const ValueKey('order_reload'),
                onPressed: _busy ? null : _load,
                child: const Text('Actualizar lista'),
              ),
            ],
            if (_items?.isEmpty == true)
              const Text('No hay tareas para ordenar.'),
            for (var i = 0; i < (_items?.length ?? 0); i++)
              Row(
                key: ValueKey('order_item_${_items![i].id}'),
                children: [
                  Expanded(child: Text(_items![i].label)),
                  IconButton(
                    key: ValueKey('order_up_${_items![i].id}'),
                    tooltip: 'Subir',
                    onPressed: _busy || i == 0 ? null : () => _move(i, i - 1),
                    icon: const Icon(Icons.arrow_upward),
                  ),
                  IconButton(
                    key: ValueKey('order_down_${_items![i].id}'),
                    tooltip: 'Bajar',
                    onPressed: _busy || i == _items!.length - 1
                        ? null
                        : () => _move(i, i + 1),
                    icon: const Icon(Icons.arrow_downward),
                  ),
                ],
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const ValueKey('order_save'),
          onPressed: _busy || _items?.isNotEmpty != true ? null : _save,
          child: const Text('Guardar orden'),
        ),
      ],
    ),
  );
}
