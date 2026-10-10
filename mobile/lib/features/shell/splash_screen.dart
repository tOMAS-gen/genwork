import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Mientras se lee la sesión guardada.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Image.asset(
        'assets/brand/genwork.png',
        width: AppSpace.hero,
        height: AppSpace.hero,
        semanticLabel: 'genwork, cargando',
      ),
    ),
  );
}
