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
import { Label } from '@/components/ui/label';
import { useAddToWatchlist } from '@/hooks/use-watchlist';
import { toast } from 'sonner';

interface AddTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHAINS = [
  { value: 'bsc', label: 'BSC' },
  { value: 'solana', label: 'Solana' },
  { value: 'eth', label: 'Ethereum' },
  { value: 'base', label: 'Base' },
];

export function AddTokenDialog({ open, onOpenChange }: AddTokenDialogProps) {
  const [chain, setChain] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const addMutation = useAddToWatchlist();

  function resetForm() {
    setChain('');
    setTokenAddress('');
    setTokenSymbol('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chain || !tokenAddress || !tokenSymbol) return;

    addMutation.mutate(
      { chain, token_address: tokenAddress, token_symbol: tokenSymbol.toUpperCase() },
      {
        onSuccess: () => {
          toast.success(`${tokenSymbol.toUpperCase()} added to watchlist`);
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to add token to watchlist');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Token to Watchlist</DialogTitle>
          <DialogDescription>
            Enter the token details to start monitoring its price and risk.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Chain</Label>
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select chain" />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Token Address</Label>
            <Input
              placeholder="0x... or token mint address"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Token Symbol</Label>
            <Input
              placeholder="e.g. USDT"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
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
              disabled={!chain || !tokenAddress || !tokenSymbol || addMutation.isPending}
            >
              {addMutation.isPending ? 'Adding...' : 'Add Token'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
