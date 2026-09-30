import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/theme/interpath_theme.dart';
import '../../shared/services/api_exception.dart';
import '../../shared/widgets/interpath_shell.dart';
import '../pdf/pdf_actions.dart';
import '../visits/employee_visit_settings.dart';
import '../visits/visit.dart';
import 'result_models.dart';
import 'results_repository.dart';

final resultDetailProvider =
    FutureProvider.autoDispose.family<ResultDetail, String>((ref, labNumber) {
  return ref.read(resultsRepositoryProvider).getResults(labNumber);
});

class ResultDetailPage extends ConsumerWidget {
  const ResultDetailPage({required this.labNumber, this.visit, super.key});

  final String labNumber;
  final Visit? visit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultState = ref.watch(resultDetailProvider(labNumber));
    final visitSettings = ref.watch(employeeVisitSettingsProvider).value;

    return InterpathShell(
      title: labNumber,
      child: resultState.when(
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, _) => _ResultError(
          message: apiErrorMessage(error),
          onRetry: () => ref.invalidate(resultDetailProvider(labNumber)),
        ),
        data: (detail) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PatientSummary(detail: detail),
            const SizedBox(height: 14),
            PdfActions(
              labNumber: labNumber,
              available: detail.pdfGenerated,
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: detail.pdfGenerated &&
                      visit?.canSendToDoctor == true &&
                      visitSettings != null
                  ? () => showDialog<void>(
                        context: context,
                        builder: (_) => _WhatsAppShareDialog(
                          detail: detail,
                          visit: visit!,
                          settings: visitSettings,
                        ),
                      )
                  : null,
              icon: const Icon(Icons.chat_rounded),
              label: Text(
                visit?.canSendToDoctor == true
                    ? 'Send securely to doctor or clinic'
                    : 'WhatsApp unavailable for this result',
              ),
            ),
            if (visit?.recipientValidation == 'walk_in') ...[
              const SizedBox(height: 8),
              const Text(
                'Walk-in and patient results cannot be sent through WhatsApp.',
                textAlign: TextAlign.center,
              ),
            ],
            if (detail.resultsToFollow) ...[
              const SizedBox(height: 12),
              const _MessageBanner(
                message: 'Some results are still to follow.',
                icon: Icons.schedule_rounded,
              ),
            ],
            if ((detail.message ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              _MessageBanner(
                message: detail.message!,
                icon: Icons.info_outline_rounded,
              ),
            ],
            const SizedBox(height: 16),
            if (detail.profiles.isEmpty)
              const Card(
                elevation: 0,
                child: Padding(
                  padding: EdgeInsets.all(18),
                  child: Text('No result values are available yet.'),
                ),
              )
            else
              for (final profile in detail.profiles)
                _ProfileCard(profile: profile),
            if (_hasValue(detail.reportedBy) ||
                _hasValue(detail.authorizedBy)) ...[
              const SizedBox(height: 6),
              _ReportCredentials(detail: detail),
            ],
          ],
        ),
      ),
    );
  }
}

class _PatientSummary extends StatelessWidget {
  const _PatientSummary({required this.detail});
  final ResultDetail detail;

  @override
  Widget build(BuildContext context) {
    final patient = detail.patientDetails;
    final name = _value(patient, const [
      'PatientName',
      'Name',
      'FullName',
    ]);
    final visitDate =
        _value(patient, const ['VisitDate', 'Date', 'ReportDate']);
    final clinic = _value(patient, const ['ClinicName', 'Clinic']);

    return Card(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xE6181C38), Color(0xE61B2457)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: InterpathColors.softBlue,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.person_outline_rounded,
                    color: InterpathColors.primaryBlue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    name.isEmpty ? 'Laboratory result' : name,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Lab number: ${detail.labNumber}'),
            if (visitDate.isNotEmpty) Text('Visit date: $visitDate'),
            if (clinic.isNotEmpty) Text('Clinic: $clinic'),
          ],
        ),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile});
  final ResultProfile profile;

  @override
  Widget build(BuildContext context) {
    final profileComments = [
      profile.autoComment,
      profile.additionalComment,
      profile.profileComment,
    ].where((value) => _hasValue(value)).cast<String>().toSet();

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 5,
                  height: 28,
                  decoration: BoxDecoration(
                    color: InterpathColors.primaryBlue,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    profile.profile,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: InterpathColors.softBlue,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${profile.results.length}',
                    style: const TextStyle(
                      color: InterpathColors.primaryBlue,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            for (final result in profile.results) _ResultRow(result: result),
            for (final comment in profileComments)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  comment,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.result});
  final TestResult result;

  @override
  Widget build(BuildContext context) {
    final color = result.isFlagged
        ? InterpathColors.accentRed
        : Theme.of(context).colorScheme.onSurface;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: result.isFlagged
            ? InterpathColors.softRed.withValues(alpha: 0.55)
            : InterpathColors.background,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  result.test.isEmpty ? 'Comment' : result.test,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              if (result.result.isNotEmpty)
                Text(
                  [result.result, result.units]
                      .where((v) => v.isNotEmpty)
                      .join(' '),
                  style: TextStyle(fontWeight: FontWeight.w700, color: color),
                ),
            ],
          ),
          if (result.range.isNotEmpty)
            Text(
              'Reference range: ${result.range}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          if (result.flag.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Flag: ${result.flag}',
                style: const TextStyle(color: InterpathColors.accentRed),
              ),
            ),
          if (result.comment.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(result.comment),
            ),
        ],
      ),
    );
  }
}

class _ReportCredentials extends StatelessWidget {
  const _ReportCredentials({required this.detail});
  final ResultDetail detail;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Report credentials',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (_hasValue(detail.reportedBy))
              Text('Reported by: ${detail.reportedBy}'),
            if (_hasValue(detail.authorizedBy))
              Text('Authorised by: ${detail.authorizedBy}'),
          ],
        ),
      ),
    );
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.message, required this.icon});
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      child: ListTile(leading: Icon(icon), title: Text(message)),
    );
  }
}

class _ResultError extends StatelessWidget {
  const _ResultError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
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

class _WhatsAppShareDialog extends ConsumerStatefulWidget {
  const _WhatsAppShareDialog({
    required this.detail,
    required this.visit,
    required this.settings,
  });
  final ResultDetail detail;
  final Visit visit;
  final EmployeeVisitSettings settings;

  @override
  ConsumerState<_WhatsAppShareDialog> createState() =>
      _WhatsAppShareDialogState();
}

class _WhatsAppShareDialogState extends ConsumerState<_WhatsAppShareDialog> {
  bool _sending = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Send via WhatsApp'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Result: ${widget.detail.labNumber}'),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.verified_user_outlined),
            title: Text(
              widget.visit.doctor?.trim().isNotEmpty == true
                  ? widget.visit.doctor!
                  : widget.visit.clinic ?? 'Doctor or clinic',
            ),
            subtitle: Text(_maskPhone(widget.visit.doctorPhoneNumber)),
          ),
          const SizedBox(height: 10),
          const Text(
            'Interpath will send an approved WhatsApp notification with a secure result link valid for 24 hours.',
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _sending ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _sending ? null : _share,
          child: Text(_sending ? 'Sending…' : 'Confirm and send'),
        ),
      ],
    );
  }

  Future<void> _share() async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(resultsRepositoryProvider).sendWhatsAppResult(
            labNumber: widget.detail.labNumber,
            date: widget.settings.date,
            branch: widget.settings.branch,
          );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('WhatsApp notification sent.')),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

String _maskPhone(String? value) {
  final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
  if (digits.length < 7) return 'Verified clinic number';
  return '+${digits.substring(0, 5)}•••${digits.substring(digits.length - 3)}';
}

bool _hasValue(String? value) => value != null && value.trim().isNotEmpty;

String _value(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key]?.toString().trim() ?? '';
    if (value.isNotEmpty) return value;
  }
  return '';
}
