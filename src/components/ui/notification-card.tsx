'use client';

import React from 'react';
import type { FC } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type NotificationStatus = 'unread' | 'read' | 'archived';
export type ActionType = 'redirect' | 'api_call' | 'workflow' | 'modal';
export type ActionStyle = 'primary' | 'danger' | 'default';
export type NotificationType = 'DISPATCHER' | 'FLEET' | 'WAREHOUSE' | 'GENERIC';

export interface NotificationAction {
  id: string;
  label: string;
  type: ActionType;
  style?: ActionStyle;
  executed?: boolean;
}

export interface NotificationCardProps {
  id: string;
  title: string;
  body: string;
  type?: NotificationType;
  status?: NotificationStatus;
  createdAt?: string | Date;
  actions?: NotificationAction[];
  orderCode?: string;
  onClick?: () => void;
  onMarkAsRead?: (id: string) => void;
  onAction?: (notificationId: string, actionId: string, actionType: ActionType) => void;
  loadingActionId?: string;
  className?: string;
  compact?: boolean;
}

// Color config per notification type
// Dùng CSS variables từ theme thay vì hardcode Tailwind colors
const TYPE_CONFIG: Record<
  NotificationType,
  {
    cssVar: string; // e.g. 'var(--chart-1)'
    icon: React.ReactNode;
    label: string;
  }
> = {
  // Điều phối / đơn hàng → chart-1 (màu đặc trưng #1 của theme)
  DISPATCHER: {
    cssVar: 'var(--chart-1)',
    icon: <Icons.truck size={14} strokeWidth={2} />,
    label: 'Dispatcher'
  },
  // Xe cộ / cảnh báo → chart-2
  FLEET: {
    cssVar: 'var(--chart-2)',
    icon: <Icons.warning size={14} strokeWidth={2} />,
    label: 'Fleet'
  },
  // Kho hàng → chart-3
  WAREHOUSE: {
    cssVar: 'var(--chart-3)',
    icon: <Icons.package size={14} strokeWidth={2} />,
    label: 'Warehouse'
  },
  // Hệ thống → muted-foreground (neutral, luôn readable)
  GENERIC: {
    cssVar: 'var(--muted-foreground)',
    icon: <Icons.notification size={14} strokeWidth={2} />,
    label: 'System'
  }
};

const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins}p trước`;
  if (diffHours < 24) return `${diffHours}h trước`;
  if (diffDays < 7) return `${diffDays}d trước`;

  return d.toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric'
  });
};

const getActionIcon = (actionType: ActionType) => {
  const iconProps = { size: 12, strokeWidth: 2.5 };
  switch (actionType) {
    case 'redirect':
      return <Icons.externalLink {...iconProps} />;
    case 'api_call':
      return <Icons.check {...iconProps} />;
    case 'workflow':
      return <Icons.clock {...iconProps} />;
    case 'modal':
      return <Icons.alertCircle {...iconProps} />;
    default:
      return null;
  }
};

export const NotificationCard: FC<NotificationCardProps> = ({
  id,
  title,
  body,
  type = 'GENERIC',
  status = 'unread',
  createdAt,
  actions = [],
  orderCode,
  onClick,
  onMarkAsRead,
  onAction,
  loadingActionId,
  className,
  compact = false
}) => {
  const isUnread = status === 'unread';
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.GENERIC;
  const color = cfg.cssVar;
  const isClickable = Boolean(onClick);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 2-layer defense: Nếu click vào button con thì tuyệt đối không trigger điều hướng card
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      data-testid='notification-item'
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a')) {
            return;
          }
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group relative w-full transition-all text-left select-none',
        compact ? 'rounded-xl' : 'rounded-2xl',
        isUnread ? 'bg-muted' : 'bg-muted/40',
        isClickable && 'cursor-pointer hover:bg-muted/80 hover:shadow-xs active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className
      )}
      style={{
        borderLeft: `${compact ? '2.5px' : '3px'} solid ${color}`
      }}
    >
      <div className={compact ? 'px-3 py-2' : 'px-4 py-3.5'}>
        <div className={cn('flex items-start justify-between', compact ? 'gap-2' : 'gap-3')}>
          {/* Type icon */}
          <div
            className={cn(
              'mt-0.5 flex flex-shrink-0 items-center justify-center',
              compact ? 'h-6 w-6 rounded-md [&_svg]:size-3.5' : 'h-7 w-7 rounded-lg'
            )}
            style={{
              backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
              color: color
            }}
          >
            {cfg.icon}
          </div>

          {/* Main content */}
          <div className='min-w-0 flex-1 space-y-0.5'>
            {/* Title with unread indicator */}
            <div className='flex items-center gap-1.5'>
              <h3
                className={cn(
                  'leading-tight font-semibold',
                  compact ? 'text-xs line-clamp-1' : 'text-[15px]',
                  isUnread ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {title}
              </h3>
              {isUnread && (
                <div
                  className='h-1.5 w-1.5 flex-shrink-0 rounded-full'
                  style={{ backgroundColor: color }}
                />
              )}
            </div>

            {/* Description */}
            <p
              className={cn(
                'mb-0',
                compact ? 'text-[11px] leading-snug line-clamp-2' : 'text-[13px]',
                isUnread ? 'text-muted-foreground' : 'text-muted-foreground/60'
              )}
            >
              {body}
            </p>

            {/* Order link cue badge */}
            {orderCode && (
              <div className='pt-1 flex items-center gap-1.5'>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
                  compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
                )}>
                  <Icons.truck className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                  <span>Đơn {orderCode}</span>
                  <Icons.chevronRight className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                </span>
              </div>
            )}
          </div>

          {/* Mark as read button with strict stopPropagation */}
          {isUnread && onMarkAsRead && (
            <button
              type='button'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation?.();
                onMarkAsRead(id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'relative z-10 rounded-lg transition-colors cursor-pointer shrink-0',
                compact ? 'p-1' : 'p-1.5',
                'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title='Đánh dấu đã đọc'
              aria-label='Đánh dấu đã đọc'
            >
              <Icons.check size={compact ? 13 : 16} />
            </button>
          )}
        </div>

        <div className={cn('flex items-end justify-between', compact ? 'mt-1.5' : 'mt-3')}>
          {/* Actions with strict stopPropagation */}
          {actions.length > 0 && (
            <div className={cn('flex flex-wrap items-center gap-1.5', !isUnread && 'opacity-60')}>
              {actions.map((action) => {
                const isLoading = loadingActionId === action.id;
                const isExecuted = action.executed || false;
                const showLoading = isLoading && action.type !== 'modal';

                return (
                  <button
                    key={action.id}
                    type='button'
                    disabled={isLoading || isExecuted}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation?.();
                      onAction?.(id, action.id, action.type);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn(
                      'relative z-10 flex items-center gap-1 rounded-md text-xs font-normal transition cursor-pointer',
                      compact ? 'px-2 py-0.5 text-[11px]' : 'px-4 py-1.5',
                      action.style === 'primary'
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : action.style === 'danger'
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                          : 'bg-accent text-muted-foreground hover:bg-accent hover:text-foreground',
                      showLoading && 'opacity-50',
                      isExecuted && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {showLoading ? (
                      <Icons.spinner size={11} className='animate-spin' />
                    ) : (
                      <>
                        <span>{action.label}</span>
                        {isExecuted ? (
                          <Icons.check size={11} strokeWidth={2.5} />
                        ) : (
                          getActionIcon(action.type)
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Timestamp */}
          {createdAt && (
            <span
              className={cn(
                'text-muted-foreground/60 inline-block ml-auto',
                compact ? 'text-[10px]' : 'text-[11px]'
              )}
            >
              {formatDate(createdAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
