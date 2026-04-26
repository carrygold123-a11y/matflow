import { NavLink, Outlet } from 'react-router-dom';
import { getRoleWorkspace, type AuthUser, type PlatformSection } from '@matflow/shared-types';
import logoUrl from '../assets/logo.svg';
import { sectionRouteMap } from '../constants/workspace';
import { useI18n } from '../i18n';

export function AppShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { formatUserRole, t } = useI18n();
  const workspace = getRoleWorkspace(user.role);

  function renderIcon(section: PlatformSection) {
    switch (section) {
      case 'dashboard':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h3a1 1 0 001-1v-3h2v3a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;
      case 'planning':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0012.586 3H4zm6 1.414L13.586 8H13a1 1 0 01-1-1V4.414H10zM6 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
      case 'sites':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 2.292a1 1 0 01.62 0l6 2A1 1 0 0117 5.24V15a1 1 0 01-.684.949l-6 2a1 1 0 01-.632 0l-6-2A1 1 0 013 15V5.24a1 1 0 01.684-.948l6-2zM10 4.387L5 6.054v8.225l5 1.667 5-1.667V6.054L10 4.387z" clipRule="evenodd" /></svg>;
      case 'people':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M13 7a3 3 0 11-6 0 3 3 0 016 0zM5 15a4 4 0 118 0H5z" /><path d="M14 6a2 2 0 100 4 2 2 0 000-4zM14 11c-1.306 0-2.418.835-2.83 2H17a3 3 0 00-3-2z" /></svg>;
      case 'fleet':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a1 1 0 011-1h7a1 1 0 011 1v6H3V5z" /><path d="M12 8h2.382a1 1 0 01.894.553L17 12v2h-1.05a2.5 2.5 0 00-4.9 0H9.95a2.5 2.5 0 00-4.9 0H4a1 1 0 01-1-1v-2h9V8z" /></svg>;
      case 'materials':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a2 2 0 00-2 2v1h14V6a2 2 0 00-2-2H5zm-2 5v6a2 2 0 002 2h10a2 2 0 002-2V9H3zm3 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
      case 'transport':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" /></svg>;
      case 'notifications':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a4 4 0 00-4 4v2.382c0 .53-.211 1.039-.586 1.414L4 11.21V13h12v-1.79l-1.414-1.414A2 2 0 0114 8.382V6a4 4 0 00-4-4z" /><path d="M8 15a2 2 0 104 0H8z" /></svg>;
      case 'reports':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V8l-5-5H4zm2 10a1 1 0 012 0v1H6v-1zm3-3a1 1 0 112 0v4H9v-4zm3-2a1 1 0 112 0v6h-2V8z" /></svg>;
      case 'admin':
        return <svg className="shell__nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17a1 1 0 00-1.98 0l-.162 1.3a5.025 5.025 0 00-1.186.49L7.03 4.28a1 1 0 00-1.4 1.42l.86 1.12a5.064 5.064 0 00-.49 1.18l-1.31.17a1 1 0 000 1.98l1.3.16c.11.42.28.82.5 1.2l-.86 1.1a1 1 0 001.41 1.42l1.11-.87c.37.21.77.38 1.19.49l.17 1.3a1 1 0 001.98 0l.16-1.3c.42-.11.83-.28 1.2-.49l1.1.87a1 1 0 001.42-1.42l-.87-1.1c.22-.38.39-.78.5-1.2l1.3-.16a1 1 0 000-1.98l-1.31-.17a5.048 5.048 0 00-.49-1.18l.87-1.12a1 1 0 10-1.42-1.42l-1.12.88a5.025 5.025 0 00-1.18-.49l-.17-1.3zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>;
    }
  }

  const sectionLabelKey = {
    dashboard: 'nav.dashboard',
    planning: 'nav.planning',
    sites: 'nav.sites',
    people: 'nav.people',
    fleet: 'nav.fleet',
    materials: 'nav.materials',
    transport: 'nav.transport',
    notifications: 'nav.notifications',
    reports: 'nav.reports',
    admin: 'nav.admin',
  } as const;

  const groupBySection: Record<PlatformSection, 'platform' | 'modules' | 'intelligence'> = {
    dashboard: 'platform',
    planning: 'platform',
    sites: 'platform',
    people: 'platform',
    fleet: 'platform',
    materials: 'modules',
    transport: 'modules',
    notifications: 'intelligence',
    reports: 'intelligence',
    admin: 'intelligence',
  };

  const sections = workspace.navigationSections.map((section) => ({
    section,
    to: sectionRouteMap[section],
    label: t(sectionLabelKey[section]),
    icon: renderIcon(section),
    group: groupBySection[section],
  }));

  const navigationGroups = [
    { title: t('shell.operationsLabel'), items: sections.filter((item) => item.group === 'platform') },
    { title: t('shell.modulesLabel'), items: sections.filter((item) => item.group === 'modules') },
    { title: t('shell.intelligenceLabel'), items: sections.filter((item) => item.group === 'intelligence') },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__sidebar-brand">
          <span className="shell__platform-tag">{t('shell.platformLabel')}</span>
          <div className="brand brand--compact">
            <img className="brand__logo" src={logoUrl} alt={t('app.logoAlt')} />
            <div>
              <p className="brand__eyebrow">{t('app.brandEyebrow')}</p>
              <h1 className="brand__title">BauFlow</h1>
              <p className="brand__module">SitePlan · MatFlow · FleetFlow</p>
            </div>
          </div>
        </div>
        <nav className="shell__nav">
          {navigationGroups.map((group) => (
            <div key={group.title} className="shell__nav-group">
              <p className="shell__nav-section">{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) => `shell__nav-link${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="shell__profile">
          <div className="shell__profile-info">
            <p className="shell__profile-name">{user.name}</p>
            <p className="shell__profile-role">{formatUserRole(user.role)} · {user.site?.name}</p>
          </div>
          <span className="shell__profile-chip">{t(sectionLabelKey[workspace.homeSection])}</span>
          <button type="button" className="shell__logout-btn" onClick={onLogout} title={t('nav.signOut')}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </aside>
      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
