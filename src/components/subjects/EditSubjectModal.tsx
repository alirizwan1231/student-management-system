"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import type { Subject } from "@/types/academic";

export function EditSubjectModal({ userId, subject }: { userId: string; subject: Subject }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit subject"
        className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        Edit
      </button>

      {open && (
        <Modal title="Edit subject" onClose={() => setOpen(false)}>
          <SubjectForm userId={userId} subject={subject} onCreated={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}