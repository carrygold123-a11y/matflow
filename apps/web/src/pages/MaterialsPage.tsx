import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { MaterialItem, MaterialStatus, SiteSummary } from '@matflow/shared-types';
import { roleWorkspaceMatrix, type AuthUser } from '@matflow/shared-types';
import { api, type CreateMaterialPayload } from '../api/client';
import { CreateMaterialModal } from '../components/CreateMaterialModal';
import { MaterialCard } from '../components/MaterialCard';
import { materialCategories } from '../constants/materialCategories';
import { useI18n } from '../i18n';

interface UndoToast {
  id: string;
  message: string;
  onUndo: () => void;
}

function UndoToastBar({ toasts, onDismiss }: { toasts: UndoToast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="undo-toast-bar">
      {toasts.map((toast) => (
        <div key={toast.id} className="undo-toast">
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => {
              toast.onUndo();
              onDismiss(toast.id);
            }}
          >
            Rückgängig
          </button>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Schließen">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function MaterialsPage({
  token,
  currentUser,
  initialMaterials,
  sites,
  onRefresh,
}: {
  token: string;
  currentUser: AuthUser;
  initialMaterials: MaterialItem[];
  sites: SiteSummary[];
  onRefresh: () => Promise<void>;
}) {
  const { formatCategory, formatErrorMessage, formatMaterialStatus, formatNumber, t } = useI18n();
  const canDeleteMaterials = roleWorkspaceMatrix[currentUser.role].canDeleteMaterials;
  const [materials, setMaterials] = useState(initialMaterials);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<MaterialStatus | ''>('');
  const [distance, setDistance] = useState('150');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [undoToasts, setUndoToasts] = useState<UndoToast[]>([]);
  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const deferredQuery = useDeferredValue(query);

  const dismissToast = useCallback((id: string) => {
    setUndoToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = undoTimers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      undoTimers.current.delete(id);
    }
  }, []);

  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  useEffect(() => {
    let active = true;

    async function loadMaterials() {
      setIsLoading(true);
      setError('');
      try {
        const nextMaterials = await api.getMaterials(token, {
          text: deferredQuery || undefined,
          category: category || undefined,
          status: status || undefined,
          distance: distance ? Number(distance) : undefined,
        });

        if (!active) {
          return;
        }

        startTransition(() => {
          setMaterials(nextMaterials);
        });
      } catch (nextError) {
        if (active) {
          setError(formatErrorMessage(nextError, 'materials.loadError'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadMaterials();

    return () => {
      active = false;
    };
  }, [token, deferredQuery, category, status, distance, formatErrorMessage]);

  const summary = useMemo(
    () => ({
      total: materials.length,
      available: materials.filter((material) => material.status === 'available').length,
      reserved: materials.filter((material) => material.status === 'reserved').length,
    }),
    [materials],
  );

  async function refresh() {
    const nextMaterials = await api.getMaterials(token, {
      text: deferredQuery || undefined,
      category: category || undefined,
      status: status || undefined,
      distance: distance ? Number(distance) : undefined,
    });
    setMaterials(nextMaterials);
    await onRefresh();
  }

  async function handleCreateMaterial(payload: CreateMaterialPayload) {
    await api.createMaterial(token, payload);
    await refresh();
  }

  async function handleReserve(id: string) {
    await api.reserveMaterial(token, id);
    await refresh();
  }

  async function handleStatusChange(id: string, nextStatus: MaterialItem['status']) {
    await api.updateMaterialStatus(token, id, nextStatus);
    await refresh();
  }

  async function handleDelete(id: string, title: string) {
    // Fetch dependency counts first for an informed confirmation
    let deps: { transports: number; zones: number } = { transports: 0, zones: 0 };
    try {
      deps = await api.getMaterialDependents(token, id);
    } catch {
      // ignore, fall back to plain confirm
    }

    const depText = deps.transports + deps.zones > 0
      ? `\n\nAcht: ${deps.transports} Transport(e) und ${deps.zones} Planungszone(n) referenzieren dieses Material.`
      : '';

    const confirmed = window.confirm(`Material "${title}" wirklich löschen?${depText}`);
    if (!confirmed) {
      return;
    }

    // Optimistic removal
    const snapshot = materials;
    setMaterials((prev) => prev.filter((m) => m.id !== id));

    const toastId = id;
    let undone = false;

    const toast: UndoToast = {
      id: toastId,
      message: `"${title}" gelöscht`,
      onUndo: () => {
        undone = true;
        setMaterials(snapshot);
      },
    };

    setUndoToasts((prev) => [...prev, toast]);
    const timer = setTimeout(async () => {
      undoTimers.current.delete(toastId);
      setUndoToasts((prev) => prev.filter((t) => t.id !== toastId));
      if (!undone) {
        try {
          await api.deleteMaterial(token, id);
        } catch {
          // Restore on API failure
          setMaterials(snapshot);
        }
      }
    }, 5000);

    undoTimers.current.set(toastId, timer);
  }

  return (
    <div className="page-grid">
      <UndoToastBar toasts={undoToasts} onDismiss={dismissToast} />
      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('materials.eyebrow')}</p>
            <h3 className="panel__title">{t('materials.title')}</h3>
          </div>
          <button type="button" className="primary-button" onClick={() => setIsModalOpen(true)}>
            {t('materials.addMaterial')}
          </button>
        </div>
        <div className="filters-grid">
          <label>
            <span>{t('materials.search')}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('materials.searchPlaceholder')} />
          </label>
          <label>
            <span>{t('materials.category')}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t('materials.allCategories')}</option>
              {materialCategories.map((item) => (
                <option key={item} value={item}>
                  {formatCategory(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('materials.status')}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as MaterialStatus | '')}>
              <option value="">{t('materials.allStatuses')}</option>
              <option value="available">{formatMaterialStatus('available')}</option>
              <option value="reserved">{formatMaterialStatus('reserved')}</option>
              <option value="picked_up">{formatMaterialStatus('picked_up')}</option>
            </select>
          </label>
          <label>
            <span>{t('materials.distance')}</span>
            <input type="number" min="1" value={distance} onChange={(event) => setDistance(event.target.value)} />
          </label>
        </div>
        <div className="stats-strip">
          <span>{t('materials.summaryTotal', { count: formatNumber(summary.total) })}</span>
          <span>{t('materials.summaryAvailable', { count: formatNumber(summary.available) })}</span>
          <span>{t('materials.summaryReserved', { count: formatNumber(summary.reserved) })}</span>
          {isLoading ? <span>{t('materials.refreshing')}</span> : null}
          {error ? <span className="error-text">{error}</span> : null}
        </div>
      </section>

      <section className="materials-grid">
        {materials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            onReserve={handleReserve}
            onStatusChange={handleStatusChange}
            onDelete={canDeleteMaterials ? handleDelete : undefined}
          />
        ))}
      </section>

      <CreateMaterialModal
        open={isModalOpen}
        sites={sites}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateMaterial}
      />
    </div>
  );
}
