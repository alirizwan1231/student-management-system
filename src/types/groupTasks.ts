export type TasksPolicy = "everyone" | "staff";

export interface GroupTask {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  subject_name: string | null;
  due_date: string | null; // yyyy-MM-dd
  week_start: string; // yyyy-MM-dd (Monday)
  assignee_ids: string[] | null; // null = everyone
  repeat_weekly: boolean;
  series_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GroupTaskCompletion {
  task_id: string;
  user_id: string;
  completed_at: string;
}

export interface GroupTaskInput {
  title: string;
  description: string | null;
  subject_name: string | null;
  due_date: string | null;
  week_start: string;
  assignee_ids: string[] | null;
  repeat_weekly: boolean;
}