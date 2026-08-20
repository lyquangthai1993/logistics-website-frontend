'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/use-auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import {
  IconCamera,
  IconUpload,
  IconTrash,
  IconLoader,
  IconUserOff,
  IconLock
} from '@tabler/icons-react';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DISPATCHER: 'Điều phối viên',
  FLEET_MANAGER: 'Quản lý Đội xe',
  WAREHOUSE_MANAGER: 'Quản lý Kho'
};

export default function ProfileViewPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isFetchingMe, setIsFetchingMe] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Fetch latest user info from backend /api/v1/auth/me
    async function fetchMe() {
      setIsFetchingMe(true);
      try {
        const { data: res } = await apiClient.get('/api/v1/auth/me');
        const meData = res?.data || res;
        if (meData?.id) {
          const roleMap: Record<number | string, any> = {
            1: 'SUPER_ADMIN',
            2: 'DISPATCHER',
            3: 'FLEET_MANAGER',
            4: 'WAREHOUSE_MANAGER'
          };
          const roleCode =
            typeof meData.role === 'object' && meData.role?.id
              ? roleMap[meData.role.id] || 'SUPER_ADMIN'
              : roleMap[meData.role] || meData.role || 'SUPER_ADMIN';

          const avatarPath = meData.photo?.path || meData.avatarUrl || '';
          const fullAvatarUrl = avatarPath
            ? avatarPath.startsWith('http')
              ? avatarPath
              : `${apiClient.defaults.baseURL || 'http://localhost:3001'}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`
            : '';

          updateUser({
            ...meData,
            name:
              meData.name ||
              `${meData.firstName || ''} ${meData.lastName || ''}`.trim() ||
              meData.email,
            role: roleCode,
            avatarUrl: fullAvatarUrl
          });
        }
      } catch {
        // Ignore fetch errors if using persisted user
      } finally {
        setIsFetchingMe(false);
      }
    }

    fetchMe();
  }, [updateUser]);

  // Loading Skeleton View during hydration or initial fetch
  if (!mounted || (isFetchingMe && !user)) {
    return (
      <div className='flex w-full flex-col p-4'>
        <Card className='mx-auto max-w-lg w-full'>
          <CardHeader className='space-y-2'>
            <Skeleton className='h-6 w-40' />
            <Skeleton className='h-4 w-72' />
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='flex items-center gap-6 pb-6 border-b border-border/40'>
              <Skeleton className='h-24 w-24 rounded-full' />
              <div className='space-y-2 flex-1'>
                <Skeleton className='h-6 w-48' />
                <Skeleton className='h-4 w-36' />
                <Skeleton className='h-8 w-32 mt-2' />
              </div>
            </div>
            <div className='space-y-3'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for unauthenticated state
  if (!user) {
    return (
      <div className='flex w-full flex-col p-4 items-center justify-center min-h-[400px]'>
        <Card className='mx-auto max-w-md w-full text-center shadow-sm'>
          <CardHeader className='pb-3'>
            <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'>
              <IconLock className='h-6 w-6' />
            </div>
            <CardTitle className='text-lg font-bold'>Chưa đăng nhập</CardTitle>
            <CardDescription className='text-xs'>
              Phiên làm việc đã hết hạn hoặc bạn chưa truy cập tài khoản. Vui lòng đăng nhập lại.
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-2 pb-6'>
            <Button
              className='w-full cursor-pointer gap-2'
              onClick={() => router.push('/auth/sign-in')}
            >
              <IconUserOff className='h-4 w-4' />
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentAvatarSrc = previewUrl || user.avatarUrl || user.photo?.path || '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (jpg, png, webp, gif).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleTriggerSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data: uploadRes } = await apiClient.post('/api/v1/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const uploadData = uploadRes?.data || uploadRes;
      const uploadedFile = uploadData?.file;
      if (!uploadedFile?.id) {
        throw new Error('Tải ảnh lên thất bại, vui lòng thử lại.');
      }

      const { data: userRes } = await apiClient.patch('/api/v1/auth/me', {
        photo: { id: uploadedFile.id }
      });

      const updatedUser = userRes?.data || userRes;
      const avatarPath = updatedUser?.photo?.path || uploadedFile.path || '';
      const fullAvatarUrl = avatarPath.startsWith('http')
        ? avatarPath
        : `${apiClient.defaults.baseURL || 'http://localhost:3001'}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;

      updateUser({
        photo: updatedUser?.photo || uploadedFile,
        avatarUrl: fullAvatarUrl
      });

      showApiSuccessToast('Cập nhật ảnh đại diện thành công!');
      handleCancelPreview();
    } catch (err: unknown) {
      showApiErrorToast(err, 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemoving(true);
    try {
      await apiClient.patch('/api/v1/auth/me', {
        photo: null
      });

      updateUser({
        photo: null,
        avatarUrl: ''
      });

      handleCancelPreview();
      showApiSuccessToast('Đã xóa ảnh đại diện.');
    } catch (err: unknown) {
      showApiErrorToast(err, 'Không thể xóa ảnh đại diện.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className='flex w-full flex-col p-4'>
      <Card className='mx-auto max-w-lg w-full shadow-sm'>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
          <CardDescription>
            Thông tin cá nhân và vai trò của bạn trong hệ thống Logistics TMS
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Avatar Section */}
          <div className='flex flex-col items-center sm:flex-row sm:items-center gap-6 pb-6 border-b border-border/40'>
            <div
              role='button'
              tabIndex={0}
              className='relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-full'
              onClick={handleTriggerSelect}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTriggerSelect();
                }
              }}
              title='Click để thay đổi ảnh đại diện'
            >
              <Avatar className='h-24 w-24 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-transform group-hover:scale-105'>
                <AvatarImage src={currentAvatarSrc} alt={user.name} className='object-cover' />
                <AvatarFallback className='text-2xl font-bold bg-primary/10 text-primary'>
                  {getInitials(user.name, 'U')}
                </AvatarFallback>
              </Avatar>
              <div className='absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white'>
                <IconCamera className='h-6 w-6' />
              </div>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp,image/gif'
                className='hidden'
                onChange={handleFileChange}
              />
            </div>

            <div className='flex flex-col gap-2 items-center sm:items-start text-center sm:text-left flex-1'>
              <h3 className='text-xl font-bold text-foreground'>{user.name}</h3>
              <p className='text-muted-foreground text-sm font-mono'>{user.email}</p>

              <div className='flex items-center gap-2 mt-1 flex-wrap justify-center sm:justify-start'>
                {!selectedFile ? (
                  <>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs gap-1.5 cursor-pointer'
                      onClick={handleTriggerSelect}
                      disabled={isUploading || isRemoving}
                    >
                      <IconUpload className='h-3.5 w-3.5' />
                      Đổi ảnh đại diện
                    </Button>
                    {(user.avatarUrl || user.photo?.path) && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer'
                        onClick={handleRemoveAvatar}
                        disabled={isUploading || isRemoving}
                      >
                        {isRemoving ? (
                          <IconLoader className='h-3.5 w-3.5 animate-spin' />
                        ) : (
                          <IconTrash className='h-3.5 w-3.5' />
                        )}
                        Xóa ảnh
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type='button'
                      size='sm'
                      className='h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                      onClick={handleSaveAvatar}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <IconLoader className='h-3.5 w-3.5 animate-spin' />
                      ) : (
                        <IconUpload className='h-3.5 w-3.5' />
                      )}
                      Lưu thay đổi
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 text-xs cursor-pointer'
                      onClick={handleCancelPreview}
                      disabled={isUploading}
                    >
                      Hủy
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between py-2 border-b border-border/20'>
              <span className='text-muted-foreground text-sm font-medium'>Vai trò hệ thống</span>
              <Badge variant='secondary' className='font-semibold'>
                {roleLabels[user.role] || user.role}
              </Badge>
            </div>
            {user.warehouseId && (
              <div className='flex items-center justify-between py-2 border-b border-border/20'>
                <span className='text-muted-foreground text-sm font-medium'>Kho phụ trách</span>
                <span className='text-sm font-semibold text-foreground'>{user.warehouseId}</span>
              </div>
            )}
            <div className='flex items-center justify-between py-2'>
              <span className='text-muted-foreground text-sm font-medium'>Mã người dùng (ID)</span>
              <span className='text-muted-foreground font-mono text-xs bg-muted px-2 py-1 rounded border border-border/30'>
                {user.id}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
