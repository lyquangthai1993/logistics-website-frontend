import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface TablePaginationBarProps extends React.ComponentProps<'div'> {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * Pagination bar dùng cho plain table (không cần TanStack Table instance).
 * Visual style khớp với DataTablePagination của product page.
 */
export function TablePaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
  ...props
}: TablePaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center justify-between gap-2 overflow-auto p-1 sm:gap-6',
        className
      )}
      {...props}
    >
      {/* Left: row count info */}
      <div className='text-muted-foreground text-xs sm:text-sm whitespace-nowrap'>
        {total === 0 ? (
          <>0 đơn hàng</>
        ) : (
          <>
            {from}–{to} / {total} đơn hàng
          </>
        )}
      </div>

      {/* Right: page controls & page size selector */}
      <div className='flex items-center gap-2 sm:gap-4 lg:gap-6'>
        {/* Page size limit per page selector */}
        {onPageSizeChange && (
          <div className='flex items-center space-x-2'>
            <p className='text-xs sm:text-sm font-medium whitespace-nowrap text-slate-600 dark:text-slate-400'>
              Số dòng / trang
            </p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger className='h-8 w-[4.5rem] text-xs [&[data-size]]:h-8 cursor-pointer'>
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side='top'>
                <SelectGroup>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`} className='text-xs cursor-pointer'>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='flex items-center justify-center text-xs sm:text-sm font-medium whitespace-nowrap'>
          Trang {page} / {Math.max(1, totalPages)}
        </div>

        <div className='flex items-center space-x-1'>
          {/* First page */}
          <Button
            aria-label='Trang đầu'
            variant='outline'
            size='icon'
            className='hidden size-8 lg:flex'
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
          >
            <Icons.chevronsLeft />
          </Button>

          {/* Prev page */}
          <Button
            aria-label='Trang trước'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <Icons.chevronLeft />
          </Button>

          {/* Next page */}
          <Button
            aria-label='Trang sau'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <Icons.chevronRight />
          </Button>

          {/* Last page */}
          <Button
            aria-label='Trang cuối'
            variant='outline'
            size='icon'
            className='hidden size-8 lg:flex'
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <Icons.chevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
