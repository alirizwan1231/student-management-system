"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SemesterForm } from "@/components/semesters/SemesterForm";
import type { Semester } from "@/types/academic";

export function EditSemesterModal({ userId, semester }: { userId: string; semester: Semester }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit semester"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98] dark:border-white/[0.08] dark:text-slate-500 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
      >
        <Pencil size={15} />
      </button>

      {open && (
        <Modal title="Edit semester" onClose={() => setOpen(false)}>
          <SemesterForm userId={userId} semester={semester} onCreated={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}