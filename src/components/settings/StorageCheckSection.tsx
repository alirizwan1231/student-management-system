"use client";

import { useState } from "react";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Step {
  name: string;
  ok: boolean | null; // null = skipped
  detail: string;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// Tests the whole file path with a 13-byte test file: the server can sign, the browser may upload
// straight to R2 (CORS PUT), the app may read it back (CORS GET, needed by the file viewer),
// and the test file is deleted again.
async function runStorageCheck(): Promise<Step[]> {
  const steps: Step[] = [];
  const add = (name: string, ok: boolean | null, detail: string) => steps.push({ name, ok, detail });
  const text = "storage check";
  const body = new Blob([text], { type: "text/plain" });
  let uploadUrl = "";
  let path = "";

  try {
    const res = await fetch("/api/storage/presign", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ resourceId: "storage-check", fileName: "storage-check.txt", size: body.size, contentType: "text/plain" }),
    });
    if (!res.ok) {
      add("Server can prepare an upload (R2 keys)", false, `Server answered ${res.status}. Check the 4 R2 values in Vercel and redeploy. ${(await res.text()).slice(0, 160)}`);
      return steps;
    }
    const data = (await res.json()) as { url: string; storage_path: string };
    uploadUrl = data.url;
    path = data.storage_path;
    add("Server can prepare an upload (R2 keys)", true, "OK");
  } catch {
    add("Server can prepare an upload (R2 keys)", false, "Could not reach the server. Are you online?");
    return steps;
  }

  let uploaded = false;
  try {
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "text/plain" }, body });
    if (put.ok) {
      uploaded = true;
      add("Direct upload from the browser (CORS PUT)", true, "Works: big files upload straight to storage.");
    } else {
      add("Direct upload from the browser (CORS PUT)", false, `Storage answered ${put.status}. Re-check the bucket CORS rule and the R2 token permission (Object Read & Write).`);
    }
  } catch {
    add("Direct upload from the browser (CORS PUT)", false, "Blocked by the browser. Add the CORS rule to the bucket (steps in the guide). Until then files go through the server, which only handles small files.");
  }

  if (uploaded) {
    try {
      const conf = await fetch("/api/storage/confirm", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ path }) });
      add("Server can verify the uploaded file", conf.ok, conf.ok ? "OK" : `Server answered ${conf.status}.`);
    } catch {
      add("Server can verify the uploaded file", false, "Request failed.");
    }
    try {
      const link = await fetch(`/api/storage/download?path=${encodeURIComponent(path)}`);
      const { url } = (await link.json()) as { url?: string };
      if (!url) throw new Error("no link");
      const got = await fetch(url);
      const same = got.ok && (await got.text()) === text;
      add("App can read files back (CORS GET, needed by the file viewer)", same, same ? "Works: PDFs, Word and Excel open inside the app." : `Storage answered ${got.status}. Re-check the CORS rule (GET).`);
    } catch {
      add("App can read files back (CORS GET, needed by the file viewer)", false, "Blocked by the browser. Add GET to the bucket CORS rule.");
    }
    try {
      const del = await fetch("/api/storage/delete", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ path }) });
      add("Test file removed", del.ok, del.ok ? "OK" : "Could not delete the 13-byte test file (harmless).");
    } catch {
      add("Test file removed", false, "Could not delete the 13-byte test file (harmless).");
    }
  } else {
    add("App can read files back (CORS GET)", null, "Skipped because the upload step failed.");
  }
  return steps;
}

export function StorageCheckSection() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setSteps(null);
    setSteps(await runStorageCheck());
    setBusy(false);
  };

  const allOk = steps !== null && steps.every((s) => s.ok !== false);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Storage check</h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Tests file uploads and the file viewer with a tiny test file. Takes a few seconds.</p>
      </div>
      <div className="space-y-4 px-5 py-4">
        <button type="button" onClick={run} disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
          {busy ? "Testing..." : "Run storage check"}
        </button>
        {steps && (
          <>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
              {steps.map((s) => {
                const Icon = s.ok === null ? MinusCircle : s.ok ? CheckCircle2 : XCircle;
                return (
                  <li key={s.name} className="flex items-start gap-2.5 px-3 py-2.5">
                    <Icon size={15} className={cn("mt-0.5 shrink-0", s.ok === null ? "text-slate-400" : s.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{s.name}</p>
                      <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-500 dark:text-slate-400">{s.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className={cn("text-xs font-semibold", allOk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {allOk ? "Everything works." : "Fix the red items, then run the check again."}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
