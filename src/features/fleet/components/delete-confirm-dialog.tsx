'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemType: 'xe' | 'tài xế';
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  itemType,
  onConfirm,
  isLoading
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id='delete-confirm-dialog' className='sm:max-w-[420px]'>
        <DialogHeader>
          <DialogTitle className='text-destructive'>Xác Nhận Xóa</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground'>
          Bạn có chắc chắn muốn xóa {itemType}{' '}
          <strong className='text-foreground font-semibold'>{title}</strong>? Thao tác này sẽ đánh dấu
          xóa trong hệ thống.
        </p>
        <DialogFooter className='pt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className='cursor-pointer'
          >
            Hủy
          </Button>
          <Button
            type='button'
            id='btn-confirm-delete'
            variant='destructive'
            onClick={onConfirm}
            disabled={isLoading}
            className='cursor-pointer'
          >
            {isLoading ? 'Đang xóa...' : 'Xóa Ngay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
