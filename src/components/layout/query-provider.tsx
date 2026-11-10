'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';
import React, { useEffect, useRef, useState } from 'react';
import { DraggableCore, type DraggableData, type DraggableEvent } from 'react-draggable';

const STORAGE_KEY = 'tms_rq_devtools_btn_pos';
const BTN_SIZE = 52;
const MARGIN = 8;

function clampPosition(x: number, y: number) {
  if (typeof window === 'undefined') return { x, y };
  const maxX = Math.max(MARGIN, window.innerWidth - BTN_SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - BTN_SIZE - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY)
  };
}

function DraggableReactQueryDevtools() {
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });
  const movedDistanceRef = useRef<number>(0);
  const suppressNextClickRef = useRef<boolean>(false);

  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 12, y: 12 });

  useEffect(() => {
    const defaultPos = clampPosition(
      window.innerWidth - BTN_SIZE - 12,
      window.innerHeight - BTN_SIZE - 34
    );
    let initial = defaultPos;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          initial = clampPosition(parsed.x, parsed.y);
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
    setPosition(initial);
    setMounted(true);

    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    const handleCaptureClick = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        suppressNextClickRef.current = false;
      }
    };

    el.addEventListener('click', handleCaptureClick, true);
    return () => el.removeEventListener('click', handleCaptureClick, true);
  }, [mounted]);

  const handleStart = (_e: DraggableEvent, data: DraggableData) => {
    dragOriginRef.current = { startX: data.x, startY: data.y };
    movedDistanceRef.current = 0;
    suppressNextClickRef.current = false;
    setIsDragging(true);
  };

  const handleDrag = (_e: DraggableEvent, data: DraggableData) => {
    movedDistanceRef.current += Math.hypot(data.deltaX, data.deltaY);
    if (movedDistanceRef.current > 4) {
      suppressNextClickRef.current = true;
    }
    setPosition((prev) => clampPosition(prev.x + data.deltaX, prev.y + data.deltaY));
  };

  const handleStop = () => {
    setIsDragging(false);
    setPosition((current) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {
        // Ignore storage errors
      }
      return current;
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <DraggableCore
      nodeRef={nodeRef}
      handle='.tsqd-open-btn-container'
      cancel='.tsqd-main-panel'
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        data-testid='draggable-rq-devtools'
        title='Kéo để di chuyển nút TanStack Query Devtools'
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          touchAction: 'none'
        }}
        className={
          isDragging
            ? '[&_.tsqd-open-btn-container_button]:!cursor-grabbing'
            : '[&_.tsqd-open-btn-container_button]:!cursor-grab'
        }
      >
        <ReactQueryDevtools buttonPosition='relative' />
      </div>
    </DraggableCore>
  );
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <DraggableReactQueryDevtools />
    </QueryClientProvider>
  );
}
