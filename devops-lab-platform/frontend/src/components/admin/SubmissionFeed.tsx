import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '../ui';

export interface FeedRow {
  lab_id: string;
  lab_title: string;
  student_name: string;
  score: number;
  passed: boolean;
  attempt_number?: number;
  submitted_at: string | null;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Live submission feed — new rows slide in from the top via AnimatePresence. */
const SubmissionFeed: React.FC<{ rows: FeedRow[]; limit?: number }> = ({ rows, limit = 10 }) => (
  <ul className="divide-y divide-border">
    <AnimatePresence initial={false}>
      {rows.slice(0, limit).map((r, i) => (
        <motion.li
          key={`${r.lab_id}-${r.student_name}-${r.submitted_at ?? i}`}
          layout
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="flex flex-wrap items-center gap-3 px-6 py-3.5"
        >
          <span className="w-14 shrink-0">
            {r.passed
              ? <Badge variant="success" dot>Pass</Badge>
              : <Badge variant="danger" dot>Fail</Badge>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-content" title={r.lab_title}>{r.lab_title}</span>
            <span className="text-xs font-semibold text-muted">
              {r.student_name}{r.attempt_number ? ` · attempt ${r.attempt_number}` : ''}
            </span>
          </span>
          <span className="text-sm font-bold tabular-nums text-content">{r.score} pts</span>
          <span className="w-16 text-right text-xs font-semibold text-muted">
            {r.submitted_at ? relTime(r.submitted_at) : ''}
          </span>
        </motion.li>
      ))}
    </AnimatePresence>
  </ul>
);

export default SubmissionFeed;
