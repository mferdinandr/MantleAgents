'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useCreateAlert } from '@/hooks/use-alerts';
import { toast } from 'sonner';

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: {
    chain: string;
    token_address: string;
    token_symbol: string;
    current_price: number;
  } | null;
}

export function AlertConfigDialog({ open, onOpenChange, token }: AlertConfigDialogProps) {
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const createAlert = useCreateAlert();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !threshold) return;

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      toast.error('Please enter a valid threshold');
      return;
    }

    createAlert.mutate(
      {
        chain: token.chain,
        token_address: token.token_address,
        token_symbol: token.token_symbol,
        condition,
        threshold: thresholdNum,
      },
      {
        onSuccess: () => {
          toast.success(`Alert created for ${token.token_symbol}`);
          setCondition('above');
          setThreshold('');
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to create alert');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Price Alert</DialogTitle>
          <DialogDescription>
            Get notified when the price meets your condition.
          </DialogDescription>
        </DialogHeader>

        {token && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{token.token_symbol}</span>
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
              {token.chain.toUpperCase()}
            </Badge>
            <span className="text-muted-foreground">
              Current: ${token.current_price < 0.01
                ? token.current_price.toFixed(6)
                : token.current_price.toFixed(2)}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as 'above' | 'below')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Price above</SelectItem>
                <SelectItem value="below">Price below</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Threshold (USD)</Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!threshold || createAlert.isPending}
            >
              {createAlert.isPending ? 'Saving...' : 'Save Alert'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
