import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfrx/pdfrx.dart';

import 'pdf_actions.dart';

class PdfPreviewPage extends ConsumerWidget {
  const PdfPreviewPage({required this.labNumber, super.key});
  final String labNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pdf = ref.watch(pdfBytesProvider(labNumber));

    return Scaffold(
      appBar: AppBar(title: Text('$labNumber PDF')),
      body: SafeArea(
        child: pdf.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Unable to open this PDF.'),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => ref.invalidate(pdfBytesProvider(labNumber)),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (bytes) => PdfViewer.data(
            bytes,
            sourceName: '${labNumber}_Test_Results.pdf',
          ),
        ),
      ),
    );
  }
}
