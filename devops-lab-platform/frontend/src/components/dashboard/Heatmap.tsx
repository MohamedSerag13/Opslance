import React, { useMemo } from 'react';
import { Card } from '../ui';

/** GitHub-style 12-week activity heatmap (Sun-aligned columns). */
const Heatmap: React.FC<{ activity: { date: string; labs_completed: number }[]; title?: string }> = ({
  activity,
  title = 'Activity',
}) => {
  const columns = useMemo(() => {
    if (!activity.length) return [];
    const cells: (string | null)[] = [];
    const first = new Date(activity[0].date + 'T00:00:00');
    for (let i = 0; i < first.getDay(); i++) cells.push(null); // pad to Sunday
    activity.forEach((a) => cells.push(a.date));
    while (cells.length % 7 !== 0) cells.push(null);
    const cols: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    return cols;
  }, [activity]);

  const level = (n: number) =>
    n === 0 ? 'bg-surface-2 border-border'
      : n === 1 ? 'bg-success/25 border-success/40'
      : n <= 3 ? 'bg-success/55 border-success/60'
      : 'bg-success border-success';

  const total = activity.reduce((s, a) => s + a.labs_completed, 0);
  const weeks = Math.ceil(activity.length / 7);

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold text-content">{title}</h3>
        <p className="text-xs font-bold text-muted">{total} labs · last {weeks} weeks</p>
      </div>
      <div className="mt-4 flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Labs completed per day, last 12 weeks">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((date, ri) => {
              const day = date ? activity.find((a) => a.date === date) : null;
              return (
                <div
                  key={ri}
                  title={day ? `${day.labs_completed} lab${day.labs_completed === 1 ? '' : 's'} on ${day.date}` : ''}
                  className={`h-3.5 w-3.5 shrink-0 rounded-[3px] border ${date ? level(day?.labs_completed ?? 0) : 'bg-transparent border-transparent'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted">
        <span>12 weeks ago</span>
        <span className="flex items-center gap-1">
          Less
          <span className={`inline-block h-3 w-3 rounded-[3px] border ${level(0)}`} />
          <span className={`inline-block h-3 w-3 rounded-[3px] border ${level(1)}`} />
          <span className={`inline-block h-3 w-3 rounded-[3px] border ${level(2)}`} />
          <span className={`inline-block h-3 w-3 rounded-[3px] border ${level(4)}`} />
          More
        </span>
        <span>Today</span>
      </div>
    </Card>
  );
};

export default Heatmap;
