import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/interpath_shell.dart';
import 'employee_visit_settings.dart';

class BranchSelectionPage extends ConsumerStatefulWidget {
  const BranchSelectionPage({super.key});

  @override
  ConsumerState<BranchSelectionPage> createState() =>
      _BranchSelectionPageState();
}

class _BranchSelectionPageState extends ConsumerState<BranchSelectionPage> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(employeeVisitSettingsProvider).value;
    if (_controller.text.isEmpty && settings?.branch.isNotEmpty == true) {
      _controller.text = settings!.branch;
    }

    return InterpathShell(
      title: 'Select branch',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Employee branch',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Daily visits will be requested from SLIS for this branch.',
          ),
          const SizedBox(height: 22),
          TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Branch or location',
              hintText: 'ALL, HARARE, BULAWAYO…',
              prefixIcon: Icon(Icons.location_on_outlined),
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final branch in employeeBranches)
                ChoiceChip(
                  label: Text(branch),
                  selected: _controller.text == branch,
                  onSelected: (_) => setState(() => _controller.text = branch),
                ),
            ],
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _continue,
            icon: const Icon(Icons.check_circle_outline_rounded),
            label: const Text('Continue to visits'),
          ),
        ],
      ),
    );
  }

  Future<void> _continue() async {
    if (_controller.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select or enter a branch.')),
      );
      return;
    }
    await ref
        .read(employeeVisitSettingsProvider.notifier)
        .selectBranch(_controller.text);
    if (mounted) context.go('/visits');
  }
}
