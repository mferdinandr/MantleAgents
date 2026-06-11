'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TrendingUp, Sprout, ArrowLeftRight, LayoutDashboard, MessageSquareText, Eye } from 'lucide-react';
import { SidebarPortfolio } from '@/components/sidebar-portfolio';

const WalletConnect = dynamic(
  () => import('@/components/wallet-connect').then((m) => m.WalletConnect),
  { ssr: false },
);

const items = [
  { title: 'Overview', url: '/overview', icon: LayoutDashboard },
  { title: 'Agent Chat', url: '/agent-chat', icon: MessageSquareText },
  { title: 'FX Agent', url: '/fx-agent', icon: TrendingUp },
  { title: 'Yield Agent', url: '/yield-agent', icon: Sprout },
  { title: 'Monitor', url: '/monitor', icon: Eye },
  { title: 'Swap', url: '/swap', icon: ArrowLeftRight },
];

export function JRPGCommandCenter() {
  const pathname = usePathname();

  return (
    <div className="w-full h-[30vh] min-h-[220px] max-h-[300px] shrink-0 border-t-4 border-gb-deep bg-gb-mid grid grid-cols-1 md:grid-cols-[1fr_300px] z-50 overflow-hidden shadow-[0px_-4px_0px_rgba(0,0,0,0.1)]">
      {/* Left: Navigation Menu */}
      <div className="border-r-0 md:border-r-4 border-gb-deep flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="bg-gb-deep text-gb-light px-4 py-2 font-press-start-2p text-sm sticky top-0 z-10 border-b-4 border-gb-deep uppercase tracking-wider flex items-center">
          COMMAND MENU
        </div>
        <div className="p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 flex-1 items-start content-start">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.url);
            return (
              <Link
                key={item.title}
                href={item.url}
                className={`flex items-center justify-start gap-2 h-12 px-3 border-2 uppercase font-vt323 text-[1.1rem] sm:text-xl transition-none ${
                  isActive 
                    ? 'bg-gb-deep text-gb-light border-gb-deep shadow-[2px_2px_0px_var(--color-gb-deep)] translate-y-[2px] translate-x-[2px]' 
                    : 'border-gb-deep text-gb-deep bg-gb-light hover:bg-gb-mid hover:shadow-[4px_4px_0px_var(--color-gb-deep)] active:shadow-[2px_2px_0px_var(--color-gb-deep)] active:translate-y-[2px] active:translate-x-[2px]'
                }`}
              >
                <item.icon className="size-4 sm:size-5 shrink-0" />
                <span className="truncate">{isActive ? `> ${item.title}` : item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right: Status Window (Desktop only for full view, mobile gets a summary) */}
      <div className="hidden md:flex flex-col bg-gb-light overflow-y-auto">
        <div className="bg-gb-deep text-gb-light px-4 py-2 font-press-start-2p text-sm sticky top-0 z-10 border-b-4 border-gb-deep uppercase tracking-wider flex justify-between items-center">
          <span>STATUS</span>
          <span className="text-[10px] opacity-70 tracking-tighter">HP 100/100</span>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-4 justify-between">
          <div className="bg-gb-mid p-3 border-2 border-gb-deep shadow-[2px_2px_0px_var(--color-gb-deep)]">
            <SidebarPortfolio />
          </div>
          <div className="[&>button]:w-full [&>button]:h-12 [&>button]:border-2 [&>button]:border-gb-deep [&>button]:bg-gb-mid [&>button]:text-gb-deep [&>button]:shadow-[2px_2px_0px_var(--color-gb-deep)] hover:[&>button]:bg-gb-light active:[&>button]:translate-x-[2px] active:[&>button]:translate-y-[2px] active:[&>button]:shadow-[0px_0px_0px_var(--color-gb-deep)] font-vt323 text-xl">
            <WalletConnect />
          </div>
        </div>
      </div>
    </div>
  );
}
