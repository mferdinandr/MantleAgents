import type { UIMessage } from 'ai';
import { User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { NewsList } from './tools/news-list';
import { CryptoPriceCard } from './tools/crypto-price-card';
import { SentimentCard } from './tools/sentiment-card';
import { GovernanceCard } from './tools/governance-card';

interface MessageItemProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-4 p-4 md:p-6',
        isUser ? 'bg-transparent' : 'bg-transparent',
      )}
    >
      <div className="shrink-0 flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm shrink-0',
            isUser
              ? 'bg-zinc-800 border-zinc-700 text-black'
              : 'bg-transparent border-transparent',
          )}
        >
          {isUser ? (
            <User className="h-5 w-5" />
          ) : (
            <Logo size="sm" showWordmark={false} />
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div
                key={index}
                className="prose prose-invert prose-sm max-w-none leading-relaxed text-black [&_strong]:text-gb-accent [&_strong]:font-bold [&_a]:text-gb-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_li]:text-gb-deep [&_p]:text-gb-deep [&_h1]:text-gb-deep [&_h2]:text-gb-deep [&_h3]:text-gb-deep [&_pre]:bg-gb-dark [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-sm [&_code]:bg-gb-dark [&_code]:text-gb-accent [&_code]:px-1 [&_code]:rounded [&_table]:border-collapse [&_th]:border [&_th]:border-gb-dark [&_th]:p-2 [&_th]:text-gb-accent [&_td]:border [&_td]:border-gb-dark [&_td]:p-2 [&_td]:text-gb-deep"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }

          if (part.type.startsWith('tool-')) {
            const toolName = part.type.replace('tool-', '');
            const toolPart = part as {
              toolCallId?: string;
              state?: string;
              output?: Record<string, unknown>;
            };
            const { toolCallId, state, output } = toolPart;

            if (state === 'output-available' && output) {
              if (toolName === 'searchNews') {
                return (
                  <NewsList
                    key={toolCallId}
                    results={
                      (output.results ?? []) as Array<{
                        title: string;
                        url: string;
                        excerpt: string;
                        publishedAt?: string;
                        source?: string;
                      }>
                    }
                    count={(output.count as number) ?? 0}
                  />
                );
              }
              if (toolName === 'getCryptoPrices') {
                const rawPrices = output.prices;
                const priceMap: Record<
                  string,
                  {
                    usd: number;
                    usd_24h_change?: number;
                    sparkline_in_7d?: { price: number[] };
                  }
                > = {};
                if (Array.isArray(rawPrices)) {
                  for (const coin of rawPrices as Array<{
                    id: string;
                    current_price?: number;
                    price_change_percentage_24h?: number;
                    sparkline_in_7d?: { price: number[] };
                  }>) {
                    priceMap[coin.id] = {
                      usd: coin.current_price ?? 0,
                      usd_24h_change: coin.price_change_percentage_24h,
                      sparkline_in_7d: coin.sparkline_in_7d,
                    };
                  }
                } else if (
                  rawPrices &&
                  typeof rawPrices === 'object' &&
                  !Array.isArray(rawPrices)
                ) {
                  Object.assign(priceMap, rawPrices);
                }
                return <CryptoPriceCard key={toolCallId} prices={priceMap} />;
              }
              if (toolName === 'analyzeSocialSentiment') {
                return (
                  <SentimentCard
                    key={toolCallId}
                    result={
                      output as {
                        sentiment: string;
                        summary: string;
                        positivePct?: number;
                        neutralPct?: number;
                        negativePct?: number;
                        postUrls?: string[];
                      }
                    }
                  />
                );
              }
              if (toolName === 'getGovernance') {
                return (
                  <GovernanceCard
                    key={toolCallId}
                    data={
                      output as {
                        markdown: string;
                        url: string;
                        scrapedAt: string;
                        error?: string;
                      }
                    }
                  />
                );
              }
            }

            // Only show "Using tool" while streaming; hide when response is complete
            if (!isStreaming) return null;

            return (
              <div
                key={toolCallId || index}
                className="flex items-center gap-2 text-xs text-gb-mid animate-pulse"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Using tool: {toolName}…</span>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
