'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { formatApiError } from '@/lib/api-error';
import { toast } from 'sonner';
import {
  IconRefresh,
  IconClock,
  IconPlayerPlay,
  IconPlayerStop,
  IconCheck,
  IconAlertTriangle,
  IconSettings,
  IconHistory,
  IconListCheck,
  IconSearch,
  IconArrowLeft,
  IconCalendarStats,
  IconChevronRight,
  IconChartBar,
  IconLoader2
} from '@tabler/icons-react';

export interface CronJobConfig {
  id: number;
  jobKey: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  cronTime: string;
  cutoffHour: number;
  notifySuperAdmins: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastReportDate: string | null;
  nextRunAt?: string | null;
  nextRunLabel?: string;
}

export interface CronScheduleInfo {
  currentVnTime: string;
  latestClosedReportDate: string;
  latestClosedWindowLabel: string;
  currentOpenReportDate: string;
  currentOpenWindowLabel: string;
  nextRunAt: string | null;
  nextRunLabel: string;
  cutoffRule: string;
}

export interface CronExecutionLogItem {
  id: number;
  jobKey: string;
  targetDate: string;
  targetEndDate: string;
  windowLabel: string;
  triggeredBy: string;
  actorUserId: number | null;
  actorEmail: string | null;
  status: string;
  processedDays: number;
  upsertedHubRows: number;
  totalInboundCbm?: number;
  totalInboundTons?: number;
  totalInboundTrips?: number;
  totalOutboundCbm?: number;
  totalOutboundTons?: number;
  totalOutboundTrips?: number;
  durationMs: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface CronDailySnapshotItem {
  reportDate: string;
  fullDateLabel: string;
  windowStart: string;
  windowEnd: string;
  windowLabel: string;
  isClosed: boolean;
  isCurrentOpen: boolean;
  hubCount: number;
  triggeredBy: string;
  calculatedAt: string | null;
  inboundCbm: number;
  inboundWeightKg: number;
  inboundTons: number;
  inboundTrips: number;
  inboundOrders: number;
  inboundPackages: number;
  outboundCbm: number;
  outboundWeightKg: number;
  outboundTons: number;
  outboundTrips: number;
  outboundOrders: number;
  outboundPackages: number;
}

export interface CronManagementResponse {
  config: CronJobConfig;
  jobs?: CronJobConfig[];
  scheduleInfo: CronScheduleInfo;
  logs: CronExecutionLogItem[];
  dailySnapshots?: CronDailySnapshotItem[];
}

interface LastRerunSummary {
  jobKey: string;
  fromDate: string;
  toDate: string;
  processedDays: number;
  windowLabel: string;
  upsertedRows: number;
  durationMs: number;
  totalInboundCbm: number;
  totalInboundTons: number;
  totalInboundTrips: number;
  totalOutboundCbm: number;
  totalOutboundTons: number;
  totalOutboundTrips: number;
}

type DayRunState = 'IDLE' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

function formatDateTimeVn(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatDateVn(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '—';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function shiftDateYmd(ymd: string, deltaDays: number): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function enumerateDatesClient(fromYmd: string, toYmd: string): string[] {
  if (
    !fromYmd ||
    !toYmd ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(toYmd)
  ) {
    return [];
  }
  const start = fromYmd <= toYmd ? fromYmd : toYmd;
  const end = fromYmd <= toYmd ? toYmd : fromYmd;
  const list: string[] = [];
  let curr = start;
  let safety = 0;
  while (curr <= end && safety < 366) {
    list.push(curr);
    curr = shiftDateYmd(curr, 1);
    safety++;
  }
  return list;
}

function computeRangeWindowPreview(fromDate: string, toDate: string): {
  orderedFrom: string;
  orderedTo: string;
  daysCount: number;
  daysList: string[];
  windowLabel: string;
} {
  const daysList = enumerateDatesClient(fromDate, toDate);
  if (daysList.length === 0) {
    return {
      orderedFrom: fromDate || '—',
      orderedTo: toDate || '—',
      daysCount: 0,
      daysList: [],
      windowLabel: '—'
    };
  }
  const orderedFrom = daysList[0];
  const orderedTo = daysList[daysList.length - 1];
  const prevStartYmd = shiftDateYmd(orderedFrom, -1);
  const windowLabel = `18:00 (6:00 PM) ngày ${formatDateVn(prevStartYmd)} → 18:00 (6:00 PM) ngày ${formatDateVn(orderedTo)}`;

  return {
    orderedFrom,
    orderedTo,
    daysCount: daysList.length,
    daysList,
    windowLabel
  };
}

function getTriggerBadge(triggeredBy: string) {
  switch (triggeredBy) {
    case 'CRON_SCHEDULED':
    case 'CRON':
      return (
        <Badge
          variant='outline'
          className='bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300 text-[10px] px-1.5 py-0'
        >
          Tự động (Cron)
        </Badge>
      );
    case 'MANUAL_RANGE':
      return (
        <Badge
          variant='outline'
          className='bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300 text-[10px] px-1.5 py-0'
        >
          Chạy tách từng ngày
        </Badge>
      );
    case 'MANUAL_RERUN':
    case 'MANUAL':
      return (
        <Badge
          variant='outline'
          className='bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300 text-[10px] px-1.5 py-0'
        >
          Chạy 1 ngày
        </Badge>
      );
    default:
      return (
        <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
          Hệ thống
        </Badge>
      );
  }
}

/**
 * 1. TRANG DANH SÁCH TÁC VỤ CRONJOB (/dashboard/admin/cronjobs)
 * Chỉ hiển thị bảng Danh mục Tác vụ Cronjob Hệ thống & KPI tổng quan.
 * Cột Trạng thái dùng công tắc Switch ON | OFF.
 * Muốn thao tác (chạy theo khoảng ngày, cấu hình lịch chạy, xem nhật ký) thì bấm vào Trang Detail của Cronjob đó.
 */
export function SuperAdminCronjobManager() {
  const router = useRouter();
  const [data, setData] = useState<CronManagementResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingJobKey, setTogglingJobKey] = useState<string | null>(null);

  const loadCronRegistry = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        '/api/v1/admin/reports/cronjobs?daysLimit=14'
      );
      const raw = res.data;
      const payload: CronManagementResponse = raw?.data ?? raw;
      setData(payload);
    } catch (err) {
      toast.error(
        formatApiError(err, 'Không thể tải danh sách tác vụ Cronjob')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCronRegistry();
  }, [loadCronRegistry]);

  const handleToggleJobSwitch = async (job: CronJobConfig) => {
    const nextEnabled = !job.isEnabled;
    setTogglingJobKey(job.jobKey);
    try {
      await apiClient.patch('/api/v1/admin/reports/cronjobs/config', {
        jobKey: job.jobKey,
        isEnabled: nextEnabled
      });
      toast.success(
        `Đã chuyển công tắc ${job.jobKey} sang trạng thái ${nextEnabled ? 'ON (Đang bật)' : 'OFF (Tạm dừng)'}`
      );
      await loadCronRegistry();
    } catch (err) {
      toast.error(
        formatApiError(err, 'Không thể cập nhật trạng thái công tắc Cronjob')
      );
    } finally {
      setTogglingJobKey(null);
    }
  };

  const jobList = useMemo<CronJobConfig[]>(() => {
    if (data?.jobs && data.jobs.length > 0) {
      return data.jobs;
    }
    return data?.config ? [data.config] : [];
  }, [data]);

  const activeJobsCount = useMemo(
    () => jobList.filter((j) => j.isEnabled).length,
    [jobList]
  );

  return (
    <div className='space-y-2 pb-2' data-testid='super-admin-cronjob-page'>
      {/* 1. Thanh KPI Tổng quan Hệ thống Cronjob */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-2'>
        <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
          <CardContent className='p-0 space-y-0.5'>
            <span className='text-[10px] font-bold uppercase text-muted-foreground'>
              Tổng tác vụ Cronjob
            </span>
            <div className='text-sm font-bold font-mono text-slate-900 dark:text-slate-100'>
              {jobList.length} tác vụ hệ thống
            </div>
            <span className='text-[10px] text-muted-foreground'>
              Quản lý tập trung tại máy chủ
            </span>
          </CardContent>
        </Card>

        <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
          <CardContent className='p-0 space-y-0.5'>
            <span className='text-[10px] font-bold uppercase text-muted-foreground'>
              Trạng thái tự động
            </span>
            <div className='text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400'>
              {activeJobsCount} / {jobList.length} đang bật
            </div>
            <span className='text-[10px] text-muted-foreground'>
              Tự động kích hoạt theo lịch GMT+7
            </span>
          </CardContent>
        </Card>

        <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
          <CardContent className='p-0 space-y-0.5'>
            <span className='text-[10px] font-bold uppercase text-muted-foreground'>
              Giờ hệ thống hiện tại (GMT+7)
            </span>
            <div className='text-sm font-bold font-mono text-[#0F3D62] dark:text-blue-300'>
              {data?.scheduleInfo?.currentVnTime || '—'}
            </div>
            <span className='text-[10px] text-muted-foreground'>
              Múi giờ chuẩn vận hành Việt Nam
            </span>
          </CardContent>
        </Card>

        <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
          <CardContent className='p-0 space-y-0.5'>
            <span className='text-[10px] font-bold uppercase text-muted-foreground'>
              Kỳ báo cáo đã khóa sổ gần nhất
            </span>
            <div className='text-sm font-bold font-mono text-slate-900 dark:text-slate-100'>
              {formatDateVn(data?.scheduleInfo?.latestClosedReportDate)}
            </div>
            <span className='text-[10px] font-mono text-muted-foreground'>
              Chu kỳ: 18:00 D-1 → 18:00 D
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 2. Bảng Danh mục Tác vụ Cronjob Hệ thống */}
      <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
            <div className='flex items-center gap-1.5'>
              <IconListCheck className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
              <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                Danh mục Tác vụ Cronjob Hệ thống ({jobList.length} tác vụ)
              </h2>
              <span className='text-[10px] text-muted-foreground'>
                • Chọn một tác vụ để mở trang Chi tiết & thực hiện chạy lại theo khoảng ngày hoặc cấu hình lịch chạy
              </span>
            </div>

            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void loadCronRegistry()}
              disabled={loading}
              data-testid='btn-refresh-cron-page'
              className='h-7 px-2 text-[10px] font-semibold cursor-pointer'
            >
              <IconRefresh
                className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`}
              />
              Làm mới danh sách
            </Button>
          </div>

          <div className='overflow-x-auto border rounded'>
            <table
              className='w-full text-left border-collapse'
              data-testid='cron-job-registry-table'
            >
              <thead className='bg-slate-100 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 border-b'>
                <tr>
                  <th className='py-1 px-1.5'>Mã & Tên tác vụ Cronjob</th>
                  <th className='py-1 px-1.5 text-center'>Giờ chạy (GMT+7)</th>
                  <th className='py-1 px-1.5'>Lần chạy kế tiếp</th>
                  <th className='py-1 px-1.5'>Lần chạy gần nhất</th>
                  <th className='py-1 px-1.5 text-center'>Kỳ dữ liệu cuối</th>
                  <th className='py-1 px-1.5 text-center'>Trạng thái</th>
                  <th className='py-1 px-1.5 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60 text-[10px]'>
                {jobList.map((job) => (
                  <tr
                    key={job.jobKey}
                    data-testid={`cron-job-row-${job.jobKey}`}
                    onClick={() =>
                      router.push(`/dashboard/admin/cronjobs/${job.jobKey}`)
                    }
                    className='hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer'
                  >
                    <td className='py-1 px-1.5'>
                      <div className='flex flex-wrap items-center gap-1'>
                        <span className='font-bold text-xs text-slate-900 dark:text-slate-100'>
                          {job.name}
                        </span>
                        <Badge
                          variant='outline'
                          className='text-[10px] font-mono px-1.5 py-0'
                        >
                          {job.jobKey}
                        </Badge>
                      </div>
                      {job.description && (
                        <p className='text-[10px] text-muted-foreground line-clamp-1'>
                          {job.description}
                        </p>
                      )}
                    </td>
                    <td className='py-1 px-1.5 text-center font-mono font-bold text-[11px] text-[#0F3D62] dark:text-blue-300'>
                      {job.cronTime}
                    </td>
                    <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                      {job.nextRunLabel ||
                        (job.isEnabled
                          ? `${job.cronTime} hàng ngày (GMT+7)`
                          : 'Đang tạm dừng')}
                    </td>
                    <td className='py-1 px-1.5 font-mono'>
                      {job.lastRunAt ? (
                        <div className='flex flex-wrap items-center gap-1'>
                          <span>{formatDateTimeVn(job.lastRunAt)}</span>
                          {job.lastRunStatus === 'SUCCESS' ? (
                            <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] px-1 py-0'>
                              THÀNH CÔNG
                            </Badge>
                          ) : job.lastRunStatus ? (
                            <Badge className='bg-rose-500/15 text-rose-700 border-rose-500/25 dark:text-rose-300 text-[10px] px-1 py-0'>
                              LỖI
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>
                          Chưa chạy (Đang trống)
                        </span>
                      )}
                    </td>
                    <td className='py-1 px-1.5 text-center font-mono font-semibold'>
                      {job.lastReportDate
                        ? formatDateVn(job.lastReportDate)
                        : '—'}
                    </td>
                    <td
                      className='py-1 px-1.5 text-center'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type='button'
                        role='switch'
                        aria-checked={job.isEnabled}
                        disabled={togglingJobKey === job.jobKey}
                        onClick={() => void handleToggleJobSwitch(job)}
                        data-testid={`btn-toggle-job-${job.jobKey}`}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-colors cursor-pointer ${
                          job.isEnabled
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span
                          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                            job.isEnabled
                              ? 'bg-emerald-600'
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                              job.isEnabled
                                ? 'translate-x-3.5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span className='font-mono'>
                          {job.isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </td>
                    <td
                      className='py-1 px-1.5 text-right'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type='button'
                        size='sm'
                        onClick={() =>
                          router.push(`/dashboard/admin/cronjobs/${job.jobKey}`)
                        }
                        className='h-6 px-2 text-[10px] font-bold bg-[#0F3D62] hover:bg-[#154c79] text-white cursor-pointer'
                        data-testid={`btn-open-cronjob-detail-${job.jobKey}`}
                      >
                        Chi tiết & Thao tác
                        <IconChevronRight className='h-3 w-3 ml-1' />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 2. TRANG CHI TIẾT & THAO TÁC CRONJOB (/dashboard/admin/cronjobs/[jobKey])
 * Khi chọn nhiều ngày (Từ ngày -> Đến ngày), hệ thống tự động chia nhỏ thành danh sách
 * từng ngày độc lập và chạy tuần tự theo từng ngày (day-by-day sequential execution).
 */
export function SuperAdminCronjobDetail({ jobKey }: { jobKey: string }) {
  const router = useRouter();
  const normalizedJobKey = decodeURIComponent(
    jobKey || 'DAILY_HUB_OPERATIONAL_REPORT'
  ).trim();

  const [data, setData] = useState<CronManagementResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Date range rerun state (Từ ngày -> Đến ngày)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [rerunNotify, setRerunNotify] = useState<boolean>(false);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [lastRerunResult, setLastRerunResult] =
    useState<LastRerunSummary | null>(null);

  // Sequential Day-by-Day execution tracking state
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayRunState>>(
    {}
  );
  const [currentRunningDay, setCurrentRunningDay] = useState<string | null>(
    null
  );
  const [completedDaysCount, setCompletedDaysCount] = useState<number>(0);
  const [totalDaysToRun, setTotalDaysToRun] = useState<number>(0);
  const abortRunRef = useRef<boolean>(false);

  // Cron Config edit state
  const [cfgEnabled, setCfgEnabled] = useState<boolean>(true);
  const [cfgCronTime, setCfgCronTime] = useState<string>('18:05');
  const [cfgNotify, setCfgNotify] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Detail bottom tab ('logs' | 'snapshots') & filters
  const [activeBottomTab, setActiveBottomTab] = useState<'logs' | 'snapshots'>(
    'logs'
  );
  const [logStatusFilter, setLogStatusFilter] = useState<
    'ALL' | 'SUCCESS' | 'FAILED'
  >('ALL');
  const [logSearch, setLogSearch] = useState<string>('');

  const loadCronDetailData = useCallback(
    async (preserveInputs = false) => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          '/api/v1/admin/reports/cronjobs?daysLimit=30'
        );
        const raw = res.data;
        const payload: CronManagementResponse = raw?.data ?? raw;
        setData(payload);

        const allJobs =
          payload.jobs && payload.jobs.length > 0
            ? payload.jobs
            : payload.config
              ? [payload.config]
              : [];
        const matchedJob =
          allJobs.find((j) => j.jobKey === normalizedJobKey) ||
          payload.config ||
          null;

        if (!preserveInputs) {
          const defaultClosedDate =
            payload.scheduleInfo?.latestClosedReportDate ||
            new Date().toISOString().slice(0, 10);
          let urlFrom = '';
          let urlTo = '';
          if (typeof window !== 'undefined') {
            const sp = new URLSearchParams(window.location.search);
            const qFrom = sp.get('fromDate') || '';
            const qTo = sp.get('toDate') || '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(qFrom)) urlFrom = qFrom;
            if (/^\d{4}-\d{2}-\d{2}$/.test(qTo)) urlTo = qTo;
          }
          setFromDate((prev) => prev || urlFrom || defaultClosedDate);
          setToDate((prev) => prev || urlTo || urlFrom || defaultClosedDate);
          if (matchedJob) {
            setCfgEnabled(Boolean(matchedJob.isEnabled));
            setCfgCronTime(matchedJob.cronTime || '18:05');
            setCfgNotify(Boolean(matchedJob.notifySuperAdmins));
          }
        }
      } catch (err) {
        toast.error(
          formatApiError(err, 'Không thể tải thông tin chi tiết Cronjob')
        );
      } finally {
        setLoading(false);
      }
    },
    [normalizedJobKey]
  );

  useEffect(() => {
    void loadCronDetailData(false);
  }, [loadCronDetailData]);

  const jobList = useMemo<CronJobConfig[]>(() => {
    if (data?.jobs && data.jobs.length > 0) {
      return data.jobs;
    }
    return data?.config ? [data.config] : [];
  }, [data]);

  const currentJob = useMemo<CronJobConfig | null>(
    () =>
      jobList.find((j) => j.jobKey === normalizedJobKey) ||
      data?.config ||
      null,
    [jobList, normalizedJobKey, data?.config]
  );

  const rangePreview = useMemo(
    () => computeRangeWindowPreview(fromDate, toDate),
    [fromDate, toDate]
  );

  const applyRangePreset = (
    preset:
      | 'LATEST_CLOSED'
      | 'TODAY_OPEN'
      | 'LAST_7_DAYS'
      | 'LAST_14_DAYS'
      | 'THIS_MONTH'
      | 'LAST_MONTH'
      | 'LAST_30_DAYS'
  ) => {
    const latestClosed =
      data?.scheduleInfo?.latestClosedReportDate ||
      new Date().toISOString().slice(0, 10);
    const currentOpen =
      data?.scheduleInfo?.currentOpenReportDate ||
      shiftDateYmd(latestClosed, 1);

    setDayStatuses({});
    setLastRerunResult(null);

    if (preset === 'LATEST_CLOSED') {
      setFromDate(latestClosed);
      setToDate(latestClosed);
      return;
    }
    if (preset === 'TODAY_OPEN') {
      setFromDate(currentOpen);
      setToDate(currentOpen);
      return;
    }
    if (preset === 'LAST_7_DAYS') {
      setFromDate(shiftDateYmd(latestClosed, -6));
      setToDate(latestClosed);
      return;
    }
    if (preset === 'LAST_14_DAYS') {
      setFromDate(shiftDateYmd(latestClosed, -13));
      setToDate(latestClosed);
      return;
    }
    if (preset === 'LAST_30_DAYS') {
      setFromDate(shiftDateYmd(latestClosed, -29));
      setToDate(latestClosed);
      return;
    }

    const [yStr, mStr] = latestClosed.split('-');
    const year = Number(yStr);
    const month = Number(mStr);

    if (preset === 'THIS_MONTH') {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
      return;
    }

    if (preset === 'LAST_MONTH') {
      const prevMonthDate = new Date(Date.UTC(year, month - 2, 1));
      const py = prevMonthDate.getUTCFullYear();
      const pm = prevMonthDate.getUTCMonth() + 1;
      const start = `${py}-${String(pm).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(py, pm, 0)).toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
    }
  };

  /**
   * Tự động chia khoảng ngày [rawFrom, rawTo] thành danh sách từng ngày một (daysList)
   * và gọi thực thi tuần tự từng ngày (1 ngày / 1 lượt chạy nguyên tử).
   */
  const handleExecuteRerunRange = async (
    overrideFrom?: string,
    overrideTo?: string,
    sourceKey = 'MAIN_FORM'
  ) => {
    const rawFrom =
      overrideFrom ||
      fromDate ||
      data?.scheduleInfo?.latestClosedReportDate ||
      new Date().toISOString().slice(0, 10);
    const rawTo = overrideTo || toDate || rawFrom;

    const daysToExecute = enumerateDatesClient(rawFrom, rawTo);
    if (daysToExecute.length === 0) {
      toast.error('Vui lòng chọn khoảng ngày (Từ ngày → Đến ngày) hợp lệ');
      return;
    }

    const orderedFrom = daysToExecute[0];

    abortRunRef.current = false;
    setRunningKey(sourceKey);
    setTotalDaysToRun(daysToExecute.length);
    setCompletedDaysCount(0);
    setLastRerunResult(null);

    const initialStatuses: Record<string, DayRunState> = {};
    for (const d of daysToExecute) {
      initialStatuses[d] = 'PENDING';
    }
    setDayStatuses(initialStatuses);

    let accProcessedDays = 0;
    let accUpsertedRows = 0;
    let accDurationMs = 0;
    let accInCbm = 0;
    let accInTons = 0;
    let accInTrips = 0;
    let accOutCbm = 0;
    let accOutTons = 0;
    let accOutTrips = 0;
    let lastSuccessDate = orderedFrom;

    try {
      for (let i = 0; i < daysToExecute.length; i++) {
        if (abortRunRef.current) {
          toast.info(
            `Đã dừng tại ngày ${formatDateVn(daysToExecute[i])} (Đã chạy xong ${accProcessedDays}/${daysToExecute.length} ngày)`
          );
          break;
        }

        const dayStr = daysToExecute[i];
        setCurrentRunningDay(dayStr);
        setDayStatuses((prev) => ({
          ...prev,
          [dayStr]: 'RUNNING'
        }));

        const isLastDay = i === daysToExecute.length - 1;
        const res = await apiClient.post(
          '/api/v1/admin/reports/cronjobs/rerun',
          {
            jobKey: normalizedJobKey,
            reportDate: dayStr,
            fromDate: dayStr,
            toDate: dayStr,
            notifySuperAdmins: isLastDay ? rerunNotify : false
          }
        );

        const raw = res.data;
        const result = raw?.data ?? raw;
        const summary = result.summary || {};

        accProcessedDays += 1;
        accUpsertedRows += Number(result.upsertedRows) || 0;
        accDurationMs += Number(result.log?.durationMs) || 1;
        accInCbm += Number(summary.totalInboundCbm) || 0;
        accInTons += Number(summary.totalInboundTons) || 0;
        accInTrips += Number(summary.totalInboundTrips) || 0;
        accOutCbm += Number(summary.totalOutboundCbm) || 0;
        accOutTons += Number(summary.totalOutboundTons) || 0;
        accOutTrips += Number(summary.totalOutboundTrips) || 0;
        lastSuccessDate = dayStr;

        setCompletedDaysCount(i + 1);
        setDayStatuses((prev) => ({
          ...prev,
          [dayStr]: 'SUCCESS'
        }));
      }

      if (accProcessedDays > 0) {
        const finalWindow = computeRangeWindowPreview(
          orderedFrom,
          lastSuccessDate
        ).windowLabel;

        setLastRerunResult({
          jobKey: normalizedJobKey,
          fromDate: orderedFrom,
          toDate: lastSuccessDate,
          processedDays: accProcessedDays,
          windowLabel: finalWindow,
          upsertedRows: accUpsertedRows,
          durationMs: accDurationMs,
          totalInboundCbm: Math.round(accInCbm * 10) / 10,
          totalInboundTons: Math.round(accInTons * 100) / 100,
          totalInboundTrips: accInTrips,
          totalOutboundCbm: Math.round(accOutCbm * 10) / 10,
          totalOutboundTons: Math.round(accOutTons * 100) / 100,
          totalOutboundTrips: accOutTrips
        });

        toast.success(
          accProcessedDays === 1
            ? `Đã chạy thành công Cronjob ngày ${formatDateVn(orderedFrom)}`
            : `Đã tách và chạy tuần tự thành công ${accProcessedDays} ngày (${formatDateVn(orderedFrom)} → ${formatDateVn(lastSuccessDate)})`
        );
      }

      await loadCronDetailData(true);
    } catch (err) {
      if (currentRunningDay) {
        setDayStatuses((prev) => ({
          ...prev,
          [currentRunningDay]: 'FAILED'
        }));
      }
      toast.error(formatApiError(err, 'Không thể thực thi chạy lại Cronjob'));
    } finally {
      setCurrentRunningDay(null);
      setRunningKey(null);
    }
  };

  const handleSaveCronConfig = async () => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(cfgCronTime.trim())) {
      toast.error('Giờ chạy hàng ngày phải đúng định dạng HH:mm (ví dụ 18:05)');
      return;
    }
    setSavingConfig(true);
    try {
      await apiClient.patch('/api/v1/admin/reports/cronjobs/config', {
        jobKey: normalizedJobKey,
        isEnabled: cfgEnabled,
        cronTime: cfgCronTime.trim(),
        notifySuperAdmins: cfgNotify
      });
      toast.success(
        `Đã lưu cấu hình ${normalizedJobKey} (${cfgEnabled ? `Tự động chạy lúc ${cfgCronTime}` : 'Tạm dừng'})`
      );
      await loadCronDetailData(true);
    } catch (err) {
      toast.error(formatApiError(err, 'Không thể lưu cấu hình Cronjob'));
    } finally {
      setSavingConfig(false);
    }
  };

  const jobLogs = useMemo(() => {
    const allLogs = data?.logs || [];
    return allLogs.filter((l) => l.jobKey === normalizedJobKey);
  }, [data?.logs, normalizedJobKey]);

  const logCounts = useMemo(
    () => ({
      all: jobLogs.length,
      success: jobLogs.filter((l) => l.status === 'SUCCESS').length,
      failed: jobLogs.filter((l) => l.status !== 'SUCCESS').length
    }),
    [jobLogs]
  );

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return jobLogs.filter((log) => {
      if (logStatusFilter === 'SUCCESS' && log.status !== 'SUCCESS') {
        return false;
      }
      if (logStatusFilter === 'FAILED' && log.status === 'SUCCESS') {
        return false;
      }
      if (q) {
        const hay = `${log.id} ${log.jobKey} ${log.targetDate} ${log.targetEndDate} ${formatDateVn(log.targetDate)} ${formatDateVn(log.targetEndDate)} ${log.actorEmail || ''} ${log.triggeredBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobLogs, logStatusFilter, logSearch]);

  const dailySnapshots = useMemo(
    () => data?.dailySnapshots || [],
    [data?.dailySnapshots]
  );

  const populatedDaysCount = useMemo(
    () => dailySnapshots.filter((s) => s.hubCount > 0).length,
    [dailySnapshots]
  );

  const progressPercent =
    totalDaysToRun > 0
      ? Math.min(100, Math.round((completedDaysCount / totalDaysToRun) * 100))
      : 0;

  return (
    <div
      className='space-y-2 pb-2'
      data-testid='super-admin-cronjob-detail-page'
    >
      {/* 1. Header Điều hướng & Định danh Tác vụ Cronjob */}
      <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-1.5'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => router.push('/dashboard/admin/cronjobs')}
                className='h-7 px-2 text-[10px] font-semibold cursor-pointer'
                data-testid='btn-back-cronjob-list'
              >
                <IconArrowLeft className='h-3.5 w-3.5 mr-1' />
                Danh sách Cronjob
              </Button>

              <span className='text-xs font-bold text-slate-900 dark:text-slate-100'>
                {currentJob?.name || normalizedJobKey}
              </span>

              <Badge
                variant='outline'
                className='text-[10px] font-mono px-1.5 py-0'
              >
                {normalizedJobKey}
              </Badge>

              <Badge
                variant='outline'
                className={`text-[10px] font-bold px-1.5 py-0 ${
                  currentJob?.isEnabled
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {currentJob?.isEnabled ? 'ON • ĐANG BẬT' : 'OFF • TẠM DỪNG'}
              </Badge>
            </div>

            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                Chuyển nhanh tác vụ:
              </span>
              <select
                value={normalizedJobKey}
                onChange={(e) =>
                  router.push(`/dashboard/admin/cronjobs/${e.target.value}`)
                }
                data-testid='select-switch-cronjob'
                className='h-7 rounded border border-input bg-background px-2 text-[10px] font-mono font-semibold'
              >
                {jobList.map((j) => (
                  <option key={j.jobKey} value={j.jobKey}>
                    {j.jobKey} — {j.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground'>
            <span>
              {currentJob?.description ||
                'Tự động chốt sản lượng CBM, Số Tấn và Chuyến xe (TRIP) xác nhận Nhập/Xuất theo chu kỳ 18:00 ngày D-1 → 18:00 ngày D'}
            </span>
            <span className='font-mono'>
              Giờ hệ thống GMT+7:{' '}
              <strong className='text-foreground'>
                {data?.scheduleInfo?.currentVnTime || '—'}
              </strong>{' '}
              • Lần chạy cuối:{' '}
              <strong className='text-foreground'>
                {currentJob?.lastRunAt
                  ? formatDateTimeVn(currentJob.lastRunAt)
                  : 'Chưa chạy'}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Khối Thao tác: Chạy lại theo Khoảng ngày (Trái 7 cột) & Cấu hình Lịch chạy (Phải 5 cột) */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-2'>
        {/* Khối Trái (7 cột): Chạy lại Cronjob theo Khoảng Ngày — Tự chia nhỏ chạy từng ngày */}
        <Card
          className='lg:col-span-7 p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
          data-testid='panel-rerun-specific-date'
        >
          <CardContent className='p-0 space-y-2'>
            <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
              <div className='flex items-center gap-1.5'>
                <IconCalendarStats className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
                <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                  Thực thi & Chạy lại Cronjob theo Khoảng Ngày (Từ ngày → Đến ngày)
                </h2>
              </div>
              <Badge
                variant='outline'
                className='bg-blue-500/10 text-[#0F3D62] dark:text-blue-300 border-blue-500/25 text-[10px] font-mono px-1.5 py-0'
              >
                Tự chia nhỏ: {rangePreview.daysCount} ngày độc lập
              </Badge>
            </div>

            {/* Thanh chọn nhanh khoảng ngày (Quick Range Presets) */}
            <div className='flex flex-wrap items-center gap-1'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground mr-1'>
                Chọn nhanh:
              </span>
              <button
                type='button'
                onClick={() => applyRangePreset('LATEST_CLOSED')}
                data-testid='preset-latest-closed'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                Ngày chốt gần nhất
              </button>
              <button
                type='button'
                onClick={() => applyRangePreset('TODAY_OPEN')}
                data-testid='preset-today'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                Hôm nay (Đang mở)
              </button>
              <button
                type='button'
                onClick={() => applyRangePreset('LAST_7_DAYS')}
                data-testid='preset-last-7-days'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                7 ngày gần nhất
              </button>
              <button
                type='button'
                onClick={() => applyRangePreset('LAST_14_DAYS')}
                data-testid='preset-last-14-days'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                14 ngày
              </button>
              <button
                type='button'
                onClick={() => applyRangePreset('THIS_MONTH')}
                data-testid='preset-this-month'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                Tháng này
              </button>
              <button
                type='button'
                onClick={() => applyRangePreset('LAST_MONTH')}
                data-testid='preset-last-month'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                Tháng trước
              </button>
              <button
                type='button'
                onClick={() => applyRangePreset('LAST_30_DAYS')}
                data-testid='preset-last-30-days'
                className='px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-muted cursor-pointer'
              >
                30 ngày gần nhất
              </button>
            </div>

            {/* Ô chọn Từ ngày -> Đến ngày + Nút Chạy tuần tự từng ngày */}
            <div className='grid grid-cols-1 sm:grid-cols-12 gap-2 items-end'>
              <div className='sm:col-span-4'>
                <label className='block text-[10px] font-bold uppercase text-muted-foreground mb-1'>
                  Từ ngày báo cáo (From Date)
                </label>
                <Input
                  type='date'
                  value={fromDate}
                  disabled={runningKey !== null}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setFromDate(nextVal);
                    setDayStatuses({});
                    if (!toDate) {
                      setToDate(nextVal);
                    }
                  }}
                  className='h-8 text-xs font-mono font-bold'
                  data-testid='rerun-target-date'
                />
              </div>

              <div className='sm:col-span-4'>
                <div className='flex items-center justify-between mb-1'>
                  <label className='block text-[10px] font-bold uppercase text-muted-foreground'>
                    Đến ngày báo cáo (To Date)
                  </label>
                  <button
                    type='button'
                    disabled={runningKey !== null}
                    onClick={() => {
                      setToDate(fromDate);
                      setDayStatuses({});
                    }}
                    data-testid='btn-single-day-sync'
                    className='text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'
                  >
                    Chỉ 1 ngày
                  </button>
                </div>
                <Input
                  type='date'
                  value={toDate}
                  disabled={runningKey !== null}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDayStatuses({});
                  }}
                  className='h-8 text-xs font-mono font-bold'
                  data-testid='rerun-to-date'
                />
              </div>

              <div className='sm:col-span-4 flex items-center gap-1'>
                <Button
                  type='button'
                  size='sm'
                  disabled={runningKey !== null}
                  onClick={() => void handleExecuteRerunRange()}
                  className='flex-1 h-8 text-xs font-bold bg-[#0F3D62] hover:bg-[#154c79] text-white cursor-pointer'
                  data-testid='btn-execute-rerun'
                >
                  {runningKey === 'MAIN_FORM' ? (
                    <>
                      <IconLoader2 className='h-3.5 w-3.5 mr-1 animate-spin shrink-0' />
                      Đang chạy {completedDaysCount}/{totalDaysToRun} ngày...
                    </>
                  ) : (
                    <>
                      <IconPlayerPlay className='h-3.5 w-3.5 mr-1 shrink-0' />
                      {rangePreview.daysCount <= 1
                        ? `Chạy ngày ${formatDateVn(rangePreview.orderedFrom)}`
                        : `Tách & chạy từng ngày (${rangePreview.daysCount} ngày)`}
                    </>
                  )}
                </Button>

                {runningKey === 'MAIN_FORM' && (
                  <Button
                    type='button'
                    size='sm'
                    variant='destructive'
                    onClick={() => {
                      abortRunRef.current = true;
                    }}
                    data-testid='btn-stop-rerun'
                    className='h-8 px-2 text-xs font-bold cursor-pointer'
                  >
                    <IconPlayerStop className='h-3.5 w-3.5 mr-1' />
                    Dừng
                  </Button>
                )}
              </div>
            </div>

            {/* Hộp Preview Khung giờ quét dữ liệu (18:00 D-1 -> 18:00 D) */}
            <div
              className='flex flex-wrap items-center justify-between gap-1.5 rounded border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-2 py-1 text-[10px]'
              data-testid='rerun-window-preview'
            >
              <div className='flex flex-wrap items-center gap-1'>
                <span className='text-muted-foreground'>
                  Phạm vi quét ({rangePreview.daysCount} ngày
                  {rangePreview.orderedFrom === rangePreview.orderedTo
                    ? ` • ${formatDateVn(rangePreview.orderedFrom)}`
                    : ` • ${formatDateVn(rangePreview.orderedFrom)} → ${formatDateVn(rangePreview.orderedTo)}`}
                  ):
                </span>
                <strong className='font-mono text-[#0F3D62] dark:text-blue-300'>
                  {rangePreview.windowLabel}
                </strong>
              </div>

              <label className='inline-flex items-center gap-1 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  checked={rerunNotify}
                  onChange={(e) => setRerunNotify(e.target.checked)}
                  className='h-3.5 w-3.5 rounded border-slate-300'
                  data-testid='rerun-notify-checkbox'
                />
                <span>Gửi thông báo In-App sau khi chạy</span>
              </label>
            </div>

            {/* Danh sách chia nhỏ từng ngày & Thanh tiến trình chạy tuần tự từng ngày */}
            {rangePreview.daysList.length > 0 && (
              <div
                className='rounded border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-1.5 space-y-1.5'
                data-testid='split-days-preview-box'
              >
                <div className='flex flex-wrap items-center justify-between gap-1 text-[10px]'>
                  <span className='font-bold text-slate-700 dark:text-slate-200'>
                    Danh sách tách nhỏ từng ngày ({rangePreview.daysList.length}{' '}
                    ngày — chạy tuần tự từ {formatDateVn(rangePreview.orderedFrom)}{' '}
                    đến {formatDateVn(rangePreview.orderedTo)}):
                  </span>
                  {runningKey === 'MAIN_FORM' && currentRunningDay ? (
                    <span className='font-mono font-bold text-blue-700 dark:text-blue-300'>
                      Đang xử lý ngày {formatDateVn(currentRunningDay)} (
                      {completedDaysCount}/{totalDaysToRun} • {progressPercent}
                      %)
                    </span>
                  ) : completedDaysCount > 0 ? (
                    <span className='font-mono font-bold text-emerald-700 dark:text-emerald-400'>
                      Đã hoàn tất {completedDaysCount}/{totalDaysToRun} ngày
                    </span>
                  ) : (
                    <span className='text-muted-foreground'>
                      Mỗi ngày chạy riêng 1 lượt chuẩn 18:00 D-1 → 18:00 D
                    </span>
                  )}
                </div>

                {/* Thanh Progress Bar khi đang chạy hoặc vừa chạy xong nhiều ngày */}
                {(runningKey === 'MAIN_FORM' || completedDaysCount > 0) &&
                  totalDaysToRun > 1 && (
                    <div className='w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden'>
                      <div
                        className='h-full bg-emerald-600 transition-all duration-150'
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}

                {/* Lưới hiển thị từng ngày được tách ra (cuộn gọn tối đa 28rem) */}
                <div className='flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5'>
                  {rangePreview.daysList.map((dayYmd, idx) => {
                    const st = dayStatuses[dayYmd] || 'IDLE';
                    return (
                      <button
                        key={dayYmd}
                        type='button'
                        disabled={runningKey !== null}
                        onClick={() =>
                          void handleExecuteRerunRange(
                            dayYmd,
                            dayYmd,
                            `PILL:${dayYmd}`
                          )
                        }
                        title={`Bấm để chạy riêng ngày ${formatDateVn(dayYmd)} (Khung 18:00 ${formatDateVn(shiftDateYmd(dayYmd, -1))} → 18:00 ${formatDateVn(dayYmd)})`}
                        data-testid={`split-day-pill-${dayYmd}`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[10px] transition-colors cursor-pointer ${
                          st === 'SUCCESS'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold'
                            : st === 'RUNNING'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold'
                              : st === 'FAILED'
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <span className='text-muted-foreground'>
                          {idx + 1}.
                        </span>
                        <span>{formatDateVn(dayYmd)}</span>
                        {st === 'RUNNING' && (
                          <IconLoader2 className='h-2.5 w-2.5 animate-spin' />
                        )}
                        {st === 'SUCCESS' && (
                          <IconCheck className='h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400' />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner Kết quả sau khi chạy xong */}
            {lastRerunResult && (
              <div
                className='rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-1.5 space-y-1 text-[10px]'
                data-testid='rerun-result-banner'
              >
                <div className='flex flex-wrap items-center justify-between gap-1.5'>
                  <div className='flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300'>
                    <IconCheck className='h-3.5 w-3.5 shrink-0' />
                    <span>
                      Đã thực thi thành công{' '}
                      {lastRerunResult.fromDate === lastRerunResult.toDate ? (
                        <>
                          ngày{' '}
                          <strong className='font-mono'>
                            {formatDateVn(lastRerunResult.fromDate)}
                          </strong>
                        </>
                      ) : (
                        <>
                          tuần tự từng ngày từ{' '}
                          <strong className='font-mono'>
                            {formatDateVn(lastRerunResult.fromDate)} →{' '}
                            {formatDateVn(lastRerunResult.toDate)}
                          </strong>{' '}
                          ({lastRerunResult.processedDays} ngày)
                        </>
                      )}{' '}
                      ({lastRerunResult.windowLabel})
                    </span>
                  </div>
                  <Badge className='bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0'>
                    {lastRerunResult.processedDays} ngày •{' '}
                    {lastRerunResult.upsertedRows} dòng Hub •{' '}
                    {lastRerunResult.durationMs} ms
                  </Badge>
                </div>

                <div className='flex flex-wrap items-center justify-between gap-1.5 pt-0.5 border-t border-emerald-200/70 dark:border-emerald-800/60'>
                  <div className='flex flex-wrap items-center gap-2 font-mono text-slate-700 dark:text-slate-200'>
                    <span>
                      Nhập kho:{' '}
                      <strong>
                        {lastRerunResult.totalInboundCbm} CBM •{' '}
                        {lastRerunResult.totalInboundTons} tấn •{' '}
                        {lastRerunResult.totalInboundTrips} chuyến
                      </strong>
                    </span>
                    <span>|</span>
                    <span>
                      Xuất kho:{' '}
                      <strong>
                        {lastRerunResult.totalOutboundCbm} CBM •{' '}
                        {lastRerunResult.totalOutboundTons} tấn •{' '}
                        {lastRerunResult.totalOutboundTrips} chuyến
                      </strong>
                    </span>
                  </div>

                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      router.push(
                        `/dashboard/admin/reports?fromDate=${lastRerunResult.fromDate}&toDate=${lastRerunResult.toDate}`
                      )
                    }
                    className='h-6 px-2 text-[10px] font-bold border-emerald-500/50 text-emerald-800 dark:text-emerald-200 cursor-pointer'
                    data-testid='btn-open-report-for-range'
                  >
                    <IconChartBar className='h-3 w-3 mr-1' />
                    Xem kết quả tại Báo cáo Vận hành
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Khối Phải (5 cột): Cấu hình Lịch chạy & Trạng thái Tự động của Tác vụ */}
        <Card
          className='lg:col-span-5 p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
          data-testid='panel-cron-config'
        >
          <CardContent className='p-0 space-y-2'>
            <div className='flex items-center justify-between border-b pb-1.5'>
              <div className='flex items-center gap-1.5'>
                <IconSettings className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
                <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                  Cấu hình Lịch chạy Định kỳ
                </h2>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] font-mono px-1.5 py-0'
              >
                {normalizedJobKey}
              </Badge>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 items-end'>
              <div>
                <span className='block text-[10px] font-bold uppercase text-muted-foreground mb-1'>
                  Công tắc tự động (ON | OFF)
                </span>
                <button
                  type='button'
                  role='switch'
                  aria-checked={cfgEnabled}
                  onClick={() => setCfgEnabled((v) => !v)}
                  data-testid='toggle-cron-enabled'
                  className={`w-full h-8 px-2.5 rounded border flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                    cfgEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className='font-mono'>
                    {cfgEnabled ? 'ON (Đang bật)' : 'OFF (Tạm dừng)'}
                  </span>
                  <span
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                      cfgEnabled
                        ? 'bg-emerald-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                        cfgEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div>
                <label className='block text-[10px] font-bold uppercase text-muted-foreground mb-1'>
                  Giờ chạy mỗi ngày (GMT+7)
                </label>
                <Input
                  type='time'
                  value={cfgCronTime}
                  onChange={(e) => setCfgCronTime(e.target.value)}
                  className='h-8 text-xs font-mono font-bold'
                  data-testid='input-cron-time'
                />
              </div>

              <div>
                <Button
                  type='button'
                  size='sm'
                  disabled={savingConfig}
                  onClick={() => void handleSaveCronConfig()}
                  className='w-full h-8 text-xs font-bold bg-[#0F3D62] hover:bg-[#154c79] text-white cursor-pointer'
                  data-testid='btn-save-cron-config'
                >
                  <IconCheck className='h-3.5 w-3.5 mr-1' />
                  {savingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
              </div>
            </div>

            <div className='flex flex-wrap items-center justify-between gap-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-2 py-1 text-[10px]'>
              <div className='flex items-center gap-1.5 text-muted-foreground'>
                <IconClock className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />
                <span>
                  Lần chạy kế tiếp:{' '}
                  <strong className='font-mono text-foreground'>
                    {currentJob?.nextRunLabel ||
                      data?.scheduleInfo?.nextRunLabel ||
                      `${cfgCronTime} (GMT+7)`}
                  </strong>
                </span>
              </div>
              <label className='inline-flex items-center gap-1 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  checked={cfgNotify}
                  onChange={(e) => setCfgNotify(e.target.checked)}
                  className='h-3.5 w-3.5 rounded border-slate-300'
                  data-testid='toggle-cron-notify'
                />
                <span>Thông báo In-App khi hoàn tất</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bảng Nhật ký lịch sử thực thi & Trạng thái dữ liệu 30 ngày gần nhất của Tác vụ */}
      <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
            {/* 2 Tab: Nhật ký thực thi & Trạng thái dữ liệu từng ngày */}
            <div className='inline-flex items-center rounded border p-0.5 bg-slate-50 dark:bg-slate-900'>
              <button
                type='button'
                onClick={() => setActiveBottomTab('logs')}
                data-testid='tab-job-logs'
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                  activeBottomTab === 'logs'
                    ? 'bg-[#0F3D62] text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <IconHistory className='h-3.5 w-3.5' />
                Nhật ký thực thi ({jobLogs.length} lượt)
              </button>
              <button
                type='button'
                onClick={() => setActiveBottomTab('snapshots')}
                data-testid='tab-daily-snapshots'
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                  activeBottomTab === 'snapshots'
                    ? 'bg-[#0F3D62] text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <IconCalendarStats className='h-3.5 w-3.5' />
                Trạng thái dữ liệu 30 ngày ({populatedDaysCount}/
                {dailySnapshots.length} ngày đã có kết quả)
              </button>
            </div>

            <div className='flex flex-wrap items-center gap-1.5'>
              {activeBottomTab === 'logs' && (
                <>
                  <div className='inline-flex items-center rounded border p-0.5 bg-slate-50 dark:bg-slate-900'>
                    <button
                      type='button'
                      onClick={() => setLogStatusFilter('ALL')}
                      data-testid='log-status-filter-ALL'
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        logStatusFilter === 'ALL'
                          ? 'bg-[#0F3D62] text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Tất cả ({logCounts.all})
                    </button>
                    <button
                      type='button'
                      onClick={() => setLogStatusFilter('SUCCESS')}
                      data-testid='log-status-filter-SUCCESS'
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        logStatusFilter === 'SUCCESS'
                          ? 'bg-emerald-600 text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Thành công ({logCounts.success})
                    </button>
                    <button
                      type='button'
                      onClick={() => setLogStatusFilter('FAILED')}
                      data-testid='log-status-filter-FAILED'
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        logStatusFilter === 'FAILED'
                          ? 'bg-rose-600 text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Lỗi ({logCounts.failed})
                    </button>
                  </div>

                  <div className='relative w-44'>
                    <IconSearch className='h-3 w-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2' />
                    <Input
                      type='text'
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder='Tìm ngày, mã lượt...'
                      data-testid='log-search-input'
                      className='h-7 pl-6 pr-2 text-[10px]'
                    />
                  </div>
                </>
              )}

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void loadCronDetailData(true)}
                disabled={loading}
                data-testid='btn-refresh-cron-detail'
                className='h-7 px-2 text-[10px] font-semibold cursor-pointer'
              >
                <IconRefresh
                  className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới
              </Button>
            </div>
          </div>

          {activeBottomTab === 'logs' ? (
            <div className='overflow-x-auto max-h-96 border rounded'>
              <table
                className='w-full text-left border-collapse'
                data-testid='cron-execution-logs-table'
              >
                <thead className='sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 border-b'>
                  <tr>
                    <th className='py-1 px-1.5'>Mã lượt</th>
                    <th className='py-1 px-1.5'>Thời điểm chạy</th>
                    <th className='py-1 px-1.5'>Ngày báo cáo mục tiêu</th>
                    <th className='py-1 px-1.5'>
                      Khung giờ quét (18:00 D-1 → 18:00 D)
                    </th>
                    <th className='py-1 px-1.5'>Loại kích hoạt</th>
                    <th className='py-1 px-1.5'>Sản lượng Nhập / Xuất chốt</th>
                    <th className='py-1 px-1.5 text-right'>Số dòng cập nhật</th>
                    <th className='py-1 px-1.5 text-right'>Thời gian xử lý</th>
                    <th className='py-1 px-1.5 text-center'>Trạng thái</th>
                    <th className='py-1 px-1.5 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60 text-[10px]'>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className='py-4 text-center text-xs text-muted-foreground'
                      >
                        Chưa có nhật ký thực thi nào cho tác vụ{' '}
                        {normalizedJobKey}. Hãy chọn khoảng ngày ở trên và bấm
                        Chạy để tạo kết quả báo cáo.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className='hover:bg-muted/60 transition-colors'
                      >
                        <td className='py-1 px-1.5 font-mono font-bold text-[11px]'>
                          #{log.id}
                        </td>
                        <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                          {formatDateTimeVn(log.startedAt)}
                        </td>
                        <td className='py-1 px-1.5 font-mono font-bold text-[11px] text-[#0F3D62] dark:text-blue-300'>
                          <div className='flex flex-wrap items-center gap-1'>
                            <span>
                              {log.targetDate === log.targetEndDate
                                ? formatDateVn(log.targetDate)
                                : `${formatDateVn(log.targetDate)} → ${formatDateVn(log.targetEndDate)}`}
                            </span>
                            <Badge
                              variant='outline'
                              className='text-[10px] font-mono px-1 py-0'
                            >
                              {log.processedDays || 1} ngày
                            </Badge>
                          </div>
                        </td>
                        <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                          {log.windowLabel}
                        </td>
                        <td className='py-1 px-1.5'>
                          {getTriggerBadge(log.triggeredBy)}
                        </td>
                        <td className='py-1 px-1.5 font-mono'>
                          Nhập: {log.totalInboundCbm ?? 0} CBM (
                          {log.totalInboundTrips ?? 0} chuyến) • Xuất:{' '}
                          {log.totalOutboundCbm ?? 0} CBM (
                          {log.totalOutboundTrips ?? 0} chuyến)
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono'>
                          {log.upsertedHubRows} dòng Hub
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono text-muted-foreground'>
                          {log.durationMs} ms
                        </td>
                        <td className='py-1 px-1.5 text-center'>
                          {log.status === 'SUCCESS' ? (
                            <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] px-1.5 py-0'>
                              THÀNH CÔNG
                            </Badge>
                          ) : (
                            <Badge className='bg-rose-500/15 text-rose-700 border-rose-500/25 dark:text-rose-300 text-[10px] px-1.5 py-0'>
                              <IconAlertTriangle className='h-3 w-3 mr-0.5 inline' />
                              LỖI
                            </Badge>
                          )}
                        </td>
                        <td className='py-1 px-1.5 text-right'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={runningKey !== null}
                            onClick={() => {
                              setFromDate(log.targetDate);
                              setToDate(log.targetEndDate || log.targetDate);
                              void handleExecuteRerunRange(
                                log.targetDate,
                                log.targetEndDate || log.targetDate,
                                `LOG:${log.id}`
                              );
                            }}
                            className='h-6 px-2 text-[10px] font-semibold cursor-pointer'
                          >
                            <IconRefresh className='h-3 w-3 mr-1' />
                            Chạy lại
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='overflow-x-auto max-h-96 border rounded'>
              <table
                className='w-full text-left border-collapse'
                data-testid='cron-daily-snapshots-table'
              >
                <thead className='sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 border-b'>
                  <tr>
                    <th className='py-1 px-1.5'>Ngày báo cáo</th>
                    <th className='py-1 px-1.5'>
                      Khung giờ chốt (18:00 D-1 → 18:00 D)
                    </th>
                    <th className='py-1 px-1.5 text-center'>
                      Trạng thái dữ liệu DB
                    </th>
                    <th className='py-1 px-1.5 text-right'>
                      Nhập kho (CBM / Tấn / Chuyến)
                    </th>
                    <th className='py-1 px-1.5 text-right'>
                      Xuất kho (CBM / Tấn / Chuyến)
                    </th>
                    <th className='py-1 px-1.5'>Cập nhật lúc</th>
                    <th className='py-1 px-1.5 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60 text-[10px]'>
                  {dailySnapshots.map((snap) => {
                    const latestLogForDay = jobLogs.find(
                      (l) =>
                        l.targetDate <= snap.reportDate &&
                        (l.targetEndDate || l.targetDate) >= snap.reportDate
                    );
                    const isSuccess =
                      snap.hubCount > 0 &&
                      (!latestLogForDay || latestLogForDay.status === 'SUCCESS');
                    return (
                      <tr
                        key={snap.reportDate}
                        className='hover:bg-muted/60 transition-colors'
                      >
                        <td className='py-1 px-1.5 font-mono font-bold text-[11px] text-[#0F3D62] dark:text-blue-300'>
                          {snap.fullDateLabel}
                        </td>
                        <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                          {snap.windowLabel}
                        </td>
                        <td className='py-1 px-1.5 text-center'>
                          {isSuccess ? (
                            <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0'>
                              Thành công
                            </Badge>
                          ) : (
                            <Badge className='bg-rose-500/15 text-rose-700 border-rose-500/25 dark:text-rose-300 text-[10px] font-bold px-1.5 py-0'>
                              Thất bại
                            </Badge>
                          )}
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono'>
                          {snap.inboundCbm} CBM • {snap.inboundTons} tấn •{' '}
                          {snap.inboundTrips} chuyến
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono'>
                          {snap.outboundCbm} CBM • {snap.outboundTons} tấn •{' '}
                          {snap.outboundTrips} chuyến
                        </td>
                        <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                          {snap.calculatedAt
                            ? formatDateTimeVn(snap.calculatedAt)
                            : '—'}
                        </td>
                        <td className='py-1 px-1.5 text-right'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={runningKey !== null}
                            onClick={() => {
                              setFromDate(snap.reportDate);
                              setToDate(snap.reportDate);
                              void handleExecuteRerunRange(
                                snap.reportDate,
                                snap.reportDate,
                                `SNAP:${snap.reportDate}`
                              );
                            }}
                            className='h-6 px-2 text-[10px] font-semibold cursor-pointer'
                          >
                            <IconPlayerPlay className='h-3 w-3 mr-1' />
                            Chạy ngày này
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
