'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconRotateClockwise,
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconPhoto,
  IconExternalLink,
} from '@tabler/icons-react';

interface CargoImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

export function CargoImageLightboxModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title = 'Chi tiết ảnh kiện hàng',
}: CargoImageLightboxModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update currentIndex when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, images.length]);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    resetTransform();
  }, [images.length, resetTransform]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    resetTransform();
  }, [images.length, resetTransform]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, resetTransform]);

  // Native non-passive wheel listener to allow preventDefault safely
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom((prev) => Math.min(prev + 0.25, 3.5));
      } else {
        setZoom((prev) => {
          const next = Math.max(prev - 0.25, 0.5);
          if (next <= 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, [isOpen]);

  // Global mousemove and mouseup listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Canvas mousedown and dblclick listeners
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !isOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (zoom <= 1) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    };

    const onDblClick = () => {
      if (zoom > 1) {
        resetTransform();
      } else {
        setZoom(2);
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('dblclick', onDblClick);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('dblclick', onDblClick);
    };
  }, [isOpen, zoom, position.x, position.y, resetTransform]);

  if (!isOpen || !mounted || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <IconPhoto className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{title}</span>
              <Badge className="bg-blue-900/60 text-blue-300 border-blue-700 text-[10px] font-mono font-bold">
                {currentIndex + 1} / {images.length}
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-400">
              Kiểm đếm kiện hàng thực tế tại kho
            </p>
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Thu nhỏ (-)"
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <IconZoomOut className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={resetTransform}
            title="Đặt lại mức zoom ban đầu (0)"
            className="px-2 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3.5}
            title="Phóng to (+)"
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <IconZoomIn className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            title="Xoay ảnh 90°"
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <IconRotateClockwise className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetTransform}
            title="Đặt lại khung nhìn"
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <IconMaximize className="h-4 w-4" />
          </Button>
        </div>

        {/* Right Tools: Open Link + Close */}
        <div className="flex items-center gap-2">
          {currentImage && (
            <a
              href={currentImage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Mở ảnh gốc trong tab mới"
            >
              <IconExternalLink className="h-5 w-5" />
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Đóng (Esc)"
            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <IconX className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Image Canvas */}
      <div
        ref={canvasRef}
        className={`flex-1 relative flex items-center justify-center overflow-hidden ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {/* Navigation Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Ảnh trước (←)"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/70 hover:bg-blue-600 text-white border border-slate-700 shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <IconChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Navigation Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Ảnh tiếp theo (→)"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/70 hover:bg-blue-600 text-white border border-slate-700 shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <IconChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Displayed Image */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center p-4 transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* oxlint-disable-next-line next/no-img-element */}
          <img
            src={currentImage}
            alt={`Ảnh kiện hàng ${currentIndex + 1}`}
            className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip & Instruction */}
      <div className="bg-slate-900/80 border-t border-slate-800 px-5 py-3 flex flex-col items-center gap-2 z-20">
        {/* Thumbnails Row */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  resetTransform();
                }}
                className={`relative h-14 w-20 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${
                  idx === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                    : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* oxlint-disable-next-line next/no-img-element */}
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono font-bold bg-black/70 text-white px-1 rounded">
                  #{idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer Hints */}
        <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>Phím ← / →: Chuyển ảnh</span>
          <span>•</span>
          <span>Cuộn chuột / Phím +/-: Phóng to thu nhỏ</span>
          <span>•</span>
          <span>Kéo chuột: Di chuyển ảnh khi zoom</span>
          <span>•</span>
          <span>Double click: Phóng to nhanh 2x</span>
          <span>•</span>
          <span>Esc: Đóng</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
