"use client";
import { createClient } from "@/lib/supabase/client";
export interface PollOption { id: string; option_text: string; position: number; }
export interface PollWithResults {
  id: string; group_id: string; created_by: string; question: string; is_closed: boolean; created_at: string;
  totalVotes: number;
  myVoteOptionId: string | null;
  options: (PollOption & { voteCount: number; percentage: number })[];
}
export async function listPolls(groupId: string): Promise<PollWithResults[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: polls } = await supabase.from("group_polls").select("*").eq("group_id", groupId).is("deleted_at", null).order("created_at", { ascending: false });
  if (!polls || polls.length === 0) return [];
  const pollIds = polls.map((p) => p.id);
  const { data: options } = await supabase.from("group_poll_options").select("*").in("poll_id", pollIds).order("position", { ascending: true });
  const { data: votes } = await supabase.from("group_poll_votes").select("*").in("poll_id", pollIds);
  return polls.map((poll) => {
    const pollOptions = (options ?? []).filter((o) => o.poll_id === poll.id);
    const pollVotes = (votes ?? []).filter((v) => v.poll_id === poll.id);
    const totalVotes = pollVotes.length;
    const myVote = pollVotes.find((v) => v.user_id === user?.id);
    return {
      ...poll,
      totalVotes,
      myVoteOptionId: myVote?.option_id ?? null,
      options: pollOptions.map((o) => {
        const count = pollVotes.filter((v) => v.option_id === o.id).length;
        return { ...o, voteCount: count, percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0 };
      }),
    };
  });
}
export async function createPoll(groupId: string, question: string, options: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const pollId = crypto.randomUUID();
  const { error } = await supabase.from("group_polls").insert({ id: pollId, group_id: groupId, created_by: user.id, question });
  if (error) throw error;
  const rows = options.filter((o) => o.trim()).map((text, i) => ({ id: crypto.randomUUID(), poll_id: pollId, option_text: text.trim(), position: i }));
  const { error: optError } = await supabase.from("group_poll_options").insert(rows);
  if (optError) throw optError;
  return pollId;
}
export async function voteOnPoll(pollId: string, optionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("group_poll_votes").insert({ id: crypto.randomUUID(), poll_id: pollId, option_id: optionId, user_id: user.id });
  if (error) throw error; // unique constraint surfaces as an error on a second vote attempt
}
export async function closePoll(pollId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("group_polls").update({ is_closed: true }).eq("id", pollId);
  if (error) throw error;
}
