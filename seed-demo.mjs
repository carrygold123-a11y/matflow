import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = await bcrypt.hash('admin123', 10);
const hashStd = await bcrypt.hash('matflow123', 10);

// ── 1. Sites ─────────────────────────────────────────────────────────────────
const siteA = await prisma.site.upsert({
  where: { id: 'demo-site-a' },
  create: { id: 'demo-site-a', name: 'Baustelle Nord (Lager)', latitude: 48.1582, longitude: 11.5675 },
  update: { name: 'Baustelle Nord (Lager)', latitude: 48.1582, longitude: 11.5675 },
});
const siteB = await prisma.site.upsert({
  where: { id: 'demo-site-b' },
  create: { id: 'demo-site-b', name: 'Baustelle Süd', latitude: 48.1021, longitude: 11.5912 },
  update: { name: 'Baustelle Süd', latitude: 48.1021, longitude: 11.5912 },
});
const siteC = await prisma.site.upsert({
  where: { id: 'demo-site-c' },
  create: { id: 'demo-site-c', name: 'Baustelle West', latitude: 48.1371, longitude: 11.5122 },
  update: { name: 'Baustelle West', latitude: 48.1371, longitude: 11.5122 },
});
console.log('✓ Sites:', siteA.name, '|', siteB.name, '|', siteC.name);

// ── 2. Users ──────────────────────────────────────────────────────────────────
const users = [
  // Führungskräfte
  { id: 'demo-user-admin',    email: 'admin@demo.de',         name: 'Admin Demo',        role: 'admin',         siteId: siteA.id, hash },
  { id: 'demo-user-polier',   email: 'polier@demo.de',        name: 'Karl Polier',       role: 'polier',        siteId: siteA.id, hash: hashStd },
  { id: 'demo-user-bltr',     email: 'bauleiter@demo.de',     name: 'Stefan Bauleiter',  role: 'bauleiter',     siteId: siteB.id, hash: hashStd },
  { id: 'demo-user-disponent',email: 'disponent@demo.de',     name: 'Maria Disponent',   role: 'disponent',     siteId: siteA.id, hash: hashStd },
  // Vorarbeiter
  { id: 'demo-user-vora-1',   email: 'brenner@demo.de',       name: 'Hans Brenner',      role: 'vorarbeiter',   siteId: siteA.id, hash: hashStd },
  { id: 'demo-user-vora-2',   email: 'meier.p@demo.de',       name: 'Petra Meier',       role: 'vorarbeiter',   siteId: siteB.id, hash: hashStd },
  { id: 'demo-user-vora-3',   email: 'kaiser@demo.de',        name: 'Robert Kaiser',     role: 'vorarbeiter',   siteId: siteC.id, hash: hashStd },
  // Fahrer
  { id: 'demo-user-fahrer-1', email: 'fahrer1@demo.de',       name: 'Peter Lange',       role: 'fahrer',        siteId: siteA.id, hash: hashStd },
  { id: 'demo-user-fahrer-2', email: 'fahrer2@demo.de',       name: 'Dieter Kraft',      role: 'fahrer',        siteId: siteB.id, hash: hashStd },
  // Arbeiter – Baustelle Nord
  { id: 'demo-user-worker1',  email: 'worker1@demo.de',       name: 'Max Maurer',        role: 'worker',        siteId: siteA.id, hash: hashStd },
  { id: 'demo-user-worker3',  email: 'worker3@demo.de',       name: 'Ali Yilmaz',        role: 'worker',        siteId: siteA.id, hash: hashStd },
  { id: 'demo-user-worker4',  email: 'worker4@demo.de',       name: 'Josef Huber',       role: 'worker',        siteId: siteA.id, hash: hashStd },
  { id: 'demo-user-worker5',  email: 'worker5@demo.de',       name: 'Mirko Hadzic',      role: 'worker',        siteId: siteA.id, hash: hashStd },
  // Arbeiter – Baustelle Süd
  { id: 'demo-user-worker2',  email: 'worker2@demo.de',       name: 'Tom Schmidt',       role: 'worker',        siteId: siteB.id, hash: hashStd },
  { id: 'demo-user-worker6',  email: 'worker6@demo.de',       name: 'Nico Bauer',        role: 'worker',        siteId: siteB.id, hash: hashStd },
  { id: 'demo-user-worker7',  email: 'worker7@demo.de',       name: 'Luca Rossi',        role: 'worker',        siteId: siteB.id, hash: hashStd },
  // Arbeiter – Baustelle West
  { id: 'demo-user-worker8',  email: 'worker8@demo.de',       name: 'Lukas Müller',      role: 'worker',        siteId: siteC.id, hash: hashStd },
  { id: 'demo-user-worker9',  email: 'worker9@demo.de',       name: 'Anna Richter',      role: 'worker',        siteId: siteC.id, hash: hashStd },
  // Subunternehmer
  { id: 'demo-user-sub-1',    email: 'sub1@demo.de',          name: 'Klaus Wagner',      role: 'subcontractor', siteId: siteB.id, hash: hashStd },
  { id: 'demo-user-sub-2',    email: 'sub2@demo.de',          name: 'Giorgio Bianchi',   role: 'subcontractor', siteId: siteC.id, hash: hashStd },
];
for (const u of users) {
  await prisma.user.upsert({
    where: { email: u.email },
    create: { id: u.id, email: u.email, name: u.name, role: u.role, siteId: u.siteId, passwordHash: u.hash },
    update: { name: u.name, role: u.role, siteId: u.siteId, passwordHash: u.hash },
  });
}
console.log('✓ Users:', users.length, 'Accounts erstellt');

// ── 3. Trucks ─────────────────────────────────────────────────────────────────
const trucks = [
  { id: 'demo-truck-1', name: 'LKW 1 – MAN TGX', licensePlate: 'M-LW 1001', siteId: siteA.id },
  { id: 'demo-truck-2', name: 'LKW 2 – Scania R', licensePlate: 'M-LW 1002', siteId: siteA.id },
  { id: 'demo-truck-3', name: 'LKW 3 – MAN TGS', licensePlate: 'M-LW 1003', siteId: siteB.id },
];
for (const t of trucks) {
  await prisma.truck.upsert({
    where: { licensePlate: t.licensePlate },
    create: { id: t.id, name: t.name, licensePlate: t.licensePlate, siteId: t.siteId },
    update: { name: t.name, siteId: t.siteId },
  });
}
console.log('✓ Trucks:', trucks.map(t => t.licensePlate).join(', '));

// ── 4. Materials ──────────────────────────────────────────────────────────────
const materials = [
  {
    id: 'demo-mat-1', title: 'Betonschutt (gemischt)', description: 'Ca. 20t Betonabbruch aus Kellersohle, gut sortiert',
    category: 'Betonschutt', quantity: 20, condition: 'used', imageUrl: '', status: 'available',
    latitude: siteA.latitude, longitude: siteA.longitude, siteId: siteA.id,
  },
  {
    id: 'demo-mat-2', title: 'Erdaushub (sandig)', description: '15t sauberer Aushub, für Verfüllung geeignet',
    category: 'Erdmaterial', quantity: 15, condition: 'good', imageUrl: '', status: 'available',
    latitude: siteA.latitude, longitude: siteA.longitude, siteId: siteA.id,
  },
  {
    id: 'demo-mat-3', title: 'Backsteinmauerwerk', description: '8t Backsteinabbruch, teilweise mit Mörtelresten',
    category: 'Mauerwerk', quantity: 8, condition: 'used', imageUrl: '', status: 'reserved',
    latitude: siteB.latitude, longitude: siteB.longitude, siteId: siteB.id,
  },
  {
    id: 'demo-mat-4', title: 'Flusssand gewaschen', description: '30t Flusssand, für Beton geeignet',
    category: 'Sand & Kies', quantity: 30, condition: 'good', imageUrl: '', status: 'available',
    latitude: siteB.latitude, longitude: siteB.longitude, siteId: siteB.id,
  },
  {
    id: 'demo-mat-5', title: 'Schotter 0/32', description: '25t Recyclingschotter, gut verdichtbar',
    category: 'Schotter', quantity: 25, condition: 'good', imageUrl: '', status: 'available',
    latitude: siteC.latitude, longitude: siteC.longitude, siteId: siteC.id,
  },
  {
    id: 'demo-mat-6', title: 'Holzpaletten (leer)', description: '50 Stück Europaletten, stapelbar',
    category: 'Sonstiges', quantity: 50, condition: 'good', imageUrl: '', status: 'available',
    latitude: siteA.latitude, longitude: siteA.longitude, siteId: siteA.id,
  },
];
for (const m of materials) {
  await prisma.material.upsert({
    where: { id: m.id },
    create: m,
    update: { title: m.title, description: m.description, quantity: m.quantity, status: m.status },
  });
}
console.log('✓ Materials:', materials.length, 'Stück');

// ── 5. Transport requests ─────────────────────────────────────────────────────
const transports = [
  {
    id: 'demo-tr-1',
    materialId: 'demo-mat-1', fromSiteId: siteA.id, toSiteId: siteB.id,
    truckId: 'demo-truck-1', status: 'planned', driverName: 'Max Fahrer',
  },
  {
    id: 'demo-tr-2',
    materialId: 'demo-mat-4', fromSiteId: siteB.id, toSiteId: siteC.id,
    truckId: 'demo-truck-3', status: 'in_transit', driverName: 'Hans Bauer',
  },
  {
    id: 'demo-tr-3',
    materialId: 'demo-mat-5', fromSiteId: siteC.id, toSiteId: siteA.id,
    truckId: 'demo-truck-2', status: 'delivered', driverName: 'Tom Fahrer',
  },
];
for (const tr of transports) {
  await prisma.transportRequest.upsert({
    where: { id: tr.id },
    create: tr,
    update: { status: tr.status },
  });
}
console.log('✓ Transporte:', transports.length, 'erstellt');

await prisma.$disconnect();

console.log('\n════════════════════════════════════════');
console.log('  DEMO-LOGIN DATEN');
console.log('════════════════════════════════════════');
  console.log('  Admin:      admin@demo.de      / admin123');
console.log('  Polier:     polier@demo.de     / matflow123');
console.log('  Bauleiter:  bauleiter@demo.de  / matflow123');
console.log('  Disponent:  disponent@demo.de  / matflow123');
console.log('════════════════════════════════════════');
