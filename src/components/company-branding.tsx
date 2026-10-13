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
            <div className='relative flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-slate-950 shadow-xs'>
              <Image
                src='/images/logo_phieu_xuat_nhap_kho.jpg'
                alt='S-Hub'
                width={32}
                height={32}
                className='h-full w-full object-cover object-left scale-150'
              />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className='flex flex-col items-center w-full px-1 py-1'>
          <div className='relative w-full max-w-[200px] overflow-hidden rounded-lg border border-border/40 bg-slate-950 shadow-xs transition-all hover:border-primary/40'>
            <Image
              src='/images/logo_phieu_xuat_nhap_kho.jpg'
              alt='Spider Express'
              width={220}
              height={60}
              priority
              className='w-full h-auto object-contain block'
            />
          </div>
          <div className='flex items-center justify-center pt-1.5 pb-0.5'>
            <span className='text-xs font-bold tracking-widest uppercase text-muted-foreground font-mono'>
              S-Hub
            </span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
