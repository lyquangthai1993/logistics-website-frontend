'use client';

import { create } from 'zustand';

/**
 * Notification store — chỉ giữ UI state.
 * Source of truth là server data qua TanStack Query (useNotificationsQuery).
 * Store này dùng cho optimistic updates hoặc local UI state nếu cần.
 */

export type NotificationStatus = 'read' | 'unread';

export type NotificationAction = {
  id: string;
  label: string;
  type: 'redirect' | 'action';
  style?: 'primary' | 'secondary';
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  actions?: NotificationAction[];
};

type NotificationState = {
  /** Local UI state — không dùng cho rendering chính (xem useNotificationsQuery) */
  _placeholder: null;
};

export const useNotificationStore = create<NotificationState>()(() => ({
  _placeholder: null
}));
