import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  dexConfigured: boolean;
  custodyLabel: string;
}

export function StatusBadge({
  dexConfigured,
  custodyLabel,
}: StatusBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        data-testid="dex-status-badge"
        className={cn(
          'rounded-none border-2 px-2.5 py-1 font-vt323 text-base uppercase',
          dexConfigured
            ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700'
            : 'border-amber-500/70 bg-amber-400/20 text-amber-800',
        )}
      >
        {dexConfigured ? 'Mantle DEX Ready' : 'Mantle DEX Missing'}
      </Badge>
      <Badge
        variant="outline"
        data-testid="custody-status-badge"
        className="rounded-none border-2 border-gb-dark/40 bg-gb-light px-2.5 py-1 font-vt323 text-base uppercase text-gb-deep"
      >
        {custodyLabel}
      </Badge>
    </div>
  );
}
