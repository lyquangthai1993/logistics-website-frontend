'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { deleteHubMutation, toggleActiveHubMutation } from '../../api/mutations';
import { hubKeys } from '../../api/queries';
import { HubFormDialog } from '../hub-form-dialog';
import type { Hub } from '../../api/types';

interface CellActionProps {
  data: Hub;
}

export function CellAction({ data }: CellActionProps) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const toggleMutation = useMutation({
    ...toggleActiveHubMutation,
    onSuccess: (updated) => {
      showApiSuccessToast(
        updated.isActive
          ? `Đã kích hoạt hoạt động chi nhánh "${data.name}"`
          : `Đã tạm ngưng hoạt động chi nhánh "${data.name}"`
      );
      queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể chuyển đổi trạng thái chi nhánh kho');
    }
  });

  const deleteMutation = useMutation({
    ...deleteHubMutation,
    onSuccess: () => {
      showApiSuccessToast(`Đã xóa mềm chi nhánh "${data.name}" thành công!`);
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Có lỗi xảy ra khi xóa chi nhánh');
    }
  });

  return (
    <>
      <HubFormDialog
        hub={data}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Soft Delete Confirmation Alert Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className='sm:max-w-[460px]'>
          <DialogHeader>
            <DialogTitle className='text-destructive flex items-center gap-2'>
              <Icons.warning className='h-5 w-5' />
              Xác Nhận Xóa Mềm Chi Nhánh Kho
            </DialogTitle>
          </DialogHeader>
          <div className='text-muted-foreground space-y-3 py-2 text-sm'>
            <p>
              Bạn có chắc chắn muốn xóa chi nhánh{' '}
              <strong className='text-foreground font-semibold'>
                {data.name} ({data.code})
              </strong>
              ?
            </p>
            {data.vehicles && data.vehicles.length > 0 && (
              <div className='border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg border p-3 text-xs'>
                ⚠️ <strong>Lưu ý:</strong> Hiện có{' '}
                <strong>{data.vehicles.length} phương tiện</strong> đang trực thuộc chi nhánh này.
                Sau khi xóa mềm, liên kết kho của các phương tiện này sẽ được giải phóng an toàn mà không làm mất dữ liệu lịch sử.
              </div>
            )}
            <p className='text-muted-foreground text-xs'>
              Hệ thống áp dụng chính sách <strong>Xóa Mềm (Soft Delete)</strong>. Lịch sử đơn hàng, chuyến xe và các giao dịch trước đây vẫn được bảo toàn nguyên vẹn.
            </p>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDeleteOpen(false)}
              className='cursor-pointer'
            >
              Hủy
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(data.id)}
              className='cursor-pointer'
            >
              {deleteMutation.isPending ? 'Đang Xóa...' : 'Xác Nhận Xóa Mềm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Row Action Buttons */}
      <div className='flex items-center justify-end gap-1'>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Bật/Tắt hoạt động kho'
          onClick={() => toggleMutation.mutate(data.id)}
          disabled={toggleMutation.isPending}
          className='text-muted-foreground hover:text-foreground h-8 px-2 cursor-pointer'
          title={data.isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt hoạt động'}
        >
          {data.isActive ? (
            <Icons.circleCheck className='h-4 w-4 text-emerald-600' />
          ) : (
            <Icons.circleX className='h-4 w-4 text-amber-600' />
          )}
        </Button>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Chỉnh sửa kho'
          data-testid={`btn-edit-hub-${data.id}`}
          onClick={() => setEditOpen(true)}
          className='text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2 cursor-pointer'
        >
          <Icons.edit className='h-4 w-4' />
        </Button>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Xóa kho'
          data-testid={`btn-delete-hub-${data.id}`}
          onClick={() => setDeleteOpen(true)}
          className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2 cursor-pointer'
        >
          <Icons.trash className='h-4 w-4' />
        </Button>
      </div>
    </>
  );
}
