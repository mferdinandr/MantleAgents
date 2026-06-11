'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const models = [
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro', icon: Sparkles },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', icon: Zap },
  { value: 'opus-4.6', label: 'Opus 4.6', icon: Zap },
  { value: 'sonnet-4.5', label: 'Sonnet 4.5', icon: Zap },
  { value: 'chatgpt-5.3', label: 'ChatGPT 5.3', icon: Zap },
];

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelector({ value, onValueChange }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedModel = models.find((m) => m.value === value) ?? models[1];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-7 px-2 text-xs justify-between border-gb-dark bg-gb-dark text-gb-mid hover:text-gb-light hover:border-gb-accent/40 w-40"
        >
          <div className="flex items-center gap-1.5">
            <selectedModel.icon className="h-3.5 w-3.5 text-gb-accent shrink-0" />
            <span className="truncate">{selectedModel.label}</span>
          </div>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 border-gb-dark bg-gb-deep"
      >
        {models.map((model) => (
          <DropdownMenuItem
            key={model.value}
            onSelect={() => {
              onValueChange(model.value);
              setOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer text-xs focus:bg-gb-dark focus:text-gb-light text-gb-mid"
          >
            <model.icon className={cn('h-3.5 w-3.5 shrink-0', value === model.value ? 'text-gb-accent' : 'text-gb-mid')} />
            <span className="flex-1">{model.label}</span>
            {value === model.value && <Check className="h-3.5 w-3.5 text-gb-accent shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
