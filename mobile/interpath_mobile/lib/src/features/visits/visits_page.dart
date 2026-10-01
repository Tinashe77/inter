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

final visitsProvider = FutureProvider.autoDispose
    .family<VisitPageResult, VisitQuery>((ref, query) {
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
  final _searchController = TextEditingController();
  String _search = '';
  int _activeTab = 0;
  final Set<String> _selectedLabNumbers = {};
  bool _sending = false;
  int _sendingCount = 0;
  final List<Visit> _additionalVisits = [];
  int _loadedPage = 1;
  bool _hasMore = false;
  bool _loadingMore = false;
  bool _prefetchFailed = false;
  bool _prefetchScheduled = false;
  String _visitQueryKey = '';
  EmployeeVisitSettings? _currentSettings;
  List<Visit> _bulkEligibleVisits = const [];

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
      overlay: _buildBottomOverlay(),
      child: settingsState.when(
        loading: () => const _LoadingVisits(),
        error: (_, __) => const Text('Unable to load visit preferences.'),
        data: (settings) {
          _currentSettings = settings;
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
                  onRefresh: () => _refreshVisits(query),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() {
                    _search = value;
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
                  data: (pageResult) {
                    final queryKey =
                        '${query.branch}|${query.date.toIso8601String()}';
                    if (_visitQueryKey != queryKey) {
                      _visitQueryKey = queryKey;
                      _additionalVisits.clear();
                      _loadedPage = pageResult.page;
                      _hasMore = pageResult.hasMore;
                      _prefetchFailed = false;
                    } else if (_loadedPage == 1 && _additionalVisits.isEmpty) {
                      _hasMore = pageResult.hasMore;
                    }
                    final items =
                        _mergeVisitPages(pageResult.visits, _additionalVisits);
                    if (_hasMore &&
                        !_loadingMore &&
                        !_prefetchFailed &&
                        !_prefetchScheduled) {
                      _prefetchScheduled = true;
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        _prefetchScheduled = false;
                        if (mounted) _loadMore(settings);
                      });
                    }
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
                    final visible = filtered;
                    final eligible = filtered;
                    _bulkEligibleVisits = items
                        .where(
                          (visit) => visit.isCompleted && visit.canSendToDoctor,
                        )
                        .toList();
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
                          )
                        else
                          _ResultsCount(
                            count: filtered.length,
                            loading: _hasMore || _loadingMore,
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
                        if (_hasMore)
                          OutlinedButton.icon(
                            onPressed:
                                _loadingMore ? null : () => _loadMore(settings),
                            icon: _loadingMore
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.expand_more_rounded),
                            label: Text(
                              _loadingMore
                                  ? 'Loading next 50…'
                                  : 'Load next 50 results',
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

  Widget? _buildBottomOverlay() {
    if (_sending) return _SendingProgress(count: _sendingCount);
    if (_activeTab != 1 ||
        _selectedLabNumbers.isEmpty ||
        _currentSettings == null) {
      return null;
    }
    final selected = _bulkEligibleVisits
        .where((visit) => _selectedLabNumbers.contains(visit.labNumber))
        .toList();
    if (selected.isEmpty) return null;
    return _BulkSelectionDock(
      count: selected.length,
      loadingMore: _hasMore || _loadingMore,
      onPressed: () => _reviewAndSend(selected, _currentSettings!),
    );
  }

  void _refreshVisits(VisitQuery query) {
    setState(() {
      _additionalVisits.clear();
      _loadedPage = 1;
      _hasMore = false;
      _prefetchFailed = false;
    });
    ref.invalidate(visitsProvider(query));
  }

  Future<void> _loadMore(EmployeeVisitSettings settings) async {
    setState(() => _loadingMore = true);
    try {
      final next = await ref.read(visitsRepositoryProvider).listVisits(
            date: settings.date,
            branch: settings.branch,
            page: _loadedPage + 1,
          );
      if (!mounted) return;
      setState(() {
        _additionalVisits.addAll(next.visits);
        _loadedPage = next.page;
        _hasMore = next.hasMore;
        _prefetchFailed = false;
      });
    } catch (error) {
      if (mounted) setState(() => _prefetchFailed = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
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

class _ResultsCount extends StatelessWidget {
  const _ResultsCount({required this.count, required this.loading});
  final int count;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '$count result${count == 1 ? '' : 's'}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (loading) ...[
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: BoxDecoration(
              color: InterpathColors.softBlue,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: InterpathColors.glassBorder),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox.square(
                  dimension: 12,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: InterpathColors.primaryBlue,
                  ),
                ),
                SizedBox(width: 6),
                Text(
                  'Loading more',
                  style: TextStyle(
                    color: InterpathColors.primaryBlue,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(width: 5),
                CircleAvatar(
                  radius: 3,
                  backgroundColor: InterpathColors.accentRed,
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _BulkSelectionDock extends StatelessWidget {
  const _BulkSelectionDock({
    required this.count,
    required this.loadingMore,
    required this.onPressed,
  });
  final int count;
  final bool loadingMore;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: InterpathColors.glassBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x240F2A66),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: InterpathColors.softBlue,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                '$count',
                style: const TextStyle(
                  color: InterpathColors.primaryBlue,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Ready to review',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                Text(
                  loadingMore
                      ? 'More results are still loading'
                      : 'Confirm recipients before sending',
                  style: const TextStyle(
                    fontSize: 11,
                    color: InterpathColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: onPressed,
            icon: const Icon(Icons.fact_check_outlined, size: 18),
            label: const Text('Review & send'),
          ),
        ],
      ),
    );
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

List<Visit> _mergeVisitPages(List<Visit> first, List<Visit> additional) {
  final merged = <String, Visit>{};
  for (final visit in [...first, ...additional]) {
    merged[visit.labNumber] = visit;
  }
  return merged.values.toList();
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
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.tune_rounded,
                  color: InterpathColors.primaryBlue,
                  size: 19,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Result filters',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: InterpathColors.textDark,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => context.go('/branch-selection'),
                  child: const Text('Change branch'),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: _CompactFilter(
                    icon: Icons.location_on_outlined,
                    label: 'Branch',
                    value: settings.branch,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _CompactFilter(
                    icon: Icons.calendar_today_outlined,
                    label: 'Visit date',
                    value: DateFormat('d MMM yyyy').format(settings.date),
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
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 44,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onRefresh,
                icon: isLoading
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh_rounded, size: 19),
                label: Text(isLoading ? 'Loading results…' : 'Refresh results'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompactFilter extends StatelessWidget {
  const _CompactFilter({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: InterpathColors.surfaceRaised,
      borderRadius: BorderRadius.circular(11),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          child: Row(
            children: [
              Icon(icon, size: 18, color: InterpathColors.primaryBlue),
              const SizedBox(width: 7),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 10,
                        color: InterpathColors.textMuted,
                      ),
                    ),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        dense: true,
        minVerticalPadding: 5,
        contentPadding: const EdgeInsets.fromLTRB(9, 5, 8, 5),
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
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: InterpathColors.softBlue,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: const Icon(
                  Icons.science_outlined,
                  size: 19,
                  color: InterpathColors.primaryBlue,
                ),
              ),
        title: Text(
          visit.patientName.isEmpty ? 'Unnamed patient' : visit.patientName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 3),
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
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        visit.status,
                        style: const TextStyle(
                          color: InterpathColors.successGreen,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              Text(
                [visit.tests, visit.clinic]
                    .where((value) => value?.trim().isNotEmpty == true)
                    .join(' • '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
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
    required this.onSelectAll,
  });

  final int total;
  final int eligible;
  final int selected;
  final bool allSelected;
  final ValueChanged<bool>? onSelectAll;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Checkbox(
              value: allSelected,
              onChanged: onSelectAll == null
                  ? null
                  : (value) => onSelectAll!(value ?? false),
            ),
            Expanded(
              child: Text(
                selected > 0
                    ? '$selected selected · $eligible ready'
                    : 'Select all valid · $eligible ready of $total',
                style: Theme.of(context).textTheme.titleSmall,
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
