export type UserRole = 'worker' | 'manager' | 'admin' | 'bauleiter' | 'polier' | 'vorarbeiter' | 'disponent' | 'lagerist' | 'fahrer' | 'subcontractor';
export type PlatformSection = 'dashboard' | 'planning' | 'sites' | 'people' | 'fleet' | 'materials' | 'transport' | 'notifications' | 'reports' | 'admin';
export type SitePlanPriority = 'critical' | 'focus' | 'ready';
export type SitePlanStatus = 'draft' | 'published';
export type SitePlanShiftStatus = 'not_ready' | 'ready' | 'active' | 'blocked' | 'complete';
export type SitePlanBriefingCategory = 'operations' | 'safety' | 'logistics';
export type SitePlanMaterialNeedStatus = 'needed' | 'ordered' | 'ready' | 'delivered';
export type MaterialStatus = 'available' | 'reserved' | 'picked_up';
export type MaterialCondition = 'new' | 'good' | 'used' | 'damaged';
export type TransportStatus = 'planned' | 'in_transit' | 'delivered';
export type NotificationEntityType = 'material' | 'transport';
export type NotificationEventType = 'material.created' | 'material.reserved' | 'material.status.changed' | 'transport.created' | 'transport.status.changed';
export interface LocationPoint {
    lat: number;
    lng: number;
}
export interface SiteSummary {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
}
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    siteId: string;
    site?: SiteSummary;
}
export interface RoleWorkspaceConfig {
    homeSection: PlatformSection;
    navigationSections: PlatformSection[];
    apiSections: PlatformSection[];
    canAccessAllSites: boolean;
    canEditPlanning: boolean;
}
export declare const platformSections: PlatformSection[];
export declare const roleWorkspaceMatrix: Record<UserRole, RoleWorkspaceConfig>;
export declare function getRoleWorkspace(role: UserRole): RoleWorkspaceConfig;
export declare function hasSectionAccess(role: UserRole, section: PlatformSection): boolean;
export interface SitePlanAssignmentItem {
    id: string;
    userId: string;
    sortOrder: number;
    user?: AuthUser;
}
export interface SitePlanBriefingItem {
    id: string;
    category: SitePlanBriefingCategory;
    title: string;
    note: string;
    sortOrder: number;
}
export interface SitePlanMaterialNeedItem {
    id: string;
    materialId?: string | null;
    material?: MaterialItem | null;
    label: string;
    quantity: number;
    unit: string;
    status: SitePlanMaterialNeedStatus;
    notes: string;
    sortOrder: number;
}
export interface SitePlanZoneItem {
    id: string;
    name: string;
    shiftLabel: string;
    focus: string;
    supportCategory: string;
    priority: SitePlanPriority;
    sortOrder: number;
    leadUserId?: string | null;
    leadUser?: AuthUser | null;
    supportMaterialId?: string | null;
    supportMaterial?: MaterialItem | null;
    supportTruckId?: string | null;
    supportTruck?: TruckItem | null;
    activeTransportId?: string | null;
    activeTransport?: TransportRequestItem | null;
    materialNeeds: SitePlanMaterialNeedItem[];
    assignments: SitePlanAssignmentItem[];
}
export interface SitePlanItem {
    id: string;
    siteId: string;
    site?: SiteSummary;
    planDate: string;
    status: SitePlanStatus;
    shiftStatus: SitePlanShiftStatus;
    briefing: string;
    safetyNotes: string;
    briefings: SitePlanBriefingItem[];
    updatedById?: string | null;
    updatedBy?: AuthUser | null;
    zones: SitePlanZoneItem[];
    createdAt: string;
    updatedAt: string;
}
export interface SitePlanBriefingInput {
    id?: string;
    category: SitePlanBriefingCategory;
    title: string;
    note: string;
    sortOrder: number;
}
export interface SitePlanAssignmentInput {
    userId: string;
    sortOrder: number;
}
export interface SitePlanMaterialNeedInput {
    id?: string;
    materialId?: string | null;
    label: string;
    quantity: number;
    unit: string;
    status: SitePlanMaterialNeedStatus;
    notes: string;
    sortOrder: number;
}
export interface SitePlanZoneInput {
    id?: string;
    name: string;
    shiftLabel: string;
    focus: string;
    supportCategory: string;
    priority: SitePlanPriority;
    sortOrder: number;
    leadUserId?: string | null;
    supportMaterialId?: string | null;
    supportTruckId?: string | null;
    activeTransportId?: string | null;
    materialNeeds: SitePlanMaterialNeedInput[];
    assignments: SitePlanAssignmentInput[];
}
export interface UpsertSitePlanPayload {
    planDate: string;
    status: SitePlanStatus;
    shiftStatus: SitePlanShiftStatus;
    briefing: string;
    safetyNotes: string;
    briefings: SitePlanBriefingInput[];
    zones: SitePlanZoneInput[];
}
export interface MaterialItem {
    id: string;
    title: string;
    description: string;
    category: string;
    quantity: number;
    condition: MaterialCondition;
    imageUrl: string;
    location: LocationPoint;
    siteId: string;
    site?: SiteSummary;
    status: MaterialStatus;
    distanceKm: number;
    suggestedCategory?: string | null;
    reservedById?: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface MaterialFilters {
    text?: string;
    category?: string;
    status?: MaterialStatus;
    distance?: number;
    lat?: number;
    lng?: number;
}
export interface TruckItem {
    id: string;
    name: string;
    licensePlate: string;
    siteId: string;
    available: boolean;
    site?: SiteSummary;
}
export interface DriverAccessInfo {
    loginPlate: string;
    accessCode?: string | null;
    driverName?: string | null;
    driverCompany?: string | null;
    loadingQrToken?: string | null;
    unloadingQrToken?: string | null;
    loadingScannedAt?: string | null;
    unloadingScannedAt?: string | null;
    loadingSignedAt?: string | null;
    loadingSignedBy?: string | null;
    loadingSignaturePath?: string | null;
    deliveryNotePath?: string | null;
}
export interface TransportRequestItem {
    id: string;
    materialId: string;
    fromSiteId: string;
    toSiteId: string;
    truckId: string;
    status: TransportStatus;
    createdAt: string;
    updatedAt: string;
    material?: MaterialItem;
    truck?: TruckItem;
    fromSite?: SiteSummary;
    toSite?: SiteSummary;
    driverAccess?: DriverAccessInfo | null;
}
export interface MaterialCreatedNotificationPayload {
    siteId: string;
    status: MaterialStatus;
    materialTitle: string;
    actorName: string;
}
export interface MaterialReservedNotificationPayload {
    reservedById: string;
    siteId: string;
    materialTitle: string;
    actorName: string;
}
export interface MaterialStatusChangedNotificationPayload {
    previousStatus: MaterialStatus;
    currentStatus: MaterialStatus;
    updatedBy: string;
    materialTitle: string;
    actorName: string;
}
export interface TransportCreatedNotificationPayload {
    truckId: string;
    fromSiteId: string;
    toSiteId: string;
    materialTitle: string;
    actorName: string;
    transportId: string;
}
export interface TransportStatusChangedNotificationPayload {
    previousStatus: TransportStatus;
    currentStatus: TransportStatus;
    updatedBy: string;
    actorName: string;
    transportId: string;
}
export interface NotificationPayloadByType {
    'material.created': MaterialCreatedNotificationPayload;
    'material.reserved': MaterialReservedNotificationPayload;
    'material.status.changed': MaterialStatusChangedNotificationPayload;
    'transport.created': TransportCreatedNotificationPayload;
    'transport.status.changed': TransportStatusChangedNotificationPayload;
}
export type NotificationPayload = NotificationPayloadByType[NotificationEventType];
export interface NotificationEventItem {
    id: string;
    type: NotificationEventType | string;
    entityType: NotificationEntityType | string;
    entityId: string;
    message: string;
    payload?: NotificationPayload | Record<string, unknown> | null;
    createdAt: string;
}
export type DomainEventPayload<T extends NotificationEventType = NotificationEventType> = {
    type: T;
    entityType: NotificationEntityType;
    entityId: string;
    message: string;
    payload: NotificationPayloadByType[T];
};
export interface LoginPayload {
    email: string;
    password: string;
}
export interface DriverLoginPayload {
    licensePlate: string;
    accessCode: string;
}
export interface LoginResponse {
    accessToken: string;
    user: AuthUser;
}
export interface DriverLoginResponse {
    accessToken: string;
    transport: TransportRequestItem;
}
export interface DriverLoadingScanPayload {
    qrToken: string;
    signedBy: string;
    signatureSvg: string;
}
export interface DriverUnloadingScanPayload {
    qrToken: string;
}
