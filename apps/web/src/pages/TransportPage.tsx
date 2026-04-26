import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { MaterialItem, SiteSummary, TransportRequestItem, TruckItem } from '@matflow/shared-types';
import { api } from '../api/client';
import { useI18n } from '../i18n';

const transportColumns: TransportRequestItem['status'][] = ['planned', 'in_transit', 'delivered'];

export function TransportPage({
  token,
  materials,
  transports,
  trucks,
  sites,
  onRefresh,
}: {
  token: string;
  materials: MaterialItem[];
  transports: TransportRequestItem[];
  trucks: TruckItem[];
  sites: SiteSummary[];
  onRefresh: () => Promise<void>;
}) {
  const { formatTransportStatus, t } = useI18n();
  const [draft, setDraft] = useState({
    materialId: materials[0]?.id || '',
    truckId: trucks.find((truck) => truck.available)?.id || '',
    toSiteId: sites[0]?.id || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDraft((current) => ({
      materialId: current.materialId || materials[0]?.id || '',
      truckId: current.truckId || trucks.find((truck) => truck.available)?.id || '',
      toSiteId: current.toSiteId || sites[0]?.id || '',
    }));
  }, [materials, trucks, sites]);

  const groupedTransports = useMemo(
    () =>
      transportColumns.map((column) => ({
        column,
        items: transports.filter((transport) => transport.status === column),
      })),
    [transports],
  );

  async function handleCreateTransport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createTransportRequest(token, draft);
      await onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusUpdate(id: string, status: TransportRequestItem['status']) {
    await api.updateTransportStatus(token, id, status);
    await onRefresh();
  }

  return (
    <div className="page-grid">
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('transport.eyebrow')}</p>
            <h3 className="panel__title">{t('transport.title')}</h3>
          </div>
        </div>
        <form className="filters-grid" onSubmit={handleCreateTransport}>
          <label>
            <span>{t('transport.fieldMaterial')}</span>
            <select value={draft.materialId} onChange={(event) => setDraft((current) => ({ ...current, materialId: event.target.value }))}>
              {materials.filter((material) => material.status !== 'picked_up').map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title} · {material.site?.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('transport.fieldDestinationSite')}</span>
            <select value={draft.toSiteId} onChange={(event) => setDraft((current) => ({ ...current, toSiteId: event.target.value }))}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('transport.fieldTruck')}</span>
            <select value={draft.truckId} onChange={(event) => setDraft((current) => ({ ...current, truckId: event.target.value }))}>
              {trucks.filter((truck) => truck.available || truck.id === draft.truckId).map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.name} · {truck.site?.name}
                </option>
              ))}
            </select>
          </label>
          <div className="transport-actions">
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? t('transport.planning') : t('transport.submit')}
            </button>
          </div>
        </form>
      </section>

      <section className="transport-board">
        {groupedTransports.map(({ column, items }) => (
          <article key={column} className="transport-column">
            <div className="transport-column__header">
              <span className={`status-badge status-badge--${column}`}>{formatTransportStatus(column)}</span>
              <strong>{items.length}</strong>
            </div>
            <div className="transport-column__items">
              {items.map((transport) => (
                <div key={transport.id} className="transport-card">
                  <h4 className="transport-card__title">{transport.material?.title}</h4>
                  <p className="transport-card__meta">
                    {transport.fromSite?.name} → {transport.toSite?.name}
                  </p>
                  <p className="transport-card__meta">{transport.truck?.name}</p>
                  <div className="transport-card__actions">
                    {transportColumns.map((nextStatus) => (
                      <button key={nextStatus} type="button" className="ghost-button" disabled={nextStatus === transport.status} onClick={() => handleStatusUpdate(transport.id, nextStatus)}>
                        {formatTransportStatus(nextStatus)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
