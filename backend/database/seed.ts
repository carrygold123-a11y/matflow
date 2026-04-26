import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sites = [
  { id: 'site-berlin-01', name: 'Berlin Mitte', latitude: 52.5208, longitude: 13.4095 },
  { id: 'site-hamburg-01', name: 'Hamburg Hafen', latitude: 53.5438, longitude: 9.9666 },
  { id: 'site-munich-01', name: 'Munich Nord', latitude: 48.1767, longitude: 11.6089 },
  { id: 'site-cologne-01', name: 'Cologne Rhein', latitude: 50.9481, longitude: 6.9732 },
  { id: 'site-frankfurt-01', name: 'Frankfurt Ost', latitude: 50.1129, longitude: 8.7372 },
] as const;

const users = [
  { id: 'user-admin-01', name: 'Mara Schneider', email: 'mara@matflow.local', role: 'admin', siteId: 'site-berlin-01' },
  { id: 'user-bauleiter-01', name: 'Jonas Weber', email: 'jonas@matflow.local', role: 'bauleiter', siteId: 'site-berlin-01' },
  { id: 'user-manager-01', name: 'Luca Neumann', email: 'luca@matflow.local', role: 'manager', siteId: 'site-berlin-01' },
  { id: 'user-polier-01', name: 'Ali Demir', email: 'ali@matflow.local', role: 'polier', siteId: 'site-berlin-01' },
  { id: 'user-vorarbeiter-01', name: 'Lea Brandt', email: 'lea.brandt@matflow.local', role: 'vorarbeiter', siteId: 'site-berlin-01' },
  { id: 'user-worker-01', name: 'Felix Koch', email: 'felix@matflow.local', role: 'worker', siteId: 'site-berlin-01' },
  { id: 'user-fahrer-01', name: 'Pavel Nowak', email: 'pavel@matflow.local', role: 'fahrer', siteId: 'site-berlin-01' },
  { id: 'user-bauleiter-02', name: 'Sina Hoffmann', email: 'sina@matflow.local', role: 'bauleiter', siteId: 'site-hamburg-01' },
  { id: 'user-disponent-01', name: 'Bora Celik', email: 'bora@matflow.local', role: 'disponent', siteId: 'site-hamburg-01' },
  { id: 'user-worker-02', name: 'Lea Hansen', email: 'lea@matflow.local', role: 'worker', siteId: 'site-hamburg-01' },
  { id: 'user-lagerist-01', name: 'Nadine Kruse', email: 'nadine@matflow.local', role: 'lagerist', siteId: 'site-hamburg-01' },
  { id: 'user-polier-02', name: 'Nina Bauer', email: 'nina@matflow.local', role: 'polier', siteId: 'site-munich-01' },
  { id: 'user-worker-03', name: 'Mila Novak', email: 'mila@matflow.local', role: 'worker', siteId: 'site-munich-01' },
  { id: 'user-subcontractor-01', name: 'Ionut Marin', email: 'ionut@matflow.local', role: 'subcontractor', siteId: 'site-munich-01' },
  { id: 'user-fahrer-02', name: 'Yusuf Kara', email: 'yusuf@matflow.local', role: 'fahrer', siteId: 'site-munich-01' },
  { id: 'user-vorarbeiter-02', name: 'Can Aydin', email: 'can@matflow.local', role: 'vorarbeiter', siteId: 'site-cologne-01' },
  { id: 'user-worker-04', name: 'Lara Berg', email: 'lara@matflow.local', role: 'worker', siteId: 'site-cologne-01' },
  { id: 'user-subcontractor-02', name: 'Matei Pop', email: 'matei@matflow.local', role: 'subcontractor', siteId: 'site-cologne-01' },
  { id: 'user-bauleiter-03', name: 'Emma Ludwig', email: 'emma@matflow.local', role: 'bauleiter', siteId: 'site-frankfurt-01' },
  { id: 'user-worker-05', name: 'Paul Berger', email: 'paul@matflow.local', role: 'worker', siteId: 'site-frankfurt-01' },
  { id: 'user-lagerist-02', name: 'Irina Costea', email: 'irina@matflow.local', role: 'lagerist', siteId: 'site-frankfurt-01' },
  { id: 'user-disponent-02', name: 'Sofia Mendes', email: 'sofia@matflow.local', role: 'disponent', siteId: 'site-frankfurt-01' },
] as const;

const trucks = [
  { id: 'truck-01', name: 'Truck Atlas', licensePlate: 'B-AT-1041', siteId: 'site-berlin-01', available: true },
  { id: 'truck-02', name: 'Truck Kranich', licensePlate: 'B-AT-1042', siteId: 'site-berlin-01', available: true },
  { id: 'truck-03', name: 'Truck Elbe', licensePlate: 'HH-EL-2203', siteId: 'site-hamburg-01', available: false },
  { id: 'truck-04', name: 'Truck Alster', licensePlate: 'HH-AL-2204', siteId: 'site-hamburg-01', available: true },
  { id: 'truck-05', name: 'Truck Isar', licensePlate: 'M-IS-3305', siteId: 'site-munich-01', available: true },
  { id: 'truck-06', name: 'Truck Bavaria', licensePlate: 'M-BY-3306', siteId: 'site-munich-01', available: true },
  { id: 'truck-07', name: 'Truck Rhein', licensePlate: 'K-RH-4407', siteId: 'site-cologne-01', available: true },
  { id: 'truck-08', name: 'Truck Dom', licensePlate: 'K-DM-4408', siteId: 'site-cologne-01', available: true },
  { id: 'truck-09', name: 'Truck Main', licensePlate: 'F-MN-5509', siteId: 'site-frankfurt-01', available: false },
  { id: 'truck-10', name: 'Truck Skyline', licensePlate: 'F-SK-5510', siteId: 'site-frankfurt-01', available: true },
] as const;

const driverAccessCodes = {
  'transport-01': '741852',
  'transport-02': '963258',
} as const;

const materials = [
  ['material-01', 'Concrete bags', '18 sealed concrete bags ready for pickup', 'Concrete', 18, 'new', 'site-berlin-01', 52.5213, 13.4111],
  ['material-02', 'Steel beams', '8 galvanized steel beams with minor scratches', 'Steel', 8, 'good', 'site-berlin-01', 52.5196, 13.4057],
  ['material-03', 'Plywood panels', '12 moisture resistant plywood sheets', 'Wood', 12, 'good', 'site-berlin-01', 52.5224, 13.4148],
  ['material-04', 'Insulation rolls', '10 unopened mineral wool rolls', 'Insulation', 10, 'new', 'site-hamburg-01', 53.5446, 9.9693],
  ['material-05', 'Wall tiles', '24 square meters of white wall tiles', 'Tiles', 24, 'new', 'site-hamburg-01', 53.5422, 9.9639],
  ['material-06', 'Copper cable', '3 spools of outdoor grade copper cable', 'Electrical', 3, 'new', 'site-hamburg-01', 53.5454, 9.9611],
  ['material-07', 'PVC pipes', '20 sections of 110mm PVC pipe', 'Plumbing', 20, 'good', 'site-munich-01', 48.1754, 11.6124],
  ['material-08', 'Gypsum boards', '15 drywall boards with edge protection', 'Drywall', 15, 'good', 'site-munich-01', 48.1786, 11.6068],
  ['material-09', 'Facade paint', '9 buckets of weatherproof facade paint', 'Paint', 9, 'new', 'site-munich-01', 48.1792, 11.6117],
  ['material-10', 'Timber studs', '35 kiln dried timber studs', 'Wood', 35, 'used', 'site-cologne-01', 50.9499, 6.9718],
  ['material-11', 'Floor tiles', '18 square meters of stone floor tiles', 'Tiles', 18, 'good', 'site-cologne-01', 50.9465, 6.9754],
  ['material-12', 'Rebar bundles', '6 rebar bundles ready for loading', 'Steel', 6, 'good', 'site-cologne-01', 50.9477, 6.9771],
  ['material-13', 'Plaster bags', '22 plaster bags on pallet', 'Drywall', 22, 'new', 'site-frankfurt-01', 50.1138, 8.7413],
  ['material-14', 'Roof insulation', '14 rigid roof insulation boards', 'Insulation', 14, 'new', 'site-frankfurt-01', 50.1111, 8.7339],
  ['material-15', 'Utility boxes', '16 weatherproof utility boxes', 'Electrical', 16, 'good', 'site-frankfurt-01', 50.1147, 8.7362],
  ['material-16', 'Tool crate', '1 crate with verified hand tools', 'Tools', 1, 'good', 'site-berlin-01', 52.5201, 13.4132],
  ['material-17', 'Concrete blocks', '40 unused lightweight blocks', 'Concrete', 40, 'used', 'site-hamburg-01', 53.5462, 9.9652],
  ['material-18', 'Pressure valves', '7 boxed pressure valves', 'Plumbing', 7, 'new', 'site-munich-01', 48.1779, 11.6141],
  ['material-19', 'Primer buckets', '5 primer buckets for interior walls', 'Paint', 5, 'good', 'site-cologne-01', 50.9508, 6.9697],
  ['material-20', 'Cable trays', '11 metal cable trays', 'Electrical', 11, 'used', 'site-frankfurt-01', 50.1153, 8.7391],
] as const;

const sitePlans = [
  {
    id: 'plan-berlin-01',
    siteId: 'site-berlin-01',
    status: 'published',
    shiftStatus: 'active',
    briefing: 'Kernhaus A betonieren, Techniktrasse freihalten und Materialhof fur den Mittagsnachschub vorbereiten.',
    safetyNotes: 'Kranfenster 07:30 bis 09:00 freihalten. PSA und Sperrzone an der Betonpumpe kontrollieren.',
    updatedById: 'user-polier-01',
    briefings: [
      ['operations', 'Morgentakt', 'Betonage und Techniktrasse vor 07:00 abstimmen.'],
      ['safety', 'Sicherheitsfreigabe', 'Pumpe, Sperrzone und Rettungsweg kontrollieren.'],
      ['logistics', 'Nachschub', 'Materialhof fur die Mittagswelle vorbereiten.'],
    ],
    zones: [
      {
        id: 'plan-zone-berlin-core',
        name: 'Kernhaus A',
        shiftLabel: '06:00-10:15',
        focus: 'Betonage und Schalungsdruck kontrollieren',
        supportCategory: 'Concrete',
        priority: 'critical',
        leadUserId: 'user-polier-01',
        supportMaterialId: 'material-01',
        supportTruckId: 'truck-01',
        assignments: ['user-vorarbeiter-01', 'user-worker-01'],
      },
      {
        id: 'plan-zone-berlin-services',
        name: 'Techniktrasse',
        shiftLabel: '06:20-10:40',
        focus: 'Durchbruche und Leitungswege vorbereiten',
        supportCategory: 'Electrical',
        priority: 'focus',
        leadUserId: 'user-vorarbeiter-01',
        supportMaterialId: 'material-16',
        activeTransportId: 'transport-01',
        assignments: ['user-worker-01'],
      },
      {
        id: 'plan-zone-berlin-yard',
        name: 'Materialhof',
        shiftLabel: '05:45-09:00',
        focus: 'Reserve, Entladung und Werkzeugumlauf sichern',
        supportCategory: 'Tools',
        priority: 'ready',
        leadUserId: 'user-fahrer-01',
        supportMaterialId: 'material-03',
        supportTruckId: 'truck-02',
        assignments: ['user-fahrer-01'],
      },
    ],
  },
  {
    id: 'plan-hamburg-01',
    siteId: 'site-hamburg-01',
    status: 'published',
    shiftStatus: 'ready',
    briefing: 'Hafenkante takten, Innenausbau West vorbereiten und Umschlagzone entlasten.',
    safetyNotes: 'Stahlbundlinge nur mit freier Laufzone anschlagen. Feuchte Fahrwege markieren.',
    updatedById: 'user-bauleiter-02',
    briefings: [
      ['operations', 'Taktung', 'Hafenkante und Innenausbau West parallel anfahren.'],
      ['safety', 'Laufwege', 'Feuchte Fahrwege markieren und Anschlagpunkte pruefen.'],
      ['logistics', 'Umschlagzone', 'Stapler- und Lieferfenster entzerren.'],
    ],
    zones: [
      {
        id: 'plan-zone-hamburg-dock',
        name: 'Hafenkante',
        shiftLabel: '06:00-10:00',
        focus: 'Stahlpakete und Korrosionsschutz koordinieren',
        supportCategory: 'Steel',
        priority: 'critical',
        leadUserId: 'user-bauleiter-02',
        supportMaterialId: 'material-17',
        supportTruckId: 'truck-04',
        assignments: ['user-worker-02'],
      },
      {
        id: 'plan-zone-hamburg-fitout',
        name: 'Innenausbau West',
        shiftLabel: '06:30-10:45',
        focus: 'Trockenbau und Leitungswege vorbereiten',
        supportCategory: 'Insulation',
        priority: 'focus',
        leadUserId: 'user-disponent-01',
        supportMaterialId: 'material-04',
        assignments: ['user-worker-02'],
      },
      {
        id: 'plan-zone-hamburg-yard',
        name: 'Umschlagzone',
        shiftLabel: '05:50-09:20',
        focus: 'Materialpuffer und Staplerwege absichern',
        supportCategory: 'Tiles',
        priority: 'ready',
        leadUserId: 'user-lagerist-01',
        supportMaterialId: 'material-05',
        supportTruckId: 'truck-03',
        assignments: ['user-lagerist-01'],
      },
    ],
  },
  {
    id: 'plan-munich-01',
    siteId: 'site-munich-01',
    status: 'draft',
    shiftStatus: 'not_ready',
    briefing: 'MEP-Achsen vorbereiten, Druckprufung absichern und Nachschubdeck fur die zweite Welle befullen.',
    safetyNotes: 'Rohrwege kennzeichnen und nur freigegebene Druckprufgerate einsetzen.',
    updatedById: 'user-polier-02',
    briefings: [
      ['operations', 'MEP-Fokus', 'Rohr- und Elektroachsen bis 08:00 freigeben.'],
      ['safety', 'Druckprufung', 'Nur freigegebene Gerate und markierte Rohrwege nutzen.'],
      ['logistics', 'Reserve', 'Nachschubdeck fur zweite Welle vorfullen.'],
    ],
    zones: [
      {
        id: 'plan-zone-munich-core',
        name: 'Rohbau Ost',
        shiftLabel: '06:00-10:20',
        focus: 'Deckenfeld vorbereiten und Sicherungen setzen',
        supportCategory: 'Plumbing',
        priority: 'critical',
        leadUserId: 'user-polier-02',
        supportMaterialId: 'material-07',
        supportTruckId: 'truck-05',
        assignments: ['user-worker-03', 'user-subcontractor-01'],
      },
      {
        id: 'plan-zone-munich-mep',
        name: 'MEP-Zone',
        shiftLabel: '06:15-10:30',
        focus: 'Sanitar- und Elektroachsen freigeben',
        supportCategory: 'Plumbing',
        priority: 'focus',
        leadUserId: 'user-worker-03',
        supportMaterialId: 'material-18',
        assignments: ['user-worker-03'],
      },
      {
        id: 'plan-zone-munich-yard',
        name: 'Nachschubdeck',
        shiftLabel: '05:40-09:10',
        focus: 'Werkzeug und Materialreserve fur die zweite Welle sichern',
        supportCategory: 'Paint',
        priority: 'ready',
        leadUserId: 'user-fahrer-02',
        supportMaterialId: 'material-09',
        supportTruckId: 'truck-06',
        assignments: ['user-fahrer-02'],
      },
    ],
  },
  {
    id: 'plan-cologne-01',
    siteId: 'site-cologne-01',
    status: 'published',
    shiftStatus: 'active',
    briefing: 'Rheinflugel absichern, Ausbaukern vorbereiten und Kranlinie fur die Vormittagsfenster frei halten.',
    safetyNotes: 'Lastpfade markieren und Kranbereich nur mit Freigabe betreten.',
    updatedById: 'user-vorarbeiter-02',
    briefings: [
      ['operations', 'Kranfenster', 'Rheinflugel und Ausbaukern im gleichen Takt fahren.'],
      ['safety', 'Lastpfade', 'Kranbereich und Laufwege vor Freigabe absperren.'],
      ['logistics', 'Uebergabe', 'Material ueber die Kranlinie ohne Stau uebergeben.'],
    ],
    zones: [
      {
        id: 'plan-zone-cologne-structure',
        name: 'Rheinflugel',
        shiftLabel: '06:05-10:15',
        focus: 'Stahlzug und Lastabtrag koordinieren',
        supportCategory: 'Steel',
        priority: 'critical',
        leadUserId: 'user-vorarbeiter-02',
        supportMaterialId: 'material-12',
        activeTransportId: 'transport-02',
        assignments: ['user-worker-04', 'user-subcontractor-02'],
      },
      {
        id: 'plan-zone-cologne-fitout',
        name: 'Ausbaukern',
        shiftLabel: '06:20-10:50',
        focus: 'Fliesen und Spachtel fur den Ausbau vorbereiten',
        supportCategory: 'Tiles',
        priority: 'focus',
        leadUserId: 'user-worker-04',
        supportMaterialId: 'material-11',
        assignments: ['user-worker-04'],
      },
      {
        id: 'plan-zone-cologne-yard',
        name: 'Kranlinie',
        shiftLabel: '05:45-09:05',
        focus: 'Kranfenster und Materialubergabe absichern',
        supportCategory: 'Wood',
        priority: 'ready',
        leadUserId: 'user-subcontractor-02',
        supportMaterialId: 'material-10',
        supportTruckId: 'truck-07',
        assignments: ['user-subcontractor-02'],
      },
    ],
  },
  {
    id: 'plan-frankfurt-01',
    siteId: 'site-frankfurt-01',
    status: 'draft',
    shiftStatus: 'blocked',
    briefing: 'Tower Nord stabilisieren, Technikschacht vorbereiten und Anlieferhof auf Nachschub am Mittag einstellen.',
    safetyNotes: 'Fassadenkante doppelt sichern und nur markierte Materialwege nutzen.',
    updatedById: 'user-bauleiter-03',
    briefings: [
      ['operations', 'Tower Nord', 'Vertikalen Ausbau und Technikschacht koppeln.'],
      ['safety', 'Fassadenkante', 'Doppelte Sicherung und Freigabe vor Schichtstart.'],
      ['logistics', 'Anlieferhof', 'Mittagsnachschub und Fahrerkoordination vorplanen.'],
    ],
    zones: [
      {
        id: 'plan-zone-frankfurt-core',
        name: 'Tower Nord',
        shiftLabel: '06:00-10:25',
        focus: 'Vertikalen Ausbau und Fassadenlogik koppeln',
        supportCategory: 'Insulation',
        priority: 'critical',
        leadUserId: 'user-bauleiter-03',
        supportMaterialId: 'material-14',
        supportTruckId: 'truck-10',
        assignments: ['user-worker-05'],
      },
      {
        id: 'plan-zone-frankfurt-services',
        name: 'Technikschacht',
        shiftLabel: '06:15-10:35',
        focus: 'Kabelwege und Verteilungen bereitstellen',
        supportCategory: 'Electrical',
        priority: 'focus',
        leadUserId: 'user-disponent-02',
        supportMaterialId: 'material-15',
        assignments: ['user-worker-05'],
      },
      {
        id: 'plan-zone-frankfurt-yard',
        name: 'Anlieferhof',
        shiftLabel: '05:35-09:00',
        focus: 'Lagerubergabe und Fahrerkoordination synchronisieren',
        supportCategory: 'Drywall',
        priority: 'ready',
        leadUserId: 'user-lagerist-02',
        supportMaterialId: 'material-13',
        supportTruckId: 'truck-09',
        assignments: ['user-lagerist-02'],
      },
    ],
  },
] as const;

async function main(): Promise<void> {
  const planDate = new Date();
  planDate.setUTCHours(0, 0, 0, 0);

  await prisma.sitePlanAssignment.deleteMany();
  await prisma.sitePlanZone.deleteMany();
  await prisma.sitePlan.deleteMany();
  await prisma.notificationEvent.deleteMany();
  await prisma.transportRequest.deleteMany();
  await prisma.material.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();

  await prisma.site.createMany({ data: sites.map((site) => ({ ...site })) });

  const passwordHash = await hash('matflow123', 10);

  await prisma.user.createMany({
    data: users.map((user) => ({
      ...user,
      passwordHash,
    })),
  });

  await prisma.truck.createMany({ data: trucks.map((truck) => ({ ...truck })) });

  for (const [id, title, description, category, quantity, condition, siteId, latitude, longitude] of materials) {
    await prisma.material.create({
      data: {
        id,
        title,
        description,
        category,
        quantity,
        condition,
        imageUrl: `https://placehold.co/1200x800/png?text=${encodeURIComponent(title)}`,
        latitude,
        longitude,
        siteId,
        status: 'available',
        suggestedCategory: category,
        createdById: users.find((user) => user.siteId === siteId)?.id,
      },
    });
  }

  await prisma.transportRequest.createMany({
    data: [
      {
        id: 'transport-01',
        materialId: 'material-02',
        fromSiteId: 'site-berlin-01',
        toSiteId: 'site-frankfurt-01',
        truckId: 'truck-10',
        status: 'planned',
        driverName: 'Pavel Nowak',
        driverCompany: 'Atlas Tiefbau Logistik',
        driverAccessCodeHash: await hash(driverAccessCodes['transport-01'], 10),
        loadingQrToken: randomUUID(),
        unloadingQrToken: randomUUID(),
      },
      {
        id: 'transport-02',
        materialId: 'material-11',
        fromSiteId: 'site-cologne-01',
        toSiteId: 'site-berlin-01',
        truckId: 'truck-07',
        status: 'in_transit',
        driverName: 'Matei Pop',
        driverCompany: 'Rhein Cargo Partner',
        driverAccessCodeHash: await hash(driverAccessCodes['transport-02'], 10),
        loadingQrToken: randomUUID(),
        unloadingQrToken: randomUUID(),
        loadedAt: new Date(planDate.getTime() + 1000 * 60 * 30),
        loadingSignedBy: 'Matei Pop',
        loadingSignedAt: new Date(planDate.getTime() + 1000 * 60 * 35),
        loadingSignaturePath: '/storage/sites/site-cologne-01/driver-signatures/demo-signature.svg',
      },
    ],
  });

  for (const plan of sitePlans) {
    await prisma.sitePlan.create({
      data: {
        id: plan.id,
        siteId: plan.siteId,
        planDate: new Date(planDate),
        status: plan.status,
        shiftStatus: plan.shiftStatus,
        briefing: plan.briefing,
        safetyNotes: plan.safetyNotes,
        updatedById: plan.updatedById,
        briefings: {
          create: plan.briefings.map(([category, title, note], briefingIndex) => ({
            category,
            title,
            note,
            sortOrder: briefingIndex,
          })),
        },
        zones: {
          create: plan.zones.map((zone, zoneIndex) => ({
            id: zone.id,
            name: zone.name,
            shiftLabel: zone.shiftLabel,
            focus: zone.focus,
            supportCategory: zone.supportCategory,
            priority: zone.priority,
            sortOrder: zoneIndex,
            leadUserId: zone.leadUserId,
            supportMaterialId: zone.supportMaterialId,
            supportTruckId: 'supportTruckId' in zone ? zone.supportTruckId : undefined,
            activeTransportId: 'activeTransportId' in zone ? zone.activeTransportId : undefined,
            materialNeeds: {
              create: [
                {
                  materialId: zone.supportMaterialId,
                  label: `${zone.supportCategory} Bedarf`,
                  quantity: 1,
                  unit: 'lot',
                  status: 'ready',
                  notes: zone.focus,
                  sortOrder: 0,
                },
              ],
            },
            assignments: {
              create: zone.assignments.map((userId, assignmentIndex) => ({
                userId,
                sortOrder: assignmentIndex,
              })),
            },
          })),
        },
      },
    });
  }

  await prisma.notificationEvent.createMany({
    data: [
      {
        id: 'event-01',
        type: 'material.created',
        entityType: 'material',
        entityId: 'material-01',
        message: 'Concrete bags were added by Mara Schneider.',
        payload: {
          siteId: 'site-berlin-01',
          status: 'available',
          materialTitle: 'Concrete bags',
          actorName: 'Mara Schneider',
        },
      },
      {
        id: 'event-02',
        type: 'transport.status.changed',
        entityType: 'transport',
        entityId: 'transport-02',
        message: 'Transport transport-02 is currently in transit.',
        payload: {
          previousStatus: 'planned',
          currentStatus: 'in_transit',
          updatedBy: 'user-disponent-01',
          actorName: 'Bora Celik',
          transportId: 'transport-02',
        },
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
