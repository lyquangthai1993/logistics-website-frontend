import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface TablePaginationBarProps extends React.ComponentProps<'div'> {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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
  onPageChange,
  className,
  ...props
}: TablePaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-2 overflow-auto p-1 sm:gap-8",
        className
      )}
      {...props}
    >
      {/* Left: row count info */}
      <div className="text-muted-foreground text-sm whitespace-nowrap">
        {total === 0 ? (
          <>0 đơn hàng</>
        ) : (
          <>
            {from}–{to} / {total} đơn hàng
          </>
        )}
      </div>

      {/* Right: page controls */}
      <div className="flex items-center gap-2 sm:gap-6 lg:gap-8">
        <div className='flex items-center justify-center text-sm font-medium whitespace-nowrap'>
          Trang {page} / {totalPages}
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
