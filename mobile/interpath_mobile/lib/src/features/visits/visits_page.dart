import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../shared/widgets/interpath_shell.dart';
import '../../shared/services/api_exception.dart';
import '../../shared/theme/interpath_theme.dart';
import '../results/results_repository.dart';
import 'employee_visit_settings.dart';
import 'visit.dart';
import 'visits_repository.dart';

typedef VisitQuery = ({String branch, DateTime date});

final visitsProvider =
    FutureProvider.autoDispose.family<List<Visit>, VisitQuery>((ref, query) {
  return ref.read(visitsRepositoryProvider).listVisits(
        date: query.date,
        branch: query.branch,
      );
});

class VisitsPage extends ConsumerStatefulWidget {
  const VisitsPage({super.key});

  @override
  ConsumerState<VisitsPage> createState() => _VisitsPageState();
}

class _VisitsPageState extends ConsumerState<VisitsPage> {
  static const _pageSize = 40;
  final _searchController = TextEditingController();
  String _search = '';
  int _visibleCount = _pageSize;
  int _activeTab = 0;
  final Set<String> _selectedLabNumbers = {};
  bool _sending = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsState = ref.watch(employeeVisitSettingsProvider);

    return InterpathShell(
      title: 'Results',
      child: settingsState.when(
        loading: () => const _LoadingVisits(),
        error: (_, __) => const Text('Unable to load visit preferences.'),
        data: (settings) {
          if (settings.branch.isEmpty) {
            return ElevatedButton(
              onPressed: () => context.go('/branch-selection'),
              child: const Text('Select a branch'),
            );
          }

          final query = (branch: settings.branch, date: settings.date);
          final visitsState = ref.watch(visitsProvider(query));

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _VisitControls(
                settings: settings,
                isLoading: visitsState.isLoading,
                onRefresh: () => ref.invalidate(visitsProvider(query)),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _searchController,
                onChanged: (value) => setState(() {
                  _search = value;
                  _visibleCount = _pageSize;
                }),
                decoration: InputDecoration(
                  labelText: 'Search results',
                  hintText: 'Patient, lab number, test or clinic',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _search.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Clear search',
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _search = '';
                              _visibleCount = _pageSize;
                            });
                          },
                          icon: const Icon(Icons.clear_rounded),
                        ),
                ),
              ),
              const SizedBox(height: 16),
              DefaultTabController(
                length: 2,
                initialIndex: _activeTab,
                child: TabBar(
                  onTap: (index) => setState(() {
                    _activeTab = index;
                    _visibleCount = _pageSize;
                  }),
                  tabs: const [
                    Tab(text: 'Results'),
                    Tab(text: 'Bulk send'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              visitsState.when(
                loading: () => const _LoadingVisits(),
                error: (error, _) => _VisitsError(
                  message: apiErrorMessage(error),
                  onRetry: () => ref.invalidate(visitsProvider(query)),
                ),
                data: (items) {
                  final source = _activeTab == 0
                      ? items
                      : items.where((visit) => visit.isCompleted).toList();
                  final filtered = filterVisits(source, _search);
                  if (filtered.isEmpty) {
                    return _EmptyVisits(
                      hasSearch: _search.trim().isNotEmpty,
                      completed: _activeTab == 1,
                    );
                  }
                  final visible = filtered.take(_visibleCount).toList();
                  final eligible =
                      filtered.where((visit) => visit.canSendToDoctor).toList();
                  final selected = eligible
                      .where(
                        (visit) =>
                            _selectedLabNumbers.contains(visit.labNumber),
                      )
                      .toList();
                  final allSelected =
                      eligible.isNotEmpty && selected.length == eligible.length;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_activeTab == 1)
                        _CompletedActions(
                          total: filtered.length,
                          eligible: eligible.length,
                          selected: selected.length,
                          allSelected: allSelected,
                          sending: _sending,
                          onSelectAll: eligible.isEmpty
                              ? null
                              : (value) => setState(() {
                                    if (value) {
                                      _selectedLabNumbers.addAll(
                                        eligible
                                            .map((visit) => visit.labNumber),
                                      );
                                    } else {
                                      _selectedLabNumbers.removeAll(
                                        eligible
                                            .map((visit) => visit.labNumber),
                                      );
                                    }
                                  }),
                          onReview: selected.isEmpty || _sending
                              ? null
                              : () => _reviewAndSend(selected, settings),
                        )
                      else
                        Text(
                          '${filtered.length} result${filtered.length == 1 ? '' : 's'}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      const SizedBox(height: 10),
                      for (final visit in visible)
                        _VisitCard(
                          visit: visit,
                          selectable: _activeTab == 1,
                          selected:
                              _selectedLabNumbers.contains(visit.labNumber),
                          onSelected: visit.canSendToDoctor
                              ? (value) => setState(() {
                                    if (value) {
                                      _selectedLabNumbers.add(visit.labNumber);
                                    } else {
                                      _selectedLabNumbers
                                          .remove(visit.labNumber);
                                    }
                                  })
                              : null,
                        ),
                      if (visible.length < filtered.length)
                        OutlinedButton.icon(
                          onPressed: () => setState(
                            () => _visibleCount += _pageSize,
                          ),
                          icon: const Icon(Icons.expand_more_rounded),
                          label: Text(
                            'Load more (${filtered.length - visible.length} remaining)',
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _reviewAndSend(
    List<Visit> visits,
    EmployeeVisitSettings settings,
  ) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Approve ${visits.length} result${visits.length == 1 ? '' : 's'}?',
        ),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 420),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Verify every lab-to-recipient pairing. The server will re-check each completed result, normalize its doctor number and create a separate secure link before sending.',
                ),
                const SizedBox(height: 14),
                for (final visit in visits)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.verified_user_outlined),
                    title: Text(visit.patientName),
                    subtitle: Text(
                      '${visit.labNumber}\n${visit.doctor?.trim().isNotEmpty == true ? visit.doctor : visit.clinic}\n${maskPhone(visit.doctorPhoneNumber)}',
                    ),
                    isThreeLine: true,
                  ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.send_rounded),
            label: const Text('Approve and send'),
          ),
        ],
      ),
    );
    if (approved != true || !mounted) return;

    setState(() => _sending = true);
    try {
      final result =
          await ref.read(resultsRepositoryProvider).sendBulkWhatsAppResults(
                date: settings.date,
                branch: settings.branch,
                labNumbers: visits.map((visit) => visit.labNumber).toList(),
              );
      if (!mounted) return;
      final sentLabNumbers = result.items
          .where((item) => item.wasSent)
          .map((item) => item.labNumber);
      setState(() => _selectedLabNumbers.removeAll(sentLabNumbers));
      final failureMessages = result.items
          .where((item) => !item.wasSent)
          .map((item) => '${item.labNumber}: ${item.message ?? 'Not sent'}')
          .join(' | ');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.failed == 0
                ? '${result.sent} WhatsApp result${result.sent == 1 ? '' : 's'} sent to the verified recipients.'
                : '${result.sent} sent; ${result.failed} blocked or failed. $failureMessages',
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

List<Visit> filterVisits(List<Visit> visits, String query) {
  final term = query.trim().toLowerCase();
  if (term.isEmpty) return visits;
  return visits.where((visit) {
    return [
      visit.patientName,
      visit.labNumber,
      visit.tests,
      visit.clinic,
      visit.visitDate,
    ].any((value) => (value ?? '').toLowerCase().contains(term));
  }).toList();
}

class _VisitControls extends ConsumerWidget {
  const _VisitControls({
    required this.settings,
    required this.isLoading,
    required this.onRefresh,
  });

  final EmployeeVisitSettings settings;
  final bool isLoading;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xE6181C38), Color(0xE61B2457)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            const Row(
              children: [
                Icon(Icons.tune_rounded, color: InterpathColors.primaryBlue),
                SizedBox(width: 10),
                Text(
                  'Result filters',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: InterpathColors.textDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const _ControlIcon(icon: Icons.location_on_outlined),
              title: const Text('Branch'),
              subtitle: Text(settings.branch),
              trailing: TextButton(
                onPressed: () => context.go('/branch-selection'),
                child: const Text('Change'),
              ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const _ControlIcon(icon: Icons.calendar_today_outlined),
              title: const Text('Visit date'),
              subtitle:
                  Text(DateFormat('EEEE, d MMMM yyyy').format(settings.date)),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: settings.date,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (date != null) {
                  ref
                      .read(employeeVisitSettingsProvider.notifier)
                      .selectDate(date);
                }
              },
              trailing: const Icon(Icons.edit_calendar_outlined),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: isLoading ? null : onRefresh,
              icon: isLoading
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh_rounded),
              label: Text(isLoading ? 'Loading results…' : 'Refresh results'),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingVisits extends StatelessWidget {
  const _LoadingVisits();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 36),
      child: Column(
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading results from SLIS…'),
          SizedBox(height: 6),
          Text(
            'This may take up to a minute.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _VisitsError extends StatelessWidget {
  const _VisitsError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          Icons.cloud_off_rounded,
          size: 42,
          color: Theme.of(context).colorScheme.error,
        ),
        const SizedBox(height: 10),
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Retry'),
        ),
      ],
    );
  }
}

class _EmptyVisits extends StatelessWidget {
  const _EmptyVisits({required this.hasSearch, this.completed = false});
  final bool hasSearch;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 30),
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined, size: 42),
          const SizedBox(height: 10),
          Text(
            hasSearch
                ? 'No results match your search.'
                : completed
                    ? 'No completed results found.'
                    : 'No results found.',
          ),
        ],
      ),
    );
  }
}

class _VisitCard extends StatelessWidget {
  const _VisitCard({
    required this.visit,
    this.selectable = false,
    this.selected = false,
    this.onSelected,
  });
  final Visit visit;
  final bool selectable;
  final bool selected;
  final ValueChanged<bool>? onSelected;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(15, 13, 12, 13),
        onTap: selectable
            ? onSelected == null
                ? null
                : () => onSelected!(!selected)
            : () => context.push('/visits/${visit.labNumber}', extra: visit),
        leading: selectable
            ? Checkbox(
                value: selected,
                onChanged: onSelected == null
                    ? null
                    : (value) => onSelected!(value ?? false),
              )
            : Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: InterpathColors.softBlue,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.science_outlined,
                  color: InterpathColors.primaryBlue,
                ),
              ),
        title: Text(
          visit.patientName.isEmpty ? 'Unnamed patient' : visit.patientName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      visit.labNumber,
                      style: const TextStyle(
                        color: InterpathColors.primaryBlue,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  if (visit.status.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF123A34),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        visit.status,
                        style: const TextStyle(
                          color: InterpathColors.successGreen,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              if (visit.tests.isNotEmpty)
                Text(visit.tests, maxLines: 2, overflow: TextOverflow.ellipsis),
              if ((visit.clinic ?? '').isNotEmpty) Text(visit.clinic!),
              if (selectable && visit.canSendToDoctor)
                Text(
                  'To ${visit.doctor?.trim().isNotEmpty == true ? visit.doctor : 'doctor'} • ${maskPhone(visit.doctorPhoneNumber)}',
                  style: const TextStyle(color: InterpathColors.successGreen),
                ),
              if (selectable && !visit.canSendToDoctor)
                Text(
                  visit.recipientValidation == 'ambiguous'
                      ? 'Multiple doctor numbers found — review clinic data'
                      : 'Valid doctor number with country code unavailable',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
            ],
          ),
        ),
        trailing: selectable ? null : const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

class _CompletedActions extends StatelessWidget {
  const _CompletedActions({
    required this.total,
    required this.eligible,
    required this.selected,
    required this.allSelected,
    required this.sending,
    required this.onSelectAll,
    required this.onReview,
  });

  final int total;
  final int eligible;
  final int selected;
  final bool allSelected;
  final bool sending;
  final ValueChanged<bool>? onSelectAll;
  final VoidCallback? onReview;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Checkbox(
                  value: allSelected,
                  onChanged: onSelectAll == null
                      ? null
                      : (value) => onSelectAll!(value ?? false),
                ),
                Expanded(
                  child: Text(
                    'Select all valid ($eligible ready of $total)',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: onReview,
              icon: sending
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.fact_check_outlined),
              label: Text(
                sending
                    ? 'Sending approved results…'
                    : 'Send via WhatsApp ($selected)',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String maskPhone(String? value) {
  final phone = (value ?? '').trim();
  if (phone.length < 6) return phone;
  return '${phone.substring(0, 5)}•••${phone.substring(phone.length - 3)}';
}

class _ControlIcon extends StatelessWidget {
  const _ControlIcon({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: InterpathColors.softBlue,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: InterpathColors.primaryBlue, size: 20),
    );
  }
}
