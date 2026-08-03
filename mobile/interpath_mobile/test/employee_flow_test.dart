import 'package:flutter_test/flutter_test.dart';
import 'package:interpath_mobile/src/features/results/result_models.dart';
import 'package:interpath_mobile/src/features/results/results_repository.dart';
import 'package:interpath_mobile/src/features/visits/visit.dart';
import 'package:interpath_mobile/src/features/visits/visits_page.dart';
import 'package:interpath_mobile/src/features/visits/visits_repository.dart';

void main() {
  test('bulk WhatsApp response preserves each lab result status', () {
    final result = BulkWhatsAppSendResult.fromJson(const {
      'sent': 1,
      'failed': 1,
      'results': [
        {'labNumber': 'LAB-1', 'status': 'sent'},
        {
          'labNumber': 'LAB-2',
          'status': 'failed',
          'message': 'Recipient unavailable',
        },
      ],
    });

    expect(result.sent, 1);
    expect(result.failed, 1);
    expect(result.items.first.labNumber, 'LAB-1');
    expect(result.items.first.wasSent, isTrue);
    expect(result.items.last.message, 'Recipient unavailable');
  });

  test('WhatsApp history distinguishes delivered, pending and failed', () {
    final delivered = WhatsAppSendAttempt.fromJson(const {
      'id': '1',
      'labNumber': 'LAB-1',
      'recipientName': 'Dr Test',
      'destination': '+26377•••456',
      'status': 'delivered',
      'createdAt': '2026-08-03T12:00:00.000Z',
    });
    final pending = WhatsAppSendAttempt.fromJson(const {
      'id': '2',
      'labNumber': 'LAB-2',
      'recipientName': 'Clinic Test',
      'destination': '+26371•••456',
      'status': 'accepted',
      'createdAt': '2026-08-03T12:00:00.000Z',
    });
    final failed = WhatsAppSendAttempt.fromJson(const {
      'id': '3',
      'labNumber': 'LAB-3',
      'recipientName': 'Dr Failed',
      'destination': '+26378•••456',
      'status': 'failed',
      'createdAt': '2026-08-03T12:00:00.000Z',
      'errorMessage': 'Recipient unavailable',
    });

    expect(delivered.isSuccessful, isTrue);
    expect(delivered.canRetry, isFalse);
    expect(pending.isPending, isTrue);
    expect(failed.isFailed, isTrue);
    expect(failed.canRetry, isTrue);
  });

  test('completed visit includes an automatically resolved doctor recipient',
      () {
    final visit = Visit.fromJson(const {
      'LabNumber': 'IP-2001',
      'PatientName': 'Patient One',
      'Status': 'Authorised',
      'Doctor': 'Dr Example',
      'DoctorPhoneNumber': '263772123456',
      'CanSendToDoctor': true,
    });

    expect(visit.isCompleted, isTrue);
    expect(visit.canSendToDoctor, isTrue);
    expect(visit.doctor, 'Dr Example');
    expect(visit.doctorPhoneNumber, '263772123456');
  });

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
