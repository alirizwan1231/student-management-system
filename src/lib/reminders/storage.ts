export const REMINDERS_ENABLED_KEY = "um-reminders-enabled";
export const REMINDERS_SEEN_KEY = "um-reminders-seen";

export function remindersEnabled(): boolean {
  try {
    return localStorage.getItem(REMINDERS_ENABLED_KEY) === "1" && typeof Notification !== "undefined" && Notification.permission === "granted";
  } catch {
    return false;
  }
}

export async function showNotification(title: string, body: string, url: string, tag: string) {
  const options = { body, icon: "/icons/icon-192.png", badge: "/icons/favicon-48.png", tag, data: { url } };
  const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}
