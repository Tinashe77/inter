import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../shared/widgets/interpath_shell.dart';
import '../../shared/services/api_exception.dart';
import '../../shared/theme/interpath_theme.dart';
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

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsState = ref.watch(employeeVisitSettingsProvider);

    return InterpathShell(
      title: 'Visits',
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
                  labelText: 'Search visits',
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
              visitsState.when(
                loading: () => const _LoadingVisits(),
                error: (error, _) => _VisitsError(
                  message: apiErrorMessage(error),
                  onRetry: () => ref.invalidate(visitsProvider(query)),
                ),
                data: (items) {
                  final filtered = filterVisits(items, _search);
                  if (filtered.isEmpty) {
                    return _EmptyVisits(hasSearch: _search.trim().isNotEmpty);
                  }
                  final visible = filtered.take(_visibleCount).toList();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${filtered.length} visit${filtered.length == 1 ? '' : 's'}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 10),
                      for (final visit in visible) _VisitCard(visit: visit),
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
                  'Visit filters',
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
              label: Text(isLoading ? 'Loading visits…' : 'Refresh visits'),
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
          Text('Loading visits from SLIS…'),
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
  const _EmptyVisits({required this.hasSearch});
  final bool hasSearch;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 30),
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined, size: 42),
          const SizedBox(height: 10),
          Text(hasSearch ? 'No visits match your search.' : 'No visits found.'),
        ],
      ),
    );
  }
}

class _VisitCard extends StatelessWidget {
  const _VisitCard({required this.visit});
  final Visit visit;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(15, 13, 12, 13),
        onTap: () => context.push('/visits/${visit.labNumber}', extra: visit),
        leading: Container(
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
            ],
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
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
