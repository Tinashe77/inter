import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/interpath_shell.dart';
import 'visit.dart';

class VisitDetailPage extends StatelessWidget {
  const VisitDetailPage({required this.labNumber, this.visit, super.key});

  final String labNumber;
  final Visit? visit;

  @override
  Widget build(BuildContext context) {
    return InterpathShell(
      title: labNumber,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            visit?.patientName.isNotEmpty == true
                ? visit!.patientName
                : 'Visit details',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 16),
          Card(
            elevation: 0,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _Detail(label: 'Lab number', value: labNumber),
                  if (visit != null) ...[
                    _Detail(label: 'Visit date', value: visit!.visitDate),
                    _Detail(label: 'Tests', value: visit!.tests),
                    _Detail(label: 'Status', value: visit!.status),
                    _Detail(label: 'Clinic', value: visit!.clinic ?? ''),
                    _Detail(
                      label: 'Payment mode',
                      value: visit!.paymentMode ?? '',
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: () => context.push('/results/$labNumber'),
            icon: const Icon(Icons.science_rounded),
            label: const Text('View results'),
          ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
