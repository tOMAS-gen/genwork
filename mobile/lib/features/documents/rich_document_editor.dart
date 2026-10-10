import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_form_dialog.dart';
import '../../shared/widgets/app_work_dialog.dart';
import '../../shared/widgets/error_text.dart';
import '../../shared/widgets/gen_skeleton.dart';
import '../files/files_providers.dart';

/// Injectable editor boundary for widget tests; the bundled TipTap is tested in
/// a real WebView. The bridge never receives credentials or arbitrary API URLs.
class RichEditorController {
  Object? _owner;
  Future<void> Function(String, Object?)? _invoke;
  void attach(Object owner, Future<void> Function(String, Object?) invoke) {
    _owner = owner;
    _invoke = invoke;
  }

  void detach(Object owner) {
    if (identical(_owner, owner)) {
      _owner = null;
      _invoke = null;
    }
  }

  Future<void> command(String name, [Object? value]) async =>
      _invoke?.call(name, value);
}

class RichDocumentEditor extends ConsumerStatefulWidget {
  const RichDocumentEditor({
    super.key,
    this.bodyKey = 'document_body',
    required this.content,
    required this.editable,
    required this.controller,
    required this.onChanged,
    required this.onMarkdown,
    required this.onUnsupported,
  });
  final String bodyKey;
  final Object? content;
  final bool editable;
  final RichEditorController controller;
  final ValueChanged<Object?> onChanged;
  final ValueChanged<String> onMarkdown;
  final VoidCallback onUnsupported;
  @override
  ConsumerState<RichDocumentEditor> createState() => _RichDocumentEditorState();
}

class _RichDocumentEditorState extends ConsumerState<RichDocumentEditor> {
  late final WebViewController _web;
  Future<void> _invoke(String name, Object? value) => _web.runJavaScript(
    'nativeEditor.command(${jsonEncode(name)},${jsonEncode(value)})',
  );
  bool _ready = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'Genwork',
        onMessageReceived: (m) => _message(m.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (r) =>
              r.url.startsWith('file:///') || r.url == 'about:blank'
              ? NavigationDecision.navigate
              : NavigationDecision.prevent,
          onWebResourceError: (e) {
            if (e.isForMainFrame == true && mounted) {
              setState(
                () => _error = 'No se pudo abrir el editor. Volvé a entrar.',
              );
            }
          },
        ),
      )
      ..loadFlutterAsset('assets/editor/index.html');
    widget.controller.attach(this, _invoke);
  }

  @override
  void didUpdateWidget(covariant RichDocumentEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_ready && oldWidget.editable != widget.editable) {
      _web.runJavaScript('nativeEditor.setEditable(${widget.editable})');
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // El mismo `page` del tema: el CSS del editor usa sus tokens.
    _web.setBackgroundColor(context.colors.page);
    if (_ready) {
      final dark = Theme.of(context).brightness == Brightness.dark;
      final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
      _web.runJavaScript('nativeEditor.style($dark,$scale)');
    }
  }

  Future<void> _message(String raw) async {
    if (!mounted) return;
    final m = jsonDecode(raw) as Map;
    switch (m['type']) {
      case 'loaded':
        await _web.runJavaScript(
          'nativeEditor.init(${jsonEncode({'content': widget.content, 'editable': widget.editable, 'dark': Theme.of(context).brightness == Brightness.dark, 'scale': MediaQuery.textScalerOf(context).scale(16) / 16})})',
        );
      case 'ready':
        setState(() => _ready = true);
      case 'change':
        widget.onChanged(m['data']);
      case 'unsupported':
        widget.onUnsupported();
      case 'markdown':
        widget.onMarkdown(m['data'] as String);
      case 'image':
        try {
          final bytes = await ref
              .read(filesRepositoryProvider)
              .image(m['data']['src'] as String);
          if (!mounted) return;
          // Browsers sniff common raster formats; SVG is intentionally not loaded.
          final png = bytes.length > 8 && bytes[0] == 137 && bytes[1] == 80;
          final jpeg = bytes.length > 3 && bytes[0] == 255 && bytes[1] == 216;
          final gif =
              bytes.length > 6 &&
              ascii.decode(bytes.sublist(0, 3), allowInvalid: true) == 'GIF';
          final webp =
              bytes.length > 12 &&
              ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP';
          if (!png && !jpeg && !gif && !webp) return;
          await _web.runJavaScript(
            'nativeEditor.image(${jsonEncode(m['data']['id'])},${jsonEncode('data:image/${png
                ? 'png'
                : jpeg
                ? 'jpeg'
                : gif
                ? 'gif'
                : 'webp'};base64,${base64Encode(bytes)}')})',
          );
        } catch (_) {
          /* Alt text remains visible; document source is preserved. */
        }
      case 'openLink':
        final source = Uri.tryParse(m['data'] as String? ?? '');
        final base = Uri.parse(
          ref.read(filesRepositoryProvider).api.dio.options.baseUrl,
        );
        final uri = source == null ? null : base.resolveUri(source);
        if (uri != null && ['https', 'http', 'mailto'].contains(uri.scheme)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      case 'linkRequest':
        var text = '';
        final value = await showAppFormDialog<String>(
          context,
          builder: (context) => AppWorkDialog(
            title: 'Insertar enlace',
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancelar'),
              ),
              TextButton(
                onPressed: () {
                  final u = Uri.tryParse(text.trim());
                  if (u != null &&
                      ['https', 'http', 'mailto'].contains(u.scheme)) {
                    Navigator.pop(context, text.trim());
                  }
                },
                child: const Text('Insertar'),
              ),
            ],
            child: TextField(
              key: const ValueKey('document_link_url'),
              onChanged: (value) => text = value,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(labelText: 'URL https://'),
            ),
          ),
        );
        if (value != null && mounted) {
          await widget.controller.command('link', value);
        }
    }
  }

  @override
  void dispose() {
    // A remote refresh can mount the new view before disposing the old one.
    // Only detach the callback owned by this instance.
    widget.controller.detach(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      WebViewWidget(key: ValueKey(widget.bodyKey), controller: _web),
      // Mientras carga el editor: skeleton en lugar de un spinner.
      if (!_ready && _error == null)
        const Padding(
          padding: EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FractionallySizedBox(
                widthFactor: .6,
                child: GenSkeleton.text(height: AppSpacing.lg),
              ),
              SizedBox(height: AppSpacing.md),
              GenSkeleton.text(),
              SizedBox(height: AppSpacing.xs),
              GenSkeleton.text(),
              SizedBox(height: AppSpacing.xs),
              FractionallySizedBox(widthFactor: .8, child: GenSkeleton.text()),
            ],
          ),
        ),
      if (_error != null) Center(child: ErrorText(_error!)),
    ],
  );
}
