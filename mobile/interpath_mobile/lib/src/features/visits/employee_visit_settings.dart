import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/secure_session_store.dart';

const employeeBranches = <String>[
  'HARARE',
  'BULAWAYO',
  'MUTARE',
  'CHITUNGWIZA',
  'GWERU',
  'BINDURA',
  'MASVINGO',
  'KWEKWE',
  'ALL',
];

class EmployeeVisitSettings {
  const EmployeeVisitSettings({required this.branch, required this.date});

  final String branch;
  final DateTime date;

  EmployeeVisitSettings copyWith({String? branch, DateTime? date}) {
    return EmployeeVisitSettings(
      branch: branch ?? this.branch,
      date: date ?? this.date,
    );
  }
}

final employeeVisitSettingsProvider = AsyncNotifierProvider<
    EmployeeVisitSettingsController, EmployeeVisitSettings>(
  EmployeeVisitSettingsController.new,
);

class EmployeeVisitSettingsController
    extends AsyncNotifier<EmployeeVisitSettings> {
  @override
  Future<EmployeeVisitSettings> build() async {
    final branch =
        await ref.read(secureSessionStoreProvider).readEmployeeBranch();
    return EmployeeVisitSettings(
      branch: branch?.trim().toUpperCase() ?? '',
      date: DateTime.now(),
    );
  }

  Future<void> selectBranch(String branch) async {
    final value = branch.trim().toUpperCase();
    if (value.isEmpty) return;
    final current =
        state.value ?? EmployeeVisitSettings(branch: '', date: DateTime.now());
    state = AsyncData(current.copyWith(branch: value));
    await ref.read(secureSessionStoreProvider).saveEmployeeBranch(value);
  }

  void selectDate(DateTime date) {
    final current =
        state.value ?? EmployeeVisitSettings(branch: '', date: DateTime.now());
    state = AsyncData(current.copyWith(date: date));
  }
}
