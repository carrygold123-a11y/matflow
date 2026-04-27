import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/session_provider.dart';
import '../services/api_service.dart';

// ── Data model stored as JSON in the "briefing" field ────────────────────────

class _TWorker {
  final String id;
  String name;
  String nr;
  _TWorker({required this.id, required this.name, required this.nr});
  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'nr': nr};
  factory _TWorker.fromJson(Map<String, dynamic> j) =>
      _TWorker(id: j['id'] as String, name: j['name'] as String, nr: (j['nr'] ?? '') as String);
}

class _TSection {
  final String id;
  String title;
  String note;
  List<String> workerIds;
  _TSection({required this.id, required this.title, required this.note, required this.workerIds});
  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'note': note, 'workerIds': workerIds};
  factory _TSection.fromJson(Map<String, dynamic> j) => _TSection(
        id: j['id'] as String,
        title: j['title'] as String,
        note: j['note'] as String,
        workerIds: (j['workerIds'] as List<dynamic>).cast<String>(),
      );
}

class _Tagesplan {
  String dayNote;
  List<_TWorker> workers;
  List<_TSection> sections;
  _Tagesplan({required this.dayNote, required this.workers, required this.sections});

  factory _Tagesplan.empty() => _Tagesplan(dayNote: '', workers: [], sections: []);

  factory _Tagesplan.fromBriefing(String briefing) {
    try {
      final m = jsonDecode(briefing) as Map<String, dynamic>;
      if (m['__tagesplan'] == true) {
        return _Tagesplan(
          dayNote: (m['dayNote'] ?? '') as String,
          workers: (m['workers'] as List<dynamic>)
              .map((e) => _TWorker.fromJson(e as Map<String, dynamic>))
              .toList(),
          sections: (m['sections'] as List<dynamic>)
              .map((e) => _TSection.fromJson(e as Map<String, dynamic>))
              .toList(),
        );
      }
    } catch (_) {}
    return _Tagesplan.empty();
  }

  String toBriefing() => jsonEncode({
        '__tagesplan': true,
        'dayNote': dayNote,
        'workers': workers.map((w) => w.toJson()).toList(),
        'sections': sections.map((s) => s.toJson()).toList(),
      });
}

String _newId() => DateTime.now().millisecondsSinceEpoch.toRadixString(36) +
    (1000 + (DateTime.now().microsecond % 9000)).toRadixString(36);

// ── Screen ────────────────────────────────────────────────────────────────────

class PlanningScreen extends StatefulWidget {
  const PlanningScreen({super.key});

  @override
  State<PlanningScreen> createState() => _PlanningScreenState();
}

class _PlanningScreenState extends State<PlanningScreen> {
  DateTime _selectedDate = DateTime.now();
  _Tagesplan _plan = _Tagesplan.empty();
  bool _loading = false;
  bool _saving = false;
  bool _saved = false;
  String? _error;

  final _nameCtrl = TextEditingController();
  final _nrCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _nrCtrl.dispose();
    super.dispose();
  }

  String get _dateStr {
    final d = _selectedDate;
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  Future<void> _load() async {
    final session = context.read<SessionProvider>().session;
    if (session == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final siteId = session.siteId;
      final plan = await ApiService.instance.fetchSitePlan(
        session.token,
        planDate: _dateStr,
        siteId: siteId.isEmpty ? null : siteId,
      );
      setState(() => _plan = _Tagesplan.fromBriefing(plan.briefing));
    } catch (_) {
      setState(() => _plan = _Tagesplan.empty());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final session = context.read<SessionProvider>().session;
    if (session == null) return;
    setState(() { _saving = true; _error = null; });
    try {
      final siteId = session.siteId;
      await ApiService.instance.upsertSitePlan(
        session.token,
        planDate: _dateStr,
        status: 'published',
        shiftStatus: 'active',
        briefing: _plan.toBriefing(),
        safetyNotes: '',
        zones: [],
        siteId: siteId.isEmpty ? null : siteId,
      );
      setState(() => _saved = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _saving = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2024),
      lastDate: DateTime(2027),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
      _load();
    }
  }

  void _addWorker() {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() {
      _plan.workers.add(_TWorker(id: _newId(), name: name, nr: _nrCtrl.text.trim()));
    });
    _nameCtrl.clear();
    _nrCtrl.clear();
  }

  void _removeWorker(String id) {
    setState(() {
      _plan.workers.removeWhere((w) => w.id == id);
      for (final s in _plan.sections) {
        s.workerIds.remove(id);
      }
    });
  }

  void _addSection() {
    setState(() => _plan.sections.add(
          _TSection(id: _newId(), title: '', note: '', workerIds: []),
        ));
  }

  void _removeSection(String id) {
    setState(() => _plan.sections.removeWhere((s) => s.id == id));
  }

  void _toggleWorker(String sectionId, String workerId) {
    setState(() {
      final s = _plan.sections.firstWhere((s) => s.id == sectionId);
      if (s.workerIds.contains(workerId)) {
        s.workerIds.remove(workerId);
      } else {
        s.workerIds.add(workerId);
      }
    });
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  static const _gold = Color(0xFFF5BF18);
  static const _goldDeep = Color(0xFFD89E00);
  static const _dark = Color(0xFF0F172A);
  static const _bg = Color(0xFFF1F5F9);
  static const _border = Color(0xFFE2E8F0);
  static const _muted = Color(0xFF64748B);

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text.toUpperCase(),
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _muted, letterSpacing: 1),
        ),
      );

  Widget _card({required Widget child, EdgeInsets? padding}) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _border),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))],
        ),
        padding: padding ?? const EdgeInsets.all(16),
        child: child,
      );

  // ── build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _dark,
        foregroundColor: Colors.white,
        title: const Text('Tagesplan', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today, size: 20),
            onPressed: _pickDate,
            tooltip: 'Datum',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
            tooltip: 'Neu laden',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _saving ? null : _save,
        backgroundColor: _gold,
        foregroundColor: _dark,
        icon: _saving
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
            : Icon(_saved ? Icons.check : Icons.save),
        label: Text(_saved ? 'Gespeichert' : 'Speichern', style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                children: [
                  // Date display
                  _card(
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today, size: 18, color: _muted),
                        const SizedBox(width: 8),
                        Text(
                          _dateStr,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                        const Spacer(),
                        GestureDetector(
                          onTap: _pickDate,
                          child: const Text('Aendern', style: TextStyle(color: _goldDeep, fontWeight: FontWeight.w600, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),

                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.red.shade200)),
                      child: Text(_error!, style: TextStyle(color: Colors.red.shade800, fontSize: 13)),
                    ),

                  // ── Day note ──
                  _card(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _sectionLabel('Tagesnotiz'),
                        TextField(
                          maxLines: 3,
                          decoration: const InputDecoration(
                            hintText: 'Was steht heute allgemein an der Baustelle an?',
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.all(12),
                          ),
                          onChanged: (v) => _plan.dayNote = v,
                          controller: TextEditingController(text: _plan.dayNote)
                            ..selection = TextSelection.collapsed(offset: _plan.dayNote.length),
                        ),
                      ],
                    ),
                  ),

                  // ── Workers ──
                  _card(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _sectionLabel('Arbeiter auf der Baustelle'),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextField(
                                controller: _nameCtrl,
                                decoration: const InputDecoration(
                                  hintText: 'Name',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                                onSubmitted: (_) => _addWorker(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 1,
                              child: TextField(
                                controller: _nrCtrl,
                                decoration: const InputDecoration(
                                  hintText: 'Pers.-Nr.',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                                onSubmitted: (_) => _addWorker(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: _addWorker,
                              style: ElevatedButton.styleFrom(backgroundColor: _gold, foregroundColor: _dark, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12)),
                              child: const Icon(Icons.add),
                            ),
                          ],
                        ),
                        if (_plan.workers.isEmpty) ...[
                          const SizedBox(height: 16),
                          const Center(
                            child: Text('Noch keine Arbeiter eingetragen', style: TextStyle(color: _muted)),
                          ),
                        ] else ...[
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: _plan.workers
                                .map((w) => Chip(
                                      label: Text(w.nr.isNotEmpty ? '${w.name}  #${w.nr}' : w.name),
                                      backgroundColor: _bg,
                                      side: const BorderSide(color: _border),
                                      deleteIcon: const Icon(Icons.close, size: 16),
                                      onDeleted: () => _removeWorker(w.id),
                                    ))
                                .toList(),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // ── Sections ──
                  Row(
                    children: [
                      const Expanded(
                        child: Text('Abschnitte des Tages', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      ),
                      TextButton.icon(
                        onPressed: _addSection,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Abschnitt'),
                        style: TextButton.styleFrom(foregroundColor: _goldDeep),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  if (_plan.sections.isEmpty)
                    _card(
                      child: const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Text('Tippe auf "+ Abschnitt" um eine Aufgabe hinzuzufuegen', style: TextStyle(color: _muted), textAlign: TextAlign.center),
                        ),
                      ),
                    ),

                  ..._plan.sections.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final section = entry.value;
                    return _SectionCard(
                      section: section,
                      idx: idx,
                      workers: _plan.workers,
                      onTitleChanged: (v) => section.title = v,
                      onNoteChanged: (v) => section.note = v,
                      onToggleWorker: (wId) => _toggleWorker(section.id, wId),
                      onRemove: () => _removeSection(section.id),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}

// ── Section card widget ───────────────────────────────────────────────────────

class _SectionCard extends StatefulWidget {
  final _TSection section;
  final int idx;
  final List<_TWorker> workers;
  final ValueChanged<String> onTitleChanged;
  final ValueChanged<String> onNoteChanged;
  final ValueChanged<String> onToggleWorker;
  final VoidCallback onRemove;

  const _SectionCard({
    required this.section,
    required this.idx,
    required this.workers,
    required this.onTitleChanged,
    required this.onNoteChanged,
    required this.onToggleWorker,
    required this.onRemove,
  });

  @override
  State<_SectionCard> createState() => _SectionCardState();
}

class _SectionCardState extends State<_SectionCard> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _noteCtrl;

  static const _gold = Color(0xFFF5BF18);
  static const _goldDeep = Color(0xFFD89E00);
  static const _border = Color(0xFFE2E8F0);
  static const _bg = Color(0xFFF1F5F9);
  static const _muted = Color(0xFF64748B);
  static const _dark = Color(0xFF0F172A);

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.section.title);
    _noteCtrl = TextEditingController(text: widget.section.note);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: _gold, borderRadius: BorderRadius.circular(6)),
                  child: Text('${widget.idx + 1}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: _dark)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _titleCtrl,
                    decoration: InputDecoration(
                      hintText: 'Aufgabe ${widget.idx + 1} - z.B. Betonarbeiten',
                      border: InputBorder.none,
                      hintStyle: const TextStyle(color: _muted),
                    ),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    onChanged: widget.onTitleChanged,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  onPressed: widget.onRemove,
                  tooltip: 'Entfernen',
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _noteCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'Was genau ist zu tun? Besonderheiten...',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.all(12),
                  ),
                  onChanged: widget.onNoteChanged,
                ),
                if (widget.workers.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text(
                    'EINGETEILT',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _muted, letterSpacing: 1),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: widget.workers.map((w) {
                      final assigned = widget.section.workerIds.contains(w.id);
                      return GestureDetector(
                        onTap: () {
                          widget.onToggleWorker(w.id);
                          setState(() {});
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: assigned ? const Color(0x20F5BF18) : _bg,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: assigned ? _gold : _border, width: assigned ? 2 : 1),
                          ),
                          child: Text(
                            w.nr.isNotEmpty ? '${w.name}  #${w.nr}' : w.name,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: assigned ? FontWeight.w700 : FontWeight.w400,
                              color: assigned ? _goldDeep : _muted,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
