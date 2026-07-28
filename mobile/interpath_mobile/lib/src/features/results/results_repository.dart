import 'package:flutter_riverpod/flutter_riverpod.dart';

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
}
