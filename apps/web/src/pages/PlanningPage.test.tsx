import { useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Language } from '../i18n';
import { I18nProvider } from '../i18n';
import { PlanningPage } from './PlanningPage';

const { getSitePlanMock, upsertSitePlanMock } = vi.hoisted(() => ({
  getSitePlanMock: vi.fn(),
  upsertSitePlanMock: vi.fn(),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();

  return {
    ...actual,
    api: {
      ...actual.api,
      getSitePlan: getSitePlanMock,
      upsertSitePlan: upsertSitePlanMock,
    },
  };
});

const planFixture = {
  id: 'plan-berlin-01',
  siteId: 'site-berlin-01',
  site: {
    id: 'site-berlin-01',
    name: 'Berlin Mitte',
    latitude: 52.5208,
    longitude: 13.4095,
  },
  planDate: '2026-04-24T00:00:00.000Z',
  status: 'published' as const,
  shiftStatus: 'active' as const,
  briefing: 'Morgens zuerst Betonage absichern.',
  safetyNotes: 'PSA und Kranfenster prüfen.',
  briefings: [
    {
      id: 'briefing-01',
      category: 'operations' as const,
      title: 'Morgenbriefing',
      note: 'Betonage und Materialhof zuerst abstimmen.',
      sortOrder: 0,
    },
  ],
  updatedById: 'user-polier-01',
  updatedBy: null,
  createdAt: '2026-04-24T05:00:00.000Z',
  updatedAt: '2026-04-24T05:20:00.000Z',
  zones: [
    {
      id: 'zone-01',
      name: 'Kernhaus A',
      shiftLabel: '06:00-10:15',
      focus: 'Betonage und Schalung kontrollieren',
      supportCategory: 'Concrete',
      priority: 'critical' as const,
      sortOrder: 0,
      leadUserId: 'user-polier-01',
      leadUser: null,
      supportMaterialId: 'material-01',
      supportMaterial: null,
      supportTruckId: 'truck-01',
      supportTruck: null,
      activeTransportId: null,
      activeTransport: null,
      materialNeeds: [
        {
          id: 'need-01',
          materialId: 'material-01',
          material: null,
          label: 'Concrete reserve',
          quantity: 6,
          unit: 'bags',
          status: 'ready' as const,
          notes: 'Deliver before the pour starts.',
          sortOrder: 0,
        },
      ],
      assignments: [
        {
          id: 'assignment-01',
          userId: 'user-worker-01',
          sortOrder: 0,
          user: null,
        },
      ],
    },
  ],
};

function TestWrapper({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('de');

  return (
    <MemoryRouter>
      <I18nProvider language={language} setLanguage={setLanguage}>
        {children}
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('PlanningPage', () => {
  beforeEach(() => {
    getSitePlanMock.mockReset();
    upsertSitePlanMock.mockReset();
    getSitePlanMock.mockResolvedValue(planFixture);
    upsertSitePlanMock.mockResolvedValue(planFixture);
  });

  it('loads and saves the site plan draft', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <PlanningPage
        token="test-token"
        currentUser={{
          id: 'user-polier-01',
          name: 'Ali Demir',
          email: 'ali@matflow.local',
          role: 'polier',
          siteId: 'site-berlin-01',
          site: planFixture.site,
        }}
        users={[
          {
            id: 'user-polier-01',
            name: 'Ali Demir',
            email: 'ali@matflow.local',
            role: 'polier',
            siteId: 'site-berlin-01',
            site: planFixture.site,
          },
          {
            id: 'user-worker-01',
            name: 'Felix Koch',
            email: 'felix@matflow.local',
            role: 'worker',
            siteId: 'site-berlin-01',
            site: planFixture.site,
          },
        ]}
        materials={[
          {
            id: 'material-01',
            title: 'Concrete bags',
            description: 'Ready for use',
            category: 'Concrete',
            quantity: 18,
            condition: 'new',
            imageUrl: '',
            location: { lat: 52.5213, lng: 13.4111 },
            siteId: 'site-berlin-01',
            site: planFixture.site,
            status: 'available',
            distanceKm: 1,
            suggestedCategory: 'Concrete',
            reservedById: null,
            createdAt: '2026-04-24T05:00:00.000Z',
            updatedAt: '2026-04-24T05:00:00.000Z',
          },
        ]}
        transports={[]}
        sites={[planFixture.site]}
        trucks={[
          {
            id: 'truck-01',
            name: 'Truck Atlas',
            licensePlate: 'B-AT-1041',
            siteId: 'site-berlin-01',
            available: true,
            site: planFixture.site,
          },
        ]}
        onRefresh={onRefresh}
      />,
      { wrapper: TestWrapper },
    );

    expect(await screen.findByDisplayValue('Morgens zuerst Betonage absichern.')).toBeInTheDocument();

    await user.clear(screen.getByDisplayValue('Morgens zuerst Betonage absichern.'));
    await user.type(screen.getByLabelText('Tagesbriefing'), 'Betonage, Materialhof und Techniktrasse priorisieren.');
    await user.click(screen.getByRole('button', { name: 'Plan speichern' }));

    await waitFor(() => {
      expect(upsertSitePlanMock).toHaveBeenCalledTimes(1);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});