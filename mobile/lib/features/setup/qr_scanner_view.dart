import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Cómo se construye el visor de QR. Se puede reemplazar en tests (la cámara no
/// existe en `flutter test`).
typedef QrScannerBuilder =
    Widget Function(BuildContext context, ValueChanged<String> onCode);

final qrScannerBuilderProvider = Provider<QrScannerBuilder>(
  (ref) =>
      (context, onCode) => QrScannerView(onCode: onCode),
);

/// Visor de cámara que entrega el texto de cada QR leído. Quien lo usa decide
/// qué hacer con repeticiones (la cámara puede leer el mismo QR muchas veces).
class QrScannerView extends StatefulWidget {
  const QrScannerView({super.key, required this.onCode});

  final ValueChanged<String> onCode;

  @override
  State<QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<QrScannerView> {
  final _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AspectRatio(
      aspectRatio: 1,
      child: ClipRRect(
        borderRadius: AppGeometry.card,
        child: MobileScanner(
          key: const ValueKey('setup_scanner'),
          controller: _controller,
          onDetect: (capture) {
            for (final barcode in capture.barcodes) {
              final value = barcode.rawValue;
              if (value != null && value.isNotEmpty) {
                widget.onCode(value);
                return;
              }
            }
          },
          errorBuilder: (context, error) => ColoredBox(
            color: c.surface,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(AppIcons.qrScanner, color: c.muted),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'No se pudo usar la cámara. Revisá el permiso o escribí la dirección a mano.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.supporting.copyWith(color: c.muted),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
