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

final whatsappAttemptsProvider =
    FutureProvider.autoDispose<List<WhatsAppSendAttempt>>((ref) {
  return ref.read(resultsRepositoryProvider).listWhatsAppAttempts();
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
  int _sendingCount = 0;

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
      overlay: _sending ? _SendingProgress(count: _sendingCount) : null,
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
              DefaultTabController(
                length: 3,
                initialIndex: _activeTab,
                child: TabBar(
                  onTap: (index) => setState(() {
                    _activeTab = index;
                    _visibleCount = _pageSize;
                  }),
                  tabs: const [
                    Tab(text: 'Results'),
                    Tab(text: 'Bulk send'),
                    Tab(text: 'Send history'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (_activeTab != 2) ...[
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
              ],
              if (_activeTab == 2)
                _WhatsAppSendHistory(
                  attempts: ref.watch(whatsappAttemptsProvider),
                  onRefresh: () => ref.invalidate(whatsappAttemptsProvider),
                  onRetry: _retryAttempt,
                )
              else
                visitsState.when(
                  loading: () => const _LoadingVisits(),
                  error: (error, _) => _VisitsError(
                    message: apiErrorMessage(error),
                    onRetry: () => ref.invalidate(visitsProvider(query)),
                  ),
                  data: (items) {
                    final source = _activeTab == 0
                        ? items
                        : items
                            .where(
                              (visit) =>
                                  visit.isCompleted && visit.canSendToDoctor,
                            )
                            .toList();
                    final filtered = filterVisits(source, _search);
                    if (filtered.isEmpty) {
                      return _EmptyVisits(
                        hasSearch: _search.trim().isNotEmpty,
                        completed: _activeTab == 1,
                      );
                    }
                    final visible = filtered.take(_visibleCount).toList();
                    final eligible = filtered;
                    final selected = eligible
                        .where(
                          (visit) =>
                              _selectedLabNumbers.contains(visit.labNumber),
                        )
                        .toList();
                    final allSelected = eligible.isNotEmpty &&
                        selected.length == eligible.length;
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
                                        _selectedLabNumbers
                                            .add(visit.labNumber);
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

    setState(() {
      _sending = true;
      _sendingCount = visits.length;
    });
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
                ? '${result.sent} result${result.sent == 1 ? '' : 's'} accepted by WhatsApp. Check Send history for delivery.'
                : '${result.sent} accepted by WhatsApp; ${result.failed} blocked or failed. $failureMessages',
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
      if (mounted) {
        setState(() {
          _sending = false;
          _sendingCount = 0;
        });
      }
    }
  }

  Future<void> _retryAttempt(WhatsAppSendAttempt attempt) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Retry WhatsApp delivery?'),
        content: Text(
          'Retry ${attempt.labNumber} to ${attempt.recipientName} (${attempt.destination})? A new secure result link will be created. Do not retry an accepted message immediately because Meta may still deliver it.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ref
          .read(resultsRepositoryProvider)
          .retryWhatsAppAttempt(attempt.id);
      ref.invalidate(whatsappAttemptsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Retry accepted by WhatsApp. Delivery status will update here.',
            ),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(error))),
        );
      }
    }
  }
}

class _SendingProgress extends StatelessWidget {
  const _SendingProgress({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xF2181C38), Color(0xF21B2457)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x43060B2A),
            blurRadius: 28,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const CircularProgressIndicator(
              strokeWidth: 2.5,
              color: Color(0xFF67E8F9),
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Processing $count result${count == 1 ? '' : 's'}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Preparing secure links and sending to WhatsApp. You can keep scrolling and using the app.',
                  style: TextStyle(
                    color: Color(0xFFCBD5E1),
                    fontSize: 12,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
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
                    ? 'No completed results have one valid doctor number yet.'
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

class _WhatsAppSendHistory extends StatelessWidget {
  const _WhatsAppSendHistory({
    required this.attempts,
    required this.onRefresh,
    required this.onRetry,
  });

  final AsyncValue<List<WhatsAppSendAttempt>> attempts;
  final VoidCallback onRefresh;
  final ValueChanged<WhatsAppSendAttempt> onRetry;

  @override
  Widget build(BuildContext context) {
    return attempts.when(
      loading: () => const _LoadingVisits(),
      error: (error, _) => _VisitsError(
        message: apiErrorMessage(error),
        onRetry: onRefresh,
      ),
      data: (items) {
        final successful = items.where((item) => item.isSuccessful).length;
        final failed = items.where((item) => item.isFailed).length;
        final pending = items.where((item) => item.isPending).length;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'WhatsApp delivery tracking',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Accepted means Meta received the request. Delivered and read are confirmed by the webhook.',
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _HistoryCount(label: 'Successful', count: successful),
                        _HistoryCount(label: 'Pending', count: pending),
                        _HistoryCount(label: 'Failed', count: failed),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: onRefresh,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Refresh delivery statuses'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 28),
                child: Text(
                  'No WhatsApp send attempts have been recorded yet.',
                  textAlign: TextAlign.center,
                ),
              )
            else
              for (final attempt in items)
                _WhatsAppAttemptCard(
                  attempt: attempt,
                  onRetry: attempt.canRetry ? () => onRetry(attempt) : null,
                ),
          ],
        );
      },
    );
  }
}

class _HistoryCount extends StatelessWidget {
  const _HistoryCount({required this.label, required this.count});
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: InterpathColors.softBlue,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text('$label: $count'),
    );
  }
}

class _WhatsAppAttemptCard extends StatelessWidget {
  const _WhatsAppAttemptCard({required this.attempt, this.onRetry});
  final WhatsAppSendAttempt attempt;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final statusColor = attempt.isSuccessful
        ? InterpathColors.successGreen
        : attempt.isFailed
            ? Theme.of(context).colorScheme.error
            : InterpathColors.primaryBlue;
    final timestamp = attempt.statusTimestamp ?? attempt.createdAt;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    attempt.labNumber,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    attempt.status.toUpperCase(),
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('${attempt.recipientName} • ${attempt.destination}'),
            Text(
              DateFormat('d MMM yyyy, HH:mm').format(timestamp.toLocal()),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if ((attempt.errorMessage ?? '').isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                attempt.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry this result'),
              ),
            ] else if (attempt.isPending) ...[
              const SizedBox(height: 8),
              const Text(
                'Waiting for Meta delivery confirmation…',
                style: TextStyle(color: InterpathColors.primaryBlue),
              ),
            ],
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
