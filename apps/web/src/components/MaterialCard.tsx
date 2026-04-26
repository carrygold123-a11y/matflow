import type { MaterialItem } from '@matflow/shared-types';
import { useI18n } from '../i18n';

export function MaterialCard({
  material,
  onReserve,
  onStatusChange,
  onDelete,
}: {
  material: MaterialItem;
  onReserve: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: MaterialItem['status']) => Promise<void>;
  onDelete?: (id: string, title: string) => Promise<void>;
}) {
  const { formatCategory, formatMaterialCondition, formatMaterialStatus, formatNumber, t } = useI18n();

  return (
    <article className="material-card">
      <div className="material-card__image-wrap">
        {material.imageUrl ? (
          <img className="material-card__image" src={material.imageUrl} alt={material.title} />
        ) : (
          <div className="material-card__no-image">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <span className={`status-badge status-badge--${material.status}`}>{formatMaterialStatus(material.status)}</span>
      </div>
      <div className="material-card__body">
        <div className="material-card__meta">
          <span className="material-card__category">{formatCategory(material.category)}</span>
          <span className="material-card__dist">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {formatNumber(material.distanceKm, material.distanceKm % 1 === 0 ? undefined : { maximumFractionDigits: 1 })} km
          </span>
        </div>
        <h3 className="material-card__title">{material.title}</h3>
        <p className="material-card__desc">{material.description}</p>
        <div className="material-card__footer">
          <span>{formatNumber(material.quantity, material.quantity % 1 === 0 ? undefined : { maximumFractionDigits: 1 })} · {formatMaterialCondition(material.condition)}</span>
          <span className="material-card__site">{material.site?.name}</span>
        </div>
        <div className="material-card__actions">
          <button type="button" className="primary-button" disabled={material.status !== 'available'} onClick={() => onReserve(material.id)}>
            {t('material.reserve')}
          </button>
          <button type="button" className="ghost-button" onClick={() => onStatusChange(material.id, 'reserved')}>
            {t('material.markReserved')}
          </button>
          <button type="button" className="ghost-button" onClick={() => onStatusChange(material.id, 'picked_up')}>
            {t('material.pickedUp')}
          </button>
          {onDelete && (
          <button type="button" className="danger-button" onClick={() => onDelete(material.id, material.title)}>
            Löschen
          </button>
          )}
        </div>
      </div>
    </article>
  );
}
