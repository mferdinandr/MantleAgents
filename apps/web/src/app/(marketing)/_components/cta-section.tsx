'use client';

import { ConnectCTA } from './connect-cta';

export function CtaSection() {
  return (
    <section className="relative border-b-4 border-gb-deep bg-gb-light" id="get-started">
      <div className="mx-auto max-w-7xl border-x-4 border-gb-deep">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Left - large heading */}
          <div className="lg:col-span-2 p-8 lg:p-16 border-b-4 lg:border-b-0 lg:border-r-4 border-gb-deep bg-gb-deep">
            <h2 className="text-4xl font-press-start-2p text-gb-light uppercase tracking-tight sm:text-5xl leading-snug">
              Stop watching charts.
            </h2>
            <p className="mt-8 max-w-lg text-2xl font-vt323 text-gb-mid uppercase leading-relaxed">
              Deploy autonomous agents that trade, farm, and rebalance for you — on-chain, gasless, non-custodial. Connect a wallet or sign in with socials to begin.
            </p>
          </div>

          {/* Right - action panel */}
          <div className="flex flex-col items-center justify-center p-8 lg:p-12 bg-gb-mid gap-8">
            <div className="text-center">
              <p className="font-press-start-2p text-sm text-gb-deep uppercase mb-2">
                Ready?
              </p>
              <p className="font-vt323 text-lg text-gb-dark uppercase">
                No KYC. No email. Just your wallet.
              </p>
            </div>

            <ConnectCTA
              // @ts-ignore
              variant="default"
              size="lg"
              className="px-10 py-6 text-2xl w-full max-w-xs"
            >
              <span className="mr-2">&gt;</span> DEPLOY
            </ConnectCTA>

            <div className="flex flex-col items-center gap-2 font-vt323 text-lg text-gb-dark uppercase">
              <span>15+ currencies</span>
              <span>Zero gas fees</span>
              <span>24/7 execution</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
