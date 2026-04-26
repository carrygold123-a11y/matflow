import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import type { DriverNoteItem, SiteSummary } from '@matflow/shared-types';
import { api } from '../api/client';
import { useI18n } from '../i18n';

const DRIVER_TOKEN_KEY = 'bauflow-driver-token';
const DRIVER_TRUCK_KEY = 'bauflow-driver-truck';
const DRIVER_NOTE_KEY = 'bauflow-driver-note';

const VEHICLE_TYPES = ['Dreiachser', 'Vierachser', 'Sattelzug', 'Hängerzug'];

interface Point {
  x: number;
  y: number;
}

function getRelativePoint(event: PointerEvent<SVGSVGElement>, svgElement: SVGSVGElement): Point {
  const bounds = svgElement.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(320, ((event.clientX - bounds.left) / bounds.width) * 320)),
    y: Math.max(0, Math.min(120, ((event.clientY - bounds.top) / bounds.height) * 120)),
  };
}

function buildSignaturePath(points: Point[]) {
  if (points.length === 0) return '';
  const [firstPoint, ...restPoints] = points;
  return `M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)} ${restPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}`;
}

function buildSignatureSvg(strokes: Point[][]) {
  const pathData = strokes.map(buildSignaturePath).filter(Boolean);
  if (!pathData.length) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect width="320" height="120" fill="#fffdf7"/><g fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${pathData.map((path) => `<path d="${path}" />`).join('')}</g></svg>`;
}

function SignaturePad({ disabled, onChange }: { disabled: boolean; onChange: (svg: string) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDrawingRef = useRef(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);

  useEffect(() => { onChange(buildSignatureSvg(strokes)); }, [onChange, strokes]);

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (disabled || !svgRef.current) return;
    svgRef.current.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    setStrokes((s) => [...s, [getRelativePoint(event, svgRef.current as SVGSVGElement)]]);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current || disabled || !svgRef.current) return;
    const point = getRelativePoint(event, svgRef.current);
    setStrokes((s) => {
      if (!s.length) return s;
      return [...s.slice(0, -1), [...s[s.length - 1], point]];
    });
  }

  function stopDrawing() { isDrawingRef.current = false; }

  return (
    <div className="signature-pad">
      <svg ref={svgRef} className={`signature-pad__canvas${disabled ? ' signature-pad__canvas--disabled' : ''}`} viewBox="0 0 320 120" role="img" aria-label="Signature pad"
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDrawing} onPointerLeave={stopDrawing}>
        <rect x="0" y="0" width="320" height="120" rx="12" fill="#fffdf7" />
        {strokes.map((stroke, i) => <path key={`${i}-${stroke.length}`} d={buildSignaturePath(stroke)} fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      <button type="button" className="ghost-button" onClick={() => setStrokes([])} disabled={disabled || strokes.length === 0}>Löschen</button>
    </div>
  );
}

export function DriverPortalPage() {
  const { t } = useI18n();

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(DRIVER_TOKEN_KEY));
  const [truck, setTruck] = useState<{ id: string; name: string; licensePlate: string } | null>(() => {
    const raw = localStorage.getItem(DRIVER_TRUCK_KEY);
    return raw ? (JSON.parse(raw) as { id: string; name: string; licensePlate: string }) : null;
  });
  const [completedNote, setCompletedNote] = useState<DriverNoteItem | null>(() => {
    const raw = localStorage.getItem(DRIVER_NOTE_KEY);
    return raw ? (JSON.parse(raw) as DriverNoteItem) : null;
  });

  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [driverName, setDriverName] = useState('');
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [fromSiteId, setFromSiteId] = useState('');
  const [toSiteId, setToSiteId] = useState('');
  const [signatureSvg, setSignatureSvg] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sites after login
  useEffect(() => {
    if (!token) return;
    api.getSites(token).then(setSites).catch(() => setSites([]));
  }, [token]);

  function handleLogout() {
    localStorage.removeItem(DRIVER_TOKEN_KEY);
    localStorage.removeItem(DRIVER_TRUCK_KEY);
    localStorage.removeItem(DRIVER_NOTE_KEY);
    setToken(null);
    setTruck(null);
    setCompletedNote(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api.driverLogin({ licensePlate });
      localStorage.setItem(DRIVER_TOKEN_KEY, response.accessToken);
      localStorage.setItem(DRIVER_TRUCK_KEY, JSON.stringify(response.truck));
      setToken(response.accessToken);
      setTruck(response.truck);
      setCompletedNote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !signatureSvg) return;
    setError('');
    setIsSubmitting(true);
    try {
      const note = await api.createDriverNote(token, { vehicleType, driverName, fromSiteId, toSiteId, signatureSvg });
      localStorage.setItem(DRIVER_NOTE_KEY, JSON.stringify(note));
      setCompletedNote(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Login screen
  if (!token || !truck) {
    return (
      <div className="login-screen login-screen--driver">
        <div className="login-screen__panel">
          <div className="login-screen__toolbar">
            <a className="ghost-button" href="/">{t('driver.backToLogin')}</a>
          </div>
          <div className="login-brand">
            <div>
              <p className="login-brand__eyebrow">BauFlow Driver</p>
              <h1 className="login-brand__title">{t('driver.title')}</h1>
            </div>
          </div>
          <p className="login-screen__copy">Melde dich mit deinem Fahrzeug-Kennzeichen an.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label>
              <span>{t('driver.licensePlate')}</span>
              <input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} autoCapitalize="characters" required />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" className="primary-button primary-button--full" disabled={isSubmitting}>
              {isSubmitting ? t('driver.loggingIn') : t('driver.login')}
            </button>
          </form>
        </div>
        <div className="login-screen__art">
          <div className="signal-block signal-block--dark"><span className="signal-block__label">LS</span><span className="signal-block__value">Lieferschein</span></div>
          <div className="signal-block signal-block--gold"><span className="signal-block__label">PDF</span><span className="signal-block__value">Automatisch erstellt</span></div>
        </div>
      </div>
    );
  }

  // Success screen
  if (completedNote) {
    return (
      <div className="page-grid driver-portal">
        <section className="hero-card">
          <div>
            <p className="hero-card__eyebrow">Lieferschein erstellt</p>
            <h2 className="hero-card__title">{completedNote.fromSite.name} → {completedNote.toSite.name}</h2>
            <p className="hero-card__copy">{completedNote.licensePlate} · {completedNote.vehicleType}</p>
          </div>
          <div className="hero-card__actions">
            {completedNote.deliveryNotePath ? (
              <a className="ghost-button" href={completedNote.deliveryNotePath} target="_blank" rel="noreferrer">Lieferschein öffnen</a>
            ) : null}
            <button type="button" className="primary-button" onClick={() => { setCompletedNote(null); localStorage.removeItem(DRIVER_NOTE_KEY); }}>
              Neuer Lieferschein
            </button>
            <button type="button" className="danger-button" onClick={handleLogout}>Abmelden</button>
          </div>
        </section>
        <section className="panel panel--wide">
          <div className="panel__header"><div><p className="panel__eyebrow">Details</p><h3 className="panel__title">Fahrerdaten</h3></div></div>
          <div className="driver-portal__summary-grid">
            {[['Kennzeichen', completedNote.licensePlate], ['Fahrzeugtyp', completedNote.vehicleType], ['Fahrername', completedNote.driverName || '-'], ['Von', completedNote.fromSite.name], ['Nach', completedNote.toSite.name]].map(([label, value]) => (
              <article key={label} className="mini-card"><p className="mini-card__title">{label}</p><p className="mini-card__sub">{value}</p></article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Note form
  return (
    <div className="page-grid driver-portal">
      <section className="hero-card">
        <div>
          <p className="hero-card__eyebrow">BauFlow Driver</p>
          <h2 className="hero-card__title">Lieferschein erstellen</h2>
          <p className="hero-card__copy">{truck.licensePlate} · {truck.name}</p>
        </div>
        <div className="hero-card__actions">
          <button type="button" className="danger-button" onClick={handleLogout}>Abmelden</button>
        </div>
      </section>
      <section className="panel panel--wide">
        <div className="panel__header"><div><p className="panel__eyebrow">Formular</p><h3 className="panel__title">Fahrt eintragen</h3></div></div>
        <form className="driver-portal__form" onSubmit={handleSubmitNote}>
          <label>
            <span>Fahrzeugtyp</span>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} required>
              <option value="">Bitte wählen...</option>
              {VEHICLE_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
            </select>
          </label>
          <label>
            <span>Fahrername</span>
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Name des Fahrers" />
          </label>
          <label>
            <span>Ladebaustelle</span>
            <select value={fromSiteId} onChange={(e) => setFromSiteId(e.target.value)} required>
              <option value="">Bitte wählen...</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            <span>Abladebaustelle</span>
            <select value={toSiteId} onChange={(e) => setToSiteId(e.target.value)} required>
              <option value="">Bitte wählen...</option>
              {sites.filter((s) => s.id !== fromSiteId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="driver-portal__signature-block">
            <p className="driver-portal__signature-label">Unterschrift Fahrer</p>
            <p className="driver-portal__signature-hint">Bitte im Feld unterschreiben</p>
            <SignaturePad disabled={isSubmitting} onChange={setSignatureSvg} />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={isSubmitting || !signatureSvg || !vehicleType || !fromSiteId || !toSiteId}>
            {isSubmitting ? 'Erstelle Lieferschein...' : 'Lieferschein erstellen & signieren'}
          </button>
        </form>
      </section>
    </div>
  );
}

const DRIVER_SESSION_STORAGE_KEY = 'bauflow-driver-session';

interface DriverSessionState {
  token: string;
  transport: TransportRequestItem;
}

interface Point {
  x: number;
  y: number;
}

function getRelativePoint(event: PointerEvent<SVGSVGElement>, svgElement: SVGSVGElement): Point {
  const bounds = svgElement.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(320, ((event.clientX - bounds.left) / bounds.width) * 320)),
    y: Math.max(0, Math.min(120, ((event.clientY - bounds.top) / bounds.height) * 120)),
  };
}

function buildSignaturePath(points: Point[]) {
  if (points.length === 0) {
    return '';
  }

  const [firstPoint, ...restPoints] = points;
  return `M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)} ${restPoints.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')}`;
}

function buildSignatureSvg(strokes: Point[][]) {
  const pathData = strokes.map(buildSignaturePath).filter(Boolean);
  if (!pathData.length) {
    return '';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect width="320" height="120" fill="#fffdf7"/><g fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${pathData.map((path) => `<path d="${path}" />`).join('')}</g></svg>`;
}

function SignaturePad({
  clearLabel,
  disabled,
  onChange,
}: {
  clearLabel: string;
  disabled: boolean;
  onChange: (signatureSvg: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDrawingRef = useRef(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);

  useEffect(() => {
    onChange(buildSignatureSvg(strokes));
  }, [onChange, strokes]);

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (disabled || !svgRef.current) {
      return;
    }

    svgRef.current.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    setStrokes((current) => [...current, [getRelativePoint(event, svgRef.current as SVGSVGElement)]]);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current || disabled || !svgRef.current) {
      return;
    }

    const point = getRelativePoint(event, svgRef.current);
    setStrokes((current) => {
      if (!current.length) {
        return current;
      }

      const nextStrokes = current.slice();
      nextStrokes[nextStrokes.length - 1] = [...nextStrokes[nextStrokes.length - 1], point];
      return nextStrokes;
    });
  }

  function stopDrawing(event: PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) {
      return;
    }

    isDrawingRef.current = false;
    if (svgRef.current.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="signature-pad">
      <svg
        ref={svgRef}
        className={`signature-pad__canvas${disabled ? ' signature-pad__canvas--disabled' : ''}`}
        viewBox="0 0 320 120"
        role="img"
        aria-label="Signature pad"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      >
        <rect x="0" y="0" width="320" height="120" rx="12" fill="#fffdf7" />
        {strokes.map((stroke, index) => (
          <path key={`${index}-${stroke.length}`} d={buildSignaturePath(stroke)} fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <button type="button" className="ghost-button" onClick={() => setStrokes([])} disabled={disabled || strokes.length === 0}>
        {clearLabel}
      </button>
    </div>
  );
}

export function DriverPortalPage() {
  const { formatTransportStatus, t } = useI18n();
  const [session, setSession] = useState<DriverSessionState | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawSession = window.localStorage.getItem(DRIVER_SESSION_STORAGE_KEY);
    return rawSession ? (JSON.parse(rawSession) as DriverSessionState) : null;
  });
  const [licensePlate, setLicensePlate] = useState('');

  const [signedBy, setSignedBy] = useState('');
  const [loadingQrCode, setLoadingQrCode] = useState('');
  const [unloadingQrCode, setUnloadingQrCode] = useState('');
  const [signatureSvg, setSignatureSvg] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(DRIVER_SESSION_STORAGE_KEY, JSON.stringify(session));
      return;
    }

    window.localStorage.removeItem(DRIVER_SESSION_STORAGE_KEY);
  }, [session]);

  const transport = session?.transport;
  const deliveryNotePath = transport?.driverAccess?.deliveryNotePath;
  const loadingConfirmed = Boolean(transport?.driverAccess?.loadingSignedAt);
  const unloadingConfirmed = Boolean(transport?.driverAccess?.unloadingScannedAt);

  const summaryRows = useMemo(
    () =>
      transport
        ? [
            ['Status', formatTransportStatus(transport.status)],
            ['Kennzeichen', transport.truck?.licensePlate || '-'],
            ['Material', transport.material?.title || '-'],
            ['Route', `${transport.fromSite?.name || '-'} -> ${transport.toSite?.name || '-'}`],
          ]
        : [],
    [formatTransportStatus, transport],
  );

  async function refreshCurrentTransport() {
    if (!session) {
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const nextTransport = await api.getDriverCurrentTransport(session.token);
      setSession({ token: session.token, transport: nextTransport });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('login.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDriverLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.driverLogin({ licensePlate });
      setSession({ token: response.accessToken, transport: response.transport });
      setSignedBy(response.transport.driverAccess?.driverName || '');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('login.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmLoading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.transport || !signatureSvg) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const nextTransport = await api.confirmDriverLoading(session.token, session.transport.id, {
        qrToken: loadingQrCode,
        signedBy,
        signatureSvg,
      });
      setSession({ token: session.token, transport: nextTransport });
      setLoadingQrCode('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('login.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmUnloading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.transport) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const nextTransport = await api.confirmDriverUnloading(session.token, session.transport.id, {
        qrToken: unloadingQrCode,
      });
      setSession({ token: session.token, transport: nextTransport });
      setUnloadingQrCode('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('login.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) {
    return (
      <div className="login-screen login-screen--driver">
        <div className="login-screen__panel">
          <div className="login-screen__toolbar">
            <a className="ghost-button" href="/">
              {t('driver.backToLogin')}
            </a>
          </div>
          <div className="login-brand">
            <div>
              <p className="login-brand__eyebrow">BauFlow Driver</p>
              <h1 className="login-brand__title">{t('driver.title')}</h1>
            </div>
          </div>
          <p className="login-screen__copy">{t('driver.copy')}</p>
          <form className="login-form" onSubmit={handleDriverLogin}>
            <label>
              <span>{t('driver.licensePlate')}</span>
              <input value={licensePlate} onChange={(event) => setLicensePlate(event.target.value)} autoCapitalize="characters" required />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" className="primary-button primary-button--full" disabled={isSubmitting}>
              {isSubmitting ? t('driver.loggingIn') : t('driver.login')}
            </button>
          </form>
        </div>
        <div className="login-screen__art">
          <div className="signal-block signal-block--dark">
            <span className="signal-block__label">QR</span>
            <span className="signal-block__value">{t('driver.loadingSection')}</span>
          </div>
          <div className="signal-block signal-block--gold">
            <span className="signal-block__label">PDF</span>
            <span className="signal-block__value">{t('driver.deliveryNoteReady')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-grid driver-portal">
      <section className="hero-card">
        <div>
          <p className="hero-card__eyebrow">BauFlow Driver</p>
          <h2 className="hero-card__title">{t('driver.currentTransport')}</h2>
          <p className="hero-card__copy">{`${transport?.fromSite?.name || '-'} -> ${transport?.toSite?.name || '-'}`}</p>
        </div>
        <div className="hero-card__actions">
          <button type="button" className="ghost-button" onClick={() => void refreshCurrentTransport()} disabled={isSubmitting}>
            {t('driver.refresh')}
          </button>
          <button type="button" className="danger-button" onClick={() => setSession(null)}>
            {t('driver.logout')}
          </button>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="driver-portal__summary-grid">
          {summaryRows.map(([label, value]) => (
            <article key={label} className="mini-card">
              <p className="mini-card__title">{label}</p>
              <p className="mini-card__sub">{value}</p>
            </article>
          ))}
        </div>
        <div className="driver-portal__status-row">
          {loadingConfirmed ? <span className="status-badge status-badge--available">{t('driver.loadingDone')}</span> : null}
          {unloadingConfirmed ? <span className="status-badge status-badge--available">{t('driver.unloadingDone')}</span> : null}
          {deliveryNotePath ? (
            <a className="ghost-button" href={deliveryNotePath} target="_blank" rel="noreferrer">
              {t('driver.deliveryNote')}
            </a>
          ) : null}
        </div>
      </section>

      {!loadingConfirmed ? (
        <section className="panel panel--wide">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">QR</p>
              <h3 className="panel__title">{t('driver.loadingSection')}</h3>
            </div>
          </div>
          <form className="driver-portal__form" onSubmit={handleConfirmLoading}>
            <label>
              <span>{t('driver.qrCode')}</span>
              <input value={loadingQrCode} onChange={(event) => setLoadingQrCode(event.target.value)} placeholder={t('driver.qrHint')} required />
            </label>
            <label>
              <span>{t('driver.signedBy')}</span>
              <input value={signedBy} onChange={(event) => setSignedBy(event.target.value)} required />
            </label>
            <div className="driver-portal__signature-block">
              <p className="driver-portal__signature-label">{t('driver.signature')}</p>
              <p className="driver-portal__signature-hint">{t('driver.signatureHint')}</p>
              <SignaturePad clearLabel={t('driver.clearSignature')} disabled={isSubmitting} onChange={setSignatureSvg} />
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" className="primary-button" disabled={isSubmitting || !signatureSvg}>
              {t('driver.confirmLoading')}
            </button>
          </form>
        </section>
      ) : null}

      {loadingConfirmed && transport?.status !== 'delivered' ? (
        <section className="panel panel--wide">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">QR</p>
              <h3 className="panel__title">{t('driver.unloadingSection')}</h3>
            </div>
          </div>
          <form className="driver-portal__form" onSubmit={handleConfirmUnloading}>
            <label>
              <span>{t('driver.qrCode')}</span>
              <input value={unloadingQrCode} onChange={(event) => setUnloadingQrCode(event.target.value)} placeholder={t('driver.qrHint')} required />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {t('driver.confirmUnloading')}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
