import { useState, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthUser } from '@matflow/shared-types';
import type { Language } from '../i18n';
import { I18nProvider } from '../i18n';
import { AppShell } from './AppShell';

afterEach(() => {
  cleanup();
});

function TestWrapper({ children, initialPath = '/planning' }: { children: ReactNode; initialPath?: string }) {
  const [language, setLanguage] = useState<Language>('de');

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nProvider language={language} setLanguage={setLanguage}>
        {children}
      </I18nProvider>
    </MemoryRouter>
  );
}

function renderShell(user: AuthUser) {
  return render(
    <Routes>
      <Route element={<AppShell user={user} onLogout={vi.fn()} />}>
        <Route path="*" element={<div>child</div>} />
      </Route>
    </Routes>,
    { wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper> },
  );
}

describe('AppShell', () => {
  it('shows the extended platform navigation for admin users', () => {
    renderShell({
      id: 'user-admin-01',
      name: 'Mara Schneider',
      email: 'mara@matflow.local',
      role: 'admin',
      siteId: 'site-berlin-01',
      site: {
        id: 'site-berlin-01',
        name: 'Berlin Mitte',
        latitude: 52.5208,
        longitude: 13.4095,
      },
    });

    expect(screen.getByRole('link', { name: 'Leitstand' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Baustellen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mitarbeiter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fuhrpark' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Berichte' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('limits worker navigation to the morning-relevant areas', () => {
    renderShell({
      id: 'user-worker-01',
      name: 'Felix Koch',
      email: 'felix@matflow.local',
      role: 'worker',
      siteId: 'site-berlin-01',
      site: {
        id: 'site-berlin-01',
        name: 'Berlin Mitte',
        latitude: 52.5208,
        longitude: 13.4095,
      },
    });

    expect(screen.getByRole('link', { name: 'SitePlan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Leitstand' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'MatFlow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'FleetFlow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows SitePlan for drivers without exposing admin areas', () => {
    renderShell({
      id: 'user-fahrer-01',
      name: 'Pavel Nowak',
      email: 'pavel@matflow.local',
      role: 'fahrer',
      siteId: 'site-berlin-01',
      site: {
        id: 'site-berlin-01',
        name: 'Berlin Mitte',
        latitude: 52.5208,
        longitude: 13.4095,
      },
    });

    expect(screen.getByRole('link', { name: 'SitePlan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fuhrpark' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'FleetFlow' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Benachrichtigungen' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Leitstand' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });
});