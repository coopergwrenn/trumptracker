import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Home from '../Home';

describe('Home', () => {
  it('renders the hero section', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/Neutral, AI-Curated News/i)).toBeInTheDocument();
    expect(screen.getByText(/on Donald Trump/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Your Free Week/i })).toBeInTheDocument();
  });

  it('displays the pricing section', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/\$0\.99\/mo/i)).toBeInTheDocument();
    expect(screen.getByText(/Simple, Transparent Pricing/i)).toBeInTheDocument();
  });
});