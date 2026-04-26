import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/material_item.dart';
import '../models/notification_item.dart';
import '../models/site_plan_item.dart';
import '../models/site_summary.dart';
import '../models/transport_request_item.dart';
import '../models/truck_item.dart';
import '../models/user_item.dart';
import '../providers/session_provider.dart';
import '../services/api_service.dart';

// Roles that can manage sites or delete materials
const _siteManagerRoles = {'admin', 'bauleiter', 'manager'};
const _materialDeleteRoles = {'admin', 'bauleiter', 'manager', 'polier', 'lagerist'};

class PlatformHubScreen extends StatefulWidget {
  const PlatformHubScreen({
    super.key,
    required this.materials,
    required this.transports,
    required this.notifications,
    required this.sites,
    required this.trucks,
    required this.users,
    required this.currentUserName,
    required this.plan,
    required this.onRefresh,
    required this.onCreateSite,
    required this.onDeleteSite,
  });

  final List<MaterialItem> materials;
  final List<TransportRequestItem> transports;
  final List<NotificationItem> notifications;
  final List<SiteSummary> sites;
  final List<TruckItem> trucks;
  final List<UserItem> users;
  final String currentUserName;
  final SitePlanItem? plan;
  final Future<void> Function() onRefresh;
  final Future<void> Function({required String name, required double latitude, required double longitude}) onCreateSite;
  final Future<void> Function({required String siteId}) onDeleteSite;

  @override
  State<PlatformHubScreen> createState() => _PlatformHubScreenState();
}

enum _Module { sites, people, fleet, notifications, reports, admin }

class _PlatformHubScreenState extends State<PlatformHubScreen> {
  _Module _selected = _Module.sites;

  @override
  Widget build(BuildContext context) {
    final availableMaterials = widget.materials.where((m) => m.status == 'available').length;
    final reservedMaterials  = widget.materials.where((m) => m.status == 'reserved').length;
    final inTransit          = widget.transports.where((t) => t.status == 'in_transit').length;
    final delivered          = widget.transports.where((t) => t.status == 'delivered').length;
    final readyTrucks        = widget.trucks.where((t) => t.available).length;

    final people = <String>{widget.currentUserName};
    final plan = widget.plan;
    final users = widget.users;

    for (final user in users) {
      final name = user.name.trim();
      if (name.isNotEmpty) {
        people.add(name);
      }
    }

    if (plan != null) {
      for (final zone in plan.zones) {
        for (final a in zone.assignments) {
          final name = (a.userName ?? a.userId).trim();
          if (name.isNotEmpty) people.add(name);
        }
      }
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: [
          Row(children: [
            Expanded(
              child: Text('Plattform',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            ),
            IconButton(onPressed: widget.onRefresh, icon: const Icon(Icons.refresh)),
          ]),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _Module.values.map((m) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(_label(m)),
                    selected: _selected == m,
                    selectedColor: const Color(0xFFF5BF18),
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: _selected == m ? const Color(0xFF0F172A) : null,
                    ),
                    onSelected: (_) => setState(() => _selected = m),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),
          if (_selected == _Module.sites) ...[
            _SectionHero(
              eyebrow: 'Baustellen',
              title: 'Alle aktiven Baustellen auf einer Oberfläche',
              copy: 'Verfolge Personal, Material und Flottenbereitschaft pro Baustelle vor Schichtstart.',
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: _showCreateSiteDialog,
                icon: const Icon(Icons.add_location_alt_outlined),
                label: const Text('Baustelle anlegen'),
              ),
            ),
            const SizedBox(height: 10),
            _SitesView(
              sites: widget.sites,
              materials: widget.materials,
              trucks: widget.trucks,
              transports: widget.transports,
              users: users,
              onDeleteSite: ({required siteId, required siteName}) => _confirmDeleteSite(siteId: siteId, siteName: siteName),
            ),
          ] else if (_selected == _Module.people) ...[
            _SectionHero(
              eyebrow: 'Mitarbeiter',
              title: 'Sichtbare Mannschaft und Führung',
              copy: 'Halte das Morgenbriefing relevant, indem du genau die Personen in deinem Bereich siehst.',
            ),
            const SizedBox(height: 16),
            _PeopleView(users: users, fallbackNames: people.toList()..sort()),
          ] else if (_selected == _Module.fleet) ...[
            _SectionHero(
              eyebrow: 'Fuhrpark',
              title: 'Fuhrpark-Status und Disposition',
              copy: 'Fahrer, Disposition und Baustellenleitung starten mit demselben Flottenbild.',
            ),
            const SizedBox(height: 16),
            _FleetView(trucks: widget.trucks, activeTransports: widget.transports.where((t) => t.status != 'delivered').length),
          ] else if (_selected == _Module.notifications) ...[
            _SectionHero(
              eyebrow: 'Benachrichtigungen',
              title: 'Operativer Signalstrom',
              copy: 'Lies Meldungen, Reservierungen und Transportänderungen in einer Timeline.',
            ),
            const SizedBox(height: 16),
            _NotificationsView(notifications: widget.notifications),
          ] else if (_selected == _Module.reports) ...[
            _SectionHero(
              eyebrow: 'Berichte',
              title: 'Morgendliches Betriebsbild',
              copy: 'Fasse Personal, Materialverfügbarkeit und Transportlast vor Arbeitsbeginn zusammen.',
            ),
            const SizedBox(height: 16),
            _ReportsView(availableMaterials: availableMaterials, inTransit: inTransit, peopleCount: people.length, readyTrucks: readyTrucks),
          ] else ...[
            _SectionHero(
              eyebrow: 'Admin',
              title: 'Rollenmatrix und Plattform-Sicht',
              copy: 'Die Admin-Sicht zeigt, wie Rollen, Navigation und API-Flächen in BauFlow getrennt sind.',
            ),
            const SizedBox(height: 16),
            _AdminView(
              sites: widget.sites.length, people: people.length, materials: widget.materials.length,
              fleet: widget.trucks.length, transports: widget.transports.length, notifications: widget.notifications.length,
              availableMaterials: availableMaterials, reservedMaterials: reservedMaterials, inTransit: inTransit, delivered: delivered,
              users: users,
            ),
          ],
        ],
      ),
    );
  }

  String _label(_Module m) {
    switch (m) {
      case _Module.sites:         return 'Baustellen';
      case _Module.people:        return 'Mitarbeiter';
      case _Module.fleet:         return 'Fuhrpark';
      case _Module.notifications: return 'Benachrichtigungen';
      case _Module.reports:       return 'Berichte';
      case _Module.admin:         return 'Admin';
    }
  }

  Future<void> _showCreateSiteDialog() async {
    final nameController = TextEditingController();
    final latitudeController = TextEditingController();
    final longitudeController = TextEditingController();

    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Neue Baustelle'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: latitudeController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              decoration: const InputDecoration(labelText: 'Breitengrad'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: longitudeController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              decoration: const InputDecoration(labelText: 'Längengrad'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Abbrechen'),
          ),
          FilledButton(
            onPressed: () async {
              final name = nameController.text.trim();
              final latitude = double.tryParse(latitudeController.text.trim());
              final longitude = double.tryParse(longitudeController.text.trim());
              if (name.isEmpty || latitude == null || longitude == null) {
                return;
              }

              await widget.onCreateSite(name: name, latitude: latitude, longitude: longitude);
              if (dialogContext.mounted) {
                Navigator.of(dialogContext).pop(true);
              }
            },
            child: const Text('Anlegen'),
          ),
        ],
      ),
    );

    nameController.dispose();
    latitudeController.dispose();
    longitudeController.dispose();

    if (created == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Baustelle erstellt')));
    }
  }

  Future<void> _confirmDeleteSite({required String siteId, required String siteName}) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Baustelle löschen?'),
        content: Text('"$siteName" wird gelöscht, wenn keine Abhängigkeiten bestehen.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Abbrechen'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Löschen'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    await widget.onDeleteSite(siteId: siteId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Baustelle gelöscht')));
    }
  }
}

class _SectionHero extends StatelessWidget {
  const _SectionHero({required this.eyebrow, required this.title, required this.copy});
  final String eyebrow, title, copy;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF151E2A), Color(0xFF0F1724)]),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(eyebrow.toUpperCase(),
            style: const TextStyle(color: Color(0xFFF5BF18), fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
        const SizedBox(height: 6),
        Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(copy, style: const TextStyle(color: Color(0xFF91A0B8), height: 1.4, fontSize: 13)),
      ]),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.items});
  final List<(String, String)> items;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.35,
      children: items.map(((String, String) item) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131A24),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF253042)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(item.$1, style: const TextStyle(color: Color(0xFF91A0B8), fontSize: 12, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(item.$2, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
        ]),
      )).toList(),
    );
  }
}

class _ZoneCard extends StatelessWidget {
  const _ZoneCard({required this.title, required this.meta, required this.details, required this.onDelete});
  final String title, meta;
  final List<(String, String)> details;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF5BF18).withValues(alpha: 0.3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ),
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline, color: Color(0xFFF87171)),
              tooltip: 'Baustelle löschen',
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(meta, style: const TextStyle(color: Color(0xFF91A0B8), fontSize: 12)),
        const SizedBox(height: 12),
        ...details.map(((String, String) d) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(children: [
            Expanded(child: Text(d.$1, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12))),
            Text(d.$2, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ]),
        )),
      ]),
    );
  }
}

class _RosterCard extends StatelessWidget {
  const _RosterCard({required this.name, required this.badge, required this.sub, this.badgeAccent = false});
  final String name, badge, sub;
  final bool badgeAccent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800, color: Colors.white),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: badgeAccent ? const Color(0xFF4ADE80).withValues(alpha: 0.15) : const Color(0xFF64748B).withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(badge, style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600,
            color: badgeAccent ? const Color(0xFF4ADE80) : const Color(0xFF94A3B8),
          )),
        ),
        const SizedBox(height: 4),
        Text(
          sub,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
        ),
      ]),
    );
  }
}

class _SitesView extends StatelessWidget {
  const _SitesView({required this.sites, required this.materials, required this.trucks, required this.transports, required this.users, required this.onDeleteSite});
  final List<SiteSummary> sites;
  final List<MaterialItem> materials;
  final List<TruckItem> trucks;
  final List<TransportRequestItem> transports;
  final List<UserItem> users;
  final Future<void> Function({required String siteId, required String siteName}) onDeleteSite;

  @override
  Widget build(BuildContext context) {
    if (sites.isEmpty) return const _Empty(message: 'Keine Baustellen gefunden.');
    return Column(
      children: sites.map((site) {
        final sm = materials.where((m) => m.siteId == site.id).length;
        final st = trucks.where((t) => t.siteId == site.id).length;
        final sn = transports.where((t) => t.fromSiteId == site.id || t.toSiteId == site.id).length;
        final su = users.where((u) => u.siteId == site.id).length;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _ZoneCard(
            title: site.name,
            meta: '${site.latitude.toStringAsFixed(3)}, ${site.longitude.toStringAsFixed(3)}',
            details: [('Team', '$su'), ('Materialien', '$sm'), ('LKWs', '$st'), ('Transporte', '$sn')],
            onDelete: () => onDeleteSite(siteId: site.id, siteName: site.name),
          ),
        );
      }).toList(),
    );
  }
}

class _PeopleView extends StatelessWidget {
  const _PeopleView({required this.users, required this.fallbackNames});
  final List<UserItem> users;
  final List<String> fallbackNames;

  @override
  Widget build(BuildContext context) {
    if (users.isEmpty && fallbackNames.isEmpty) {
      return const _Empty(message: 'Keine Personen gefunden.');
    }

    if (users.isEmpty) {
      return GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.25,
        children: fallbackNames.map((name) => _RosterCard(name: name, badge: 'Mitarbeiter', sub: 'Aktive Zone')).toList(),
      );
    }

    final sortedUsers = [...users]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.25,
      children: sortedUsers
          .map((user) => _RosterCard(
                name: user.name,
                badge: _roleLabel(user.role),
                sub: user.site?.name ?? user.siteId,
              ))
          .toList(),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'bauleiter':
        return 'Bauleiter';
      case 'polier':
        return 'Polier';
      case 'vorarbeiter':
        return 'Vorarbeiter';
      case 'disponent':
        return 'Disponent';
      case 'lagerist':
        return 'Lagerist';
      case 'fahrer':
        return 'Fahrer';
      case 'subcontractor':
        return 'Nachunternehmer';
      default:
        return 'Arbeiter';
    }
  }
}

class _FleetView extends StatelessWidget {
  const _FleetView({required this.trucks, required this.activeTransports});
  final List<TruckItem> trucks;
  final int activeTransports;

  @override
  Widget build(BuildContext context) {
    final ready = trucks.where((t) => t.available).length;
    return Column(children: [
      _StatsGrid(items: [('Verfügbare LKWs', '$ready'), ('Aktive Transporte', '$activeTransports')]),
      const SizedBox(height: 16),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.25,
        children: trucks.map((truck) => _RosterCard(
          name: truck.name,
          badge: truck.available ? 'Verfügbar' : 'Im Einsatz',
          sub: truck.site?.name ?? truck.siteId,
          badgeAccent: truck.available,
        )).toList(),
      ),
    ]);
  }
}

class _NotificationsView extends StatelessWidget {
  const _NotificationsView({required this.notifications});
  final List<NotificationItem> notifications;

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'gerade eben';
    if (diff.inMinutes < 60) return 'vor ${diff.inMinutes} Min.';
    if (diff.inHours < 24) return 'vor ${diff.inHours} Std.';
    return 'vor ${diff.inDays} Tag${diff.inDays == 1 ? "" : "en"}';
  }

  @override
  Widget build(BuildContext context) {
    if (notifications.isEmpty) return const _Empty(message: 'Keine Ereignisse vorhanden.');
    final items = notifications.take(30).toList();
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final n = entry.value;
          final isLast = entry.key == items.length - 1;
          return Column(children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5BF18).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(n.typeLabel,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFD89E00))),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(n.message, style: const TextStyle(color: Colors.white, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(_timeAgo(n.createdAt), style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                ])),
              ]),
            ),
            if (!isLast) const Divider(height: 1, color: Color(0xFF253042)),
          ]);
        }).toList(),
      ),
    );
  }
}

class _ReportsView extends StatelessWidget {
  const _ReportsView({required this.availableMaterials, required this.inTransit, required this.peopleCount, required this.readyTrucks});
  final int availableMaterials, inTransit, peopleCount, readyTrucks;

  @override
  Widget build(BuildContext context) {
    return _StatsGrid(items: [
      ('Material verfügbar', '$availableMaterials'),
      ('Transport-Aktivität', '$inTransit aktiv'),
      ('Personal', '$peopleCount'),
      ('Verfügbare LKWs', '$readyTrucks'),
    ]);
  }
}

class _AdminView extends StatelessWidget {
  const _AdminView({
    required this.sites, required this.people, required this.materials, required this.fleet,
    required this.transports, required this.notifications,
    required this.availableMaterials, required this.reservedMaterials, required this.inTransit, required this.delivered,
    required this.users,
  });
  final int sites, people, materials, fleet, transports, notifications;
  final int availableMaterials, reservedMaterials, inTransit, delivered;
  final List<UserItem> users;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      _StatsGrid(items: [
        ('Sites', '$sites'), ('People', '$people'),
        ('Materialien', '$materials'), ('Flotte', '$fleet'),
        ('Transporte', '$transports'), ('Events', '$notifications'),
      ]),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131A24),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF253042)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Navigation und API-Sicht', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 12),
          _Row('Verfügbar', '$availableMaterials Materialien'),
          _Row('Reserviert', '$reservedMaterials Materialien'),
          _Row('In Transit', '$inTransit Transporte'),
          _Row('Geliefert', '$delivered Transporte'),
          const SizedBox(height: 8),
          const Text('Rollen- und Policy-Einstellungen werden serverseitig gesteuert (wie in der Web-App).',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 12, height: 1.4)),
        ]),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131A24),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF253042)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Rollenmatrix', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 10),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.18,
            children: _roleMatrix.entries
                .map(
                  (entry) => _RoleCard(
                    role: entry.key,
                    homeSection: entry.value.$1,
                    sections: entry.value.$2,
                    activeUsers: users.where((user) => user.role == entry.key).length,
                  ),
                )
                .toList(),
          ),
        ]),
      ),
    ]);
  }

  static const Map<String, (String, String)> _roleMatrix = {
    'admin': ('dashboard', 'dashboard · planning · sites · people · fleet · materials · transport · notifications · reports · admin'),
    'bauleiter': ('dashboard', 'dashboard · planning · sites · people · fleet · materials · transport · notifications · reports'),
    'manager': ('dashboard', 'dashboard · planning · sites · people · fleet · materials · transport · notifications · reports'),
    'polier': ('planning', 'planning · people · materials · transport · notifications'),
    'vorarbeiter': ('planning', 'planning · people · materials · notifications'),
    'disponent': ('transport', 'transport · fleet · planning · notifications · reports'),
    'lagerist': ('materials', 'materials · planning · notifications · reports'),
    'fahrer': ('fleet', 'planning · fleet · transport · notifications'),
    'worker': ('planning', 'planning · notifications'),
    'subcontractor': ('planning', 'planning · notifications'),
  };
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.role, required this.homeSection, required this.sections, required this.activeUsers});

  final String role;
  final String homeSection;
  final String sections;
  final int activeUsers;

  @override
  Widget build(BuildContext context) {
    final roleLabel = _roleLabel(role);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1724),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(roleLabel, style: const TextStyle(color: Color(0xFFF5BF18), fontWeight: FontWeight.w700, fontSize: 12)),
        const SizedBox(height: 4),
        Text('Home: $homeSection', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
        const SizedBox(height: 4),
        Text(sections, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF91A0B8), fontSize: 11, height: 1.3)),
        const SizedBox(height: 8),
        Text('User: $activeUsers', style: const TextStyle(color: Color(0xFF4ADE80), fontWeight: FontWeight.w700, fontSize: 11)),
      ]),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'worker':
        return 'Arbeiter';
      case 'manager':
        return 'Einsatzleiter';
      case 'admin':
        return 'Admin';
      case 'bauleiter':
        return 'Bauleiter';
      case 'polier':
        return 'Polier';
      case 'vorarbeiter':
        return 'Vorarbeiter';
      case 'disponent':
        return 'Disponent';
      case 'lagerist':
        return 'Lagerist';
      case 'fahrer':
        return 'Fahrer';
      case 'subcontractor':
        return 'Nachunternehmer';
      default:
        return role;
    }
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);
  final String label, value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(child: Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13))),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(child: Padding(
      padding: const EdgeInsets.all(32),
      child: Text(message, style: const TextStyle(color: Color(0xFF64748B))),
    ));
  }
}
