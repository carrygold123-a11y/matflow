import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SiteSummary } from '@matflow/shared-types';
import type { CreateMaterialPayload } from '../api/client';
import { materialCategories } from '../constants/materialCategories';
import { useI18n } from '../i18n';

const conditionOptions: CreateMaterialPayload['condition'][] = ['new', 'good', 'used', 'damaged'];

interface DraftState {
  title: string;
  description: string;
  category: string;
  quantity: string;
  condition: CreateMaterialPayload['condition'];
  siteId: string;
  latitude: string;
  longitude: string;
  image: File | null;
}

const emptyDraft = (siteId: string, latitude: string, longitude: string): DraftState => ({
  title: '',
  description: '',
  category: '',
  quantity: '1',
  condition: 'good',
  siteId,
  latitude,
  longitude,
  image: null,
});

export function CreateMaterialModal({
  open,
  sites,
  onClose,
  onSubmit,
}: {
  open: boolean;
  sites: SiteSummary[];
  onClose: () => void;
  onSubmit: (payload: CreateMaterialPayload) => Promise<void>;
}) {
  const { formatCategory, formatMaterialCondition, t } = useI18n();
  const firstSite = sites[0];
  const [draft, setDraft] = useState<DraftState>(() =>
    emptyDraft(firstSite?.id || '', String(firstSite?.latitude || ''), String(firstSite?.longitude || '')),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previewUrl = useMemo(() => (draft.image ? URL.createObjectURL(draft.image) : ''), [draft.image]);

  useEffect(() => {
    if (!sites.length || draft.siteId) {
      return;
    }

    const site = sites[0];
    setDraft(emptyDraft(site.id, String(site.latitude), String(site.longitude)));
  }, [sites, draft.siteId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.image) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: draft.title,
        description: draft.description,
        category: draft.category || undefined,
        quantity: Number(draft.quantity),
        condition: draft.condition,
        siteId: draft.siteId,
        latitude: Number(draft.latitude),
        longitude: Number(draft.longitude),
        image: draft.image,
      });
      const site = sites.find((entry) => entry.id === draft.siteId) || firstSite;
      setDraft(emptyDraft(site?.id || '', String(site?.latitude || ''), String(site?.longitude || '')));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="panel__header">
          <p className="panel__eyebrow">{t('createMaterial.eyebrow')}</p>
          <h3 className="panel__title">{t('createMaterial.title')}</h3>
        </div>
        <label>
          <span>{t('createMaterial.fieldTitle')}</span>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required />
        </label>
        <label>
          <span>{t('createMaterial.fieldDescription')}</span>
          <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} required rows={4} />
        </label>
        <div className="form-grid">
          <label>
            <span>{t('createMaterial.fieldCategory')}</span>
            <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              <option value="">{t('createMaterial.autoSuggest')}</option>
              {materialCategories.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('createMaterial.fieldCondition')}</span>
            <select value={draft.condition} onChange={(event) => setDraft((current) => ({ ...current, condition: event.target.value as DraftState['condition'] }))}>
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {formatMaterialCondition(condition)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('createMaterial.fieldQuantity')}</span>
            <input type="number" min="0.1" step="0.1" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} required />
          </label>
          <label>
            <span>{t('createMaterial.fieldSite')}</span>
            <select
              value={draft.siteId}
              onChange={(event) => {
                const site = sites.find((entry) => entry.id === event.target.value);
                setDraft((current) => ({
                  ...current,
                  siteId: event.target.value,
                  latitude: String(site?.latitude || current.latitude),
                  longitude: String(site?.longitude || current.longitude),
                }));
              }}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('createMaterial.fieldLatitude')}</span>
            <input value={draft.latitude} onChange={(event) => setDraft((current) => ({ ...current, latitude: event.target.value }))} required />
          </label>
          <label>
            <span>{t('createMaterial.fieldLongitude')}</span>
            <input value={draft.longitude} onChange={(event) => setDraft((current) => ({ ...current, longitude: event.target.value }))} required />
          </label>
        </div>
        <label className="upload-field">
          <span>{t('createMaterial.fieldImage')}</span>
          <input type="file" accept="image/*" onChange={(event) => setDraft((current) => ({ ...current, image: event.target.files?.[0] || null }))} required />
        </label>
        {previewUrl ? <img className="modal__preview" src={previewUrl} alt={t('createMaterial.previewAlt')} /> : null}
        <div className="modal__actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            {t('createMaterial.cancel')}
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? t('createMaterial.uploading') : t('createMaterial.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
