/// Mirrors shared/types/src/index.ts → roleWorkspaceMatrix
/// Keep in sync with the TypeScript source.
library role_workspace;

enum AppSection {
  dashboard,
  planning,
  sites,
  people,
  fleet,
  materials,
  transport,
  notifications,
  reports,
  admin,
}

class RoleWorkspaceConfig {
  const RoleWorkspaceConfig({
    required this.homeSection,
    required this.navigationSections,
    required this.canAccessAllSites,
    required this.canEditPlanning,
    required this.canManageSites,
    required this.canDeleteMaterials,
  });

  final AppSection homeSection;
  final List<AppSection> navigationSections;
  final bool canAccessAllSites;
  final bool canEditPlanning;
  final bool canManageSites;
  final bool canDeleteMaterials;

  bool hasSection(AppSection s) => navigationSections.contains(s);
}

const Map<String, RoleWorkspaceConfig> roleWorkspaceMatrix = {
  'admin': RoleWorkspaceConfig(
    homeSection: AppSection.dashboard,
    navigationSections: [
      AppSection.dashboard, AppSection.planning, AppSection.sites,
      AppSection.people, AppSection.fleet, AppSection.materials,
      AppSection.transport, AppSection.notifications, AppSection.reports, AppSection.admin,
    ],
    canAccessAllSites: true, canEditPlanning: true,
    canManageSites: true, canDeleteMaterials: true,
  ),
  'bauleiter': RoleWorkspaceConfig(
    homeSection: AppSection.dashboard,
    navigationSections: [
      AppSection.dashboard, AppSection.planning, AppSection.sites,
      AppSection.people, AppSection.fleet, AppSection.materials,
      AppSection.transport, AppSection.notifications, AppSection.reports,
    ],
    canAccessAllSites: true, canEditPlanning: true,
    canManageSites: true, canDeleteMaterials: true,
  ),
  'manager': RoleWorkspaceConfig(
    homeSection: AppSection.dashboard,
    navigationSections: [
      AppSection.dashboard, AppSection.planning, AppSection.sites,
      AppSection.people, AppSection.fleet, AppSection.materials,
      AppSection.transport, AppSection.notifications, AppSection.reports,
    ],
    canAccessAllSites: true, canEditPlanning: true,
    canManageSites: true, canDeleteMaterials: true,
  ),
  'polier': RoleWorkspaceConfig(
    homeSection: AppSection.planning,
    navigationSections: [
      AppSection.planning, AppSection.people, AppSection.materials,
      AppSection.transport, AppSection.notifications,
    ],
    canAccessAllSites: false, canEditPlanning: true,
    canManageSites: false, canDeleteMaterials: true,
  ),
  'vorarbeiter': RoleWorkspaceConfig(
    homeSection: AppSection.planning,
    navigationSections: [
      AppSection.planning, AppSection.people, AppSection.materials,
      AppSection.notifications,
    ],
    canAccessAllSites: false, canEditPlanning: true,
    canManageSites: false, canDeleteMaterials: false,
  ),
  'disponent': RoleWorkspaceConfig(
    homeSection: AppSection.transport,
    navigationSections: [
      AppSection.transport, AppSection.fleet, AppSection.planning,
      AppSection.notifications, AppSection.reports,
    ],
    canAccessAllSites: false, canEditPlanning: false,
    canManageSites: false, canDeleteMaterials: false,
  ),
  'lagerist': RoleWorkspaceConfig(
    homeSection: AppSection.materials,
    navigationSections: [
      AppSection.materials, AppSection.planning,
      AppSection.notifications, AppSection.reports,
    ],
    canAccessAllSites: false, canEditPlanning: false,
    canManageSites: false, canDeleteMaterials: true,
  ),
  'fahrer': RoleWorkspaceConfig(
    homeSection: AppSection.fleet,
    navigationSections: [
      AppSection.planning, AppSection.fleet,
      AppSection.transport, AppSection.notifications,
    ],
    canAccessAllSites: false, canEditPlanning: false,
    canManageSites: false, canDeleteMaterials: false,
  ),
  'worker': RoleWorkspaceConfig(
    homeSection: AppSection.planning,
    navigationSections: [AppSection.planning, AppSection.notifications],
    canAccessAllSites: false, canEditPlanning: false,
    canManageSites: false, canDeleteMaterials: false,
  ),
  'subcontractor': RoleWorkspaceConfig(
    homeSection: AppSection.planning,
    navigationSections: [AppSection.planning, AppSection.notifications],
    canAccessAllSites: false, canEditPlanning: false,
    canManageSites: false, canDeleteMaterials: false,
  ),
};

RoleWorkspaceConfig getRoleWorkspace(String role) {
  return roleWorkspaceMatrix[role] ??
      const RoleWorkspaceConfig(
        homeSection: AppSection.dashboard,
        navigationSections: [AppSection.dashboard],
        canAccessAllSites: false, canEditPlanning: false,
        canManageSites: false, canDeleteMaterials: false,
      );
}
