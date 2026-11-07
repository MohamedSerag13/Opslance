/** Shared response shapes for GET /api/progress/dashboard. */

export interface continueItem {
  kind: 'attempt' | 'session' | 'retry' | 'next';
  lab_id: string;
  lab_title: string;
  module_number: number;
  /** attempt */
  session_id?: string;
  attempt_id?: string;
  mode?: 'practice' | 'exam';
  current_index?: number;
  question_count?: number;
  expires_at?: string | null;
  /** session */
  last_active_at?: string;
  /** retry */
  last_score?: number;
  points?: number;
  /** next */
  difficulty?: string;
  estimated_minutes?: number;
}

export interface trackModule {
  module_number: number;
  module_title: string;
  total_labs: number;
  completed_labs: number;
  points: number;
  next_lab?: { lab_id: string; title: string };
  labs?: Array<{
    lab_id: string;
    title: string;
    status: 'completed' | 'in_progress' | 'not_started';
    best_score: number;
    points: number;
    estimated_minutes: number;
  }>;
}

export interface trackData {
  key: string;
  kind: 'path' | 'certification';
  title: string;
  tagline: string;
  icon: string;
  accent: string;
  modules: trackModule[];
  total_labs: number;
  completed_labs: number;
  completion: number;
}

export interface dashboardData {
  summary: {
    total_labs_completed: number;
    total_points: number;
    current_streak: number;
    completion_percentage: number;
    subscription_tier: string;
  };
  continue: continueItem[];
  tracks: trackData[];
  activity: Array<{ date: string; labs_completed: number }>;
  leaderboard: {
    scope: 'group' | 'global';
    total_students: number;
    my_rank: number | null;
    entries: Array<{
      student_id: string;
      name: string;
      total_score: number;
      labs_completed: number;
      is_me: boolean;
      rank: number;
    }>;
  };
}
