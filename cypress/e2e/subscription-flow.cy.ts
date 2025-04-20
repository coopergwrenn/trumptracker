describe('Subscription Flow', () => {
  beforeEach(() => {
    // Reset any previous state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('completes the full subscription flow', () => {
    // Visit home page
    cy.visit('/');
    cy.contains('Start Your Free Week').click();

    // Sign up
    cy.url().should('include', '/signup');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').first().type('testPassword123');
    cy.get('input[type="password"]').last().type('testPassword123');
    cy.contains('button', 'Start free trial').click();

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('Trial Active').should('be.visible');
    cy.contains('7 days left in your trial').should('be.visible');

    // Check news functionality
    cy.contains('button', 'Refresh').click();
    cy.contains('Loading headlines').should('be.visible');
    
    // Should eventually show either headlines or no headlines message
    cy.get('body').then($body => {
      if ($body.text().includes('No headlines available')) {
        cy.contains('No headlines available right now—check back soon!').should('be.visible');
      } else {
        cy.get('[data-testid="headline"]').should('have.length.at.least', 1);
      }
    });
  });

  it('handles failed subscription gracefully', () => {
    // Mock failed Stripe checkout
    cy.intercept('POST', '**/create-checkout', {
      statusCode: 500,
      body: { error: 'Failed to create checkout session' },
    });

    cy.visit('/pricing');
    cy.contains('Start Free Trial').click();

    // Should show error message
    cy.contains('Failed to start subscription').should('be.visible');
  });
});