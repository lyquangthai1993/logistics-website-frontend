'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { toast, Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const toastEl = (e.target as HTMLElement).closest('[data-sonner-toast]');
      if (toastEl) {
        const id = toastEl.getAttribute('data-id');
        if (id) {
          toast.dismiss(id);
        } else {
          toast.dismiss();
        }
      }
    };

    // Use capture phase (true) to intercept clicks on all Toast portals
    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      richColors
      position='top-right'
      offset={{ top: 64, right: 16 }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans cursor-pointer select-none',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error:
            '!bg-destructive !text-destructive-foreground !border-destructive/80 font-medium shadow-md shadow-destructive/20',
          success:
            '!bg-emerald-600 !text-white !border-emerald-700 font-medium shadow-md shadow-emerald-500/20',
          warning:
            '!bg-amber-500 !text-white !border-amber-600 font-medium shadow-md shadow-amber-500/20',
          info: '!bg-blue-600 !text-white !border-blue-700 font-medium shadow-md shadow-blue-500/20'
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
