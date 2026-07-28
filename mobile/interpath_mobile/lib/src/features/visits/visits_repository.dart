import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../shared/services/api_client.dart';
import 'visit.dart';

final visitsRepositoryProvider = Provider<VisitsRepository>((ref) {
  return VisitsRepository(ref);
});

class VisitsRepository {
  const VisitsRepository(this.ref);

  final Ref ref;

  Future<List<Visit>> listVisits({
    required DateTime date,
    String branch = 'ALL',
  }) async {
    final dio = ref.read(dioProvider);
    final response = await dio.get<Map<String, dynamic>>(
      '/api/visits',
      queryParameters: {
        'date': DateFormat('yyyy-MM-dd').format(date),
        'branch': branch,
      },
    );

    return parseVisitsResponse(response.data);
  }
}

List<Visit> parseVisitsResponse(Map<String, dynamic>? data) {
  final rows = data?['visits'];
  if (rows is! List) return const [];

  return rows
      .whereType<Map>()
      .map((row) => Visit.fromJson(Map<String, dynamic>.from(row)))
      .toList();
}
