import { Wallet, SlidersHorizontal, TreePalm } from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Link Your Wallet',
    description:
      'Plug in with MetaMask, Coinbase, or any wallet you trust. Prefer socials? Google, Apple, and X work too. Zero forms, zero KYC — just your address on-chain.',
    icon: Wallet,
    mock: (
      <div className="space-y-3 font-vt323 text-xl uppercase">
        <div className="border-4 border-gb-deep bg-gb-mid px-4 py-3 text-gb-deep shadow-[4px_4px_0px_var(--color-gb-deep)]">
          0x7f3a...c2d1 &nbsp; [CONNECTED]
        </div>
        <div className="flex gap-2">
          {['Google', 'Apple', 'X'].map((s) => (
            <div key={s} className="flex-1 border-4 border-gb-deep bg-gb-light py-2 text-center text-gb-deep shadow-[4px_4px_0px_var(--color-gb-deep)]">
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: 2,
    title: 'Set the Rules',
    description:
      'Define how your agents behave — risk appetite, position limits, which assets to touch, when to stop. Two minutes of setup, then hands off.',
    icon: SlidersHorizontal,
    mock: (
      <div className="space-y-3 font-vt323 text-xl uppercase">
        {[
          { label: 'Risk Profile', value: '> MODERATE' },
          { label: 'Max Per Trade', value: '$200' },
          { label: 'Daily Cap', value: '5 TRADES' },
          { label: 'Stop-Loss', value: '-8%' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between border-4 border-gb-deep bg-gb-mid px-4 py-2 shadow-[4px_4px_0px_var(--color-gb-deep)]"
          >
            <span className="text-gb-deep">{item.label}</span>
            <span className="text-gb-deep font-press-start-2p text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: 3,
    title: 'Walk Away',
    description:
      'Agents operate around the clock — scanning, deciding, executing. Check back when you feel like it, or just watch the live feed scroll.',
    icon: TreePalm,
    mock: (
      <div className="space-y-2 font-vt323 text-xl uppercase">
        {[
          { label: 'Scanning EUR/USD news', status: 'OK', pulse: false },
          { label: 'Signal: BUY EURm', status: 'EXEC', pulse: true },
          { label: 'Yield harvest: ICHI', status: 'OK', pulse: false },
          { label: 'Rebalance queue', status: 'WAIT', pulse: false },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between border-4 border-gb-deep bg-gb-light px-4 py-3 shadow-[4px_4px_0px_var(--color-gb-deep)]"
          >
            <span className="text-gb-deep">{item.label}</span>
            <span className={`font-press-start-2p text-xs ${item.pulse ? 'animate-pulse text-gb-deep' : 'text-gb-dark'}`}>
              [{item.status}]
            </span>
          </div>
        ))}
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="border-b-4 border-gb-deep bg-gb-light" id="how-it-works">
      <div className="mx-auto max-w-7xl border-x-4 border-gb-deep">
        {/* Header - full width, left-aligned */}
        <div className="border-b-4 border-gb-deep bg-gb-deep p-8 lg:p-12">
          <h2 className="text-3xl font-press-start-2p text-gb-light sm:text-4xl uppercase">
            Boot Sequence
          </h2>
          <p className="mt-6 text-xl font-vt323 text-gb-mid uppercase">
            Three inputs. Then the agents take over.
          </p>
        </div>

        {/* Steps - alternating layout */}
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`grid grid-cols-1 lg:grid-cols-2 ${
              index !== steps.length - 1 ? 'border-b-4 border-gb-deep' : ''
            }`}
          >
            {/* Text side */}
            <div
              className={`flex flex-col justify-center p-8 lg:p-12 bg-gb-light border-b-4 lg:border-b-0 border-gb-deep ${
                index % 2 === 1 ? 'lg:order-2' : ''
              } ${index % 2 === 0 ? 'lg:border-r-4' : 'lg:border-l-4'}`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-14 w-14 items-center justify-center border-4 border-gb-deep bg-gb-deep text-xl font-press-start-2p text-gb-light shadow-[4px_4px_0px_var(--color-gb-deep)]">
                  {step.number}
                </div>
                <step.icon className="h-8 w-8 text-gb-deep" />
              </div>
              <h3 className="text-2xl font-press-start-2p text-gb-deep uppercase leading-snug">
                {step.title}
              </h3>
              <p className="mt-6 text-lg leading-relaxed font-vt323 text-gb-dark uppercase">
                {step.description}
              </p>
            </div>

            {/* Mock UI side */}
            <div
              className={`flex items-center p-8 lg:p-12 bg-gb-mid ${
                index % 2 === 1 ? 'lg:order-1' : ''
              }`}
            >
              <div className="w-full">{step.mock}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
