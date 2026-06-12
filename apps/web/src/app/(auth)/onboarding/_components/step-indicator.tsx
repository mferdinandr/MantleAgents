import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  connected: boolean;
  funded: boolean;
  registered: boolean;
  configured: boolean;
  started: boolean;
}

const STEPS = [
  { key: 'connected', label: 'Connect Wallet' },
  { key: 'funded', label: 'Fund Wallet' },
  { key: 'registered', label: 'Register Agent' },
  { key: 'configured', label: 'Configure Guardrails' },
  { key: 'started', label: 'Start Agent' },
] as const;

export function getOnboardingStepStates(props: StepIndicatorProps) {
  const activeIndex = STEPS.findIndex((step) => !props[step.key]);

  return STEPS.map((step, index) => {
    const complete = props[step.key];
    const state = complete
      ? 'completed'
      : index === activeIndex
        ? 'active'
        : 'pending';

    return {
      ...step,
      number: index + 1,
      state,
    };
  });
}

export function StepIndicator(props: StepIndicatorProps) {
  const steps = getOnboardingStepStates(props);

  return (
    <div className="w-full border-4 border-gb-deep bg-gb-light p-4 shadow-[4px_4px_0px_var(--color-gb-deep)]">
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <li
            key={step.key}
            data-testid={`onboarding-step-${step.key}`}
            data-state={step.state}
            className={cn(
              'relative flex min-h-16 items-center gap-3 border-2 px-3 py-2 transition-colors',
              step.state === 'completed' &&
                'border-emerald-600 bg-emerald-500/15 text-emerald-800',
              step.state === 'active' &&
                'border-gb-deep bg-gb-accent text-gb-deep shadow-[2px_2px_0px_var(--color-gb-deep)]',
              step.state === 'pending' &&
                'border-gb-dark/25 bg-gb-mid/20 text-gb-dark/60',
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center border-2 font-press-start-2p text-[10px]',
                step.state === 'completed' &&
                  'border-emerald-600 bg-emerald-600 text-white',
                step.state === 'active' &&
                  'border-gb-deep bg-gb-deep text-gb-accent',
                step.state === 'pending' &&
                  'border-gb-dark/30 bg-gb-light text-gb-dark/50',
              )}
              aria-hidden="true"
            >
              {step.state === 'completed' ? <Check className="size-4" /> : step.number}
            </span>
            <span className="font-vt323 text-lg uppercase leading-none">
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="absolute left-1/2 top-full hidden h-3 w-0.5 bg-gb-deep/30 md:left-full md:top-1/2 md:block md:h-0.5 md:w-3" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
