import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export interface SeriesPoint {
  label: string;
  value: number;
  secondary?: number;
}

/** Bar or area chart, raw SVG + framer-motion entrance. Redraws only on data change. */
const ActivityChart: React.FC<{
  data: SeriesPoint[];
  kind?: 'bars' | 'area';
  height?: number;
  ariaLabel?: string;
  secondaryLabel?: string;
  caption?: React.ReactNode;
  className?: string;
}> = ({ data, kind = 'bars', height = 220, ariaLabel = 'Activity chart', secondaryLabel, caption, className }) => {
  const W = 760;
  const H = height;
  const padX = 10;
  const baseline = H - 26;
  const [hover, setHover] = useState<number | null>(null);

  const { max, slot } = useMemo(() => ({
    max: Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0))),
    slot: W / Math.max(1, data.length),
  }), [data]);

  const dateLabel = (label: string) => {
    const d = new Date(label + 'T00:00:00');
    return isNaN(d.getTime()) ? label : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const pathFor = (key: 'value' | 'secondary') => {
    const step = (W - padX * 2) / Math.max(1, data.length - 1);
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${padX + i * step} ${baseline - ((d[key] ?? 0) / max) * (baseline - 16)}`)
      .join(' ');
  };

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={baseline - g * (baseline - 16)} y2={baseline - g * (baseline - 16)}
                className="stroke-border" strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
        ))}

        {kind === 'bars' ? (
          data.map((d, i) => {
            const barW = Math.max(3, slot * 0.55);
            const x = i * slot + (slot - barW) / 2;
            const hgt = (d.value / max) * (baseline - 16);
            return (
              <g key={`${d.label}-${i}`}
                 onMouseEnter={() => setHover(i)}>
                <motion.rect
                  x={x} width={barW} rx={2}
                  initial={{ height: 0, y: baseline }}
                  animate={{ height: Math.max(0, hgt), y: baseline - hgt }}
                  transition={{ duration: 0.5, delay: i * 0.03, ease: 'easeOut' }}
                  className={hover === i ? 'fill-accent' : 'fill-primary'}
                  style={{ transformOrigin: 'bottom' }}
                />
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              </g>
            );
          })
        ) : (
          <>
            {/* filled area for the primary series */}
            <motion.path
              d={`${pathFor('value')} L ${W - padX} ${baseline} L ${padX} ${baseline} Z`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="fill-primary/30"
            />
            <motion.path
              d={pathFor('value')}
              fill="none"
              className="stroke-primary"
              strokeWidth={2.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {data.some((d) => d.secondary !== undefined) && (
              <motion.path
                d={pathFor('secondary')}
                fill="none"
                className="stroke-accent"
                strokeWidth={1.8}
                strokeDasharray="1 0"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
              />
            )}
            {/* crosshair */}
            {hover !== null && (
              <line
                x1={padX + hover * ((W - padX * 2) / Math.max(1, data.length - 1))}
                x2={padX + hover * ((W - padX * 2) / Math.max(1, data.length - 1))}
                y1={6} y2={baseline}
                className="stroke-border" strokeWidth={1}
              />
            )}
            {data.map((d, i) => {
              const step = (W - padX * 2) / Math.max(1, data.length - 1);
              return (
                <rect key={`${d.label}-${i}`}
                      x={padX + i * step - step / 2} y={0} width={step} height={H}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)} />
              );
            })}
          </>
        )}

        {/* hover tooltip */}
        {hover !== null && data[hover] && (
          <g>
            <rect
              x={Math.min(W - 150, Math.max(0, hover * slot - 60))}
              y={4}
              width={148}
              height={secondaryLabel ? 40 : 26}
              rx={6}
              className="fill-[rgb(var(--c-surface))]"
              stroke="rgb(var(--c-border))"
            />
            <text
              x={Math.min(W - 150, Math.max(0, hover * slot - 60)) + 10}
              y={19}
              className="fill-[rgb(var(--c-content))] text-[11px] font-bold"
            >
              {dateLabel(data[hover].label)} · {data[hover].value}
            </text>
            {secondaryLabel && data[hover].secondary !== undefined && (
              <text
                x={Math.min(W - 150, Math.max(0, hover * slot - 60)) + 10}
                y={36}
                className="fill-[rgb(var(--c-accent))] text-[11px] font-bold"
              >
                {secondaryLabel} · {data[hover].secondary}
              </text>
            )}
          </g>
        )}

        {/* x-axis labels */}
        {data.map((d, i) => (
          (i % Math.ceil(data.length / 9) === 0) && (
            <text key={`x-${d.label}-${i}`} x={i * slot + slot / 2} y={H - 6} textAnchor="middle"
                  className="fill-[rgb(var(--c-muted))] text-[10px]">
              {dateLabel(d.label)}
            </text>
          )
        ))}
      </svg>
      {kind === 'area' && (
        <figcaption className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-muted">
          {caption ?? (
            <>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary" /> passed</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> {secondaryLabel ?? 'secondary'}</span>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
};

export default ActivityChart;
