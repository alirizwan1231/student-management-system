import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

// Fix 5E (audit H-4): /share/<id> used to bounce silently to /login, so a
// shared link was useless to anyone not already signed in. This public
// preview deliberately shows NO shared content -- it only explains what the
// link is and sends the visitor to sign in / join. The actual content stays
// protected by sign-in + group membership, exactly as before.
export const metadata = { title: "Shared with you - University Manager" };

export default function SharePreviewPage({ params }: { params: { id: string } }) {
  return (
    <AuthShell
      title="Something was shared with you"
      subtitle="Sign in (or create an account) to view it. Shared notes, files and group content are only visible to signed-in members of the group they were shared with."
    >
      <p className="mb-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
        Share reference: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{params.id}</span>
      </p>
      <div className="flex flex-col gap-2.5">
        <Link href="/login" className="rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
          Sign in to view
        </Link>
        <Link href="/signup" className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
          Create an account
        </Link>
      </div>
    </AuthShell>
  );
}
