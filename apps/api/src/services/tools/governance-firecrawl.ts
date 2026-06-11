/**
 * On-chain governance scraper via Firecrawl.
 */

import Firecrawl from '@mendable/firecrawl-js';

// Governance scraping URL (configurable via env)
const GOVERNANCE_URL = process.env.GOVERNANCE_SCRAPE_URL || 'https://governance.example.com';

let _firecrawl: Firecrawl | null = null;

function getFirecrawlClient(): Firecrawl {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY not set — governance tool disabled');
    }
    _firecrawl = new Firecrawl({ apiKey });
  }
  return _firecrawl;
}

export interface GovernanceData {
  markdown: string;
  url: string;
  scrapedAt: string;
}

let governanceCache: { data: GovernanceData; expiresAt: number } | null = null;
const GOV_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Scrape governance page content via Firecrawl.
 */
export async function scrapeGovernance(): Promise<GovernanceData> {
  if (governanceCache && Date.now() < governanceCache.expiresAt) return governanceCache.data;

  const client = getFirecrawlClient();
  const doc = await client.scrape(GOVERNANCE_URL, {
    formats: ['markdown'],
  });

  const markdown = (doc as { markdown?: string }).markdown ?? '';
  const data: GovernanceData = {
    markdown: markdown.slice(0, 15000),
    url: GOVERNANCE_URL,
    scrapedAt: new Date().toISOString(),
  };
  governanceCache = { data, expiresAt: Date.now() + GOV_CACHE_TTL_MS };
  return data;
}
