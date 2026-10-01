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

  Future<VisitPageResult> listVisits({
    required DateTime date,
    String branch = 'ALL',
    int page = 1,
  }) async {
    final dio = ref.read(dioProvider);
    final response = await dio.get<Map<String, dynamic>>(
      '/api/visits',
      queryParameters: {
        'date': DateFormat('yyyy-MM-dd').format(date),
        'branch': branch,
        'page': page,
      },
    );

    return parseVisitPageResponse(response.data, requestedPage: page);
  }
}

class VisitPageResult {
  const VisitPageResult({
    required this.visits,
    required this.page,
    required this.hasMore,
    this.totalPages,
    this.totalRecords,
  });

  final List<Visit> visits;
  final int page;
  final bool hasMore;
  final int? totalPages;
  final int? totalRecords;
}

VisitPageResult parseVisitPageResponse(
  Map<String, dynamic>? data, {
  int requestedPage = 1,
}) {
  final pagination = data?['pagination'];
  final metadata = pagination is Map ? pagination : const {};
  return VisitPageResult(
    visits: parseVisitsResponse(data),
    page: _asInt(metadata['page']) ?? requestedPage,
    hasMore: metadata['hasMore'] == true,
    totalPages: _asInt(metadata['totalPages']),
    totalRecords: _asInt(metadata['totalRecords']),
  );
}

int? _asInt(dynamic value) => value is int ? value : int.tryParse('$value');

List<Visit> parseVisitsResponse(Map<String, dynamic>? data) {
  final rows = data?['visits'];
  if (rows is! List) return const [];

  return rows
      .whereType<Map>()
      .map((row) => Visit.fromJson(Map<String, dynamic>.from(row)))
      .toList();
}
