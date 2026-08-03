import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../shared/services/api_client.dart';
import 'result_models.dart';

final resultsRepositoryProvider = Provider<ResultsRepository>((ref) {
  return ResultsRepository(ref);
});

class ResultsRepository {
  const ResultsRepository(this.ref);

  final Ref ref;

  Future<ResultDetail> getResults(String labNumber) async {
    final dio = ref.read(dioProvider);
    final response = await dio.get<Map<String, dynamic>>(
      '/api/results/$labNumber',
    );

    return ResultDetail.fromJson(response.data ?? const {});
  }

  Future<String?> sendWhatsAppResult({
    required String labNumber,
    required String phoneNumber,
    required String patientName,
  }) async {
    final dio = ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/results/${Uri.encodeComponent(labNumber)}/send-whatsapp',
      data: {
        'phoneNumber': phoneNumber,
        'patientName': patientName,
      },
    );
    return response.data?['messageId']?.toString();
  }

  Future<BulkWhatsAppSendResult> sendBulkWhatsAppResults({
    required DateTime date,
    required String branch,
    required List<String> labNumbers,
  }) async {
    final dio = ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/results/bulk-whatsapp/send',
      data: {
        'date': DateFormat('yyyy-MM-dd').format(date),
        'branch': branch,
        'labNumbers': labNumbers,
      },
    );
    return BulkWhatsAppSendResult.fromJson(response.data ?? const {});
  }

  Future<List<WhatsAppSendAttempt>> listWhatsAppAttempts() async {
    final dio = ref.read(dioProvider);
    final response = await dio.get<Map<String, dynamic>>(
      '/api/results/whatsapp-attempts',
    );
    final rows = response.data?['attempts'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map>()
        .map(
          (row) => WhatsAppSendAttempt.fromJson(
            Map<String, dynamic>.from(row),
          ),
        )
        .toList();
  }

  Future<WhatsAppSendAttempt> retryWhatsAppAttempt(String attemptId) async {
    final dio = ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/results/whatsapp-attempts/${Uri.encodeComponent(attemptId)}/retry',
    );
    return WhatsAppSendAttempt.fromJson(
      Map<String, dynamic>.from(response.data?['attempt'] as Map? ?? const {}),
    );
  }
}

class WhatsAppSendAttempt {
  const WhatsAppSendAttempt({
    required this.id,
    required this.labNumber,
    required this.recipientName,
    required this.destination,
    required this.status,
    required this.createdAt,
    this.statusTimestamp,
    this.errorMessage,
    this.source,
  });

  final String id;
  final String labNumber;
  final String recipientName;
  final String destination;
  final String status;
  final DateTime createdAt;
  final DateTime? statusTimestamp;
  final String? errorMessage;
  final String? source;

  bool get isSuccessful => const {'delivered', 'read'}.contains(status);
  bool get isFailed => status == 'failed';
  bool get isPending => const {'accepted', 'sent'}.contains(status);
  bool get canRetry =>
      isFailed ||
      (isPending && DateTime.now().difference(createdAt).inMinutes >= 2);

  factory WhatsAppSendAttempt.fromJson(Map<String, dynamic> json) {
    return WhatsAppSendAttempt(
      id: json['id']?.toString() ?? '',
      labNumber: json['labNumber']?.toString() ?? '',
      recipientName: json['recipientName']?.toString() ?? 'Doctor',
      destination: json['destination']?.toString() ?? '',
      status: json['status']?.toString().toLowerCase() ?? 'accepted',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      statusTimestamp: DateTime.tryParse(
        json['statusTimestamp']?.toString() ?? '',
      ),
      errorMessage: json['errorMessage']?.toString(),
      source: json['source']?.toString(),
    );
  }
}

class BulkWhatsAppSendResult {
  const BulkWhatsAppSendResult({
    required this.sent,
    required this.failed,
    required this.items,
  });

  final int sent;
  final int failed;
  final List<BulkWhatsAppSendItem> items;

  factory BulkWhatsAppSendResult.fromJson(Map<String, dynamic> json) {
    final rows = json['results'];
    return BulkWhatsAppSendResult(
      sent: (json['sent'] as num?)?.toInt() ?? 0,
      failed: (json['failed'] as num?)?.toInt() ?? 0,
      items: rows is List
          ? rows
              .whereType<Map>()
              .map(
                (row) => BulkWhatsAppSendItem.fromJson(
                  Map<String, dynamic>.from(row),
                ),
              )
              .toList()
          : const [],
    );
  }
}

class BulkWhatsAppSendItem {
  const BulkWhatsAppSendItem({
    required this.labNumber,
    required this.status,
    this.message,
  });

  final String labNumber;
  final String status;
  final String? message;

  bool get wasSent => status == 'sent';

  factory BulkWhatsAppSendItem.fromJson(Map<String, dynamic> json) {
    return BulkWhatsAppSendItem(
      labNumber: json['labNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? 'failed',
      message: json['message']?.toString(),
    );
  }
}
