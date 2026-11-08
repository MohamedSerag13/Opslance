import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSettings from '@/pages/admin/AdminSettings';
import { ToastProvider } from '@/components/ui';

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}));

import { api } from '@/api/client';
const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const SETTINGS_PAYLOAD = {
  settings: {
    maintenance_mode: false,
    announcement: '',
    support_email: 'ops@opslance.dev',
    default_session_minutes_free: 90,
    default_session_minutes_pro: 150,
    session_extend_minutes: 30,
    max_running_sessions_free: 1,
    max_running_sessions_pro: 3,
    spawn_window_limit: 8,
    hints_allowed: true,
  },
  meta: {
    announcement: { updated_by: null, updated_at: null },
  },
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <AdminSettings />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('AdminSettings', () => {
  beforeEach(() => {
    mockedApi.get.mockReset();
    mockedApi.get.mockImplementation((url: string) =>
      url.includes('/audit')
        ? Promise.resolve({ data: [] })
        : Promise.resolve({ data: SETTINGS_PAYLOAD }),
    );
  });

  it('renders the settings sections with loaded values', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
      expect(screen.getByLabelText('Announcement banner text')).toBeTruthy();
      expect((screen.getByLabelText('Support email') as HTMLInputElement).value).toBe('ops@opslance.dev');
    });
    // Sessions tab shows the tier caps
    fireEvent.click(screen.getByRole('tab', { name: 'Sessions & Labs' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Free concurrent sessions') as HTMLInputElement).value).toBe('1');
      expect((screen.getByLabelText('Pro concurrent sessions') as HTMLInputElement).value).toBe('3');
    });
  });

  it('tracks unsaved changes and only submits dirty keys on save', async () => {
    const { container } = renderPage();
    await waitFor(() => screen.getByLabelText('Announcement banner text'));

    fireEvent.change(screen.getByLabelText('Announcement banner text'), {
      target: { value: 'Mock exam Saturday' },
    });
    expect(screen.getByText('1 unsaved')).toBeTruthy();

    (api.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { ...SETTINGS_PAYLOAD, settings: { ...SETTINGS_PAYLOAD.settings, announcement: 'Mock exam Saturday' } },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledTimes(1);
      const arg = (api.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(Object.keys(arg)).toEqual(['announcement']);
      expect(arg.announcement).toBe('Mock exam Saturday');
    });
    void container;
  });

  it('maintenance banner appears when the toggle is on', async () => {
    mockedApi.get.mockImplementation((url: string) =>
      url.includes('/audit')
        ? Promise.resolve({ data: [{ id: 'a1', actor_email: 'admin', action: 'settings.update', target: 'maintenance_mode', detail: { value: true }, created_at: '2026-11-08T00:00:00Z' }] })
        : Promise.resolve({ data: { ...SETTINGS_PAYLOAD, settings: { ...SETTINGS_PAYLOAD.settings, maintenance_mode: true } } }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Maintenance mode is/)).toBeTruthy();
    });
    // the audit tab lists the change
    fireEvent.click(screen.getByRole('tab', { name: 'Audit log' }));
    await waitFor(() => {
      expect(screen.getByText('maintenance_mode')).toBeTruthy();
    });
  });
});
