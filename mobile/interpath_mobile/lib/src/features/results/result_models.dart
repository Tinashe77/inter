class ResultDetail {
  const ResultDetail({
    required this.labNumber,
    required this.profiles,
    required this.pdfGenerated,
    this.message,
    this.patientDetails = const {},
    this.credentials = const [],
    this.reportedBy,
    this.authorizedBy,
    this.resultsToFollow = false,
  });

  final String labNumber;
  final List<ResultProfile> profiles;
  final bool pdfGenerated;
  final String? message;
  final Map<String, dynamic> patientDetails;
  final List<Map<String, dynamic>> credentials;
  final String? reportedBy;
  final String? authorizedBy;
  final bool resultsToFollow;

  factory ResultDetail.fromJson(Map<String, dynamic> json) {
    final metadata = _map(json['metadata']);
    final patient = _firstMap(metadata['patientDetails']);
    final credentials = _maps(metadata['credentials']);
    final rows = _maps(json['results']);

    return ResultDetail(
      labNumber: '${json['labNumber'] ?? ''}',
      profiles: groupResultRows(rows),
      pdfGenerated: json['pdfGenerated'] == true,
      message: json['message']?.toString(),
      patientDetails: patient,
      credentials: credentials,
      reportedBy: metadata['reportedBy']?.toString(),
      authorizedBy: metadata['authorizedBy']?.toString(),
      resultsToFollow: metadata['resultsToFollow'] == true,
    );
  }
}

List<ResultProfile> groupResultRows(List<Map<String, dynamic>> rows) {
  final grouped = <String, List<TestResult>>{};
  final comments = <String, Map<String, String>>{};

  for (final row in rows) {
    final profile = '${row['Profile'] ?? 'General'}'.trim();
    final name = profile.isEmpty ? 'General' : profile;
    grouped.putIfAbsent(name, () => []).add(TestResult.fromJson(row));
    comments[name] = {
      'auto': '${row['AutoComment'] ?? ''}',
      'additional': '${row['AdditionalComment'] ?? ''}',
      'profile': '${row['ProfileComment'] ?? ''}',
    };
  }

  return grouped.entries.map((entry) {
    final profileComments = comments[entry.key] ?? const {};
    return ResultProfile(
      profile: entry.key,
      results: entry.value,
      autoComment: profileComments['auto'],
      additionalComment: profileComments['additional'],
      profileComment: profileComments['profile'],
    );
  }).toList();
}

class ResultProfile {
  const ResultProfile({
    required this.profile,
    required this.results,
    this.autoComment,
    this.additionalComment,
    this.profileComment,
  });

  final String profile;
  final List<TestResult> results;
  final String? autoComment;
  final String? additionalComment;
  final String? profileComment;
}

class TestResult {
  const TestResult({
    required this.test,
    required this.result,
    required this.units,
    required this.flag,
    required this.range,
    required this.comment,
  });

  final String test;
  final String result;
  final String units;
  final String flag;
  final String range;
  final String comment;

  bool get isFlagged => flag.trim().isNotEmpty;

  factory TestResult.fromJson(Map<String, dynamic> json) {
    return TestResult(
      test: '${json['Test'] ?? ''}',
      result: '${json['Result'] ?? ''}',
      units: '${json['Units'] ?? ''}',
      flag: '${json['Flag'] ?? ''}',
      range: '${json['Range'] ?? ''}',
      comment: '${json['Comment'] ?? json['Fcomment'] ?? ''}',
    );
  }
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

Map<String, dynamic> _firstMap(Object? value) {
  if (value is List && value.isNotEmpty) return _map(value.first);
  return _map(value);
}

List<Map<String, dynamic>> _maps(Object? value) {
  if (value is! List) return const [];
  return value.whereType<Map>().map(Map<String, dynamic>.from).toList();
}
