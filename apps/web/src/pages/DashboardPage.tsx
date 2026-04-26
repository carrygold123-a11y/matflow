import type { AuthUser, MaterialItem, NotificationEventItem, SiteSummary, TransportRequestItem, TruckItem } from '@matflow/shared-types';
import { Link } from 'react-router-dom';
import { MapPanel } from '../components/MapPanel';
import { buildSiteZonePlan, countActiveTransports, countMaterialAlerts, countReadyTrucks, getSiteCrew } from '../constants/sitePlanning';
import { useI18n } from '../i18n';

export function DashboardPage({
  currentUser,
  materials,
  transports,
  notifications,
  sites,
  trucks,
  users,
  onRefresh,
}: {
  currentUser: AuthUser;
  materials: MaterialItem[];
  transports: TransportRequestItem[];
  notifications: NotificationEventItem[];
  sites: SiteSummary[];
  trucks: TruckItem[];
  users: AuthUser[];
  onRefresh: () => Promise<void>;
}) {
  const { formatDateTime, formatMaterialStatus, formatNotificationMessage, formatNotificationType, formatNumber, t } = useI18n();
  const focusSite = sites.find((site) => site.id === currentUser.siteId) ?? currentUser.site;
  const siteCrew = getSiteCrew(users, currentUser.siteId);
  const sitePlan = buildSiteZonePlan({
    siteId: currentUser.siteId,
    users,
    materials,
    trucks,
    transports,
  });
  const availableCount = materials.filter((material) => material.status === 'available').length;
  const activeTransportCount = countActiveTransports(currentUser.siteId, transports);
  const materialAlertCount = countMaterialAlerts(currentUser.siteId, materials);
  const readyTruckCount = countReadyTrucks(currentUser.siteId, trucks);
  const moduleCards = [
    { name: 'SitePlan', value: formatNumber(sitePlan.length), meta: t('dashboard.activeZones') },
    { name: 'MatFlow', value: formatNumber(availableCount), meta: t('dashboard.availableMaterials') },
    { name: 'FleetFlow', value: formatNumber(activeTransportCount), meta: t('dashboard.activeTransports') },
    { name: 'Pulse', value: formatNumber(notifications.length), meta: t('dashboard.eventLogTitle') },
  ];

  return (
    <div className="page-grid">
      <section className="hero-card">
        <div>
          <p className="hero-card__eyebrow">{t('dashboard.heroEyebrow')}</p>
          <h2 className="hero-card__title">{t('dashboard.heroTitle')}</h2>
          <div className="hero-card__meta">
            <span className="hero-card__badge">{focusSite?.name}</span>
            <span className="hero-card__badge">{formatNumber(siteCrew.length)} {t('dashboard.crewReady')}</span>
            <span className="hero-card__badge">{formatDateTime(Date.now())}</span>
          </div>
        </div>
        <div className="hero-card__actions">
          <Link to="/planning" className="primary-button">
            {t('nav.planning')}
          </Link>
          <button type="button" className="ghost-button" onClick={() => void onRefresh()}>
            {t('dashboard.refresh')}
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {[
          [t('dashboard.crewReady'), formatNumber(siteCrew.length)],
          [t('dashboard.activeZones'), formatNumber(sitePlan.length)],
          [t('dashboard.materialAlerts'), formatNumber(materialAlertCount)],
          [t('dashboard.availableTrucks'), formatNumber(readyTruckCount)],
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
            <p className="panel__eyebrow">{t('dashboard.modulesEyebrow')}</p>
            <h3 className="panel__title">{t('dashboard.modulesTitle')}</h3>
          </div>
        </div>
        <div className="module-grid">
          {moduleCards.map((module) => (
            <article key={module.name} className="module-card">
              <span className="module-card__chip">{module.name}</span>
              <strong className="module-card__value">{module.value}</strong>
              <p className="module-card__text">{module.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('dashboard.nearestStockEyebrow')}</p>
            <h3 className="panel__title">{t('dashboard.nearestStockTitle')}</h3>
          </div>
        </div>
        <div className="list-grid">
          {materials.slice(0, 6).map((material) => (
            <div key={material.id} className="mini-card">
              <span className={`status-badge status-badge--${material.status}`}>{formatMaterialStatus(material.status)}</span>
              <h4 className="mini-card__title">{material.title}</h4>
              <p className="mini-card__sub">{material.site?.name}</p>
              <span className="mini-card__dist">{formatNumber(material.distanceKm, material.distanceKm % 1 === 0 ? undefined : { maximumFractionDigits: 1 })} km</span>
            </div>
          ))}
        </div>
      </section>

      <MapPanel materials={materials.slice(0, 10)} sites={sites} />

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('dashboard.eventLogEyebrow')}</p>
            <h3 className="panel__title">{t('dashboard.eventLogTitle')}</h3>
          </div>
        </div>
        <div className="timeline">
          {notifications.slice(0, 8).map((notification) => (
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
