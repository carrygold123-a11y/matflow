import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';
import 'qr_scanner_screen.dart';

// ─── State machine ────────────────────────────────────────────────────────────
enum _DriverStep { login, vehicleType, driverName, qrScan, review, signature, submitting, success }

// ─── Main widget ──────────────────────────────────────────────────────────────
class DriverPortalScreen extends StatefulWidget {
  const DriverPortalScreen({super.key, required this.apiService});

  final ApiService apiService;

  @override
  State<DriverPortalScreen> createState() => _DriverPortalScreenState();
}

class _DriverPortalScreenState extends State<DriverPortalScreen> {
  static const _plateKey = 'matflow-driver-plate';
  static const _tokenKey = 'matflow-driver-token';
  static const _truckKey = 'matflow-driver-truck';

  final _licensePlateController = TextEditingController();
  final _driverNameController = TextEditingController();
  final _signatureController = SignatureController();

  _DriverStep _step = _DriverStep.login;

  // Auth
  String? _token;
  Map<String, dynamic>? _truck; // {id, name, licensePlate}

  // Form
  String? _vehicleType;
  String? _fromSiteId;
  String? _fromSiteName;
  String? _toSiteId;
  String? _toSiteName;
  Map<String, dynamic>? _completedNote;

  bool _isLoading = false;
  String? _errorMessage;

  static const _vehicleTypes = ['Dreiachser', 'Vierachser', 'Sattelzug', 'Hängerzug'];

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  @override
  void dispose() {
    _licensePlateController.dispose();
    _driverNameController.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final plate = prefs.getString(_plateKey) ?? '';
    final token = prefs.getString(_tokenKey);
    final truckRaw = prefs.getString(_truckKey);
    if (plate.isNotEmpty) _licensePlateController.text = plate;
    if (token != null && truckRaw != null) {
      final truck = jsonDecode(truckRaw) as Map<String, dynamic>;
      setState(() {
        _token = token;
        _truck = truck;
        _step = _DriverStep.vehicleType;
      });
    }
  }

  Future<void> _login() async {
    final plate = _licensePlateController.text.trim();
    if (plate.isEmpty) return;
    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      final resp = await widget.apiService.driverLogin(licensePlate: plate);
      final token = resp['accessToken'] as String;
      final truck = resp['truck'] as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_plateKey, plate);
      await prefs.setString(_tokenKey, token);
      await prefs.setString(_truckKey, jsonEncode(truck));
      setState(() {
        _token = token;
        _truck = truck;
        _step = _DriverStep.vehicleType;
      });
    } catch (e) {
      setState(() => _errorMessage = 'Kennzeichen nicht gefunden oder Verbindungsfehler.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_truckKey);
    setState(() {
      _token = null;
      _truck = null;
      _vehicleType = null;
      _fromSiteId = null;
      _fromSiteName = null;
      _toSiteId = null;
      _toSiteName = null;
      _completedNote = null;
      _errorMessage = null;
      _signatureController.clear();
      _driverNameController.clear();
      _step = _DriverStep.login;
    });
  }

  void _resetForNewNote() {
    setState(() {
      _vehicleType = null;
      _fromSiteId = null;
      _fromSiteName = null;
      _toSiteId = null;
      _toSiteName = null;
      _completedNote = null;
      _errorMessage = null;
      _signatureController.clear();
      _step = _DriverStep.vehicleType;
    });
  }

  Future<void> _scanQr() async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen(title: 'QR-Code scannen')),
    );
    if (result == null || result.isEmpty) return;
    try {
      // Expected format: {"f":"<id>","fn":"<name>","t":"<id>","tn":"<name>"}
      final data = jsonDecode(result) as Map<String, dynamic>;
      final fromId = data['f'] as String?;
      final fromName = data['fn'] as String?;
      final toId = data['t'] as String?;
      final toName = data['tn'] as String?;
      if (fromId == null || toId == null) {
        setState(() => _errorMessage = 'Ungültiger QR-Code. Bitte den richtigen Code scannen.');
        return;
      }
      setState(() {
        _fromSiteId = fromId;
        _fromSiteName = fromName ?? fromId;
        _toSiteId = toId;
        _toSiteName = toName ?? toId;
        _errorMessage = null;
        _step = _DriverStep.review;
      });
    } catch (_) {
      setState(() => _errorMessage = 'QR-Code konnte nicht gelesen werden. Bitte erneut scannen.');
    }
  }

  Future<void> _submitNote() async {
    final token = _token;
    if (token == null) return;
    if (_signatureController.isEmpty) {
      setState(() => _errorMessage = 'Bitte zuerst unterschreiben.');
      return;
    }
    setState(() { _step = _DriverStep.submitting; _isLoading = true; _errorMessage = null; });
    try {
      final note = await widget.apiService.createDriverNote(
        token: token,
        vehicleType: _vehicleType!,
        driverName: _driverNameController.text.trim(),
        fromSiteId: _fromSiteId!,
        toSiteId: _toSiteId!,
        signatureSvg: _signatureController.toSvg(),
      );
      setState(() { _completedNote = note; _step = _DriverStep.success; });
    } catch (e) {
      setState(() {
        _errorMessage = 'Fehler beim Erstellen des Lieferscheins. Bitte erneut versuchen.';
        _step = _DriverStep.signature;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('BauFlow Driver'),
        actions: [
          if (_token != null)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Abmelden',
              onPressed: _logout,
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_step) {
      case _DriverStep.login:
        return _buildLoginStep();
      case _DriverStep.vehicleType:
        return _buildVehicleTypeStep();
      case _DriverStep.driverName:
        return _buildDriverNameStep();
      case _DriverStep.qrScan:
        return _buildQrScanStep();
      case _DriverStep.review:
        return _buildReviewStep();
      case _DriverStep.signature:
        return _buildSignatureStep();
      case _DriverStep.submitting:
        return const Center(child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Lieferschein wird erstellt...'),
          ],
        ));
      case _DriverStep.success:
        return _buildSuccessStep();
    }
  }

  // ─── Step: Login ────────────────────────────────────────────────────────────
  Widget _buildLoginStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 24),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Fahrer-Login', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text('Melde dich mit deinem LKW-Kennzeichen an.',
                  style: TextStyle(color: Color(0xFF91A0B8))),
              const SizedBox(height: 20),
              TextField(
                controller: _licensePlateController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Kennzeichen',
                  hintText: 'z.B. M-AB 1234',
                  prefixIcon: Icon(Icons.local_shipping),
                ),
                onSubmitted: (_) => _isLoading ? null : _login(),
              ),
              const SizedBox(height: 16),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFFF87171))),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isLoading ? null : _login,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text(_isLoading ? 'Anmelden...' : 'Anmelden'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step: Fahrzeugtyp ──────────────────────────────────────────────────────
  Widget _buildVehicleTypeStep() {
    final truck = _truck;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (truck != null)
          _TruckHeader(truck: truck, onLogout: _logout),
        const SizedBox(height: 16),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Fahrzeugtyp', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text('Welches Fahrzeug fährst du heute?',
                  style: TextStyle(color: Color(0xFF91A0B8))),
              const SizedBox(height: 20),
              ..._vehicleTypes.map((vt) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SizedBox(
                      width: double.infinity,
                      child: _vehicleType == vt
                          ? FilledButton(
                              onPressed: () => setState(() {
                                _vehicleType = vt;
                                _step = _DriverStep.driverName;
                              }),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                child: Text(vt, style: const TextStyle(fontWeight: FontWeight.w700)),
                              ),
                            )
                          : OutlinedButton(
                              onPressed: () => setState(() {
                                _vehicleType = vt;
                                _step = _DriverStep.driverName;
                              }),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                child: Text(vt),
                              ),
                            ),
                    ),
                  )),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step: Fahrername ───────────────────────────────────────────────────────
  Widget _buildDriverNameStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _StepHeader(step: '2/4', title: 'Fahrername', subtitle: 'Wer fährt diesen Transport?'),
        const SizedBox(height: 16),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _driverNameController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Vor- und Nachname',
                  hintText: 'z.B. Max Mustermann',
                  prefixIcon: Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 6),
              const Text('Optional — kann leer gelassen werden.',
                  style: TextStyle(color: Color(0xFF91A0B8), fontSize: 12)),
              const SizedBox(height: 20),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () => setState(() => _step = _DriverStep.vehicleType),
                    child: const Text('Zurück'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => setState(() => _step = _DriverStep.qrScan),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text('Weiter'),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step: QR-Scan ──────────────────────────────────────────────────────────
  Widget _buildQrScanStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _StepHeader(step: '3/4', title: 'QR-Code scannen', subtitle: 'Scanne den QR-Code der Baustelle.'),
        const SizedBox(height: 16),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D131D),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.qr_code, size: 64, color: Color(0xFFF5BF18)),
                    SizedBox(height: 10),
                    Text(
                      'Den QR-Code vom Polier oder Bauleiter erhalten und scannen.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF91A0B8)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFFF87171))),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _scanQr,
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14),
                    child: Text('QR-Code scannen'),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = _DriverStep.driverName),
                  child: const Text('Zurück'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step: Zusammenfassung ──────────────────────────────────────────────────
  Widget _buildReviewStep() {
    final truck = _truck;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _StepHeader(step: '4/4', title: 'Zusammenfassung', subtitle: 'Bitte prüfe die Angaben.'),
        const SizedBox(height: 16),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ReviewRow('Kennzeichen', truck?['licensePlate'] as String? ?? '-'),
              _ReviewRow('Fahrzeugtyp', _vehicleType ?? '-'),
              if ((_driverNameController.text.trim()).isNotEmpty)
                _ReviewRow('Fahrername', _driverNameController.text.trim()),
              _ReviewRow('Ladebaustelle', _fromSiteName ?? '-'),
              _ReviewRow('Abladebaustelle', _toSiteName ?? '-'),
              const SizedBox(height: 20),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () => setState(() { _step = _DriverStep.qrScan; _errorMessage = null; }),
                    child: const Text('QR neu scannen'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => setState(() => _step = _DriverStep.signature),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text('Unterschreiben'),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step: Unterschrift ─────────────────────────────────────────────────────
  Widget _buildSignatureStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const _StepHeader(step: '5/5', title: 'Unterschrift', subtitle: 'Bitte im Feld unterschreiben.'),
        const SizedBox(height: 16),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SignaturePad(controller: _signatureController),
              const SizedBox(height: 20),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFFF87171))),
                ),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () => setState(() { _step = _DriverStep.review; _errorMessage = null; }),
                    child: const Text('Zurück'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ListenableBuilder(
                      listenable: _signatureController,
                      builder: (context, _) => FilledButton(
                        onPressed: _signatureController.isEmpty ? null : _submitNote,
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Text('Lieferschein absenden'),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step: Erfolg ────────────────────────────────────────────────────────────
  Widget _buildSuccessStep() {
    final note = _completedNote;
    final fromSite = (note?['fromSite'] as Map<String, dynamic>?)?['name'] as String? ?? _fromSiteName ?? '-';
    final toSite = (note?['toSite'] as Map<String, dynamic>?)?['name'] as String? ?? _toSiteName ?? '-';
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF14532D), Color(0xFF0F1724)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.check_circle, color: Color(0xFF4ADE80), size: 48),
              const SizedBox(height: 12),
              const Text('Lieferschein erstellt!',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text('$fromSite → $toSite', style: const TextStyle(color: Color(0xFF91A0B8))),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (note != null) ...[
                _ReviewRow('Kennzeichen', note['licensePlate'] as String? ?? '-'),
                _ReviewRow('Fahrzeugtyp', note['vehicleType'] as String? ?? '-'),
                _ReviewRow('Von', fromSite),
                _ReviewRow('Nach', toSite),
                const SizedBox(height: 8),
              ],
              const Text(
                'Der Lieferschein wurde automatisch an den Polier gesendet.',
                style: TextStyle(color: Color(0xFF91A0B8), fontSize: 13),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _resetForNewNote,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14),
                    child: Text('Neuen Lieferschein erstellen'),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _logout,
                  child: const Text('Abmelden'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Helper widgets ───────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: child,
    );
  }
}

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step, required this.title, required this.subtitle});
  final String step;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Schritt $step', style: const TextStyle(color: Color(0xFFF5BF18), fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(subtitle, style: const TextStyle(color: Color(0xFF91A0B8))),
      ],
    );
  }
}

class _TruckHeader extends StatelessWidget {
  const _TruckHeader({required this.truck, required this.onLogout});
  final Map<String, dynamic> truck;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0D131D),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_shipping, color: Color(0xFFF5BF18), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(truck['licensePlate'] as String? ?? '-',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(truck['name'] as String? ?? '-',
                    style: const TextStyle(color: Color(0xFF91A0B8), fontSize: 12)),
              ],
            ),
          ),
          TextButton(onPressed: onLogout, child: const Text('Abmelden')),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(label, style: const TextStyle(color: Color(0xFF91A0B8), fontSize: 13)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

// ─── Signature controller + pad (reusable) ────────────────────────────────────

class SignatureController extends ChangeNotifier {
  final List<List<Offset>> _strokes = [];

  List<List<Offset>> get strokes => _strokes;
  bool get isEmpty => _strokes.isEmpty;

  void startStroke(Offset point) { _strokes.add([point]); notifyListeners(); }
  void appendPoint(Offset point) { if (_strokes.isNotEmpty) { _strokes.last.add(point); notifyListeners(); } }
  void clear() { _strokes.clear(); notifyListeners(); }

  String toSvg() {
    final paths = _strokes
        .where((s) => s.isNotEmpty)
        .map((s) {
          final first = s.first;
          final rest = s.skip(1).map((p) => 'L ${p.dx.toStringAsFixed(1)} ${p.dy.toStringAsFixed(1)}').join(' ');
          return '<path d="M ${first.dx.toStringAsFixed(1)} ${first.dy.toStringAsFixed(1)} $rest" />';
        })
        .join();
    if (paths.isEmpty) return '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect width="320" height="120" fill="#fffdf7"/><g fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">$paths</g></svg>';
  }
}

class SignaturePad extends StatefulWidget {
  const SignaturePad({super.key, required this.controller});
  final SignatureController controller;

  @override
  State<SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<SignaturePad> {
  @override
  void initState() { super.initState(); widget.controller.addListener(_onChange); }

  @override
  void dispose() { widget.controller.removeListener(_onChange); super.dispose(); }

  void _onChange() { if (mounted) setState(() {}); }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          height: 160,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFCBD5E1)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: GestureDetector(
              onPanStart: (d) => widget.controller.startStroke(d.localPosition),
              onPanUpdate: (d) => widget.controller.appendPoint(d.localPosition),
              child: CustomPaint(
                painter: _SignaturePainter(widget.controller.strokes),
                child: const SizedBox.expand(),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: widget.controller.isEmpty ? null : widget.controller.clear,
            icon: const Icon(Icons.undo, size: 16),
            label: const Text('Löschen'),
          ),
        ),
      ],
    );
  }
}

class _SignaturePainter extends CustomPainter {
  const _SignaturePainter(this.strokes);
  final List<List<Offset>> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF111827)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final stroke in strokes) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (final p in stroke.skip(1)) path.lineTo(p.dx, p.dy);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter old) => true;
}
