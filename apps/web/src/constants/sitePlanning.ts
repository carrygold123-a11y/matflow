import type {
  AuthUser,
  MaterialItem,
  TransportRequestItem,
  TruckItem,
  UserRole,
} from '@matflow/shared-types';

export interface SiteZoneTemplate {
  id: string;
  name: string;
  shift: string;
  focus: string;
  supportCategory: string;
  priority: 'critical' | 'focus' | 'ready';
}

export interface SiteZonePlan extends SiteZoneTemplate {
  lead?: AuthUser;
  crew: AuthUser[];
  flaggedMaterial?: MaterialItem;
  supportTruck?: TruckItem;
  activeTransport?: TransportRequestItem;
}

const roleOrder: Record<UserRole, number> = {
  admin: 0,
  bauleiter: 1,
  manager: 2,
  polier: 3,
  vorarbeiter: 4,
  disponent: 5,
  lagerist: 6,
  fahrer: 7,
  worker: 8,
  subcontractor: 9,
};

const leadRoles = new Set<UserRole>(['bauleiter', 'manager', 'polier', 'vorarbeiter']);
const fieldRoles = new Set<UserRole>(['worker', 'subcontractor', 'vorarbeiter', 'polier', 'fahrer']);

const defaultZones: SiteZoneTemplate[] = [
  {
    id: 'zone-raw-works',
    name: 'Rohbau Nord',
    shift: '06:00-10:00',
    focus: 'Betonage und Bewehrung absichern',
    supportCategory: 'Concrete',
    priority: 'critical',
  },
  {
    id: 'zone-shell',
    name: 'Schalung Sud',
    shift: '06:15-10:30',
    focus: 'Schalung nachziehen und Materialfluss freihalten',
    supportCategory: 'Wood',
    priority: 'focus',
  },
  {
    id: 'zone-logistics',
    name: 'Logistiklinie',
    shift: '05:45-09:15',
    focus: 'Entladung, Reserve und Nachschub koordinieren',
    supportCategory: 'Tools',
    priority: 'ready',
  },
];

const siteZonesById: Record<string, SiteZoneTemplate[]> = {
  'site-berlin-01': [
    {
      id: 'berlin-core',
      name: 'Kernhaus A',
      shift: '06:00-10:15',
      focus: 'Betonage und Schalungsdruck kontrollieren',
      supportCategory: 'Concrete',
      priority: 'critical',
    },
    {
      id: 'berlin-services',
      name: 'Techniktrasse',
      shift: '06:20-10:40',
      focus: 'Elektrotrassen und Durchbruche vorbereiten',
      supportCategory: 'Electrical',
      priority: 'focus',
    },
    {
      id: 'berlin-yard',
      name: 'Yard und Anlieferung',
      shift: '05:45-09:00',
      focus: 'Annahme, Reserve und Umlagerung sichern',
      supportCategory: 'Tools',
      priority: 'ready',
    },
  ],
  'site-hamburg-01': [
    {
      id: 'hamburg-dock',
      name: 'Hafenkante',
      shift: '06:00-10:00',
      focus: 'Korrosionsschutz und Stahlpakete takten',
      supportCategory: 'Steel',
      priority: 'critical',
    },
    {
      id: 'hamburg-fitout',
      name: 'Innenausbau West',
      shift: '06:30-10:45',
      focus: 'Trockenbau und Leitungswege vorbereiten',
      supportCategory: 'Drywall',
      priority: 'focus',
    },
    {
      id: 'hamburg-yard',
      name: 'Umschlagzone',
      shift: '05:50-09:20',
      focus: 'Materialpuffer und Staplerwege entlasten',
      supportCategory: 'Insulation',
      priority: 'ready',
    },
  ],
  'site-munich-01': [
    {
      id: 'munich-core',
      name: 'Rohbau Ost',
      shift: '06:00-10:20',
      focus: 'Deckenfeld vorbereiten und Sicherungen setzen',
      supportCategory: 'Concrete',
      priority: 'critical',
    },
    {
      id: 'munich-mep',
      name: 'MEP-Zone',
      shift: '06:15-10:30',
      focus: 'Sanitar- und Elektroachsen freigeben',
      supportCategory: 'Plumbing',
      priority: 'focus',
    },
    {
      id: 'munich-yard',
      name: 'Nachschubdeck',
      shift: '05:40-09:10',
      focus: 'Werkzeug und Materialreserven fur die zweite Welle',
      supportCategory: 'Tools',
      priority: 'ready',
    },
  ],
  'site-cologne-01': [
    {
      id: 'cologne-structure',
      name: 'Rheinflugel',
      shift: '06:05-10:15',
      focus: 'Stahlzug und Lastabtrag koordinieren',
      supportCategory: 'Steel',
      priority: 'critical',
    },
    {
      id: 'cologne-fitout',
      name: 'Ausbaukern',
      shift: '06:20-10:50',
      focus: 'Fliesen, Spachtel und Trockenbau takten',
      supportCategory: 'Tiles',
      priority: 'focus',
    },
    {
      id: 'cologne-yard',
      name: 'Kranlinie',
      shift: '05:45-09:05',
      focus: 'Kranfenster und Materialubergabe absichern',
      supportCategory: 'Wood',
      priority: 'ready',
    },
  ],
  'site-frankfurt-01': [
    {
      id: 'frankfurt-core',
      name: 'Tower Nord',
      shift: '06:00-10:25',
      focus: 'Vertikaler Ausbau und Fassadenlogik koppeln',
      supportCategory: 'Insulation',
      priority: 'critical',
    },
    {
      id: 'frankfurt-services',
      name: 'Technikschacht',
      shift: '06:15-10:35',
      focus: 'Kabelwege, Verteilungen und Boxen bereitstellen',
      supportCategory: 'Electrical',
      priority: 'focus',
    },
    {
      id: 'frankfurt-yard',
      name: 'Anlieferhof',
      shift: '05:35-09:00',
      focus: 'Lagerubergabe und Fahrerkoordination synchronisieren',
      supportCategory: 'Paint',
      priority: 'ready',
    },
  ],
};

function sortByRoleAndName(left: AuthUser, right: AuthUser) {
  return roleOrder[left.role] - roleOrder[right.role] || left.name.localeCompare(right.name);
}

export function getSiteCrew(users: AuthUser[], siteId: string) {
  return users.filter((user) => user.siteId === siteId).sort(sortByRoleAndName);
}

export function getPrimaryLead(users: AuthUser[], siteId: string) {
  return getSiteCrew(users, siteId).find((user) => leadRoles.has(user.role));
}

export function getSiteZoneTemplates(siteId: string) {
  return siteZonesById[siteId] ?? defaultZones;
}

export function buildSiteZonePlan({
  siteId,
  users,
  materials,
  trucks,
  transports,
}: {
  siteId: string;
  users: AuthUser[];
  materials: MaterialItem[];
  trucks: TruckItem[];
  transports: TransportRequestItem[];
}): SiteZonePlan[] {
  const siteCrew = getSiteCrew(users, siteId);
  const siteLeads = siteCrew.filter((user) => leadRoles.has(user.role));
  const fieldCrew = siteCrew.filter((user) => fieldRoles.has(user.role));
  const siteMaterials = materials.filter((material) => material.siteId === siteId);
  const siteTrucks = trucks.filter((truck) => truck.siteId === siteId);
  const siteTransports = transports.filter(
    (transport) => transport.status !== 'delivered' && (transport.fromSiteId === siteId || transport.toSiteId === siteId),
  );

  return getSiteZoneTemplates(siteId).map((template, index) => {
    const crewSlice = fieldCrew.slice(index * 2, index * 2 + 2);

    return {
      ...template,
      lead: siteLeads.length ? siteLeads[index % siteLeads.length] : undefined,
      crew: crewSlice.length ? crewSlice : fieldCrew.slice(0, Math.min(2, fieldCrew.length)),
      flaggedMaterial: siteMaterials.find(
        (material) => material.category === template.supportCategory && material.status !== 'picked_up',
      ) ?? (siteMaterials.length ? siteMaterials[index % siteMaterials.length] : undefined),
      supportTruck: siteTrucks.length ? siteTrucks[index % siteTrucks.length] : undefined,
      activeTransport: siteTransports.length ? siteTransports[index % siteTransports.length] : undefined,
    };
  });
}

export function countMaterialAlerts(siteId: string, materials: MaterialItem[]) {
  return materials.filter((material) => material.siteId === siteId && material.status !== 'available').length;
}

export function countActiveTransports(siteId: string, transports: TransportRequestItem[]) {
  return transports.filter(
    (transport) => transport.status !== 'delivered' && (transport.fromSiteId === siteId || transport.toSiteId === siteId),
  ).length;
}

export function countReadyTrucks(siteId: string, trucks: TruckItem[]) {
  return trucks.filter((truck) => truck.siteId === siteId && truck.available).length;
}