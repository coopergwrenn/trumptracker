import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
};

vi.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

// MSW Server setup
export const server = setupServer(
  // Mock the news fetch endpoint
  http.post('*/functions/v1/fetch-news', () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock Stripe checkout
  http.post('*/functions/v1/create-checkout', () => {
    return HttpResponse.json({ url: 'https://checkout.stripe.com/test' });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());