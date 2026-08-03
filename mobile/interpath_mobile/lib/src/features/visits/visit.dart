class Visit {
  const Visit({
    required this.labNumber,
    required this.patientName,
    required this.tests,
    required this.visitDate,
    required this.status,
    this.clinic,
    this.paymentMode,
    this.phoneNumber,
    this.doctor,
    this.doctorPhoneNumber,
    this.canSendToDoctor = false,
    this.recipientValidation,
  });

  final String labNumber;
  final String patientName;
  final String tests;
  final String visitDate;
  final String status;
  final String? clinic;
  final String? paymentMode;
  final String? phoneNumber;
  final String? doctor;
  final String? doctorPhoneNumber;
  final bool canSendToDoctor;
  final String? recipientValidation;

  bool get isCompleted {
    final value = status.trim().toLowerCase();
    return value.contains('complete') ||
        value.contains('authorised') ||
        value.contains('authorized') ||
        value.contains('reported') ||
        value.contains('result ready') ||
        value == 'success' ||
        value == 'final';
  }

  factory Visit.fromJson(Map<String, dynamic> json) {
    return Visit(
      labNumber: '${json['LabNumber'] ?? ''}',
      patientName: '${json['PatientName'] ?? ''}',
      tests: '${json['Tests'] ?? ''}',
      visitDate: '${json['VisitDate'] ?? ''}',
      status: '${json['Status'] ?? ''}',
      clinic: json['Clinic']?.toString(),
      paymentMode: json['PaymentMode']?.toString(),
      phoneNumber: json['PhoneNumber']?.toString(),
      doctor: json['Doctor']?.toString(),
      doctorPhoneNumber: json['DoctorPhoneNumber']?.toString(),
      canSendToDoctor: json['CanSendToDoctor'] == true,
      recipientValidation: json['RecipientValidation']?.toString(),
    );
  }
}
