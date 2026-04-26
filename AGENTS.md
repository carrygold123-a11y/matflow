# MatFlow — Agent Context

> Stand: 23. April 2026  
> Interne Plattform für Baustellen: Überschussmaterial teilen, finden und Transport organisieren.

---

## Projektstruktur

```
C:\Users\Adrian\Desktop\Lw app!\        ← Monorepo-Root (npm workspaces)
├── apps/
│   ├── web/                            ← React + Vite, läuft auf http://localhost:5173
│   └── mobile/                         ← Flutter (noch nicht konfiguriert)
├── backend/
│   ├── api/                            ← NestJS API, läuft auf http://localhost:3000
│   └── database/                       ← Prisma + PostgreSQL
├── packages/
│   └── shared-types/                   ← Gemeinsame TypeScript-Typen
└── uploads/                            ← Datei-Upload Ordner
```

---

## Infrastruktur & Dienste

### PostgreSQL 17.9
- Installiert unter `C:\Program Files\PostgreSQL\17\`
- Datenbank: `matflow` | User: `postgres` | Passwort: `postgres` | Port: `5432`
- **Wichtig:** Läuft NICHT als Windows-Dienst — muss bei jedem Reboot manuell gestartet werden:
  ```powershell
  & "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\logfile"
  ```
- Optional: Als Dienst registrieren (erfordert Admin-PowerShell):
  ```powershell
  & "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" register -N "postgresql-17" -D "C:\Program Files\PostgreSQL\17\data"
  Start-Service postgresql-17
  ```

### NestJS API starten
```powershell
cd "C:\Users\Adrian\Desktop\Lw app!"
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/matflow"
$env:JWT_SECRET="matflow-secret-key-change-in-production"
npm run start:dev --workspace @matflow/api
```

### React Web App starten
```powershell
cd "C:\Users\Adrian\Desktop\Lw app!"
npm run dev --workspace @matflow/web
```

### Umgebungsvariablen
- `backend/api/.env`: `DATABASE_URL`, `JWT_SECRET`, `PORT=3000`, `STORAGE_PATH="C:/Users/Adrian/Desktop/Lw app!/uploads"`
- `backend/database/.env`: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/matflow"`

### Seed-Daten
Bereits geladen: 5 Baustellen, 10 User, 10 LKWs, 20 Materialien.  
Demo-Login: `mara@matflow.local` / `matflow123`

---

## Technologie-Stack

| Layer | Tech |
|-------|------|
| Web Frontend | React 18 + Vite + React Router |
| API | NestJS + Prisma ORM |
| Datenbank | PostgreSQL 17 |
| Typen | `@matflow/shared-types` (packages/shared-types) |
| Schriftarten | Space Grotesk + IBM Plex Mono (Google Fonts, geladen in index.html) |
| Mobile | Flutter 3.41.7 via Puro (nicht fertig konfiguriert) |

---

## Design System (styles.css)

Datei: `apps/web/src/styles.css`

### CSS Custom Properties
```css
--bg: #f1f5f9               /* Seiten-Hintergrund */
--surface: #ffffff           /* Karten-Hintergrund */
--sidebar-bg: #0f172a        /* Dunkle Sidebar */
--sidebar-text: #f1f5f9
--sidebar-muted: #94a3b8
--sidebar-active-bg: rgba(245,191,24,0.15)
--sidebar-active-text: #f5bf18
--accent: #f5bf18            /* Gelb / Amber */
--accent-deep: #d89e00
--text: #0f172a
--text-secondary: #64748b
--border: #e2e8f0
--radius / --radius-lg / --radius-xl
--shadow-sm / --shadow / --shadow-lg
```

### Wichtige CSS-Klassen
- Shell: `.shell`, `.shell__sidebar`, `.shell__sidebar-brand`, `.shell__nav-link`, `.shell__nav-icon`, `.shell__profile`, `.shell__profile-name`, `.shell__profile-role`, `.shell__logout-btn`, `.shell__content`
- Hero: `.hero-card`, `.hero-card__eyebrow`, `.hero-card__title`
- Stats: `.stats-grid`, `.stat-card`, `.stat-card__label`, `.stat-card__value`
- Panels: `.panel`, `.panel--wide`, `.panel__header`, `.panel__eyebrow`, `.panel__title`
- Mini-Cards: `.mini-card`, `.mini-card__title`, `.mini-card__sub`, `.mini-card__dist`
- Timeline: `.timeline__item`, `.timeline__type`, `.timeline__msg`, `.timeline__time`
- Material-Cards: `.material-card`, `.material-card__image-wrap`, `.material-card__no-image`, `.material-card__category`, `.material-card__dist`, `.material-card__title`, `.material-card__desc`, `.material-card__footer`, `.material-card__site`
- Login: `.login-screen`, `.login-screen__panel`, `.login-brand`, `.login-brand__logo`, `.login-brand__eyebrow`, `.login-brand__title`, `.login-screen__heading`, `.login-screen__art`
- Signal Blocks: `.signal-block`, `.signal-block--dark`, `.signal-block--gold`, `.signal-block__label`, `.signal-block__value`
- Badges: `.status-badge`, `.status-badge--available`, `.status-badge--reserved`, `.status-badge--in_transit`
- Buttons: `.primary-button`, `.ghost-button`, `.danger-button`
- Leer-Zustand: `.empty-state`, `.empty-state__icon`, `.empty-state__title`, `.empty-state__desc`

---

## Abgeschlossene Arbeiten

- [x] Vollständiges Monorepo-Gerüst aufgebaut (npm workspaces)
- [x] Alle Node-Pakete installiert
- [x] Prisma-Client generiert
- [x] `npm run build` erfolgreich
- [x] `npm test` erfolgreich (2/2)
- [x] PostgreSQL 17.9 installiert und läuft
- [x] Datenbank `matflow` erstellt
- [x] Prisma-Migration angewendet (`20260423000000_init`)
- [x] Seed-Daten geladen
- [x] NestJS API läuft auf Port 3000
- [x] React Web App läuft auf Port 5173
- [x] `styles.css` komplett neu gestaltet (dunkle Sidebar, Amber-Akzent, weiße Cards)
- [x] `AppShell.tsx` — neue Struktur, SVG-Icons (Home/Box/Truck), Encoding-Bug behoben, Logout-Button
- [x] `MaterialCard.tsx` — Encoding-Bug behoben, No-Image-Fallback, Status-Badge als `position:absolute`
- [x] `DashboardPage.tsx` — alle Class-Namen aktualisiert (hero, stat, timeline, panel, mini-card)
- [x] `App.tsx` + Login-Screen — neue `.login-brand`-Struktur, `.signal-block__label/value`

---

## Offene Aufgaben / Nächste Schritte

### Hohe Priorität
- [ ] **API-Start-Problem beheben** — letzter Befehl (`npm run start:dev --workspace @matflow/api`) endete mit Exit Code 1. Fehlerursache prüfen: PostgreSQL läuft? `.env` vorhanden? NestJS-Konfiguration korrekt?
- [ ] **MaterialsPage.tsx** — `panel__title`-ClassName für `<h3>` setzen (noch alter Stil)
- [ ] **TransportPage.tsx** — Class-Namen prüfen, ob sie mit dem neuen CSS übereinstimmen

### Mittlere Priorität
- [ ] **PostgreSQL als Windows-Dienst registrieren** — damit er automatisch startet (Admin-Rechte erforderlich)
- [ ] **Logo verbessern** — User hat echtes LW-Logo hochgeladen (schwarze L/E-Form + gelbe Unterseite). Als `apps/web/src/assets/logo.svg` ersetzen oder PNG einbinden
- [ ] **CreateMaterialModal.tsx** — Styling prüfen, ob neue CSS-Klassen passen

### Niedrige Priorität
- [ ] **Flutter/Android-Setup** — Android SDK fehlt, VS C++ Workload für Windows-Build fehlt
- [ ] **Mobile-App** in Flutter aufbauen (nach Web abgeschlossen)

---

## Bekannte Probleme & Lösungen

| Problem | Lösung |
|---------|--------|
| `npx` not found | `$env:Path` aus Registry neu laden |
| Script-Ausführungsrichtlinie blockiert | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `DATABASE_URL` in Seed nicht gefunden | Per `$env:DATABASE_URL=...` vor dem Befehl setzen |
| `Â·` statt `·` in TSX | UTF-8-Zeichen direkt einsetzen (U+00B7) |
| PostgreSQL nicht als Dienst | `pg_ctl start` manuell nach jedem Reboot |

---

## Konventionen

- Alle Komponenten nutzen BEM-ähnliche CSS-Klassen (`block__element--modifier`)
- Icons: Inline-SVG mit `currentColor`, 20×20 ViewBox (Heroicons-Stil)
- Kein `BrandMark`-Komponent in App.tsx — direkt `logo.svg` + HTML-Struktur mit `.login-brand`-Klassen
- `AppShell.tsx` importiert `logo.svg` direkt (nicht über `BrandMark`)
- PowerShell-Ausführungsrichtlinie: `RemoteSigned` für CurrentUser gesetzt
