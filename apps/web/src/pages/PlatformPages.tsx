import { useCallback, useRef, useState } from 'react';
import { roleWorkspaceMatrix, type AuthUser, type MaterialItem, type NotificationEventItem, type SiteSummary, type TransportRequestItem, type TruckItem } from '@matflow/shared-types';
import { api } from '../api/client';
import { useI18n } from '../i18n';

interface UndoToast { id: string; message: string; onUndo: () => void; }

function UndoToastBar({ toasts, onDismiss }: { toasts: UndoToast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="undo-toast-bar">
      {toasts.map((toast) => (
        <div key={toast.id} className="undo-toast">
          <span>{toast.message}</span>
          <button type="button" onClick={() => { toast.onUndo(); onDismiss(toast.id); }}>Rückgängig</button>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Schließen">✕</button>
        </div>
      ))}
    </div>
  );
}

function SectionHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <section className="hero-card">
      <div>
        <p className="hero-card__eyebrow">{eyebrow}</p>
        <h2 className="hero-card__title">{title}</h2>
        <p className="hero-card__copy">{copy}</p>
      </div>
    </section>
  );
}

export function SitesPage({
  token,
  currentUser,
  materials,
  sites,
  transports,
  trucks,
  users,
  onRefresh,
}: {
  token: string;
  currentUser: AuthUser;
  materials: MaterialItem[];
  sites: SiteSummary[];
  transports: TransportRequestItem[];
  trucks: TruckItem[];
  users: AuthUser[];
  onRefresh: () => Promise<void>;
}) {
  const { formatNumber, t } = useI18n();
  const canManageSites = roleWorkspaceMatrix[currentUser.role].canManageSites;
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [undoToasts, setUndoToasts] = useState<UndoToast[]>([]);
  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setUndoToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = undoTimers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      undoTimers.current.delete(id);
    }
  }, []);

  async function handleCreateSite() {
    if (!name.trim() || !latitude || !longitude || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await api.createSite(token, {
        name: name.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      setName('');
      setLatitude('');
      setLongitude('');
      await onRefresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSite(siteId: string, siteName: string) {
    // Fetch dependency counts for informed confirmation
    let deps: { users: number; materials: number; trucks: number; sitePlans: number; transports: number } = { users: 0, materials: 0, trucks: 0, sitePlans: 0, transports: 0 };
    try {
      deps = await api.getSiteDependents(token, siteId);
    } catch { /* ignore */ }

    const total = deps.users + deps.materials + deps.trucks + deps.sitePlans + deps.transports;
    const depText = total > 0
      ? `\n\nAcht: ${deps.users} Nutzer, ${deps.materials} Materialien, ${deps.trucks} LKWs, ${deps.sitePlans} Pläne und ${deps.transports} Transporte hängen dran.`
      : '';

    const confirmed = window.confirm(`Baustelle "${siteName}" wirklich löschen?${depText}`);
    if (!confirmed) {
      return;
    }

    // Optimistic removal not possible here since sites are props — fire API directly then refresh
    await api.deleteSite(token, siteId);

    setUndoToasts([]);  // clear before refresh
    await onRefresh();
  }

  return (
    <div className="page-grid">
      <UndoToastBar toasts={undoToasts} onDismiss={dismissToast} />
      <SectionHero eyebrow={t('nav.sites')} title={t('areas.sites.title')} copy={t('areas.sites.copy')} />
      {canManageSites && (
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Baustelle anlegen</p>
            <h3 className="panel__title">Neue Baustelle erstellen</h3>
          </div>
        </div>
        <div className="filters-grid">
          <label>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="z.B. Hamburg Nord" />
          </label>
          <label>
            <span>Breitengrad</span>
            <input value={latitude} onChange={(event) => setLatitude(event.target.value)} type="number" />
          </label>
          <label>
            <span>Längengrad</span>
            <input value={longitude} onChange={(event) => setLongitude(event.target.value)} type="number" />
          </label>
          <div className="transport-actions">
            <button type="button" className="primary-button" disabled={isSaving} onClick={() => void handleCreateSite()}>
              {isSaving ? 'Erstellt...' : 'Baustelle erstellen'}
            </button>
          </div>
        </div>
      </section>
      )}
      <section className="zone-grid">
        {sites.map((site) => {
          const siteUsers = users.filter((user) => user.siteId === site.id);
          const siteMaterials = materials.filter((material) => material.siteId === site.id);
          const siteTrucks = trucks.filter((truck) => truck.siteId === site.id);
          const siteTransports = transports.filter((transport) => transport.fromSiteId === site.id || transport.toSiteId === site.id);

          return (
            <article key={site.id} className="zone-card zone-card--focus">
              <div className="zone-card__header">
                <div>
                  <h3 className="zone-card__title">{site.name}</h3>
                  <p className="zone-card__meta">{formatNumber(site.latitude, { maximumFractionDigits: 3 })}, {formatNumber(site.longitude, { maximumFractionDigits: 3 })}</p>
                </div>
                <div className="zone-card__header-actions">
                  {canManageSites && (
                  <button type="button" className="danger-button" onClick={() => void handleDeleteSite(site.id, site.name)}>
                    Löschen
                  </button>
                  )}
                </div>
              </div>
              <dl className="zone-card__details">
                <div>
                  <dt>{t('dashboard.crewReady')}</dt>
                  <dd>{formatNumber(siteUsers.length)}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.availableMaterials')}</dt>
                  <dd>{formatNumber(siteMaterials.length)}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.availableTrucks')}</dt>
                  <dd>{formatNumber(siteTrucks.length)}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.activeTransports')}</dt>
                  <dd>{formatNumber(siteTransports.length)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function PeoplePage({ users }: { users: AuthUser[] }) {
  const { formatUserRole, t } = useI18n();

  return (
    <div className="page-grid">
      <SectionHero eyebrow={t('nav.people')} title={t('areas.people.title')} copy={t('areas.people.copy')} />
      <section className="roster-grid">
        {users.map((user) => (
          <article key={user.id} className="roster-card">
            <strong className="roster-card__name">{user.name}</strong>
            <span className="roster-card__role">{formatUserRole(user.role)}</span>
            <span className="roster-card__site">{user.site?.name}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

export function FleetPage({ transports, trucks }: { transports: TransportRequestItem[]; trucks: TruckItem[] }) {
  const { formatNumber, t } = useI18n();
  const readyTrucks = trucks.filter((truck) => truck.available).length;
  const activeTransports = transports.filter((transport) => transport.status !== 'delivered').length;

  return (
    <div className="page-grid">
      <SectionHero eyebrow={t('nav.fleet')} title={t('areas.fleet.title')} copy={t('areas.fleet.copy')} />
      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__label">{t('dashboard.availableTrucks')}</p>
          <span className="stat-card__value">{formatNumber(readyTrucks)}</span>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">{t('dashboard.activeTransports')}</p>
          <span className="stat-card__value">{formatNumber(activeTransports)}</span>
        </article>
      </section>
      <section className="roster-grid">
        {trucks.map((truck) => (
          <article key={truck.id} className="roster-card">
            <strong className="roster-card__name">{truck.name}</strong>
            <span className="roster-card__role">{truck.available ? t('areas.fleet.ready') : t('areas.fleet.busy')}</span>
            <span className="roster-card__site">{truck.site?.name}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

export function NotificationsPage({ notifications }: { notifications: NotificationEventItem[] }) {
  const { formatDateTime, formatNotificationMessage, formatNotificationType, t } = useI18n();

  return (
    <div className="page-grid">
      <SectionHero eyebrow={t('nav.notifications')} title={t('areas.notifications.title')} copy={t('areas.notifications.copy')} />
      <section className="panel panel--wide">
        <div className="timeline">
          {notifications.map((notification) => (
            <article key={notification.id} className="timeline__item">
              <span className="timeline__type">{formatNotificationType(notification.type)}</span>
              <p className="timeline__msg">{formatNotificationMessage(notification)}</p>
              <p className="timeline__time">{formatDateTime(notification.createdAt)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ReportsPage({
  materials,
  transports,
  trucks,
  users,
}: {
  materials: MaterialItem[];
  transports: TransportRequestItem[];
  trucks: TruckItem[];
  users: AuthUser[];
}) {
  const { formatNumber, t } = useI18n();
  const reusableMaterials = materials.filter((material) => material.status === 'available').length;
  const transportLoad = transports.filter((transport) => transport.status !== 'delivered').length;
  const staffingCoverage = users.length;
  const readyFleet = trucks.filter((truck) => truck.available).length;

  return (
    <div className="page-grid">
      <SectionHero eyebrow={t('nav.reports')} title={t('areas.reports.title')} copy={t('areas.reports.copy')} />
      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__label">{t('areas.reports.materialAvailability')}</p>
          <span className="stat-card__value">{formatNumber(reusableMaterials)}</span>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">{t('areas.reports.transportActivity')}</p>
          <span className="stat-card__value">{formatNumber(transportLoad)}</span>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">{t('areas.reports.staffCoverage')}</p>
          <span className="stat-card__value">{formatNumber(staffingCoverage)}</span>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">{t('dashboard.availableTrucks')}</p>
          <span className="stat-card__value">{formatNumber(readyFleet)}</span>
        </article>
      </section>
    </div>
  );
}

export function AdminPage({
  materials,
  notifications,
  sites,
  transports,
  trucks,
  users,
}: {
  materials: MaterialItem[];
  notifications: NotificationEventItem[];
  sites: SiteSummary[];
  transports: TransportRequestItem[];
  trucks: TruckItem[];
  users: AuthUser[];
}) {
  const { formatNumber, formatUserRole, t } = useI18n();

  return (
    <div className="page-grid">
      <SectionHero eyebrow={t('nav.admin')} title={t('areas.admin.title')} copy={t('areas.admin.copy')} />
      <section className="stats-grid">
        {[
          [t('nav.sites'), formatNumber(sites.length)],
          [t('nav.people'), formatNumber(users.length)],
          [t('nav.materials'), formatNumber(materials.length)],
          [t('nav.fleet'), formatNumber(trucks.length)],
          [t('nav.transport'), formatNumber(transports.length)],
          [t('nav.notifications'), formatNumber(notifications.length)],
        ].map(([label, value]) => (
          <article key={label} className="stat-card">
            <p className="stat-card__label">{label}</p>
            <span className="stat-card__value">{value}</span>
          </article>
        ))}
      </section>
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('areas.admin.roleMatrix')}</p>
            <h3 className="panel__title">{t('areas.admin.apiScope')}</h3>
          </div>
        </div>
        <div className="module-grid">
          {Object.entries(roleWorkspaceMatrix).map(([role, config]) => (
            <article key={role} className="module-card">
              <span className="module-card__chip">{formatUserRole(role as AuthUser['role'])}</span>
              <strong className="module-card__value">{config.homeSection}</strong>
              <p className="module-card__text">{config.navigationSections.join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}