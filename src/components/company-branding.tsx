'use client';

import Image from 'next/image';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export function CompanyBranding() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (isCollapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            tooltip='S-Hub'
            className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground cursor-default hover:bg-transparent justify-center p-0!'
          >
            <div className='flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-slate-950 shadow-xs select-none'>
              <span className='font-bold text-sm leading-none text-cyan-400 font-mono'>
                S
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className='flex flex-col items-start w-full px-1 py-1 gap-1.5'>
          <div className='relative w-full max-w-50 overflow-hidden rounded-lg border border-border/40 bg-slate-950 shadow-xs transition-all hover:border-primary/40'>
            <Image
              src='/images/logo_phieu_xuat_nhap_kho.jpg'
              alt='Spider Express'
              width={220}
              height={60}
              priority
              className='w-full h-auto object-contain block'
            />
          </div>
          <div className='flex items-center gap-1.5 px-0.5'>
            <div className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-white border border-cyan-500/30 shadow-xs'>
              <span className='h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]' />
              <span className='text-[11px] font-bold tracking-widest font-mono text-cyan-400 uppercase'>
                S-HUB
              </span>
            </div>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
