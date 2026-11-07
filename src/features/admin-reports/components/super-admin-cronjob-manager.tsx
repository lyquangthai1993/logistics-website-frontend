'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  IconCheck,
  IconAlertTriangle,
  IconSettings,
  IconHistory,
  IconListCheck,
  IconSearch
} from '@tabler/icons-react';

interface CronJobConfig {
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

interface CronScheduleInfo {
  currentVnTime: string;
  latestClosedReportDate: string;
  latestClosedWindowLabel: string;
  currentOpenReportDate: string;
  currentOpenWindowLabel: string;
  nextRunAt: string | null;
  nextRunLabel: string;
  cutoffRule: string;
}

interface CronExecutionLogItem {
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
  durationMs: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface CronManagementResponse {
  config: CronJobConfig;
  jobs?: CronJobConfig[];
  scheduleInfo: CronScheduleInfo;
  logs: CronExecutionLogItem[];
}

interface LastRerunSummary {
  jobKey: string;
  reportDate: string;
  windowLabel: string;
  upsertedRows: number;
  durationMs: number;
}

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

function computeWindowLabelClient(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '—';
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const prevYmd = d.toISOString().slice(0, 10);
  return `18:00 (6:00 PM) ngày ${formatDateVn(prevYmd)} → 18:00 (6:00 PM) ngày ${formatDateVn(dateStr)}`;
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
    case 'MANUAL_RERUN':
    case 'MANUAL':
    case 'MANUAL_RANGE':
      return (
        <Badge
          variant='outline'
          className='bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300 text-[10px] px-1.5 py-0'
        >
          Chạy lại thủ công
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

export function SuperAdminCronjobManager() {
  const [data, setData] = useState<CronManagementResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected job for configuration
  const [selectedJobKey, setSelectedJobKey] = useState<string>(
    'DAILY_HUB_OPERATIONAL_REPORT'
  );

  // Rerun single specific date state
  const [targetDate, setTargetDate] = useState<string>('');
  const [runningDateKey, setRunningDateKey] = useState<string | null>(null);
  const [lastRerunResult, setLastRerunResult] =
    useState<LastRerunSummary | null>(null);

  // Cron Config edit state
  const [cfgEnabled, setCfgEnabled] = useState<boolean>(true);
  const [cfgCronTime, setCfgCronTime] = useState<string>('18:05');
  const [cfgNotify, setCfgNotify] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Log filtering state
  const [logStatusFilter, setLogStatusFilter] = useState<
    'ALL' | 'SUCCESS' | 'FAILED'
  >('ALL');
  const [logJobFilter, setLogJobFilter] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');

  const loadCronManagementData = useCallback(async (preserveInputs = false) => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        '/api/v1/admin/reports/cronjobs?daysLimit=14'
      );
      const raw = res.data;
      const payload: CronManagementResponse = raw?.data ?? raw;
      setData(payload);

      if (!preserveInputs) {
        const defaultDate =
          payload.scheduleInfo?.latestClosedReportDate ||
          new Date().toISOString().slice(0, 10);
        setTargetDate((prev) => prev || defaultDate);
        if (payload.config) {
          setSelectedJobKey(
            payload.config.jobKey || 'DAILY_HUB_OPERATIONAL_REPORT'
          );
          setCfgEnabled(Boolean(payload.config.isEnabled));
          setCfgCronTime(payload.config.cronTime || '18:05');
          setCfgNotify(Boolean(payload.config.notifySuperAdmins));
        }
      }
    } catch (err) {
      toast.error(
        formatApiError(err, 'Không thể tải dữ liệu Quản trị Cronjob')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCronManagementData(false);
  }, [loadCronManagementData]);

  const jobList = useMemo<CronJobConfig[]>(() => {
    if (data?.jobs && data.jobs.length > 0) {
      return data.jobs;
    }
    return data?.config ? [data.config] : [];
  }, [data]);

  const handleSelectJobForConfig = (job: CronJobConfig) => {
    setSelectedJobKey(job.jobKey);
    setCfgEnabled(Boolean(job.isEnabled));
    setCfgCronTime(job.cronTime || '18:05');
    setCfgNotify(Boolean(job.notifySuperAdmins));
  };

  const handleQuickToggleJob = async (job: CronJobConfig) => {
    const nextEnabled = !job.isEnabled;
    setSavingConfig(true);
    try {
      await apiClient.patch('/api/v1/admin/reports/cronjobs/config', {
        jobKey: job.jobKey,
        isEnabled: nextEnabled
      });
      if (selectedJobKey === job.jobKey) {
        setCfgEnabled(nextEnabled);
      }
      toast.success(
        `Đã ${nextEnabled ? 'BẬT' : 'TẮT'} tự động cho tác vụ ${job.jobKey}`
      );
      await loadCronManagementData(true);
    } catch (err) {
      toast.error(formatApiError(err, 'Không thể cập nhật trạng thái Cronjob'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExecuteRerun = async (
    specificDate?: string,
    overrideJobKey?: string
  ) => {
    const dateToRun =
      specificDate ||
      targetDate ||
      data?.scheduleInfo?.latestClosedReportDate ||
      new Date().toISOString().slice(0, 10);
    const jobToRun = overrideJobKey || selectedJobKey;

    if (!dateToRun || !/^\d{4}-\d{2}-\d{2}$/.test(dateToRun)) {
      toast.error('Vui lòng chọn ngày cần chạy lại hợp lệ');
      return;
    }

    const runKey = overrideJobKey
      ? `JOB:${overrideJobKey}`
      : specificDate
        ? `ROW:${specificDate}`
        : 'MAIN_FORM';
    setRunningDateKey(runKey);
    try {
      const res = await apiClient.post('/api/v1/admin/reports/cronjobs/rerun', {
        jobKey: jobToRun,
        reportDate: dateToRun,
        fromDate: dateToRun,
        toDate: dateToRun,
        notifySuperAdmins: false
      });

      const raw = res.data;
      const result = raw?.data ?? raw;
      setLastRerunResult({
        jobKey: jobToRun,
        reportDate: result.fromDate || dateToRun,
        windowLabel:
          result.windowLabel || computeWindowLabelClient(dateToRun),
        upsertedRows: Number(result.upsertedRows) || 0,
        durationMs: Number(result.log?.durationMs) || 1
      });

      toast.success(
        `Đã thực thi tác vụ ${jobToRun} cho ngày ${formatDateVn(dateToRun)} thành công`
      );
      await loadCronManagementData(true);
    } catch (err) {
      toast.error(formatApiError(err, 'Không thể thực thi chạy lại Cronjob'));
    } finally {
      setRunningDateKey(null);
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
        jobKey: selectedJobKey,
        isEnabled: cfgEnabled,
        cronTime: cfgCronTime.trim(),
        notifySuperAdmins: cfgNotify
      });
      toast.success(
        `Đã lưu cấu hình ${selectedJobKey} (${cfgEnabled ? `Tự động chạy lúc ${cfgCronTime}` : 'Tạm dừng'})`
      );
      await loadCronManagementData(true);
    } catch (err) {
      toast.error(formatApiError(err, 'Không thể lưu cấu hình Cronjob'));
    } finally {
      setSavingConfig(false);
    }
  };

  const liveWindowPreview = useMemo(
    () => computeWindowLabelClient(targetDate),
    [targetDate]
  );

  const logCounts = useMemo(() => {
    const allLogs = data?.logs || [];
    return {
      all: allLogs.length,
      success: allLogs.filter((l) => l.status === 'SUCCESS').length,
      failed: allLogs.filter((l) => l.status !== 'SUCCESS').length
    };
  }, [data?.logs]);

  const filteredLogs = useMemo(() => {
    const allLogs = data?.logs || [];
    const q = logSearch.trim().toLowerCase();
    return allLogs.filter((log) => {
      if (logStatusFilter === 'SUCCESS' && log.status !== 'SUCCESS') {
        return false;
      }
      if (logStatusFilter === 'FAILED' && log.status === 'SUCCESS') {
        return false;
      }
      if (logJobFilter !== 'ALL' && log.jobKey !== logJobFilter) {
        return false;
      }
      if (q) {
        const hay = `${log.id} ${log.jobKey} ${log.targetDate} ${formatDateVn(log.targetDate)} ${log.actorEmail || ''} ${log.triggeredBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data?.logs, logStatusFilter, logJobFilter, logSearch]);

  const selectedJobObj = useMemo(
    () =>
      jobList.find((j) => j.jobKey === selectedJobKey) ||
      data?.config ||
      null,
    [jobList, selectedJobKey, data?.config]
  );

  return (
    <div className='space-y-2 pb-2' data-testid='super-admin-cronjob-page'>
      {/* 1. Bảng Danh mục Tác vụ Cronjob Hệ thống (Job Registry) */}
      <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
            <div className='flex items-center gap-1.5'>
              <IconListCheck className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
              <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                Danh mục Tác vụ Cronjob Hệ thống ({jobList.length} tác vụ)
              </h2>
            </div>
            <span className='text-[10px] font-mono text-muted-foreground'>
              Giờ hệ thống GMT+7:{' '}
              <strong className='text-foreground'>
                {data?.scheduleInfo?.currentVnTime || '—'}
              </strong>
            </span>
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
                  <th className='py-1 px-1.5 text-center'>Trạng thái</th>
                  <th className='py-1 px-1.5 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60 text-[10px]'>
                {jobList.map((job) => {
                  const isSelected = job.jobKey === selectedJobKey;
                  const isRunningThisJob =
                    runningDateKey === `JOB:${job.jobKey}`;
                  return (
                    <tr
                      key={job.jobKey}
                      data-testid={`cron-job-row-${job.jobKey}`}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-[#0F3D62]'
                          : 'hover:bg-muted/60'
                      }`}
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
                                OK
                              </Badge>
                            ) : job.lastRunStatus ? (
                              <Badge className='bg-rose-500/15 text-rose-700 border-rose-500/25 dark:text-rose-300 text-[10px] px-1 py-0'>
                                LỖI
                              </Badge>
                            ) : null}
                          </div>
                        ) : (
                          <span className='text-muted-foreground'>
                            Chưa ghi nhận
                          </span>
                        )}
                      </td>
                      <td className='py-1 px-1.5 text-center'>
                        <button
                          type='button'
                          disabled={savingConfig}
                          onClick={() => void handleQuickToggleJob(job)}
                          data-testid={`btn-toggle-job-${job.jobKey}`}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            job.isEnabled
                              ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {job.isEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                        </button>
                      </td>
                      <td className='py-1 px-1.5 text-right'>
                        <div className='inline-flex items-center gap-1'>
                          <Button
                            type='button'
                            size='sm'
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={() => handleSelectJobForConfig(job)}
                            data-testid={`btn-select-job-${job.jobKey}`}
                            className='h-6 px-2 text-[10px] font-semibold cursor-pointer'
                          >
                            <IconSettings className='h-3 w-3 mr-1' />
                            Cấu hình
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={runningDateKey !== null}
                            onClick={() => {
                              handleSelectJobForConfig(job);
                              void handleExecuteRerun(undefined, job.jobKey);
                            }}
                            data-testid={`btn-run-job-${job.jobKey}`}
                            className='h-6 px-2 text-[10px] font-semibold cursor-pointer border-blue-300 dark:border-blue-800 text-[#0F3D62] dark:text-blue-300'
                          >
                            <IconPlayerPlay className='h-3 w-3 mr-1' />
                            {isRunningThisJob ? 'Đang chạy...' : 'Chạy ngay'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Hai khung điều khiển thuần túy: Cấu hình lịch chạy & Chạy lại 1 ngày cụ thể */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-2'>
        {/* Card Trái: Cấu hình lịch chạy Cronjob */}
        <Card
          className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
          data-testid='panel-cron-config'
        >
          <CardContent className='p-0 space-y-2'>
            <div className='flex items-center justify-between border-b pb-1.5'>
              <div className='flex items-center gap-1.5'>
                <IconSettings className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
                <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                  Cấu hình Lịch chạy Cronjob Hàng ngày
                </h2>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] font-mono px-1.5 py-0'
              >
                {selectedJobKey}
              </Badge>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 items-end'>
              <div>
                <span className='block text-[10px] font-bold uppercase text-muted-foreground mb-1'>
                  Trạng thái tự động
                </span>
                <button
                  type='button'
                  onClick={() => setCfgEnabled((v) => !v)}
                  data-testid='toggle-cron-enabled'
                  className={`w-full h-8 px-2.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                    cfgEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cfgEnabled ? 'ĐANG BẬT (ACTIVE)' : 'ĐANG TẮT (PAUSED)'}
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
                  Lần chạy tự động kế tiếp:{' '}
                  <strong className='font-mono text-foreground'>
                    {selectedJobObj?.nextRunLabel ||
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

        {/* Card Phải: Chạy lại Cronjob cho 1 ngày cụ thể */}
        <Card
          className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
          data-testid='panel-rerun-specific-date'
        >
          <CardContent className='p-0 space-y-2'>
            <div className='flex items-center justify-between border-b pb-1.5'>
              <div className='flex items-center gap-1.5'>
                <IconPlayerPlay className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                  Chạy lại Cronjob cho 1 Ngày cụ thể
                </h2>
              </div>
              <span className='text-[10px] font-mono text-muted-foreground'>
                Chu kỳ: 18:00 D-1 → 18:00 D
              </span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-12 gap-2 items-end'>
              <div className='sm:col-span-7'>
                <label className='block text-[10px] font-bold uppercase text-muted-foreground mb-1'>
                  Chọn chính xác ngày cần chạy lại
                </label>
                <Input
                  type='date'
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className='h-8 text-xs font-mono font-bold'
                  data-testid='rerun-target-date'
                />
              </div>

              <div className='sm:col-span-5'>
                <Button
                  type='button'
                  size='sm'
                  disabled={runningDateKey !== null}
                  onClick={() => void handleExecuteRerun()}
                  className='w-full h-8 text-xs font-bold bg-[#0F3D62] hover:bg-[#154c79] text-white cursor-pointer'
                  data-testid='btn-execute-rerun'
                >
                  <IconPlayerPlay className='h-3.5 w-3.5 mr-1' />
                  {runningDateKey === 'MAIN_FORM'
                    ? 'Đang chạy lại...'
                    : `Chạy lại ngày ${formatDateVn(targetDate)}`}
                </Button>
              </div>
            </div>

            <div
              className='flex flex-wrap items-center justify-between gap-1 rounded border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-2 py-1 text-[10px]'
              data-testid='rerun-window-preview'
            >
              <span className='text-muted-foreground'>
                Khung giờ quét của ngày{' '}
                <strong className='font-mono text-foreground'>
                  {formatDateVn(targetDate)}
                </strong>
                :
              </span>
              <span className='font-mono font-bold text-[#0F3D62] dark:text-blue-300'>
                {liveWindowPreview}
              </span>
            </div>

            {lastRerunResult && (
              <div
                className='flex flex-wrap items-center justify-between gap-1.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-1 text-[10px]'
                data-testid='rerun-result-banner'
              >
                <div className='flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300'>
                  <IconCheck className='h-3.5 w-3.5 shrink-0' />
                  <span>
                    Đã chạy lại thành công ngày{' '}
                    <strong className='font-mono'>
                      {formatDateVn(lastRerunResult.reportDate)}
                    </strong>{' '}
                    ({lastRerunResult.windowLabel})
                  </span>
                </div>
                <Badge className='bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0'>
                  {lastRerunResult.durationMs} ms • {lastRerunResult.upsertedRows}{' '}
                  Hub
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Bảng Nhật ký lịch sử thực thi Cronjob kèm Bộ lọc Trạng thái & Tác vụ */}
      <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
            <div className='flex items-center gap-1.5'>
              <IconHistory className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
              <h2 className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                Nhật ký lịch sử thực thi Cronjob ({filteredLogs.length}/
                {data?.logs?.length ?? 0} lượt chạy)
              </h2>
            </div>

            <div className='flex flex-wrap items-center gap-1.5'>
              {/* Bộ lọc trạng thái */}
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

              {/* Bộ lọc theo Mã tác vụ Job */}
              <select
                value={logJobFilter}
                onChange={(e) => setLogJobFilter(e.target.value)}
                data-testid='log-job-filter'
                className='h-7 rounded border border-input bg-background px-2 text-[10px] font-semibold'
              >
                <option value='ALL'>Tất cả tác vụ Cronjob</option>
                {jobList.map((j) => (
                  <option key={j.jobKey} value={j.jobKey}>
                    {j.jobKey}
                  </option>
                ))}
              </select>

              {/* Ô tìm kiếm nhanh nhật ký */}
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

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void loadCronManagementData(true)}
                disabled={loading}
                data-testid='btn-refresh-cron-page'
                className='h-7 px-2 text-[10px] font-semibold cursor-pointer'
              >
                <IconRefresh
                  className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`}
                />
                Làm mới nhật ký
              </Button>
            </div>
          </div>

          <div className='overflow-x-auto max-h-96 border rounded'>
            <table
              className='w-full text-left border-collapse'
              data-testid='cron-execution-logs-table'
            >
              <thead className='sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 border-b'>
                <tr>
                  <th className='py-1 px-1.5'>Mã lượt</th>
                  <th className='py-1 px-1.5'>Mã tác vụ (Job)</th>
                  <th className='py-1 px-1.5'>Thời điểm chạy</th>
                  <th className='py-1 px-1.5'>Ngày báo cáo mục tiêu</th>
                  <th className='py-1 px-1.5'>
                    Khung giờ quét (18:00 D-1 → 18:00 D)
                  </th>
                  <th className='py-1 px-1.5'>Loại kích hoạt</th>
                  <th className='py-1 px-1.5'>Người thực hiện</th>
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
                      colSpan={11}
                      className='py-4 text-center text-xs text-muted-foreground'
                    >
                      Không có nhật ký thực thi Cronjob nào khớp với bộ lọc.
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
                      <td className='py-1 px-1.5 font-mono'>
                        <Badge
                          variant='outline'
                          className='text-[10px] font-mono px-1.5 py-0'
                        >
                          {log.jobKey}
                        </Badge>
                      </td>
                      <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                        {formatDateTimeVn(log.startedAt)}
                      </td>
                      <td className='py-1 px-1.5 font-mono font-bold text-[11px] text-[#0F3D62] dark:text-blue-300'>
                        {log.targetDate === log.targetEndDate
                          ? formatDateVn(log.targetDate)
                          : `${formatDateVn(log.targetDate)} → ${formatDateVn(log.targetEndDate)}`}
                      </td>
                      <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                        {log.windowLabel}
                      </td>
                      <td className='py-1 px-1.5'>
                        {getTriggerBadge(log.triggeredBy)}
                      </td>
                      <td className='py-1 px-1.5 font-mono'>
                        {log.actorEmail || 'SYSTEM'}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono'>
                        {log.upsertedHubRows} Hub
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
                          disabled={runningDateKey !== null}
                          onClick={() => {
                            setTargetDate(log.targetDate);
                            void handleExecuteRerun(
                              log.targetDate,
                              log.jobKey
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
        </CardContent>
      </Card>
    </div>
  );
}
