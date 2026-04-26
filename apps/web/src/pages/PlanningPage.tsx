import { useEffect, useMemo, useState } from 'react';
import {
  getRoleWorkspace,
  type AuthUser,
  type MaterialItem,
  type SitePlanBriefingCategory,
  type SitePlanItem,
  type SitePlanMaterialNeedStatus,
  type SitePlanPriority,
  type SitePlanShiftStatus,
  type SitePlanStatus,
  type SiteSummary,
  type TransportRequestItem,
  type TruckItem,
  type UpsertSitePlanPayload,
} from '@matflow/shared-types';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  countActiveTransports,
  countMaterialAlerts,
  countReadyTrucks,
  getSiteCrew,
} from '../constants/sitePlanning';
import { useI18n } from '../i18n';

const statusOptions: SitePlanStatus[] = ['draft', 'published'];
const shiftStatusOptions: SitePlanShiftStatus[] = ['not_ready', 'ready', 'active', 'blocked', 'complete'];
const priorityOptions: SitePlanPriority[] = ['critical', 'focus', 'ready'];
const briefingCategoryOptions: SitePlanBriefingCategory[] = ['operations', 'safety', 'logistics'];
const materialNeedStatusOptions: SitePlanMaterialNeedStatus[] = ['needed', 'ordered', 'ready', 'delivered'];

interface PlanningAssignmentDraft {
  key: string;
  userId: string;
  sortOrder: number;
}

interface PlanningBriefingDraft {
  key: string;
  category: SitePlanBriefingCategory;
  title: string;
  note: string;
  sortOrder: number;
}

interface PlanningMaterialNeedDraft {
  key: string;
  materialId: string;
  label: string;
  quantity: number;
  unit: string;
  status: SitePlanMaterialNeedStatus;
  notes: string;
  sortOrder: number;
}

interface PlanningZoneDraft {
  id: string;
  name: string;
  shiftLabel: string;
  focus: string;
  supportCategory: string;
  priority: SitePlanPriority;
  sortOrder: number;
  leadUserId: string;
  supportMaterialId: string;
  supportTruckId: string;
  activeTransportId: string;
  materialNeeds: PlanningMaterialNeedDraft[];
  assignments: PlanningAssignmentDraft[];
}

interface PlanningDraft {
  planDate: string;
  status: SitePlanStatus;
  shiftStatus: SitePlanShiftStatus;
  briefing: string;
  safetyNotes: string;
  briefings: PlanningBriefingDraft[];
  zones: PlanningZoneDraft[];
  updatedAt?: string;
}

function createLocalKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyBriefing(sortOrder: number): PlanningBriefingDraft {
  return {
    key: createLocalKey('briefing'),
    category: 'operations',
    title: '',
    note: '',
    sortOrder,
  };
}

function createEmptyMaterialNeed(sortOrder: number): PlanningMaterialNeedDraft {
  return {
    key: createLocalKey('need'),
    materialId: '',
    label: '',
    quantity: 1,
    unit: 'lot',
    status: 'needed',
    notes: '',
    sortOrder,
  };
}

function toPlanningDraft(plan: SitePlanItem): PlanningDraft {
  return {
    planDate: plan.planDate.slice(0, 10),
    status: plan.status,
    shiftStatus: plan.shiftStatus,
    briefing: plan.briefing,
    safetyNotes: plan.safetyNotes,
    briefings: plan.briefings.map((briefing) => ({
      key: briefing.id,
      category: briefing.category,
      title: briefing.title,
      note: briefing.note,
      sortOrder: briefing.sortOrder,
    })),
    updatedAt: plan.updatedAt,
    zones: plan.zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      shiftLabel: zone.shiftLabel,
      focus: zone.focus,
      supportCategory: zone.supportCategory,
      priority: zone.priority,
      sortOrder: zone.sortOrder,
      leadUserId: zone.leadUserId ?? '',
      supportMaterialId: zone.supportMaterialId ?? '',
      supportTruckId: zone.supportTruckId ?? '',
      activeTransportId: zone.activeTransportId ?? '',
      materialNeeds: zone.materialNeeds.map((materialNeed) => ({
        key: materialNeed.id,
        materialId: materialNeed.materialId ?? '',
        label: materialNeed.label,
        quantity: materialNeed.quantity,
        unit: materialNeed.unit,
        status: materialNeed.status,
        notes: materialNeed.notes,
        sortOrder: materialNeed.sortOrder,
      })),
      assignments: zone.assignments.map((assignment) => ({
        key: assignment.id,
        userId: assignment.userId,
        sortOrder: assignment.sortOrder,
      })),
    })),
  };
}

function toPayload(draft: PlanningDraft): UpsertSitePlanPayload {
  return {
    planDate: draft.planDate,
    status: draft.status,
    shiftStatus: draft.shiftStatus,
    briefing: draft.briefing,
    safetyNotes: draft.safetyNotes,
    briefings: draft.briefings
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((briefing, briefingIndex) => ({
        id: briefing.key,
        category: briefing.category,
        title: briefing.title,
        note: briefing.note,
        sortOrder: briefingIndex,
      })),
    zones: draft.zones
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((zone, zoneIndex) => ({
        id: zone.id,
        name: zone.name,
        shiftLabel: zone.shiftLabel,
        focus: zone.focus,
        supportCategory: zone.supportCategory,
        priority: zone.priority,
        sortOrder: zoneIndex,
        leadUserId: zone.leadUserId || undefined,
        supportMaterialId: zone.supportMaterialId || undefined,
        supportTruckId: zone.supportTruckId || undefined,
        activeTransportId: zone.activeTransportId || undefined,
        materialNeeds: zone.materialNeeds
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((materialNeed, materialNeedIndex) => ({
            id: materialNeed.key,
            materialId: materialNeed.materialId || undefined,
            label: materialNeed.label,
            quantity: materialNeed.quantity,
            unit: materialNeed.unit,
            status: materialNeed.status,
            notes: materialNeed.notes,
            sortOrder: materialNeedIndex,
          })),
        assignments: zone.assignments
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .filter((assignment) => assignment.userId)
          .map((assignment, assignmentIndex) => ({
            userId: assignment.userId,
            sortOrder: assignmentIndex,
          })),
      })),
  };
}

function createEmptyZone(sortOrder: number): PlanningZoneDraft {
  return {
    id: createLocalKey('zone'),
    name: '',
    shiftLabel: '06:00-10:00',
    focus: '',
    supportCategory: 'Concrete',
    priority: 'focus',
    sortOrder,
    leadUserId: '',
    supportMaterialId: '',
    supportTruckId: '',
    activeTransportId: '',
    materialNeeds: [createEmptyMaterialNeed(0)],
    assignments: [],
  };
}

export function PlanningPage({
  token,
  currentUser,
  users,
  materials,
  transports,
  sites,
  trucks,
  onRefresh,
}: {
  token: string;
  currentUser: AuthUser;
  users: AuthUser[];
  materials: MaterialItem[];
  transports: TransportRequestItem[];
  sites: SiteSummary[];
  trucks: TruckItem[];
  onRefresh: () => Promise<void>;
}) {
  const { formatDateTime, formatNumber, formatUserRole, t } = useI18n();
  const workspace = getRoleWorkspace(currentUser.role);
  const [selectedSiteId, setSelectedSiteId] = useState(currentUser.siteId);
  const [selectedPlanDate, setSelectedPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<PlanningDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  const [crewSearches, setCrewSearches] = useState<Record<string, string>>({});

  const canEdit = workspace.canEditPlanning;
  const canSwitchSite = workspace.canAccessAllSites;
  const focusSite = sites.find((site) => site.id === selectedSiteId) ?? currentUser.site;
  const siteCrew = useMemo(() => getSiteCrew(users, selectedSiteId), [users, selectedSiteId]);
  const allUsersForAssignment = useMemo(
    () =>
      [...users].sort((a, b) => {
        const order: Record<string, number> = {
          admin: 0, bauleiter: 1, manager: 2, polier: 3, vorarbeiter: 4,
          disponent: 5, lagerist: 6, fahrer: 7, worker: 8, subcontractor: 9,
        };
        return (order[a.role] ?? 99) - (order[b.role] ?? 99);
      }),
    [users],
  );
  const siteMaterials = useMemo(() => materials.filter((material) => material.siteId === selectedSiteId), [materials, selectedSiteId]);
  const siteTrucks = useMemo(() => trucks.filter((truck) => truck.siteId === selectedSiteId), [trucks, selectedSiteId]);
  const siteTransports = useMemo(
    () => transports.filter((transport) => transport.fromSiteId === selectedSiteId || transport.toSiteId === selectedSiteId),
    [transports, selectedSiteId],
  );
  const materialAlertCount = countMaterialAlerts(selectedSiteId, materials);
  const readyTruckCount = countReadyTrucks(selectedSiteId, trucks);
  const activeTransportCount = countActiveTransports(selectedSiteId, transports);
  const coveredZones = draft?.zones.filter((zone) => zone.assignments.some((assignment) => assignment.userId)).length ?? 0;

  useEffect(() => {
    let active = true;

    async function loadPlan() {
      setIsLoading(true);
      setError('');
      setSaveNotice('');

      try {
        const plan = await api.getSitePlan(token, selectedPlanDate, selectedSiteId);

        if (!active) {
          return;
        }

        setDraft(toPlanningDraft(plan));
      } catch (nextError) {
        if (active) {
          setError(t('planning.loadError'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      active = false;
    };
  }, [selectedPlanDate, selectedSiteId, token, t]);

  async function handleSave() {
    if (!draft || !canEdit) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveNotice('');

    try {
      const savedPlan = await api.upsertSitePlan(token, toPayload(draft), selectedSiteId);
      setDraft(toPlanningDraft(savedPlan));
      setSaveNotice(t('planning.saveSuccess'));
      await onRefresh();
    } catch {
      setError(t('planning.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  function updateDraft(mutator: (current: PlanningDraft) => PlanningDraft) {
    setDraft((current) => (current ? mutator(current) : current));
  }

  function updateZone(zoneId: string, mutator: (zone: PlanningZoneDraft, zoneIndex: number) => PlanningZoneDraft) {
    updateDraft((current) => ({
      ...current,
      zones: current.zones.map((zone, zoneIndex) => (zone.id === zoneId ? mutator(zone, zoneIndex) : zone)),
    }));
  }

  function addZone() {
    updateDraft((current) => ({
      ...current,
      zones: [...current.zones, createEmptyZone(current.zones.length)],
    }));
  }

  function removeZone(zoneId: string) {
    updateDraft((current) => ({
      ...current,
      zones: current.zones.filter((zone) => zone.id !== zoneId).map((zone, index) => ({ ...zone, sortOrder: index })),
    }));
  }

  function addAssignment(zoneId: string) {
    updateZone(zoneId, (zone) => ({
      ...zone,
      assignments: [
        ...zone.assignments,
        {
          key: createLocalKey('assignment'),
          userId: '',
          sortOrder: zone.assignments.length,
        },
      ],
    }));
  }

  function removeAssignment(zoneId: string, assignmentKey: string) {
    updateZone(zoneId, (zone) => ({
      ...zone,
      assignments: zone.assignments
        .filter((assignment) => assignment.key !== assignmentKey)
        .map((assignment, index) => ({ ...assignment, sortOrder: index })),
    }));
  }

  function addBriefing() {
    updateDraft((current) => ({
      ...current,
      briefings: [...current.briefings, createEmptyBriefing(current.briefings.length)],
    }));
  }

  function removeBriefing(briefingKey: string) {
    updateDraft((current) => ({
      ...current,
      briefings: current.briefings
        .filter((briefing) => briefing.key !== briefingKey)
        .map((briefing, index) => ({ ...briefing, sortOrder: index })),
    }));
  }

  function addMaterialNeed(zoneId: string) {
    updateZone(zoneId, (zone) => ({
      ...zone,
      materialNeeds: [...zone.materialNeeds, createEmptyMaterialNeed(zone.materialNeeds.length)],
    }));
  }

  function removeMaterialNeed(zoneId: string, materialNeedKey: string) {
    updateZone(zoneId, (zone) => ({
      ...zone,
      materialNeeds: zone.materialNeeds
        .filter((materialNeed) => materialNeed.key !== materialNeedKey)
        .map((materialNeed, index) => ({ ...materialNeed, sortOrder: index })),
    }));
  }

  if (isLoading || !draft) {
    return (
      <div className="page-grid">
        <section className="panel panel--wide planning-empty-state">
          <p className="panel__eyebrow">{t('planning.eyebrow')}</p>
          <h3 className="panel__title">{t('planning.loading')}</h3>
        </section>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card hero-card--planning">
        <div>
          <p className="hero-card__eyebrow">{t('planning.eyebrow')}</p>
          <h2 className="hero-card__title">{t('planning.title')}</h2>
          <p className="hero-card__copy">{t('planning.copy')}</p>
          <div className="hero-card__meta">
            <span className="hero-card__badge">{focusSite?.name}</span>
            <span className="hero-card__badge">{t('planning.status')}: {t(`planning.status.${draft.status}` as never)}</span>
            <span className="hero-card__badge">{t('planning.shiftStatus')}: {t(`planning.shiftStatus.${draft.shiftStatus}` as never)}</span>
            <span className="hero-card__badge">{formatDateTime(draft.updatedAt ?? Date.now())}</span>
          </div>
        </div>
        <div className="hero-card__actions">
          {canEdit ? (
            <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? t('planning.saving') : t('planning.save')}
            </button>
          ) : null}
          <button type="button" className="primary-button" onClick={() => void onRefresh()}>
            {t('dashboard.refresh')}
          </button>
          <Link to="/materials" className="ghost-button">
            {t('nav.materials')}
          </Link>
        </div>
      </section>

      <section className="stats-grid">
        {[
          [t('planning.activeCrew'), formatNumber(siteCrew.length)],
          [t('planning.zoneCoverage'), `${formatNumber(coveredZones)}/${formatNumber(draft.zones.length)}`],
          [t('planning.materialAlerts'), formatNumber(materialAlertCount)],
          [t('planning.readyTrucks'), formatNumber(readyTruckCount)],
        ].map(([label, value]) => (
          <article key={label} className="stat-card">
            <p className="stat-card__label">{label}</p>
            <span className="stat-card__value">{value}</span>
          </article>
        ))}
      </section>

      <section className="panel panel--wide planning-editor-panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('planning.editorEyebrow')}</p>
            <h3 className="panel__title">{t('planning.editorTitle')}</h3>
          </div>
        </div>
        <div className="planning-toolbar">
          <label>
            <span>{t('planning.site')}</span>
            <select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)} disabled={!canSwitchSite}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('planning.planDate')}</span>
            <input
              type="date"
              value={selectedPlanDate}
              onChange={(event) => setSelectedPlanDate(event.target.value)}
            />
          </label>
          <label>
            <span>{t('planning.status')}</span>
            <select
              value={draft.status}
              onChange={(event) => updateDraft((current) => ({ ...current, status: event.target.value as SitePlanStatus }))}
              disabled={!canEdit}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {t(`planning.status.${status}` as never)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('planning.shiftStatus')}</span>
            <select
              value={draft.shiftStatus}
              onChange={(event) => updateDraft((current) => ({ ...current, shiftStatus: event.target.value as SitePlanShiftStatus }))}
              disabled={!canEdit}
            >
              {shiftStatusOptions.map((shiftStatus) => (
                <option key={shiftStatus} value={shiftStatus}>
                  {t(`planning.shiftStatus.${shiftStatus}` as never)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="planning-text-grid">
          <label>
            <span>{t('planning.briefing')}</span>
            <textarea
              value={draft.briefing}
              onChange={(event) => updateDraft((current) => ({ ...current, briefing: event.target.value }))}
              disabled={!canEdit}
              rows={4}
            />
          </label>
          <label>
            <span>{t('planning.safetyNotes')}</span>
            <textarea
              value={draft.safetyNotes}
              onChange={(event) => updateDraft((current) => ({ ...current, safetyNotes: event.target.value }))}
              disabled={!canEdit}
              rows={4}
            />
          </label>
        </div>
        <div className="planning-zone-actions">
          {canEdit ? (
            <button type="button" className="ghost-button" onClick={addBriefing}>
              {t('planning.addBriefing')}
            </button>
          ) : null}
        </div>
        <div className="zone-grid">
          {draft.briefings.map((briefing) => (
            <article key={briefing.key} className="zone-card zone-card--focus">
              <div className="zone-card__header">
                <div>
                  <input
                    className="zone-card__input zone-card__input--title"
                    value={briefing.title}
                    onChange={(event) => {
                      updateDraft((current) => ({
                        ...current,
                        briefings: current.briefings.map((entry) => (
                          entry.key === briefing.key ? { ...entry, title: event.target.value } : entry
                        )),
                      }));
                    }}
                    disabled={!canEdit}
                    placeholder={t('planning.briefingTitle')}
                  />
                </div>
                <div className="zone-card__header-actions">
                  <select
                    className="zone-card__priority-select"
                    value={briefing.category}
                    onChange={(event) => {
                      updateDraft((current) => ({
                        ...current,
                        briefings: current.briefings.map((entry) => (
                          entry.key === briefing.key ? { ...entry, category: event.target.value as SitePlanBriefingCategory } : entry
                        )),
                      }));
                    }}
                    disabled={!canEdit}
                  >
                    {briefingCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {t(`planning.briefingCategory.${category}` as never)}
                      </option>
                    ))}
                  </select>
                  {canEdit ? (
                    <button type="button" className="ghost-button" onClick={() => removeBriefing(briefing.key)}>
                      {t('planning.removeBriefing')}
                    </button>
                  ) : null}
                </div>
              </div>
              <textarea
                value={briefing.note}
                onChange={(event) => {
                  updateDraft((current) => ({
                    ...current,
                    briefings: current.briefings.map((entry) => (
                      entry.key === briefing.key ? { ...entry, note: event.target.value } : entry
                    )),
                  }));
                }}
                disabled={!canEdit}
                rows={4}
                placeholder={t('planning.briefingNote')}
              />
            </article>
          ))}
        </div>
        {saveNotice ? <p className="planning-inline-success">{saveNotice}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('planning.zoneBoardEyebrow')}</p>
            <h3 className="panel__title">{t('planning.zoneBoardTitle')}</h3>
          </div>
          <span className="status-badge status-badge--planned">{formatNumber(activeTransportCount)} {t('dashboard.activeTransports')}</span>
        </div>
        {canEdit ? (
          <div className="planning-zone-actions">
            <button type="button" className="ghost-button" onClick={addZone}>
              {t('planning.addZone')}
            </button>
          </div>
        ) : null}
        <div className="zone-grid">
          {draft.zones.map((zone) => (
            <article key={zone.id} className={`zone-card zone-card--${zone.priority}`}>
              <div className="zone-card__header">
                <div>
                  <input
                    className="zone-card__input zone-card__input--title"
                    value={zone.name}
                    onChange={(event) => updateZone(zone.id, (current) => ({ ...current, name: event.target.value }))}
                    disabled={!canEdit}
                    placeholder={t('planning.zoneName')}
                  />
                  <p className="zone-card__meta">{t('planning.zoneShift')}: {zone.shiftLabel}</p>
                </div>
                <div className="zone-card__header-actions">
                  <select
                    className="zone-card__priority-select"
                    value={zone.priority}
                    onChange={(event) => updateZone(zone.id, (current) => ({ ...current, priority: event.target.value as SitePlanPriority }))}
                    disabled={!canEdit}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {t(`planning.priority.${priority}` as never)}
                      </option>
                    ))}
                  </select>
                  {canEdit ? (
                    <button type="button" className="ghost-button" onClick={() => removeZone(zone.id)}>
                      {t('planning.removeZone')}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="zone-card__editor-grid">
                <label>
                  <span>{t('planning.zoneShift')}</span>
                  <input
                    value={zone.shiftLabel}
                    onChange={(event) => updateZone(zone.id, (current) => ({ ...current, shiftLabel: event.target.value }))}
                    disabled={!canEdit}
                  />
                </label>
                <label>
                  <span>{t('planning.zoneLeader')}</span>
                  <select
                    value={zone.leadUserId}
                    onChange={(event) => updateZone(zone.id, (current) => ({ ...current, leadUserId: event.target.value }))}
                    disabled={!canEdit}
                  >
                    <option value="">{t('planning.none')}</option>
                    {siteCrew.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} · {formatUserRole(member.role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <dl className="zone-card__details">
                <div>
                  <dt>{t('planning.zoneFocus')}</dt>
                  <dd>
                    <textarea
                      value={zone.focus}
                      onChange={(event) => updateZone(zone.id, (current) => ({ ...current, focus: event.target.value }))}
                      disabled={!canEdit}
                      rows={3}
                    />
                  </dd>
                </div>
                <div>
                  <dt>{t('planning.supportCategory')}</dt>
                  <dd>
                    <input
                      value={zone.supportCategory}
                      onChange={(event) => updateZone(zone.id, (current) => ({ ...current, supportCategory: event.target.value }))}
                      disabled={!canEdit}
                    />
                  </dd>
                </div>
                <div>
                  <dt>{t('planning.zoneSupport')}</dt>
                  <dd>
                    <select
                      value={zone.supportMaterialId}
                      onChange={(event) => updateZone(zone.id, (current) => ({ ...current, supportMaterialId: event.target.value }))}
                      disabled={!canEdit}
                    >
                      <option value="">{t('planning.none')}</option>
                      {siteMaterials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.title}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('planning.zoneTransport')}</dt>
                  <dd>
                    <select
                      value={zone.activeTransportId}
                      onChange={(event) => updateZone(zone.id, (current) => ({ ...current, activeTransportId: event.target.value }))}
                      disabled={!canEdit}
                    >
                      <option value="">{t('planning.none')}</option>
                      {siteTransports.map((transport) => (
                        <option key={transport.id} value={transport.id}>
                          {transport.material?.title} · {transport.toSite?.name}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('planning.supportTruck')}</dt>
                  <dd>
                    <select
                      value={zone.supportTruckId}
                      onChange={(event) => updateZone(zone.id, (current) => ({ ...current, supportTruckId: event.target.value }))}
                      disabled={!canEdit}
                    >
                      <option value="">{t('planning.none')}</option>
                      {siteTrucks.map((truck) => (
                        <option key={truck.id} value={truck.id}>
                          {truck.name}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
              </dl>
              <div className="zone-card__crew">
                <div className="zone-card__crew-header">
                  <strong>{t('planning.materialNeeds')}</strong>
                  {canEdit ? (
                    <button type="button" className="ghost-button" onClick={() => addMaterialNeed(zone.id)}>
                      {t('planning.addMaterialNeed')}
                    </button>
                  ) : null}
                </div>
                <div className="zone-card__assignment-list">
                  {zone.materialNeeds.map((materialNeed) => (
                    <div key={materialNeed.key} className="zone-card__need-row">
                      <input
                        value={materialNeed.label}
                        onChange={(event) => {
                          updateZone(zone.id, (current) => ({
                            ...current,
                            materialNeeds: current.materialNeeds.map((entry) => (
                              entry.key === materialNeed.key ? { ...entry, label: event.target.value } : entry
                            )),
                          }));
                        }}
                        disabled={!canEdit}
                        placeholder={t('planning.materialNeedLabel')}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={materialNeed.quantity}
                        onChange={(event) => {
                          updateZone(zone.id, (current) => ({
                            ...current,
                            materialNeeds: current.materialNeeds.map((entry) => (
                              entry.key === materialNeed.key ? { ...entry, quantity: Number(event.target.value) || 0 } : entry
                            )),
                          }));
                        }}
                        disabled={!canEdit}
                      />
                      <input
                        value={materialNeed.unit}
                        onChange={(event) => {
                          updateZone(zone.id, (current) => ({
                            ...current,
                            materialNeeds: current.materialNeeds.map((entry) => (
                              entry.key === materialNeed.key ? { ...entry, unit: event.target.value } : entry
                            )),
                          }));
                        }}
                        disabled={!canEdit}
                        placeholder={t('planning.materialNeedUnit')}
                      />
                      <select
                        value={materialNeed.status}
                        onChange={(event) => {
                          updateZone(zone.id, (current) => ({
                            ...current,
                            materialNeeds: current.materialNeeds.map((entry) => (
                              entry.key === materialNeed.key ? { ...entry, status: event.target.value as SitePlanMaterialNeedStatus } : entry
                            )),
                          }));
                        }}
                        disabled={!canEdit}
                      >
                        {materialNeedStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {t(`planning.materialNeedStatus.${status}` as never)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={materialNeed.materialId}
                        onChange={(event) => {
                          updateZone(zone.id, (current) => ({
                            ...current,
                            materialNeeds: current.materialNeeds.map((entry) => (
                              entry.key === materialNeed.key ? { ...entry, materialId: event.target.value } : entry
                            )),
                          }));
                        }}
                        disabled={!canEdit}
                      >
                        <option value="">{t('planning.none')}</option>
                        {siteMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.title}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={materialNeed.notes}
                        onChange={(event) => {
                          updateZone(zone.id, (current) => ({
                            ...current,
                            materialNeeds: current.materialNeeds.map((entry) => (
                              entry.key === materialNeed.key ? { ...entry, notes: event.target.value } : entry
                            )),
                          }));
                        }}
                        disabled={!canEdit}
                        rows={2}
                        placeholder={t('planning.materialNeedNotes')}
                      />
                      {canEdit ? (
                        <button type="button" className="ghost-button" onClick={() => removeMaterialNeed(zone.id, materialNeed.key)}>
                          {t('planning.removeMaterialNeed')}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="zone-card__crew">
                <div className="zone-card__crew-header">
                  <strong>{t('planning.assignedCrew')}</strong>
                  {canEdit ? (
                    <button type="button" className="ghost-button" onClick={() => addAssignment(zone.id)}>
                      {t('planning.addCrew')}
                    </button>
                  ) : null}
                </div>
                <div className="zone-card__assignment-list">
                  {zone.assignments.map((assignment) => {
                    const searchTerm = crewSearches[assignment.key] ?? '';
                    const filteredUsers = allUsersForAssignment.filter(
                      (u) =>
                        searchTerm === '' ||
                        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.role.toLowerCase().includes(searchTerm.toLowerCase()),
                    );
                    return (
                      <div key={assignment.key} className="zone-card__assignment-row">
                        <div className="zone-card__assignment-search">
                          <input
                            type="search"
                            className="zone-card__assignment-search-input"
                            placeholder="Arbeiter suchen (Name oder Rolle)…"
                            value={searchTerm}
                            onChange={(event) =>
                              setCrewSearches((prev) => ({ ...prev, [assignment.key]: event.target.value }))
                            }
                            disabled={!canEdit}
                          />
                          <select
                            value={assignment.userId}
                            onChange={(event) => {
                              updateZone(zone.id, (current) => ({
                                ...current,
                                assignments: current.assignments.map((entry) =>
                                  entry.key === assignment.key ? { ...entry, userId: event.target.value } : entry,
                                ),
                              }));
                            }}
                            disabled={!canEdit}
                          >
                            <option value="">{t('planning.none')}</option>
                            {filteredUsers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} · {formatUserRole(member.role)}
                                {member.siteId !== selectedSiteId && member.site?.name
                                  ? ` · ${member.site.name}`
                                  : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => removeAssignment(zone.id, assignment.key)}
                          >
                            {t('planning.removeCrew')}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">{t('planning.rosterEyebrow')}</p>
            <h3 className="panel__title">{t('planning.rosterTitle')}</h3>
          </div>
        </div>
        <div className="roster-grid">
          {siteCrew.map((member) => (
            <article key={member.id} className="roster-card">
              <strong className="roster-card__name">{member.name}</strong>
              <span className="roster-card__role">{formatUserRole(member.role)}</span>
              <span className="roster-card__site">{member.site?.name ?? focusSite?.name}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}