import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../shared/services/api_client.dart';

final pdfRepositoryProvider = Provider<PdfRepository>((ref) {
  return PdfRepository(ref);
});

final pdfBytesProvider =
    FutureProvider.autoDispose.family<Uint8List, String>((ref, labNumber) {
  return ref.read(pdfRepositoryProvider).download(labNumber);
});

class PdfRepository {
  const PdfRepository(this.ref);
  final Ref ref;

  Future<Uint8List> download(String labNumber) async {
    final response = await ref.read(dioProvider).get<List<int>>(
          '/api/results/${Uri.encodeComponent(labNumber)}/pdf',
          options: Options(responseType: ResponseType.bytes),
        );
    return Uint8List.fromList(response.data ?? const []);
  }

  Future<File> saveTemporary(String labNumber, Uint8List bytes) async {
    final directory = await getTemporaryDirectory();
    final safeLabNumber = labNumber.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
    final file = File('${directory.path}/${safeLabNumber}_Test_Results.pdf');
    return file.writeAsBytes(bytes, flush: true);
  }
}

class PdfActions extends ConsumerStatefulWidget {
  const PdfActions({
    required this.labNumber,
    required this.available,
    super.key,
  });

  final String labNumber;
  final bool available;

  @override
  ConsumerState<PdfActions> createState() => _PdfActionsState();
}

class _PdfActionsState extends ConsumerState<PdfActions> {
  bool _sharing = false;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: widget.available
                ? () => context.push('/results/${widget.labNumber}/pdf')
                : null,
            icon: const Icon(Icons.picture_as_pdf_rounded),
            label: const Text('Preview PDF'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: widget.available && !_sharing ? _sharePdf : null,
            icon: _sharing
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download_rounded),
            label: Text(_sharing ? 'Preparing…' : 'Save / share'),
          ),
        ),
      ],
    );
  }

  Future<void> _sharePdf() async {
    setState(() => _sharing = true);
    try {
      final bytes = await ref.read(pdfBytesProvider(widget.labNumber).future);
      final file = await ref
          .read(pdfRepositoryProvider)
          .saveTemporary(widget.labNumber, bytes);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf')],
          subject: 'Interpath result ${widget.labNumber}',
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('The PDF could not be prepared.')),
        );
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }
}
