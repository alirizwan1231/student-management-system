// Turns a raw sync error into something a student can act on.
export function explainSyncError(raw: string | null | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (!m) return "Unknown error";
  if (/jwt|not signed in|session|invalid refresh|refresh token|401|not authenticated/.test(m))
    return "Your login session has expired. Sign out and sign in again, then your changes will upload.";
  if (/row-level security|permission denied|42501|policy/.test(m))
    return "The database refused this change (permission). Sign out and sign in again; if it continues, send this message to support: " + raw;
  if (/invalid input syntax|22007|22p02|date\/time|out of range/.test(m))
    return "A date or number was in the wrong format. It is fixed automatically; press Retry now.";
  if (/foreign key|23503|violates foreign key/.test(m))
    return "This item belongs to a subject/semester that is not in the cloud yet. Press Retry now; the app uploads it first.";
  if (/relation .* does not exist|schema cache|could not find the table|pgrst205|42p01/.test(m))
    return "A required database table is missing. Run the latest SQL files in Supabase. Detail: " + raw;
  if (/column .* does not exist|pgrst204|could not find the .* column/.test(m))
    return "The database is missing a column the app uses. Run the latest SQL files in Supabase. Detail: " + raw;
  if (/failed to fetch|networkerror|network request failed|load failed/.test(m))
    return "No connection to the server right now. It will retry automatically.";
  return raw as string;
}