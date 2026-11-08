import React from 'react';
import { Link } from 'react-router-dom';

export interface LabPerfRow {
  lab_id: string;
  title: string;
  module_number?: number | null;
  difficulty?: string | null;
  attempts: number;
  students?: number;
  pass_rate: number;
  avg_score: number;
  avg_time?: number | null;
}

/** Lab performance table with inline pass-rate bars. */
const LabPerfTable: React.FC<{ rows: LabPerfRow[]; limit?: number; linkTo?: string }> = ({ rows, limit = 5, linkTo }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border bg-surface-2/50 text-left">
        <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Lab</th>
        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Attempts</th>
        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Pass rate</th>
        <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Avg score</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      {rows.slice(0, limit).map((l) => (
        <tr key={l.lab_id} className="transition-colors hover:bg-surface-2/40">
          <td className="max-w-[260px] px-5 py-3">
            {linkTo ? (
              <Link to={linkTo.replace(':id', l.lab_id)} className="block truncate font-semibold text-content hover:text-primary hover:underline" title={l.title}>
                {l.title}
              </Link>
            ) : (
              <span className="block truncate font-semibold text-content" title={l.title}>{l.title}</span>
            )}
            <span className="text-xs font-semibold text-muted">
              {l.module_number != null ? `Module ${l.module_number}` : ''}{l.difficulty ? ` · ${l.difficulty}` : ''}
            </span>
          </td>
          <td className="px-3 py-3 text-right font-bold tabular-nums text-content">{l.attempts}</td>
          <td className="px-3 py-3 text-right">
            <div className="flex items-center justify-end gap-2">
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${l.pass_rate >= 66 ? 'bg-success' : l.pass_rate >= 40 ? 'bg-warn' : 'bg-danger'}`}
                     style={{ width: `${Math.min(100, l.pass_rate)}%` }} />
              </div>
              <span className="tabular-nums font-bold text-content">{l.pass_rate}%</span>
            </div>
          </td>
          <td className="px-5 py-3 text-right tabular-nums text-muted">{l.avg_score}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default LabPerfTable;
