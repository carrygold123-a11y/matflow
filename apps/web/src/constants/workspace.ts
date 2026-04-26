import { getRoleWorkspace, type PlatformSection, type UserRole } from '@matflow/shared-types';

export const sectionRouteMap: Record<PlatformSection, string> = {
  dashboard: '/dashboard',
  planning: '/planning',
  sites: '/sites',
  people: '/people',
  fleet: '/fleet',
  materials: '/materials',
  transport: '/transport',
  notifications: '/notifications',
  reports: '/reports',
  admin: '/admin',
};

export function getHomePath(role: UserRole): string {
  return sectionRouteMap[getRoleWorkspace(role).homeSection];
}
