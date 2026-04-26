import { useEffect, useState, startTransition, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { hasSectionAccess, type AuthUser, type MaterialItem, type NotificationEventItem, type PlatformSection, type SiteSummary, type TransportRequestItem, type TruckItem } from '@matflow/shared-types';
import { api } from './api/client';
import { AppShell } from './components/AppShell';
import { getHomePath } from './constants/workspace';
import { useSession } from './hooks/useSession';
import { DashboardPage } from './pages/DashboardPage';
import { DriverPortalPage } from './pages/DriverPortalPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { PlanningPage } from './pages/PlanningPage';
import { AdminPage, FleetPage, NotificationsPage, PeoplePage, ReportsPage, SitesPage } from './pages/PlatformPages';
import { TransportPage } from './pages/TransportPage';
import logoUrl from './assets/logo.svg';
import { I18nProvider, LANGUAGE_STORAGE_KEY, getInitialLanguage, languageOptions, type Language, useI18n } from './i18n';

interface DashboardState {
  materials: MaterialItem[];
  transports: TransportRequestItem[];
  notifications: NotificationEventItem[];
  sites: SiteSummary[];
  trucks: TruckItem[];
  users: AuthUser[];
}

const emptyDashboardState: DashboardState = {
  materials: [],
  transports: [],
  notifications: [],
  sites: [],
  trucks: [],
  users: [],
};

function SectionGate({
  children,
  section,
  user,
}: {
  children: JSX.Element;
  section: PlatformSection;
  user: AuthUser;
}) {
  if (!hasSectionAccess(user.role, section)) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return children;
}

function LoginScreen({
  onSubmit,
  isLoading,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
}) {
  const { formatErrorMessage, language, setLanguage, t } = useI18n();
  const [email, setEmail] = useState('mara@matflow.local');
  const [password, setPassword] = useState('matflow123');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit(email, password);
    } catch (nextError) {
      setError(formatErrorMessage(nextError, 'login.errorFallback'));
    }
  }

  return (
    <div className="login-screen">
      <div className="login-screen__panel">
        <div className="login-screen__toolbar">
          <label className="login-screen__language">
            <span>{t('login.languageLabel')}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t('login.languageLabel')}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="login-brand">
          <img className="login-brand__logo" src={logoUrl} alt={t('app.logoAlt')} />
          <div>
            <p className="login-brand__eyebrow">{t('app.brandEyebrow')}</p>
            <h1 className="login-brand__title">BauFlow</h1>
          </div>
        </div>
        <h2 className="login-screen__heading">{t('login.heading')}</h2>
        <p className="login-screen__copy">
          {t('login.copy')}
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>{t('login.email')}</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            <span>{t('login.password')}</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="primary-button primary-button--full" disabled={isLoading}>
            {isLoading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <a className="ghost-button login-screen__driver-link" href="/driver">
          {t('driver.openPortal')}
        </a>
        <div className="login-screen__demo">
          <strong>{t('login.demoCredentials')}</strong>
          <span>mara@matflow.local / matflow123</span>
        </div>
      </div>
      <div className="login-screen__art">
        <div className="signal-block signal-block--dark">
          <span className="signal-block__label">{t('login.nearbyFirstLabel')}</span>
          <span className="signal-block__value">{t('login.nearbyFirstValue')}</span>
        </div>
        <div className="signal-block signal-block--gold">
          <span className="signal-block__label">{t('login.fleetReadyLabel')}</span>
          <span className="signal-block__value">{t('login.fleetReadyValue')}</span>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { formatErrorMessage, t } = useI18n();
  const { session, isAuthenticating, login, logout } = useSession();
  const isDriverPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/driver');
  const [dashboardState, setDashboardState] = useState<DashboardState>(emptyDashboardState);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootError, setBootError] = useState('');

  async function refreshDashboardData(currentToken = session?.token) {
    if (!currentToken) {
      return;
    }

    setIsBootstrapping(true);
    setBootError('');

    try {
      const [materials, transports, notifications, sites, trucks, users] = await Promise.all([
        api.getMaterials(currentToken, { distance: 250 }),
        api.getTransportRequests(currentToken),
        api.getNotifications(currentToken),
        api.getSites(currentToken),
        api.getTrucks(currentToken),
        api.getUsers(currentToken),
      ]);

      startTransition(() => {
        setDashboardState({ materials, transports, notifications, sites, trucks, users });
      });
    } catch (nextError) {
      setBootError(formatErrorMessage(nextError, 'app.dashboardLoadError'));
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    if (!session?.token) {
      setDashboardState(emptyDashboardState);
      return;
    }

    void refreshDashboardData(session.token);
  }, [session?.token]);

  if (!session) {
    if (isDriverPortal) {
      return <DriverPortalPage />;
    }

    return <LoginScreen onSubmit={(email, password) => login({ email, password })} isLoading={isAuthenticating} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell user={session.user} onLogout={logout} />}>
          <Route index element={<Navigate to={getHomePath(session.user.role)} replace />} />
          <Route
            path="dashboard"
            element={
              <SectionGate section="dashboard" user={session.user}>
                <DashboardPage
                  currentUser={session.user}
                  materials={dashboardState.materials}
                  transports={dashboardState.transports}
                  notifications={dashboardState.notifications}
                  sites={dashboardState.sites}
                  trucks={dashboardState.trucks}
                  users={dashboardState.users}
                  onRefresh={() => refreshDashboardData(session.token)}
                />
              </SectionGate>
            }
          />
          <Route
            path="planning"
            element={
              <SectionGate section="planning" user={session.user}>
                <PlanningPage
                  token={session.token}
                  currentUser={session.user}
                  users={dashboardState.users}
                  materials={dashboardState.materials}
                  transports={dashboardState.transports}
                  sites={dashboardState.sites}
                  trucks={dashboardState.trucks}
                  onRefresh={() => refreshDashboardData(session.token)}
                />
              </SectionGate>
            }
          />
          <Route
            path="sites"
            element={
              <SectionGate section="sites" user={session.user}>
                <SitesPage
                  token={session.token}
                  currentUser={session.user}
                  materials={dashboardState.materials}
                  sites={dashboardState.sites}
                  transports={dashboardState.transports}
                  trucks={dashboardState.trucks}
                  users={dashboardState.users}
                  onRefresh={() => refreshDashboardData(session.token)}
                />
              </SectionGate>
            }
          />
          <Route
            path="people"
            element={
              <SectionGate section="people" user={session.user}>
                <PeoplePage users={dashboardState.users} />
              </SectionGate>
            }
          />
          <Route
            path="fleet"
            element={
              <SectionGate section="fleet" user={session.user}>
                <FleetPage transports={dashboardState.transports} trucks={dashboardState.trucks} />
              </SectionGate>
            }
          />
          <Route
            path="materials"
            element={
              <SectionGate section="materials" user={session.user}>
                <MaterialsPage
                  token={session.token}
                  currentUser={session.user}
                  initialMaterials={dashboardState.materials}
                  sites={dashboardState.sites}
                  onRefresh={() => refreshDashboardData(session.token)}
                />
              </SectionGate>
            }
          />
          <Route
            path="transport"
            element={
              <SectionGate section="transport" user={session.user}>
                <TransportPage
                  token={session.token}
                  materials={dashboardState.materials}
                  transports={dashboardState.transports}
                  trucks={dashboardState.trucks}
                  sites={dashboardState.sites}
                  onRefresh={() => refreshDashboardData(session.token)}
                />
              </SectionGate>
            }
          />
          <Route
            path="notifications"
            element={
              <SectionGate section="notifications" user={session.user}>
                <NotificationsPage notifications={dashboardState.notifications} />
              </SectionGate>
            }
          />
          <Route
            path="reports"
            element={
              <SectionGate section="reports" user={session.user}>
                <ReportsPage
                  materials={dashboardState.materials}
                  transports={dashboardState.transports}
                  trucks={dashboardState.trucks}
                  users={dashboardState.users}
                />
              </SectionGate>
            }
          />
          <Route
            path="admin"
            element={
              <SectionGate section="admin" user={session.user}>
                <AdminPage
                  materials={dashboardState.materials}
                  notifications={dashboardState.notifications}
                  sites={dashboardState.sites}
                  transports={dashboardState.transports}
                  trucks={dashboardState.trucks}
                  users={dashboardState.users}
                />
              </SectionGate>
            }
          />
        </Route>
      </Routes>
      {isBootstrapping ? <div className="toast">{t('app.refreshingBoard')}</div> : null}
      {bootError ? <div className="toast toast--error">{bootError}</div> : null}
    </BrowserRouter>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }

    document.documentElement.lang = language;
    document.title = 'BauFlow';
  }, [language]);

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <AppContent />
    </I18nProvider>
  );
}
