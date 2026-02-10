'use client';

import Link from 'next/link';
import { ToastProvider } from '@/hooks/useToast';
import { JobsProvider } from '@/hooks/useJobs';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppSidebar from '@/components/layout/Sidebar';
import Toast from '@/components/ui/Toast';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <JobsProvider>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center justify-between bg-[var(--surface)] backdrop-blur-xl px-4 shadow-sm">
                <Link href="/generate" className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--purple)] text-xs font-bold text-white">
                    AI
                  </div>
                  <span className="text-sm font-bold">AI UGC</span>
                </Link>
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-y-auto p-8">
                {children}
              </main>
            </SidebarInset>
            <Toast />
          </SidebarProvider>
        </TooltipProvider>
      </JobsProvider>
    </ToastProvider>
  );
}
