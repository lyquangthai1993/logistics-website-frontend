'use client';
import React, { useEffect } from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';
import { tokenManager } from '@/lib/token-manager';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    tokenManager.init();
  }, []);

  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <QueryProvider>{children}</QueryProvider>
      </ActiveThemeProvider>
    </>
  );
}
