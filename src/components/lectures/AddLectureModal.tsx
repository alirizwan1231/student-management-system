"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { LectureForm } from "@/components/lectures/LectureForm";
import { cn } from "@/lib/utils/cn";

export function AddLectureModal({
  userId,
  fullWidth,
}: {
  userId: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex items-center justify-center gap-2 rounded-xl",
          "border border-brand-200 bg-brand-50 px-4 py-2.5",
          "text-sm font-semibold text-brand-700",
          "shadow-sm transition-all duration-200",
          "hover:-translate-y-[1px] hover:border-brand-300 hover:bg-brand-100 hover:shadow-md",
          "active:translate-y-0 active:shadow-sm",
          "dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300",
          "dark:hover:border-brand-400/30 dark:hover:bg-brand-500/15 dark:hover:text-brand-200",
          "dark:hover:shadow-brand-500/10",
          "focus:outline-none focus:ring-4 focus:ring-brand-500/10",
          fullWidth && "w-full justify-start text-left"
        )}
      >
        <span className="text-base leading-none transition-transform duration-200 group-hover:rotate-90">
          +
        </span>
        <span>Add lecture</span>
      </button>

      {open && (
        <Modal title="Add a lecture" onClose={() => setOpen(false)}>
          <LectureForm userId={userId} onCreated={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
