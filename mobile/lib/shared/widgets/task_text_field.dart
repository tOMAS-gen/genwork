import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../core/theme/gen_colors.dart';
import '../../data/models/tag_suggestion.dart';

/// Solo resalta sintaxis; el servidor sigue siendo la fuente del parseo y fecha.
class TaskTextController extends TextEditingController {
  TaskTextController({super.text});
  static final tags = RegExp(
    r'(^|\s)([/#@$])([\p{L}\p{N}_\-.]+)',
    unicode: true,
  );
  static final dates = RegExp(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b');
  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    if (withComposing &&
        value.composing.isValid &&
        !value.composing.isCollapsed) {
      return super.buildTextSpan(
        context: context,
        style: style,
        withComposing: withComposing,
      );
    }
    final c = context.colors;
    final ranges = <(TextRange, Color)>[];
    for (final m in tags.allMatches(text)) {
      final end = m.end - (RegExp(r'\.+$').stringMatch(m[3]!)?.length ?? 0);
      if (end > m.start + m[1]!.length + 1) {
        ranges.add((
          TextRange(start: m.start + m[1]!.length, end: end),
          switch (m[2]) {
            '/' => c.tagWorkText,
            '#' => c.tagExecText,
            '@' => c.tagRefText,
            _ => c.tagLabelText,
          },
        ));
      }
    }
    for (final m in dates.allMatches(text)) {
      final d = int.parse(m[1]!), mo = int.parse(m[2]!), y = int.parse(m[3]!);
      final date = DateTime(y, mo, d);
      if (y >= 2000 &&
          y <= 2099 &&
          date.day == d &&
          date.month == mo &&
          date.year == y) {
        ranges.add((TextRange(start: m.start, end: m.end), c.dueText));
      }
    }
    ranges.sort((a, b) => a.$1.start.compareTo(b.$1.start));
    final spans = <TextSpan>[];
    var at = 0;
    for (final (r, color) in ranges) {
      if (r.start < at) continue;
      spans.add(TextSpan(text: text.substring(at, r.start)));
      spans.add(
        TextSpan(
          text: text.substring(r.start, r.end),
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
      );
      at = r.end;
    }
    spans.add(TextSpan(text: text.substring(at)));
    return TextSpan(style: style, children: spans);
  }
}

class TaskTextField extends ConsumerStatefulWidget {
  const TaskTextField({
    super.key,
    required this.controller,
    required this.fieldKey,
    required this.decoration,
    this.enabled = true,
    this.workId,
    this.sectorId,
    this.onSubmitted,
    this.style,
    this.maxLines,
  });
  final TextEditingController controller;
  final String fieldKey;
  final InputDecoration decoration;
  final bool enabled;
  final String? workId, sectorId;
  final ValueChanged<String>? onSubmitted;
  final TextStyle? style;
  final int? maxLines;
  @override
  ConsumerState<TaskTextField> createState() => _TaskTextFieldState();
}

class _TaskTextFieldState extends ConsumerState<TaskTextField> {
  Timer? _timer;
  int _sequence = 0;
  List<TagSuggestion> _suggestions = [];
  ({int start, int end, String symbol})? _active;
  bool _failed = false;
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_changed);
  }

  @override
  void didUpdateWidget(covariant TaskTextField old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      old.controller.removeListener(_changed);
      widget.controller.addListener(_changed);
    }
    if (old.workId != widget.workId || old.sectorId != widget.sectorId) {
      _changed();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _sequence++;
    widget.controller.removeListener(_changed);
    super.dispose();
  }

  void _changed() {
    _timer?.cancel();
    final seq = ++_sequence;
    final caret = widget.controller.selection.baseOffset;
    final before = caret < 0 ? '' : widget.controller.text.substring(0, caret);
    final m = RegExp(
      r'(^|\s)([/#@$])([\p{L}\p{N}_\-.]*)$',
      unicode: true,
    ).firstMatch(before);
    if (!widget.enabled ||
        m == null ||
        (widget.sectorId != null && m[2] == '#')) {
      if (mounted) {
        setState(() {
          _active = null;
          _suggestions = [];
          _failed = false;
        });
      }
      return;
    }
    final active = (start: caret - m[3]!.length, end: caret, symbol: m[2]!);
    setState(() {
      _active = active;
      _suggestions = [];
      _failed = false;
    });
    _timer = Timer(const Duration(milliseconds: 200), () async {
      try {
        final items = await ref
            .read(tasksRepositoryProvider)
            .suggest(
              m[2]!,
              m[3]!,
              workId: widget.workId,
              sectorId: widget.sectorId,
            );
        if (mounted && seq == _sequence) setState(() => _suggestions = items);
      } catch (_) {
        if (mounted && seq == _sequence) setState(() => _failed = true);
      }
    });
  }

  void _pick(TagSuggestion s) {
    final a = _active;
    if (a == null) return;
    final text = widget.controller.text;
    final insert = '${s.insertText} ';
    widget.controller.value = TextEditingValue(
      text: text.replaceRange(a.start, a.end, insert),
      selection: TextSelection.collapsed(offset: a.start + insert.length),
    );
  }

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      TextField(
        key: ValueKey(widget.fieldKey),
        controller: widget.controller,
        enabled: widget.enabled,
        minLines: 1,
        maxLines: widget.maxLines ?? 3,
        style: widget.style,
        textInputAction: TextInputAction.send,
        onSubmitted: widget.onSubmitted,
        decoration: widget.decoration,
      ),
      if (_failed)
        TextButton(
          onPressed: _changed,
          child: const Text('Reintentar sugerencias'),
        ),
      if (_suggestions.isNotEmpty && widget.enabled)
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 144),
          child: ListView(
            shrinkWrap: true,
            children: [
              for (final s in _suggestions)
                ListTile(
                  key: ValueKey('tag_suggestion_${s.type}_${s.id}'),
                  title: Text(s.name),
                  subtitle: Text(
                    s.keyName ??
                        switch (s.type) {
                          'work' => 'Proyecto',
                          'sector' => 'Sector',
                          'user' => 'Persona',
                          _ => 'Etiqueta',
                        },
                  ),
                  onTap: () => _pick(s),
                ),
            ],
          ),
        ),
      if (!_failed && _active?.symbol == r'$' && _suggestions.isEmpty)
        const Text('No hay etiquetas disponibles para esta búsqueda.'),
    ],
  );
}
