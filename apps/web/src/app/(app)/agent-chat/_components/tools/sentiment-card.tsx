import { MessageSquare, ThumbsUp, ThumbsDown, Minus, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SentimentResult {
  sentiment: string;
  summary: string;
  positivePct?: number;
  neutralPct?: number;
  negativePct?: number;
  postUrls?: string[];
}

export function SentimentCard({ result }: { result: SentimentResult }) {
  if (!result) return null;

  const getSentimentColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive': return 'text-emerald-400';
      case 'negative': return 'text-rose-400';
      case 'neutral': return 'text-zinc-400';
      default: return 'text-primary';
    }
  };

  const getSentimentIcon = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive': return <ThumbsUp className="h-4 w-4" />;
      case 'negative': return <ThumbsDown className="h-4 w-4" />;
      case 'neutral': return <Minus className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md bg-gb-dark border-gb-dark">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gb-light uppercase tracking-wide flex items-center gap-2">
            <span className="text-gb-accent">𝕏</span> Social Sentiment
          </CardTitle>
          <div className={`flex items-center gap-1.5 text-sm font-bold capitalize ${getSentimentColor(result.sentiment)}`}>
            {getSentimentIcon(result.sentiment)}
            {result.sentiment}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-gb-light leading-relaxed">
          {result.summary}
        </p>

        {result.positivePct !== undefined && (
          <div className="space-y-2">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-gb-deep">
              <div
                className="h-full bg-emerald-500/80"
                style={{ width: `${result.positivePct}%` }}
              />
              <div
                className="h-full bg-gb-mid/50"
                style={{ width: `${result.neutralPct}%` }}
              />
              <div
                className="h-full bg-rose-500/80"
                style={{ width: `${result.negativePct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{result.positivePct}% Positive</span>
              <span className="text-gb-mid">{result.neutralPct}% Neutral</span>
              <span className="text-rose-400 font-semibold">{result.negativePct}% Negative</span>
            </div>
          </div>
        )}

        {result.postUrls && result.postUrls.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gb-deep">
            <p className="text-xs font-semibold text-gb-mid uppercase tracking-wide">Related X posts</p>
            <ul className="space-y-1.5">
              {result.postUrls.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gb-accent hover:text-gb-accent/80 underline flex items-center gap-1 truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
