import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api/client';
import App from './App';

const { loginMock, logoutMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('./hooks/useSession', () => ({
  useSession: () => ({
    session: null,
    isAuthenticating: false,
    login: loginMock,
    logout: logoutMock,
  }),
}));

describe('App login smoke tests', () => {
  beforeEach(() => {
    loginMock.mockReset();
    logoutMock.mockReset();
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('switches the login language and persists the selection', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Starte BauFlow für Teams, Baustellen und Logistik.' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'App-Sprache' }), 'en');

    expect(await screen.findByRole('heading', { name: 'Start BauFlow for crews, sites and logistics.' })).toBeInTheDocument();
    expect(window.localStorage.getItem('bauflow.language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('shows a localized login error for invalid credentials', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new ApiError('Invalid credentials', { status: 401 }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'BauFlow öffnen' }));

    await waitFor(() => {
      expect(screen.getByText('E-Mail oder Passwort sind falsch.')).toBeInTheDocument();
    });
  });

  it('defaults to German on first load even when the browser language is different', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Starte BauFlow für Teams, Baustellen und Logistik.' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('de');
    expect(window.localStorage.getItem('bauflow.language')).toBe('de');
  });

  it('shows the driver portal on the dedicated route', () => {
    window.history.pushState({}, '', '/driver');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Fahrer-Check-in für Belade- und Abladestellen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fahrerportal öffnen' })).toBeInTheDocument();
  });
});