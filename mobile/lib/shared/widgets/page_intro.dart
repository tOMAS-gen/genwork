import 'package:flutter/material.dart';

import 'gen_section_header.dart';

/// Encabezado de pantalla: título, subtítulo e ícono opcional, con el estilo
/// de [GenSectionHeader].
class PageIntro extends StatelessWidget {
  const PageIntro({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon,
  });
  final String title, subtitle;
  final IconData? icon;
  @override
  Widget build(BuildContext context) =>
      GenSectionHeader(title: title, subtitle: subtitle, icon: icon);
}
