import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('shows a warning badge when RealClaw is not configured', () => {
    render(
      createElement(StatusBadge, {
        realClawConfigured: false,
        custodyLabel: 'Non-custodial via Privy/RealClaw',
      }),
    );

    const badge = screen.getByTestId('realclaw-status-badge');
    expect(badge).toHaveTextContent('RealClaw Not Configured');
    expect(badge).toHaveClass('border-amber-500/70');
    expect(badge).toHaveClass('text-amber-800');
  });

  it('shows a success badge when RealClaw is connected', () => {
    render(
      createElement(StatusBadge, {
        realClawConfigured: true,
        custodyLabel: 'Non-custodial via Privy/RealClaw',
      }),
    );

    const badge = screen.getByTestId('realclaw-status-badge');
    expect(badge).toHaveTextContent('RealClaw Connected');
    expect(badge).toHaveClass('border-emerald-500/60');
    expect(badge).toHaveClass('text-emerald-700');
  });

  it('always shows the non-custodial custody badge', () => {
    render(
      createElement(StatusBadge, {
        realClawConfigured: true,
        custodyLabel: 'Non-custodial via Privy/RealClaw',
      }),
    );

    expect(screen.getByTestId('custody-status-badge')).toHaveTextContent(
      'Non-custodial',
    );
  });
});
