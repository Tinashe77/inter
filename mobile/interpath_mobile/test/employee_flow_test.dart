import 'package:flutter_test/flutter_test.dart';
import 'package:interpath_mobile/src/features/results/result_models.dart';
import 'package:interpath_mobile/src/features/visits/visit.dart';
import 'package:interpath_mobile/src/features/visits/visits_page.dart';
import 'package:interpath_mobile/src/features/visits/visits_repository.dart';

void main() {
  test('employee API payload flows from visits into grouped result details',
      () {
    final visits = parseVisitsResponse({
      'visits': [
        {
          'LabNumber': 'IP-1001',
          'PatientName': 'Jane Example',
          'Tests': 'Full Blood Count',
          'VisitDate': '27/07/2026',
          'Status': 'Complete',
          'Clinic': 'Harare',
        },
      ],
    });

    expect(filterVisits(visits, 'jane'), hasLength(1));
    expect(filterVisits(visits, 'IP-1001'), hasLength(1));
    expect(filterVisits(visits, 'chemistry'), isEmpty);

    final detail = ResultDetail.fromJson({
      'labNumber': visits.single.labNumber,
      'pdfGenerated': true,
      'results': [
        {
          'Profile': 'Haematology',
          'Test': 'Haemoglobin',
          'Result': '11.2',
          'Units': 'g/dL',
          'Range': '12.0 - 16.0',
          'Flag': 'L',
        },
        {
          'Profile': 'Haematology',
          'Test': 'WBC',
          'Result': '6.4',
          'Units': '10^9/L',
        },
      ],
      'metadata': {
        'patientDetails': {'PatientName': 'Jane Example'},
        'reportedBy': 'Scientist One',
        'authorizedBy': 'Pathologist One',
      },
    });

    expect(detail.labNumber, 'IP-1001');
    expect(detail.profiles, hasLength(1));
    expect(detail.profiles.single.results, hasLength(2));
    expect(detail.profiles.single.results.first.isFlagged, isTrue);
    expect(detail.pdfGenerated, isTrue);
    expect(detail.reportedBy, 'Scientist One');
  });

  test('visit filtering is case insensitive across supported fields', () {
    const visit = Visit(
      labNumber: 'LAB-5',
      patientName: 'Tariro Moyo',
      tests: 'Renal profile',
      visitDate: '27/07/2026',
      status: 'Complete',
      clinic: 'Mutare Clinic',
    );

    expect(filterVisits(const [visit], 'MUTARE'), hasLength(1));
    expect(filterVisits(const [visit], 'renal'), hasLength(1));
  });
}
