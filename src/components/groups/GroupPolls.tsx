"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { listPolls, createPoll, voteOnPoll, closePoll, type PollWithResults } from "@/lib/groups/polls";
export function GroupPolls({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { user } = useUser();
  const [polls, setPolls] = useState<PollWithResults[]>([]);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const load = () => listPolls(groupId).then(setPolls);
  useEffect(() => { load(); }, [groupId]);
  const handleCreate = async () => {
    const valid = options.filter((o) => o.trim());
    if (!question.trim() || valid.length < 2) { setError("Add a question and at least 2 options."); return; }
    await createPoll(groupId, question, valid);
    setQuestion(""); setOptions(["", ""]); setCreating(false); setError(null);
    load();
  };
  const handleVote = async (pollId: string, optionId: string) => {
    try { await voteOnPoll(pollId, optionId); load(); } catch { /* already voted or poll closed -- UI reflects state on next load */ }
  };
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Polls</h2>
        <button onClick={() => setCreating((v) => !v)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
          + New poll
        </button>
      </div>
      {creating && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should we study today?" className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          {options.map((o, i) => (
            <input
              key={i}
              value={o}
              onChange={(e) => setOptions((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          ))}
          <button onClick={() => setOptions((prev) => [...prev, ""])} className="mb-2 text-xs font-semibold text-brand-600 hover:underline">+ Add option</button>
          {error && <p className="text-xs text-status-overdue">{error}</p>}
          <button onClick={handleCreate} className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Create poll</button>
        </div>
      )}
      {polls.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No polls yet.</p>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <div key={poll.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-slate-800 dark:text-slate-100">📊 {poll.question}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${poll.is_closed ? "bg-slate-100 text-slate-500 dark:bg-white/[0.06]" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
                  {poll.is_closed ? "Closed" : "Open"}
                </span>
              </div>
              <div className="space-y-1.5">
                {poll.options.map((opt) => (
                  <button
                    key={opt.id}
                    disabled={poll.is_closed || !!poll.myVoteOptionId}
                    onClick={() => handleVote(poll.id, opt.id)}
                    className="relative block w-full overflow-hidden rounded-lg border border-slate-200 p-2 text-left text-sm disabled:cursor-default dark:border-slate-700"
                  >
                    <div className="absolute inset-y-0 left-0 bg-brand-100 dark:bg-brand-900/30" style={{ width: `${opt.percentage}%` }} />
                    <div className="relative flex items-center justify-between">
                      <span className={poll.myVoteOptionId === opt.id ? "font-bold text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-200"}>
                        {poll.myVoteOptionId === opt.id ? "✓ " : ""}{opt.option_text}
                      </span>
                      <span className="text-xs text-slate-400">{opt.voteCount} ({opt.percentage}%)</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">{poll.totalVotes} total votes</p>
              {!poll.is_closed && (poll.created_by === user?.id || myRole === "owner" || myRole === "moderator") && (
                <button onClick={() => closePoll(poll.id).then(load)} className="mt-2 text-xs font-semibold text-status-overdue hover:underline">
                  Close poll
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
