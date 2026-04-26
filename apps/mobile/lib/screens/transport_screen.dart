import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/auth_session.dart';
import '../models/material_item.dart';
import '../models/transport_request_item.dart';
import '../providers/session_provider.dart';
import '../providers/transport_provider.dart';

class TransportScreen extends StatefulWidget {
  const TransportScreen({super.key, required this.materials});

  final List<MaterialItem> materials;

  @override
  State<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends State<TransportScreen> {
  String? _materialId;
  String? _toSiteId;
  String? _truckId;
  bool _isCreating = false;

  static const _statusLabels = {
    'planned': 'geplant',
    'in_transit': 'unterwegs',
    'delivered': 'geliefert',
  };

  @override
  Widget build(BuildContext context) {
    final session = context.read<SessionProvider>().session!;
    final transportProvider = context.watch<TransportProvider>();
    final availableMaterials = widget.materials.where((m) => m.status != 'picked_up').toList();
    final availableTrucks = transportProvider.trucks.where((t) => t.available || t.id == _truckId).toList();

    _materialId ??= availableMaterials.isNotEmpty ? availableMaterials.first.id : null;
    _toSiteId ??= transportProvider.sites.isNotEmpty ? transportProvider.sites.first.id : null;
    _truckId ??= availableTrucks.isNotEmpty ? availableTrucks.first.id : null;

    final planned = transportProvider.transports.where((t) => t.status == 'planned').toList();
    final inTransit = transportProvider.transports.where((t) => t.status == 'in_transit').toList();
    final delivered = transportProvider.transports.where((t) => t.status == 'delivered').toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF131A24),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFF253042)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'FleetFlow',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: const Color(0xFFF5BF18),
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text('LKWs, Ziele und Lieferstatus zentral steuern', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _materialId,
                items: availableMaterials
                    .map((m) => DropdownMenuItem(value: m.id, child: Text('${m.title} · ${m.site?.name ?? m.siteId}')))
                    .toList(),
                onChanged: (v) => setState(() => _materialId = v),
                decoration: const InputDecoration(labelText: 'Material'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _toSiteId,
                items: transportProvider.sites.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                onChanged: (v) => setState(() => _toSiteId = v),
                decoration: const InputDecoration(labelText: 'Ziel-Baustelle'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _truckId,
                items: availableTrucks
                    .map((t) => DropdownMenuItem(value: t.id, child: Text('${t.name} · ${t.site?.name ?? t.siteId}')))
                    .toList(),
                onChanged: (v) => setState(() => _truckId = v),
                decoration: const InputDecoration(labelText: 'LKW'),
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: (_materialId == null || _toSiteId == null || _truckId == null || _isCreating)
                    ? null
                    : () async {
                        setState(() => _isCreating = true);
                        try {
                          await transportProvider.createTransport(
                            session: session,
                            materialId: _materialId!,
                            toSiteId: _toSiteId!,
                            truckId: _truckId!,
                          );
                        } finally {
                          if (mounted) setState(() => _isCreating = false);
                        }
                      },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text(_isCreating ? 'Wird geplant...' : 'Transport erstellen'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text('Transport-Board', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _TransportColumn(
                title: 'geplant',
                count: planned.length,
                statusColor: const Color(0xFF64748B),
                transports: planned,
                session: session,
                transportProvider: transportProvider,
                statusLabels: _statusLabels,
              ),
              const SizedBox(width: 12),
              _TransportColumn(
                title: 'unterwegs',
                count: inTransit.length,
                statusColor: const Color(0xFFF5BF18),
                transports: inTransit,
                session: session,
                transportProvider: transportProvider,
                statusLabels: _statusLabels,
              ),
              const SizedBox(width: 12),
              _TransportColumn(
                title: 'geliefert',
                count: delivered.length,
                statusColor: const Color(0xFF22C55E),
                transports: delivered,
                session: session,
                transportProvider: transportProvider,
                statusLabels: _statusLabels,
                readOnly: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TransportColumn extends StatelessWidget {
  const _TransportColumn({
    required this.title,
    required this.count,
    required this.statusColor,
    required this.transports,
    required this.session,
    required this.transportProvider,
    required this.statusLabels,
    this.readOnly = false,
  });

  final String title;
  final int count;
  final Color statusColor;
  final List<TransportRequestItem> transports;
  final AuthSession session;
  final TransportProvider transportProvider;
  final Map<String, String> statusLabels;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 320,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
              ),
              Text('$count', style: const TextStyle(color: Color(0xFF91A0B8), fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 10),
          if (transports.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Keine Transporte', style: TextStyle(color: Color(0xFF64748B))),
            )
          else
            ...transports.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _TransportCard(
                    transport: t,
                    session: session,
                    transportProvider: transportProvider,
                    statusLabels: statusLabels,
                    readOnly: readOnly,
                  ),
                )),
        ],
      ),
    );
  }
}

class _TransportCard extends StatelessWidget {
  const _TransportCard({
    required this.transport,
    required this.session,
    required this.transportProvider,
    required this.statusLabels,
    this.readOnly = false,
  });

  final TransportRequestItem transport;
  final AuthSession session;
  final TransportProvider transportProvider;
  final Map<String, String> statusLabels;
  final bool readOnly;
  static const _allStatuses = ['planned', 'in_transit', 'delivered'];

  static const _statusColor = {
    'planned': Color(0xFF64748B),
    'in_transit': Color(0xFFF5BF18),
    'delivered': Color(0xFF22C55E),
  };

  @override
  Widget build(BuildContext context) {
    final color = _statusColor[transport.status] ?? Colors.grey;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Text(
                  statusLabels[transport.status] ?? transport.status,
                  style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              transport.material?.title ?? transport.materialId,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.place_outlined, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '${transport.fromSite?.name ?? transport.fromSiteId} → ${transport.toSite?.name ?? transport.toSiteId}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.local_shipping_outlined, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    transport.truck?.name ?? transport.truckId,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            if (!readOnly) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _allStatuses.map((nextStatus) {
                  final isCurrent = nextStatus == transport.status;
                  return OutlinedButton(
                    onPressed: isCurrent
                        ? null
                        : () => transportProvider.updateStatus(
                              session: session,
                              transportId: transport.id,
                              status: nextStatus,
                            ),
                    child: Text(statusLabels[nextStatus] ?? nextStatus),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
