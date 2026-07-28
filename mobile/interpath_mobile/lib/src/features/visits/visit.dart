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
  });

  final String labNumber;
  final String patientName;
  final String tests;
  final String visitDate;
  final String status;
  final String? clinic;
  final String? paymentMode;
  final String? phoneNumber;

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
    );
  }
}
