import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/role_workspace.dart';
import '../models/material_item.dart';
import '../models/notification_item.dart';
import '../providers/materials_provider.dart';
import '../providers/notifications_provider.dart';
import '../providers/planning_provider.dart';
import '../providers/session_provider.dart';
import '../providers/transport_provider.dart';
import '../providers/users_provider.dart';
import '../widgets/brand_mark.dart';
import '../widgets/material_card.dart';
import 'create_material_screen.dart';
import 'map_screen.dart';
import 'material_detail_screen.dart';
import 'planning_screen.dart';
import 'platform_hub_screen.dart';
import 'transport_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

// ── Tab page constants ──────────────────────────────────────────────────────
const _pageLabels = ['Dashboard', 'Materialien', 'Karte', 'Planung', 'Transport', 'Plattform'];
const _pageIcons = [
  Icons.dashboard_outlined, Icons.inventory_2_outlined, Icons.map_outlined,
  Icons.event_note_outlined, Icons.local_shipping_outlined, Icons.hub_outlined,
];
const _pageSelectedIcons = [
  Icons.dashboard, Icons.inventory_2, Icons.map,
  Icons.event_note, Icons.local_shipping, Icons.hub,
];

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  bool _bootstrapped = false;

  /// Returns the full-page indices (0-5) that are visible for this role.
  List<int> _getVisiblePageIndices(String role) {
    final workspace = getRoleWorkspace(role);
    final List<int> indices = [];
    if (workspace.hasSection(AppSection.dashboard)) indices.add(0);
    if (workspace.hasSection(AppSection.materials)) indices.add(1);
    if (workspace.hasSection(AppSection.sites)) indices.add(2);
    if (workspace.hasSection(AppSection.planning)) indices.add(3);
    if (workspace.hasSection(AppSection.transport)) indices.add(4);
    const platformSections = [
      AppSection.fleet, AppSection.people, AppSection.notifications,
      AppSection.reports, AppSection.admin,
    ];
    if (platformSections.any((s) => workspace.hasSection(s))) indices.add(5);
    return indices.isEmpty ? [0] : indices;
  }

  final _searchController = TextEditingController();
  String _filterCategory = '';
  String _filterStatus = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_bootstrapped) return;
    _bootstrapped = true;
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshAll());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refreshAll() async {
    final session = context.read<SessionProvider>().session!;
    await Future.wait([
      context.read<MaterialsProvider>().refresh(session),
      context.read<TransportProvider>().refresh(session),
      context.read<NotificationsProvider>().refresh(session),
      context.read<PlanningProvider>().refresh(session),
      context.read<UsersProvider>().refresh(session),
    ]);
  }

  Future<void> _applyFilter() async {
    final session = context.read<SessionProvider>().session!;
    await context.read<MaterialsProvider>().refreshFiltered(
          session,
          text: _searchController.text,
          category: _filterCategory,
          status: _filterStatus,
        );
  }

  Future<void> _createSite({
    required String name,
    required double latitude,
    required double longitude,
  }) async {
    final session = context.read<SessionProvider>().session!;
    await context.read<TransportProvider>().createSite(
          session: session,
          name: name,
          latitude: latitude,
          longitude: longitude,
        );
    await _refreshAll();
  }

  Future<void> _deleteSite({required String siteId}) async {
    final session = context.read<SessionProvider>().session!;
    await context.read<TransportProvider>().deleteSite(session: session, siteId: siteId);
    await _refreshAll();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.read<SessionProvider>().session!;
    final visibleIndices = _getVisiblePageIndices(session.role);
    final safeCurrentIndex = _currentIndex.clamp(0, visibleIndices.length - 1);
    final currentPageIndex = visibleIndices[safeCurrentIndex];
    final materialsProvider = context.watch<MaterialsProvider>();
    final transportProvider = context.watch<TransportProvider>();
    final notificationsProvider = context.watch<NotificationsProvider>();
    final planningProvider = context.watch<PlanningProvider>();
    final usersProvider = context.watch<UsersProvider>();
    final materials = materialsProvider.materials;
    final transports = transportProvider.transports;
    final notifications = notificationsProvider.notifications;

    final pages = [
      // ── Tab 0: Dashboard ───────────────────────────────────────────────
      RefreshIndicator(
        onRefresh: _refreshAll,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          children: [
            // Hero card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF151E2A), Color(0xFF0F1724)],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF253042)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'BAUFLOW',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: const Color(0xFFF5BF18),
                          letterSpacing: 3,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    session.site?.name ?? 'Baustelle',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: const Color(0xFFE8EDF4),
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Willkommen, ${session.name}',
                    style: const TextStyle(color: Color(0xFF91A0B8)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Stats grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.6,
              children: [
                _StatCard(
                  label: 'Verfügbar',
                  value: '${materials.where((m) => m.status == 'available').length}',
                  icon: Icons.inventory_2_outlined,
                ),
                _StatCard(
                  label: 'In Transit',
                  value: '${transports.where((t) => t.status == 'in_transit').length}',
                  icon: Icons.local_shipping_outlined,
                ),
                _StatCard(
                  label: 'LKWs frei',
                  value: '${transportProvider.trucks.where((t) => t.available).length}',
                  icon: Icons.fire_truck_outlined,
                ),
                _StatCard(
                  label: 'Events',
                  value: '${notifications.length}',
                  icon: Icons.notifications_outlined,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Nearest materials
            // ── Module cards (like web: SitePlan / MatFlow / FleetFlow / Pulse) ──
            Text(
              'Plattform-Module',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF91A0B8),
                    letterSpacing: 1.1,
                  ),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.3,
              children: [
                _ModuleCard(
                  chip: 'SitePlan',
                  value: '${planningProvider.plan?.zones.length ?? 0}',
                  label: 'Aktive Zonen',
                ),
                _ModuleCard(
                  chip: 'MatFlow',
                  value: '${materials.where((m) => m.status == 'available').length}',
                  label: 'Verfügbare Materialien',
                ),
                _ModuleCard(
                  chip: 'FleetFlow',
                  value: '${transports.where((t) => t.status != 'delivered').length}',
                  label: 'Aktive Transporte',
                ),
                _ModuleCard(
                  chip: 'Pulse',
                  value: '${notifications.length}',
                  label: 'Event-Log',
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Nearest materials
            if (materials.isNotEmpty) ...[
              Text(
                'Nächste Materialien',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ...materials.take(5).map(
                    (m) => _MiniMaterialRow(
                      material: m,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => MaterialDetailScreen(material: m)),
                      ),
                    ),
                  ),
              const SizedBox(height: 24),
            ],

            // Event log
            Text(
              'Event-Log',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (notifications.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Keine Ereignisse', style: TextStyle(color: Colors.grey)),
              )
            else
              ...notifications.take(10).map((n) => _NotificationRow(item: n)),
          ],
        ),
      ),

      // ── Tab 1: Materialien + Filter ────────────────────────────────────
      Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Materialien suchen…',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _applyFilter();
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                  ),
                  onChanged: (_) => _applyFilter(),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      FilterChip(
                        label: Text(_filterCategory.isEmpty ? 'Kategorie' : _filterCategory),
                        selected: _filterCategory.isNotEmpty,
                        selectedColor: const Color(0xFFF5BF18).withValues(alpha: 0.2),
                        onSelected: (_) async {
                          final picked = await showModalBottomSheet<String>(
                            context: context,
                            builder: (_) => _PickerSheet(
                              title: 'Kategorie',
                              items: const ['', 'Beton', 'Stahl', 'Holz', 'Ziegel', 'Asphalt', 'Sand', 'Kies', 'Dämmung', 'Glas', 'Kunststoff', 'Sonstiges'],
                              labels: const {'': 'Alle Kategorien'},
                              current: _filterCategory,
                            ),
                          );
                          if (picked != null && mounted) {
                            setState(() => _filterCategory = picked);
                            await _applyFilter();
                          }
                        },
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        label: Text(_filterStatus.isEmpty
                            ? 'Status'
                            : {'available': 'Verfügbar', 'reserved': 'Reserviert', 'picked_up': 'Abgeholt'}[_filterStatus] ?? _filterStatus),
                        selected: _filterStatus.isNotEmpty,
                        selectedColor: const Color(0xFFF5BF18).withValues(alpha: 0.2),
                        onSelected: (_) async {
                          final picked = await showModalBottomSheet<String>(
                            context: context,
                            builder: (_) => const _PickerSheet(
                              title: 'Status',
                              items: ['', 'available', 'reserved', 'picked_up'],
                              labels: {'': 'Alle', 'available': 'Verfügbar', 'reserved': 'Reserviert', 'picked_up': 'Abgeholt'},
                              current: '',
                            ),
                          );
                          if (picked != null && mounted) {
                            setState(() => _filterStatus = picked);
                            await _applyFilter();
                          }
                        },
                      ),
                      if (_filterCategory.isNotEmpty || _filterStatus.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        ActionChip(
                          label: const Text('Zurücksetzen'),
                          onPressed: () async {
                            setState(() {
                              _filterCategory = '';
                              _filterStatus = '';
                              _searchController.clear();
                            });
                            await _applyFilter();
                          },
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      '${materials.length} Materialien · ${materials.where((m) => m.status == 'available').length} verfügbar',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF91A0B8)),
                    ),
                    if (materialsProvider.isLoading) ...[
                      const SizedBox(width: 8),
                      const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                    ],
                  ],
                ),
                  const SizedBox(height: 10),
                  // Signal blocks like web (Total / Verfügbar / Reserviert)
                  Row(
                    children: [
                      _SignalBlock(label: 'Gesamt', value: '${materials.length}', dark: true),
                      const SizedBox(width: 8),
                      _SignalBlock(label: 'Verfügbar', value: '${materials.where((m) => m.status == 'available').length}', gold: true),
                      const SizedBox(width: 8),
                      _SignalBlock(label: 'Reserviert', value: '${materials.where((m) => m.status == 'reserved').length}'),
                    ],
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refreshAll,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                itemCount: materials.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, index) => MaterialCard(
                  material: materials[index],
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => MaterialDetailScreen(material: materials[index])),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),

      // ── Tab 2: Karte ───────────────────────────────────────────────────
      Padding(
        padding: const EdgeInsets.all(16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: MapScreen(materials: materials, sites: transportProvider.sites),
        ),
      ),

      // ── Tab 3: Planung ─────────────────────────────────────────────────
      const PlanningScreen(),

      // ── Tab 4: Transport ───────────────────────────────────────────────
      TransportScreen(materials: materials),

      // ── Tab 5: Plattform ───────────────────────────────────────────────
      PlatformHubScreen(
        materials: materials,
        transports: transports,
        notifications: notifications,
        sites: transportProvider.sites,
        trucks: transportProvider.trucks,
        users: usersProvider.users,
        currentUserName: session.name,
        plan: planningProvider.plan,
        onRefresh: _refreshAll,
        onCreateSite: _createSite,
        onDeleteSite: _deleteSite,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const BrandMark(compact: true),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _appBarTitle(session.site?.name, currentPageIndex),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(onPressed: _refreshAll, icon: const Icon(Icons.refresh)),
          IconButton(
            onPressed: () async => context.read<SessionProvider>().logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: IndexedStack(index: currentPageIndex, children: pages),
      floatingActionButton: currentPageIndex == 1
          ? FloatingActionButton.extended(
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => CreateMaterialScreen(sites: transportProvider.sites),
                  ),
                );
                if (mounted) await _refreshAll();
              },
              label: const Text('Material hinzufügen'),
              icon: const Icon(Icons.camera_alt_outlined),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeCurrentIndex,
        onDestinationSelected: (value) => setState(() => _currentIndex = value),
        destinations: visibleIndices
            .map((pi) => NavigationDestination(
                  icon: Icon(_pageIcons[pi]),
                  selectedIcon: Icon(_pageSelectedIcons[pi]),
                  label: _pageLabels[pi],
                ))
            .toList(),
      ),
    );
  }

  String _appBarTitle(String? siteName, int pageIndex) {
    switch (pageIndex) {
      case 0: return siteName ?? 'BauFlow';
      case 1: return 'Materialien';
      case 2: return 'Karte';
      case 3: return 'Planung';
      case 4: return 'Transport';
      case 5: return 'Plattform';
      default: return 'BauFlow';
    }
  }
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, size: 22, color: const Color(0xFFF5BF18)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFE8EDF4),
                      ),
                ),
              ),
              Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF91A0B8))),
            ],
          ),
        ],
      ),
    );
  }
}

  // ── Module Card ───────────────────────────────────────────────────────────────

  class _ModuleCard extends StatelessWidget {
    const _ModuleCard({required this.chip, required this.value, required this.label});

    final String chip;
    final String value;
    final String label;

    @override
    Widget build(BuildContext context) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131A24),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF253042)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF5BF18).withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(chip,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFD89E00),
                  )),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFE8EDF4),
                        )),
                Text(label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: const Color(0xFF91A0B8))),
              ],
            ),
          ],
        ),
      );
    }
  }

// ── Mini Material Row ─────────────────────────────────────────────────────────

class _MiniMaterialRow extends StatelessWidget {
  const _MiniMaterialRow({required this.material, required this.onTap});

  final MaterialItem material;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = material.status == 'available'
        ? Colors.green.shade700
        : material.status == 'reserved'
            ? Colors.orange.shade700
            : Colors.grey.shade600;
    final statusLabel = material.status == 'available'
        ? 'Verfügbar'
        : material.status == 'reserved'
            ? 'Reserviert'
            : 'Abgeholt';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF131A24),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF253042)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(material.title, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFE8EDF4))),
                  Text(
                    material.site?.name ?? material.siteId,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF91A0B8)),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('${material.distanceKm.toStringAsFixed(1)} km', style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Notification Row ──────────────────────────────────────────────────────────

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.item});

  final NotificationItem item;

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'gerade eben';
    if (diff.inMinutes < 60) return 'vor ${diff.inMinutes} Min.';
    if (diff.inHours < 24) return 'vor ${diff.inHours} Std.';
    return 'vor ${diff.inDays} Tag${diff.inDays == 1 ? '' : 'en'}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF131A24),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF253042)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFF5BF18).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              item.typeLabel,
              style: const TextStyle(fontSize: 11, color: Color(0xFFD89E00), fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.message, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 2),
                Text(
                  _timeAgo(item.createdAt),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF91A0B8)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Picker Sheet ──────────────────────────────────────────────────────────────

class _PickerSheet extends StatelessWidget {
  const _PickerSheet({
    required this.title,
    required this.items,
    required this.labels,
    required this.current,
  });

  final String title;
  final List<String> items;
  final Map<String, String> labels;
  final String current;

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.of(context).size.height * 0.75;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: items
                    .map(
                      (item) => ListTile(
                        title: Text(labels[item] ?? item),
                        trailing: item == current ? const Icon(Icons.check, color: Color(0xFFF5BF18)) : null,
                        onTap: () => Navigator.of(context).pop(item),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
// ── Signal Block ─────────────────────────────────────────────────────────────

class _SignalBlock extends StatelessWidget {
  const _SignalBlock({required this.label, required this.value, this.dark = false, this.gold = false});

  final String label;
  final String value;
  final bool dark;
  final bool gold;

  @override
  Widget build(BuildContext context) {
    final bg = gold
        ? const Color(0xFFF5BF18)
        : dark
            ? const Color(0xFF0F172A)
            : const Color(0xFF1E293B);
    final labelColor = gold ? const Color(0xFF0F172A) : const Color(0xFF94A3B8);
    final valueColor = gold ? const Color(0xFF0F172A) : Colors.white;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: labelColor, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: valueColor)),
          ],
        ),
      ),
    );
  }
}
