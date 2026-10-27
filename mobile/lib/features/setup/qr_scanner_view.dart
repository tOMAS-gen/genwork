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
  Widget build(BuildContext context) => Center(
    child: QrViewfinder(
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
        errorBuilder: (context, error) => const _CameraError(),
      ),
    ),
  );
}

/// Avisa a quien contiene el visor que la cámara no está disponible (sin
/// permiso o sin cámara), para ofrecer con más peso escribir la dirección.
class QrCameraUnavailable extends Notification {
  const QrCameraUnavailable();
}

/// Lado del visor (P01-M1).
const double _viewfinder = 240;

/// Largo de cada esquina de encuadre.
const double _corner = 24;

/// Visor de 240 × 240 dp sobre `field`, con esquinas de encuadre de marca.
class QrViewfinder extends StatelessWidget {
  const QrViewfinder({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox.square(
      dimension: _viewfinder,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            key: const ValueKey('qr_viewfinder_box'),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: c.field,
              borderRadius: AppGeometry.card,
            ),
            child: child,
          ),
          IgnorePointer(
            child: CustomPaint(
              key: const ValueKey('qr_corners'),
              painter: _CornersPainter(c.brand),
            ),
          ),
        ],
      ),
    );
  }
}

class _CornersPainter extends CustomPainter {
  const _CornersPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = AppSpacing.xxs
      ..style = PaintingStyle.stroke;
    const inset = AppSpacing.md;
    final l = inset, t = inset;
    final r = size.width - inset, b = size.height - inset;
    for (final (x, y, dx, dy) in [
      (l, t, 1.0, 1.0),
      (r, t, -1.0, 1.0),
      (l, b, 1.0, -1.0),
      (r, b, -1.0, -1.0),
    ]) {
      canvas.drawPath(
        Path()
          ..moveTo(x, y + dy * _corner)
          ..lineTo(x, y)
          ..lineTo(x + dx * _corner, y),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_CornersPainter old) => old.color != color;
}

/// Error de cámara dentro del visor: ícono de 32 dp y texto 13/400.
class _CameraError extends StatefulWidget {
  const _CameraError();

  @override
  State<_CameraError> createState() => _CameraErrorState();
}

class _CameraErrorState extends State<_CameraError> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) const QrCameraUnavailable().dispatch(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(AppIcons.qrScanner, size: AppIconSizes.empty, color: c.muted),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'No se pudo usar la cámara. Revisá el permiso o escribí la dirección a mano.',
              textAlign: TextAlign.center,
              style: AppTextStyles.body.copyWith(color: c.muted),
            ),
          ],
        ),
      ),
    );
  }
}
