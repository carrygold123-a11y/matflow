import { useEffect, useState } from 'react';
import type { AuthUser, SiteSummary } from '@matflow/shared-types';
import { api } from '../api/client';

// ── Tagesplan data model (serialised into the briefing field) ─────────────────
interface TWorker {
  id: string;
  name: string;
  nr: string;
}

interface TSection {
  id: string;
  title: string;
  note: string;
  workerIds: string[];
}

interface TagesplanData {
  __tagesplan: true;
  dayNote: string;
  workers: TWorker[];
  sections: TSection[];
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseTagesplan(briefing: string): TagesplanData {
  try {
    const data = JSON.parse(briefing);
    if (data && data.__tagesplan) return data as TagesplanData;
  } catch {
    // ignore
  }
  return { __tagesplan: true, dayNote: '', workers: [], sections: [] };
}

const emptyPlan = (): TagesplanData => ({
  __tagesplan: true,
  dayNote: '',
  workers: [],
  sections: [],
});

// ── Component ─────────────────────────────────────────────────────────────────
export function PlanningPage({
  token,
  currentUser,
  sites,
}: {
  token: string;
  currentUser: AuthUser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transports: any[];
  sites: SiteSummary[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trucks: any[];
  onRefresh: () => Promise<void>;
}) {
  const [planDate, setPlanDate] = useState(todayStr());
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [plan, setPlan] = useState<TagesplanData>(emptyPlan());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerNr, setNewWorkerNr] = useState('');

  useEffect(() => {
    if (sites.length === 0) return;
    const mine = sites.find((s) => s.id === (currentUser as { siteId?: string }).siteId);
    setSelectedSiteId((mine ?? sites[0]).id);
  }, [sites, currentUser]);

  useEffect(() => {
    if (!selectedSiteId) return;
    setLoading(true);
    setPlan(emptyPlan());
    api
      .getSitePlan(token, planDate, selectedSiteId)
      .then((p) => setPlan(parseTagesplan(p.briefing)))
      .catch(() => setPlan(emptyPlan()))
      .finally(() => setLoading(false));
  }, [selectedSiteId, planDate, token]);

  const save = async () => {
    setSaving(true);
    try {
      await api.upsertSitePlan(
        token,
        {
          planDate,
          status: 'published',
          shiftStatus: 'active',
          briefing: JSON.stringify(plan),
          safetyNotes: '',
          briefings: [],
          zones: [],
        },
        selectedSiteId,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const addWorker = () => {
    if (!newWorkerName.trim()) return;
    setPlan((p) => ({
      ...p,
      workers: [...p.workers, { id: newId(), name: newWorkerName.trim(), nr: newWorkerNr.trim() }],
    }));
    setNewWorkerName('');
    setNewWorkerNr('');
  };

  const removeWorker = (id: string) => {
    setPlan((p) => ({
      ...p,
      workers: p.workers.filter((w) => w.id !== id),
      sections: p.sections.map((s) => ({ ...s, workerIds: s.workerIds.filter((wid) => wid !== id) })),
    }));
  };

  const addSection = () => {
    setPlan((p) => ({
      ...p,
      sections: [...p.sections, { id: newId(), title: '', note: '', workerIds: [] }],
    }));
  };

  const updateSection = (id: string, patch: Partial<TSection>) => {
    setPlan((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeSection = (id: string) => {
    setPlan((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }));
  };

  const toggleWorkerInSection = (sectionId: string, workerId: string) => {
    setPlan((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          workerIds: s.workerIds.includes(workerId)
            ? s.workerIds.filter((id) => id !== workerId)
            : [...s.workerIds, workerId],
        };
      }),
    }));
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1rem 5rem' }}>

      <div className="hero-card" style={{ marginBottom: '1.5rem' }}>
        <div className="hero-card__eyebrow">Planung</div>
        <div className="hero-card__title">Tagesplan</div>
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>BAUSTELLE</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              style={selectStyle}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>DATUM</label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Lade Tagesplan...
        </div>
      )}

      {!loading && (
        <>
          <div className="panel" style={{ marginBottom: '1.25rem' }}>
            <div className="panel__header">
              <span className="panel__eyebrow">Allgemein</span>
              <h2 className="panel__title" style={{ margin: 0 }}>Tagesnotiz</h2>
            </div>
            <textarea
              value={plan.dayNote}
              onChange={(e) => setPlan((p) => ({ ...p, dayNote: e.target.value }))}
              placeholder="Was steht heute allgemein an der Baustelle an?"
              rows={3}
              style={textareaStyle}
            />
          </div>

          <div className="panel" style={{ marginBottom: '1.25rem' }}>
            <div className="panel__header">
              <span className="panel__eyebrow">Personal</span>
              <h2 className="panel__title" style={{ margin: 0 }}>Arbeiter auf der Baustelle</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Name"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWorker()}
                style={{ ...inputStyle, flex: 2, minWidth: 120 }}
              />
              <input
                type="text"
                placeholder="Personalnr."
                value={newWorkerNr}
                onChange={(e) => setNewWorkerNr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWorker()}
                style={{ ...inputStyle, flex: 1, minWidth: 80 }}
              />
              <button className="primary-button" onClick={addWorker}>
                + Hinzufuegen
              </button>
            </div>
            {plan.workers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">👷</div>
                <div className="empty-state__title">Noch keine Arbeiter eingetragen</div>
                <div className="empty-state__desc">
                  Fuege Arbeiter ueber Namen oder Personalnummer hinzu
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {plan.workers.map((w) => (
                  <div key={w.id} style={workerChipStyle}>
                    <span style={{ fontWeight: 600 }}>{w.name}</span>
                    {w.nr && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        &nbsp;#{w.nr}
                      </span>
                    )}
                    <button onClick={() => removeWorker(w.id)} style={chipRemoveBtn} title="Entfernen">
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={sectionEyebrow}>Aufgaben</div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Abschnitte des Tages
                </h2>
              </div>
              <button className="primary-button" onClick={addSection}>
                + Abschnitt
              </button>
            </div>

            {plan.sections.length === 0 && (
              <div className="panel">
                <div className="empty-state">
                  <div className="empty-state__icon">📋</div>
                  <div className="empty-state__title">Noch keine Aufgaben</div>
                  <div className="empty-state__desc">
                    Klicke auf "+ Abschnitt" um eine neue Aufgabe hinzuzufuegen
                  </div>
                </div>
              </div>
            )}

            {plan.sections.map((section, idx) => (
              <div key={section.id} className="panel" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    placeholder={`Aufgabe ${idx + 1} - z.B. Betonarbeiten Abschnitt A`}
                    style={{ ...inputStyle, flex: 1, fontSize: '1rem', fontWeight: 600 }}
                  />
                  <button className="danger-button" onClick={() => removeSection(section.id)} style={{ flexShrink: 0 }}>
                    Entfernen
                  </button>
                </div>
                <textarea
                  value={section.note}
                  onChange={(e) => updateSection(section.id, { note: e.target.value })}
                  placeholder="Was genau ist zu tun? Besonderheiten, Hinweise..."
                  rows={2}
                  style={{ ...textareaStyle, marginBottom: '0.75rem' }}
                />
                {plan.workers.length > 0 && (
                  <>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                      Eingeteilt
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {plan.workers.map((w) => {
                        const assigned = section.workerIds.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            onClick={() => toggleWorkerInSection(section.id, w.id)}
                            style={{
                              padding: '0.3rem 0.75rem',
                              borderRadius: 'var(--radius)',
                              border: `2px solid ${assigned ? 'var(--accent)' : 'var(--border)'}`,
                              background: assigned ? 'rgba(245,191,24,0.13)' : 'var(--surface)',
                              color: assigned ? 'var(--accent-deep)' : 'var(--text-secondary)',
                              fontWeight: assigned ? 700 : 400,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            {w.name}{w.nr ? ` #${w.nr}` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="primary-button"
              onClick={save}
              disabled={saving}
              style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
            >
              {saving ? 'Speichert...' : saved ? 'Gespeichert' : 'Tagesplan speichern'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  fontSize: '0.9rem',
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  resize: 'vertical',
  padding: '0.65rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  background: 'var(--surface)',
  color: 'var(--text)',
  boxSizing: 'border-box',
  outline: 'none',
};

const workerChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '0.35rem 0.75rem',
  fontSize: '0.875rem',
};

const chipRemoveBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  fontSize: '1.1rem',
  lineHeight: 1,
  padding: '0 0 0 0.2rem',
};

const sectionEyebrow: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  marginBottom: 2,
};
