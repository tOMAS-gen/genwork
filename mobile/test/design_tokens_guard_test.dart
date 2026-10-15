// Guardia de tokens (DS-28): falla si `lib/features/**` o `lib/shared/**`
// vuelven a usar valores sueltos en lugar de los tokens de `lib/core/theme`.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Únicos lugares autorizados a abrir un `showDialog` directo: los helpers
/// compartidos que lo envuelven.
const _dialogHelpers = {
  'lib/shared/widgets/app_form_dialog.dart',
  'lib/shared/widgets/adaptive_modal.dart',
  'lib/shared/widgets/picker_dialog.dart',
};

class _Rule {
  const _Rule(this.name, this.pattern, {this.allow = const {}});
  final String name;
  final RegExp pattern;
  final Set<String> allow;
}

final _rules = <_Rule>[
  _Rule(
    'Colors.* (usar context.colors)',
    RegExp(r'\bColors\.(?!transparent\b)\w+'),
  ),
  _Rule('Color(0x…) literal (usar GenColors)', RegExp(r'\bColor\(\s*0x')),
  _Rule(
    'Color(int.parse…) (usar colorFromHex)',
    RegExp(r'\bColor\(\s*int\.parse'),
  ),
  _Rule(
    'BorderRadius.circular(<número>) (usar AppGeometry)',
    RegExp(r'BorderRadius\.circular\(\s*\d'),
  ),
  _Rule(
    'showModalBottomSheet (usar showAdaptiveModal)',
    RegExp(r'showModalBottomSheet'),
  ),
  _Rule('Icons.* (usar AppIcons)', RegExp(r'\bIcons\.')),
  _Rule('AlertDialog (usar AppWorkDialog)', RegExp(r'\bAlertDialog\(')),
  _Rule(
    'showDialog directo (usar showAppFormDialog)',
    RegExp(r'\bshowDialog\s*[<(]'),
    allow: _dialogHelpers,
  ),
  _Rule(
    'SizedBox con medida literal (usar AppSpacing)',
    RegExp(r'\bSizedBox\(\s*(?:height|width):\s*[1-9]'),
  ),
];

/// `EdgeInsets.xxx(...)` con algún número distinto de 0 dentro de los paréntesis.
final _edgeInsets = RegExp(r'EdgeInsets\.\w+\(([^()]*)\)');
final _literal = RegExp(r'(?<![\w.])[1-9]\d*(?:\.\d+)?(?![\w.])');

String _withoutComments(String source) => source
    .split('\n')
    .map((l) => l.trimLeft().startsWith('//') ? '' : l)
    .join('\n');

int _lineOf(String source, int offset) =>
    '\n'.allMatches(source.substring(0, offset)).length + 1;

void main() {
  test('features/ y shared/ no usan valores sueltos', () {
    final files = [
      for (final dir in ['lib/features', 'lib/shared'])
        ...Directory(dir)
            .listSync(recursive: true)
            .whereType<File>()
            .where((f) => f.path.endsWith('.dart')),
    ];
    expect(files, isNotEmpty);

    final violations = <String>[];
    for (final file in files) {
      final path = file.path;
      final source = _withoutComments(file.readAsStringSync());
      for (final rule in _rules) {
        if (rule.allow.contains(path)) continue;
        for (final m in rule.pattern.allMatches(source)) {
          violations.add('$path:${_lineOf(source, m.start)} → ${rule.name}');
        }
      }
      for (final m in _edgeInsets.allMatches(source)) {
        if (_literal.hasMatch(m.group(1)!)) {
          violations.add(
            '$path:${_lineOf(source, m.start)} → EdgeInsets con medida literal (usar AppSpacing)',
          );
        }
      }
    }
    expect(violations, isEmpty, reason: '\n${violations.join('\n')}');
  });
}
