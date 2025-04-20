import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import Dashboard from '../Dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';

// Mock the hooks
vi.mock('../../contexts/AuthContext');
vi.mock('../../hooks/useSubscription');

describe('Dashboard', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
  };

  const mockSubscription = {
    is_active: true,
    subscription_status: 'trialing',
    trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (useSubscription as any).mockReturnValue({
      subscription: mockSubscription,
      loading: false,
    });
  });

  it('shows loading state', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: true,
    });

    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });

    const { container } = renderWithProviders(<Dashboard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows trial status when in trial period', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/Trial Active/i)).toBeInTheDocument();
    expect(screen.getByText(/7 days left in your trial/i)).toBeInTheDocument();
  });

  it('handles refresh news action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/refreshing\.\.\./i)).toBeInTheDocument();
    });
  });

  it('shows error state when news fetch fails', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    // Mock a failed API call
    server.use(
      http.post('*/functions/v1/fetch-news', () => {
        return HttpResponse.error();
      })
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to refresh news/i)).toBeInTheDocument();
    });
  });
});