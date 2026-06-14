import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('shows a warning badge when the Mantle DEX is not configured', () => {
    render(
      createElement(StatusBadge, {
        dexConfigured: false,
        custodyLabel: 'Non-custodial via relayer',
      }),
    );

    const badge = screen.getByTestId('dex-status-badge');
    expect(badge).toHaveTextContent('Mantle DEX Missing');
    expect(badge).toHaveClass('border-amber-500/70');
    expect(badge).toHaveClass('text-amber-800');
  });

  it('shows a success badge when the Mantle DEX is configured', () => {
    render(
      createElement(StatusBadge, {
        dexConfigured: true,
        custodyLabel: 'Non-custodial via relayer',
      }),
    );

    const badge = screen.getByTestId('dex-status-badge');
    expect(badge).toHaveTextContent('Mantle DEX Ready');
    expect(badge).toHaveClass('border-emerald-500/60');
    expect(badge).toHaveClass('text-emerald-700');
  });

  it('always shows the non-custodial custody badge', () => {
    render(
      createElement(StatusBadge, {
        dexConfigured: true,
        custodyLabel: 'Non-custodial via relayer',
      }),
    );

    expect(screen.getByTestId('custody-status-badge')).toHaveTextContent(
      'Non-custodial',
    );
  });
});
