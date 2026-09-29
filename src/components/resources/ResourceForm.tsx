"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resourceSchema, type ResourceInput } from "@/lib/validation/resource";
import { createResource } from "@/lib/db/repo/resources";
import { queueFileUpload } from "@/lib/db/repo/pendingUploads";

const inputClass =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400";

export function ResourceForm({
  userId,
  subjectId,
  lectureId,
  taskId,
  onCreated,
}: {
  userId: string;
  subjectId?: string;
  lectureId?: string;
  taskId?: string;
  onCreated?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResourceInput>({
    resolver: zodResolver(resourceSchema),
    defaultValues: { resource_type: "pdf" },
  });

  const onSubmit = async (values: ResourceInput) => {
    const resource = await createResource(userId, {
      subject_id: subjectId ?? null,
      lecture_id: lectureId ?? null,
      task_id: taskId ?? null,
      title: values.title,
      url: values.url || null,
      resource_type: values.resource_type,
    });
    if (file) {
      await queueFileUpload(userId, resource.id, file);
    }
    reset();
    setFile(null);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} {...register("title")} />
          {errors.title && <p className="text-xs text-status-overdue">{errors.title.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select className={inputClass} {...register("resource_type")}>
            <option value="pdf">PDF</option>
            <option value="ppt">Slides</option>
            <option value="doc">Document</option>
            <option value="image">Image</option>
            <option value="link">Link</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Link (optional)</label>
          <input placeholder="https://..." className={inputClass} {...register("url")} />
        </div>
        <div>
          <label className={labelClass}>File (optional)</label>
          <input
            type="file"
            className="block w-full text-sm text-slate-600 dark:text-slate-300"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:self-start"
      >
        Add resource
      </button>
    </form>
  );
}
