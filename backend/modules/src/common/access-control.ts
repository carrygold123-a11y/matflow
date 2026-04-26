import { ForbiddenException } from '@nestjs/common';
import { getRoleWorkspace, type PlatformSection } from '@matflow/shared-types';
import type { RequestUser } from './request-user.interface';

export function getWorkspaceConfig(currentUser: Pick<RequestUser, 'role'>) {
  return getRoleWorkspace(currentUser.role);
}

export function canAccessAllSites(currentUser: Pick<RequestUser, 'role'>): boolean {
  return getWorkspaceConfig(currentUser).canAccessAllSites;
}

export function canEditPlanning(currentUser: Pick<RequestUser, 'role'>): boolean {
  return getWorkspaceConfig(currentUser).canEditPlanning;
}

export function hasApiSectionAccess(
  currentUser: Pick<RequestUser, 'role'>,
  section: PlatformSection,
): boolean {
  return getWorkspaceConfig(currentUser).apiSections.includes(section);
}

export function assertApiSectionAccess(
  currentUser: Pick<RequestUser, 'role'>,
  section: PlatformSection,
  message: string,
): void {
  if (!hasApiSectionAccess(currentUser, section)) {
    throw new ForbiddenException(message);
  }
}

export function assertSiteVisibility(
  currentUser: Pick<RequestUser, 'role' | 'siteId'>,
  siteId: string,
  message: string,
): void {
  if (!canAccessAllSites(currentUser) && currentUser.siteId !== siteId) {
    throw new ForbiddenException(message);
  }
}

export function isTransportVisibleForUser(
  currentUser: Pick<RequestUser, 'role' | 'siteId'>,
  fromSiteId: string,
  toSiteId: string,
): boolean {
  return canAccessAllSites(currentUser) || currentUser.siteId === fromSiteId || currentUser.siteId === toSiteId;
}