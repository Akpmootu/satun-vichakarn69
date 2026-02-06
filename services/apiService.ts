import { AppSettings, Submission } from '../types';

const LS_KEYS = {
  submissions: "svk_submissions_v1",
  settings: "svk_settings_v1",
};

export function nowISO(): string {
  return new Date().toISOString();
}

function safeJsonParse<T>(v: string | null, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

// --- LocalStorage Mock Helpers ---
function loadSubmissions(): Submission[] {
  return safeJsonParse(localStorage.getItem(LS_KEYS.submissions), []);
}

function saveSubmissions(items: Submission[]) {
  localStorage.setItem(LS_KEYS.submissions, JSON.stringify(items));
}

export function loadSettings(): AppSettings {
  return safeJsonParse(localStorage.getItem(LS_KEYS.settings), { 
    mode: "mock", 
    apiBaseUrl: "" 
  });
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(LS_KEYS.settings, JSON.stringify(s));
}

// --- Exponential Backoff Fetcher ---
async function fetchWithBackoff(url: string, options: RequestInit = {}, config = { maxRetries: 3 }) {
  const { maxRetries } = config;
  const baseDelayMs = 500;
  
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
         // Retry on 429 or 5xx
        if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
          throw new Error(`Server Error ${res.status}`);
        }
        const text = await res.text().catch(() => "");
        throw new Error(`API Error (${res.status}): ${text}`);
      }
      return res;
    } catch (err: any) {
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt); // Exponential
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries reached");
}

// --- API Methods ---

export async function apiListSubmissions(settings: AppSettings): Promise<Submission[]> {
  if (settings.mode === "mock") {
    await new Promise((r) => setTimeout(r, 400)); // Simulate latency
    return loadSubmissions();
  }

  if (!settings.apiBaseUrl) throw new Error("กรุณาตั้งค่า Base URL ของ API ก่อน");
  const res = await fetchWithBackoff(`${settings.apiBaseUrl}/submissions`);
  return await res.json();
}

export async function apiCreateSubmission(settings: AppSettings, payload: Submission): Promise<Submission> {
  if (settings.mode === "mock") {
    await new Promise((r) => setTimeout(r, 600));
    const all = loadSubmissions();
    const item = { ...payload };
    all.unshift(item);
    saveSubmissions(all);
    return item;
  }

  if (!settings.apiBaseUrl) throw new Error("กรุณาตั้งค่า Base URL ของ API ก่อน");
  const res = await fetchWithBackoff(`${settings.apiBaseUrl}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function apiUpdateSubmission(settings: AppSettings, id: string, patch: Partial<Submission>): Promise<Submission> {
  if (settings.mode === "mock") {
    await new Promise((r) => setTimeout(r, 300));
    const all = loadSubmissions();
    const idx = all.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error("ไม่พบรายการ");
    
    // Check if we need to merge audit logs
    let newAudit = patch.audit;
    if (patch.audit && all[idx].audit) {
       // In mock mode, we assume the patch contains the *new* log entry only or the full list?
       // Let's assume the calling component sends the full list or we handle append logic here.
       // For simplicity in this mock, we'll trust the payload or just merge if it's separate.
       // To align with the App logic, the payload contains the FULL new object state usually.
    }
    
    const updated = { ...all[idx], ...patch, updatedAt: nowISO() };
    all[idx] = updated;
    saveSubmissions(all);
    return updated;
  }

  if (!settings.apiBaseUrl) throw new Error("กรุณาตั้งค่า Base URL ของ API ก่อน");
  const res = await fetchWithBackoff(`${settings.apiBaseUrl}/submissions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return await res.json();
}