import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/auth_session.dart';
import '../models/site_plan_item.dart';
import '../providers/planning_provider.dart';
import '../providers/session_provider.dart';

class PlanningScreen extends StatefulWidget {
  const PlanningScreen({super.key});

  @override
  State<PlanningScreen> createState() => _PlanningScreenState();
}

class _PlanningScreenState extends State<PlanningScreen> {
  bool _isEditing = false;
  late TextEditingController _briefingController;
  late TextEditingController _safetyNotesController;
  String _selectedStatus = 'draft';
  String _selectedShiftStatus = 'not_ready';

  @override
  void initState() {
    super.initState();
    _briefingController = TextEditingController();
    _safetyNotesController = TextEditingController();
  }

  @override
  void dispose() {
    _briefingController.dispose();
    _safetyNotesController.dispose();
    super.dispose();
  }

  void _enterEditMode(SitePlanItem plan) {
    setState(() {
      _isEditing = true;
      _briefingController.text = plan.briefing;
      _safetyNotesController.text = plan.safetyNotes;
      _selectedStatus = plan.status;
      _selectedShiftStatus = plan.shiftStatus;
    });
  }

  void _cancelEdit() {
    setState(() {
      _isEditing = false;
      context.read<PlanningProvider>().cancelEdit();
    });
  }

  Future<void> _savePlan(SitePlanItem plan, AuthSession session, PlanningProvider provider) async {
    final updated = SitePlanItem(
      id: plan.id,
      siteId: plan.siteId,
      planDate: plan.planDate,
      status: _selectedStatus,
      shiftStatus: _selectedShiftStatus,
      briefing: _briefingController.text,
      safetyNotes: _safetyNotesController.text,
      zones: plan.zones,
      updatedAt: DateTime.now(),
    );

    await provider.upsert(session, updated);

    if (mounted && context.mounted) {
      setState(() => _isEditing = false);
      if (provider.errorMessage == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Plan gespeichert'), duration: Duration(seconds: 2)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler: ${provider.errorMessage}'), duration: const Duration(seconds: 3)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.read<SessionProvider>().session!;
    final planningProvider = context.watch<PlanningProvider>();
    final plan = planningProvider.plan;
    final draft = planningProvider.draft;
    final displayPlan = draft ?? plan;

    return RefreshIndicator(
      onRefresh: () => planningProvider.refresh(session),
      child: _isEditing && displayPlan != null
          ? _EditForm(
              plan: displayPlan,
              briefingController: _briefingController,
              safetyNotesController: _safetyNotesController,
              selectedStatus: _selectedStatus,
              selectedShiftStatus: _selectedShiftStatus,
              onStatusChanged: (val) => setState(() => _selectedStatus = val),
              onShiftStatusChanged: (val) => setState(() => _selectedShiftStatus = val),
              onCancel: _cancelEdit,
              onSave: () => _savePlan(displayPlan, session, planningProvider),
              isSaving: planningProvider.isSaving,
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Tagesplanung',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    if (displayPlan != null && !_isEditing) ...[
                      IconButton(
                        onPressed: () => _enterEditMode(displayPlan),
                        icon: const Icon(Icons.edit),
                        tooltip: 'Bearbeiten',
                      ),
                    ],
                    IconButton(
                      onPressed: () => planningProvider.refresh(session),
                      icon: const Icon(Icons.refresh),
                      tooltip: 'Aktualisieren',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (planningProvider.isLoading && plan == null)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (planningProvider.errorMessage != null && plan == null)
                  _ErrorState(message: planningProvider.errorMessage!)
                else if (plan == null)
                  const _EmptyState()
                else ...[
                  _PlanMetaCard(
                    date: plan.planDate,
                    status: plan.status,
                    shiftStatus: plan.shiftStatus,
                    updatedAt: plan.updatedAt,
                  ),
                  const SizedBox(height: 12),
                  _InfoCard(title: 'Briefing', content: plan.briefing),
                  const SizedBox(height: 12),
                  _InfoCard(title: 'Sicherheit', content: plan.safetyNotes),
                  const SizedBox(height: 16),
                  Text(
                    'Zonen (${plan.zones.length})',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  ...plan.zones.map((zone) => _ZoneCard(zone: zone)),
                ],
              ],
            ),
    );
  }
}

class _PlanMetaCard extends StatelessWidget {
  const _PlanMetaCard({
    required this.date,
    required this.status,
    required this.shiftStatus,
    required this.updatedAt,
  });

  final String date;
  final String status;
  final String shiftStatus;
  final DateTime updatedAt;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Wrap(
        runSpacing: 8,
        spacing: 8,
        children: [
          _MetaChip(label: 'Datum', value: date),
          _MetaChip(label: 'Status', value: status),
          _MetaChip(label: 'Schicht', value: shiftStatus),
          _MetaChip(
            label: 'Update',
            value: '${updatedAt.day.toString().padLeft(2, '0')}.${updatedAt.month.toString().padLeft(2, '0')} ${updatedAt.hour.toString().padLeft(2, '0')}:${updatedAt.minute.toString().padLeft(2, '0')}',
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: const Color(0xFFF5BF18).withValues(alpha: 0.18),
      ),
      child: Text('$label: $value', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.content});

  final String title;
  final String content;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(content.isEmpty ? 'Keine Angaben' : content),
        ],
      ),
    );
  }
}

class _ZoneCard extends StatelessWidget {
  const _ZoneCard({required this.zone});

  final SitePlanZoneItem zone;

  @override
  Widget build(BuildContext context) {
    final assignmentNames = zone.assignments
        .map((item) => item.userName ?? item.userId)
        .where((name) => name.isNotEmpty)
        .toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(zone.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF111111).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(zone.priority, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(zone.focus.isEmpty ? 'Kein Fokus hinterlegt' : zone.focus),
          if (zone.shiftLabel.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Schicht: ${zone.shiftLabel}', style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 8),
          Text('Team: ${assignmentNames.isEmpty ? '-': assignmentNames.join(', ')}', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 6),
          Text('Materialbedarf: ${zone.materialNeeds.length}', style: Theme.of(context).textTheme.bodySmall),
          if (zone.materialNeeds.isNotEmpty) ...[
            const SizedBox(height: 6),
            ...zone.materialNeeds.take(3).map((SitePlanMaterialNeedItem need) => Text(
                  '- ${need.label}: ${need.quantity} ${need.unit} (${need.status})',
                  style: Theme.of(context).textTheme.bodySmall,
                )),
          ],
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          Icon(Icons.event_note_outlined, size: 44, color: Colors.grey.shade500),
          const SizedBox(height: 10),
          const Text('Für heute liegt noch keine Planung vor.'),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Text(message, style: TextStyle(color: Colors.red.shade700)),
    );
  }
}

class _EditForm extends StatelessWidget {
  const _EditForm({
    required this.plan,
    required this.briefingController,
    required this.safetyNotesController,
    required this.selectedStatus,
    required this.selectedShiftStatus,
    required this.onStatusChanged,
    required this.onShiftStatusChanged,
    required this.onCancel,
    required this.onSave,
    required this.isSaving,
  });

  final SitePlanItem plan;
  final TextEditingController briefingController;
  final TextEditingController safetyNotesController;
  final String selectedStatus;
  final String selectedShiftStatus;
  final Function(String) onStatusChanged;
  final Function(String) onShiftStatusChanged;
  final VoidCallback onCancel;
  final VoidCallback onSave;
  final bool isSaving;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Plan bearbeiten',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _PlanMetaCard(
          date: plan.planDate,
          status: plan.status,
          shiftStatus: plan.shiftStatus,
          updatedAt: plan.updatedAt,
        ),
        const SizedBox(height: 20),
        Text('Status', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'draft', label: Text('Entwurf')),
            ButtonSegment(value: 'published', label: Text('Veröffentlicht')),
          ],
          selected: {selectedStatus},
          onSelectionChanged: (s) => onStatusChanged(s.first),
        ),
        const SizedBox(height: 20),
        Text('Schichtstatus', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        DropdownButton<String>(
          value: selectedShiftStatus,
          isExpanded: true,
          items: const [
            DropdownMenuItem(value: 'not_ready', child: Text('Nicht bereit')),
            DropdownMenuItem(value: 'ready', child: Text('Bereit')),
            DropdownMenuItem(value: 'active', child: Text('Aktiv')),
            DropdownMenuItem(value: 'blocked', child: Text('Blockiert')),
            DropdownMenuItem(value: 'complete', child: Text('Abgeschlossen')),
          ],
          onChanged: (val) {
            if (val != null) onShiftStatusChanged(val);
          },
        ),
        const SizedBox(height: 20),
        Text('Briefing', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        TextField(
          controller: briefingController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Briefing eingeben…',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 20),
        Text('Sicherheit', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        TextField(
          controller: safetyNotesController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Sicherheitsnotizen eingeben…',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 30),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: isSaving ? null : onCancel,
                child: const Text('Abbrechen'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: isSaving ? null : onSave,
                child: isSaving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Speichern'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

