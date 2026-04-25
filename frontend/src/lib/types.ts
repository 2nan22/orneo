// frontend/src/lib/types.ts

export type JournalCategory = "investment" | "housing" | "learning" | "routine";

export type TodayAction = {
  id: number;
  text: string;
  completed: boolean;
};

export type DashboardData = {
  score: number;
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
  key_question: string;
  today_actions: TodayAction[];
};

export type JournalEntry = {
  id: number;
  category: JournalCategory;
  title: string;
  content: string;
  ai_summary: string | null;
  mood_score: number | null;
  is_reviewed: boolean;
  review_memo: string | null;
  created_at: string;
  related_goal: number | null;
};

export type Goal = {
  id: number;
  title: string;
  category: string;
};
