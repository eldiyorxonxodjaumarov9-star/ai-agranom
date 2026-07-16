import type { CalendarTask, ReminderItem } from "./types";

const CAL_KEY = "agro-olam-calendar-v1";
const REM_KEY = "agro-olam-reminders-v1";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadCalendar(): CalendarTask[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CAL_KEY) || "[]") as CalendarTask[];
  } catch {
    return [];
  }
}

export function saveCalendar(tasks: CalendarTask[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CAL_KEY, JSON.stringify(tasks));
}

export function addCalendarTasks(
  items: { title: string; daysFromNow: number; cropId?: string; cropName?: string }[]
): CalendarTask[] {
  const existing = loadCalendar();
  const now = new Date();
  const added: CalendarTask[] = items.map((item) => {
    const due = new Date(now);
    due.setDate(due.getDate() + item.daysFromNow);
    return {
      id: uid(),
      cropId: item.cropId || "general",
      cropName: item.cropName || "Umumiy",
      title: item.title,
      dueDate: due.toISOString().slice(0, 10),
      done: false,
    };
  });
  const next = [...added, ...existing].slice(0, 80);
  saveCalendar(next);
  return next;
}

export function loadReminders(): ReminderItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REM_KEY) || "[]") as ReminderItem[];
  } catch {
    return [];
  }
}

export function saveReminders(items: ReminderItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REM_KEY, JSON.stringify(items));
}

export function createReminder(
  title: string,
  hoursFromNow: number,
  cropName?: string
): ReminderItem {
  const at = new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();
  const item: ReminderItem = {
    id: uid(),
    title,
    at,
    cropName,
    notified: false,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadReminders()].slice(0, 50);
  saveReminders(next);
  scheduleBrowserNotification(item);
  return item;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function scheduleBrowserNotification(item: ReminderItem): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const delay = new Date(item.at).getTime() - Date.now();
  if (delay <= 0) {
    showNotification(item);
    return;
  }
  // Cap setTimeout (~24h) for demo reliability
  const wait = Math.min(delay, 24 * 3600 * 1000);
  window.setTimeout(() => showNotification(item), wait);
}

function showNotification(item: ReminderItem): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Я AI Дехқон", {
    body: item.title,
    icon: "/favicon.ico",
  });
  const all = loadReminders().map((r) =>
    r.id === item.id ? { ...r, notified: true } : r
  );
  saveReminders(all);
}

export function restoreReminderTimers(): void {
  loadReminders()
    .filter((r) => !r.notified && new Date(r.at).getTime() > Date.now() - 60000)
    .forEach(scheduleBrowserNotification);
}

export function parseReminderIntent(text: string): { title: string; hours: number } | null {
  const lower = text.toLowerCase();
  if (!/eslat|reminder|eslatib|напомина/i.test(lower)) return null;
  let hours = 24;
  if (/ertaga|tomorrow|завтра/i.test(lower)) hours = 24;
  if (/soat|hour|час/i.test(lower)) {
    const m = lower.match(/(\d+)\s*(soat|hour|час)/);
    if (m) hours = Number(m[1]);
  }
  if (/bugun\s+kech|tonight/i.test(lower)) hours = 6;
  return { title: text.trim().slice(0, 120), hours };
}
