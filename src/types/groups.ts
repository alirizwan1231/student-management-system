export type GroupRole = "owner" | "moderator" | "member";
export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  subject_id: string | null;
  semester_id: string | null;
  invite_code: string;
  avatar_url: string | null;
  tasks_policy?: "everyone" | "staff";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null };
}
export type SharedSourceType = "lecture" | "resource" | "task";
export interface LectureSnapshot {
  title: string;
  subject_name: string;
  lecture_number: number | null;
  lecture_date: string | null;
  short_summary: string | null;
  detailed_notes: string | null;
  keywords: string[];
}
export interface TaskSnapshot {
  title: string;
  subject_name: string;
  task_type: string;
  deadline: string | null;
  priority: string;
  marks: number | null;
  description: string | null;
}
export interface ResourceSnapshot {
  title: string;
  subject_name: string | null;
  resource_type: string;
  url: string | null;
  storage_path: string | null;
}
export interface GroupSharedItem {
  id: string;
  group_id: string;
  shared_by: string;
  source_type: SharedSourceType;
  source_id: string;
  snapshot: LectureSnapshot | TaskSnapshot | ResourceSnapshot;
  group_task_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null };
}
export interface GroupAnnouncement {
  id: string;
  group_id: string;
  posted_by: string;
  message: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null };
}
export interface GroupComment {
  id: string;
  group_id: string;
  shared_item_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null };
}
export interface GroupNotification {
  id: string;
  group_id: string;
  user_id: string;
  type: string;
  message: string;
  created_at: string;
  read_at: string | null;
}
