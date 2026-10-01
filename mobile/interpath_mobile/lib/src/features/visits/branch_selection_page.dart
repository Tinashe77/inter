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
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Branch or location',
              hintText: 'ALL, HARARE, BULAWAYO…',
              prefixIcon: Icon(Icons.location_on_outlined),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final branch in employeeBranches)
                ChoiceChip(
                  label: Text(
                    branch,
                    style: TextStyle(
                      color: _controller.text == branch
                          ? Colors.white
                          : const Color(0xFF334155),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                  selected: _controller.text == branch,
                  backgroundColor: Colors.white,
                  selectedColor: Theme.of(context).colorScheme.primary,
                  side: BorderSide(
                    color: _controller.text == branch
                        ? Theme.of(context).colorScheme.primary
                        : const Color(0xFFD6DEEB),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
                  onSelected: (_) => setState(() => _controller.text = branch),
                ),
            ],
          ),
          const SizedBox(height: 18),
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
