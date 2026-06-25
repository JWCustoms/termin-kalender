import { useCalendarStore } from '@/stores';
import { getYearMonths, formatDate, isSameMonth } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

export function YearView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const setView = useCalendarStore((s) => s.setView);

  const year = currentDate.getFullYear();
  const months = getYearMonths(year);

  return (
    <div className="grid grid-cols-3 gap-3 p-4 overflow-y-auto">
      {months.map((month) => {
        const isCurrent = isSameMonth(month, new Date());
        const isSelected = isSameMonth(month, currentDate);

        return (
          <button
            key={month.toISOString()}
            onClick={() => {
              hapticLight();
              setCurrentDate(month);
              setView('month');
            }}
            className={cn(
              'rounded-xl border border-border p-4 text-center transition-colors hover:bg-accent',
              isSelected && 'border-primary bg-primary/5',
              isCurrent && 'ring-2 ring-primary/30'
            )}
          >
            <div className="text-sm font-semibold capitalize">
              {formatDate(month, 'MMM')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(month, 'yyyy')}
            </div>
          </button>
        );
      })}
    </div>
  );
}
