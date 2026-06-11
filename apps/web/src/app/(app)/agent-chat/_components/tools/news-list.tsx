import { ExternalLink, Newspaper } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NewsArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt?: string;
  source?: string;
}

interface NewsListProps {
  results: NewsArticle[];
  count: number;
}

export function NewsList({ results, count }: NewsListProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="space-y-4 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-gb-accent" />
          <h3 className="text-sm font-semibold text-gb-light uppercase tracking-wide">Related News</h3>
        </div>
        <Badge variant="outline" className="text-xs text-gb-accent border-gb-accent/40 bg-gb-accent/10">
          {count} articles
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {results.slice(0, 4).map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group h-full"
          >
            <Card className="h-full bg-gb-dark border-gb-dark hover:border-gb-accent/40 hover:bg-gb-dark/80 transition-all duration-200">
              <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gb-accent truncate max-w-30 uppercase tracking-wide">
                      {article.source || 'Unknown'}
                    </span>
                    {article.publishedAt && (
                      <span className="text-gb-mid">{new Date(article.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gb-light group-hover:text-gb-accent transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-xs text-gb-mid line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs text-gb-mid group-hover:text-gb-accent transition-colors pt-2 border-t border-gb-dark">
                  <span>Read article</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {results.length > 4 && (
        <div className="text-xs text-center text-gb-mid">
          + {results.length - 4} more sources analyzed
        </div>
      )}
    </div>
  );
}
