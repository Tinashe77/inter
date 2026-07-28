import 'package:flutter_test/flutter_test.dart';
import 'package:interpath_mobile/src/features/visits/visits_repository.dart';

void main() {
  test('parses visits from the API response envelope', () {
    final visits = parseVisitsResponse({
      'message': null,
      'visits': [
        {
          'LabNumber': 'LAB-123',
          'PatientName': 'Test Patient',
          'Tests': 'FBC',
          'VisitDate': '27/07/2026',
          'Status': 'Complete',
        },
      ],
    });

    expect(visits, hasLength(1));
    expect(visits.single.labNumber, 'LAB-123');
    expect(visits.single.patientName, 'Test Patient');
  });

  test('returns an empty list when the response has no visits', () {
    expect(parseVisitsResponse({'message': 'No records'}), isEmpty);
  });
}
