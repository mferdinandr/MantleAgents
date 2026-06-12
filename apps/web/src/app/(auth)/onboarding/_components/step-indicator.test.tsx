import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { StepIndicator } from './step-indicator';

describe('StepIndicator', () => {
  it('marks Fund Wallet active after wallet connection when funding is incomplete', () => {
    render(
      createElement(StepIndicator, {
        connected: true,
        funded: false,
        registered: false,
        configured: false,
        started: false,
      }),
    );

    const connectStep = screen.getByTestId('onboarding-step-connected');
    const fundStep = screen.getByTestId('onboarding-step-funded');

    expect(connectStep).toHaveAttribute('data-state', 'completed');
    expect(connectStep).toHaveClass('border-emerald-600');
    expect(fundStep).toHaveAttribute('data-state', 'active');
    expect(fundStep).toHaveClass('bg-gb-accent');
  });
});
