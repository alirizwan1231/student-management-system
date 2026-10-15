import type { Lecture, AcademicTask, Resource } from "@/types/academic";
import type { LectureSnapshot, TaskSnapshot, ResourceSnapshot } from "@/types/groups";
export function buildLectureSnapshot(lecture: Lecture, subjectName: string): LectureSnapshot {
  return {
    title: lecture.title,
    subject_name: subjectName,
    lecture_number: lecture.lecture_number,
    lecture_date: lecture.lecture_date,
    short_summary: lecture.short_summary,
    detailed_notes: lecture.detailed_notes,
    keywords: lecture.keywords,
  };
}
export function buildTaskSnapshot(task: AcademicTask, subjectName: string): TaskSnapshot {
  return {
    title: task.title,
    subject_name: subjectName,
    task_type: task.task_type,
    deadline: task.deadline,
    priority: task.priority,
    marks: task.marks,
    description: task.description,
  };
}
export function buildResourceSnapshot(resource: Resource, subjectName: string | null): ResourceSnapshot {
  return {
    title: resource.title,
    subject_name: subjectName,
    resource_type: resource.resource_type,
    url: resource.url,
    storage_path: resource.storage_path,
  };
}
