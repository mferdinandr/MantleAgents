import { HeroSection } from './_components/hero-section';
import { HowItWorks } from './_components/how-it-works';
import { FeaturesSection } from './_components/features-section';
import { LiveAgentFeed } from './_components/live-agent-feed';
import { FaqSection } from './_components/faq-section';
import { CtaSection } from './_components/cta-section';
import { LandingPageClient } from './_components/landing-page-client';

export const dynamic = 'force-static';

export default function LandingPage() {
  return (
    <LandingPageClient>
      <HeroSection />
      <HowItWorks />
      <FeaturesSection />
      <LiveAgentFeed />
      <FaqSection />
      <CtaSection />
    </LandingPageClient>
  );
}
