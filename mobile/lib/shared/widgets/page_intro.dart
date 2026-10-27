import 'package:flutter/material.dart';

import 'gen_section_header.dart';

/// Encabezado de pantalla: título y subtítulo, con el estilo de
/// [GenSectionHeader].
class PageIntro extends StatelessWidget {
  const PageIntro({super.key, required this.title, required this.subtitle});
  final String title, subtitle;
  @override
  Widget build(BuildContext context) =>
      GenSectionHeader(title: title, subtitle: subtitle);
}
