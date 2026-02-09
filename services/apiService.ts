import { AppSettings, Submission, UserProfile, NewsItem } from '../types';
import { PR_NEWS } from '../constants';

const LS_KEYS = {
  submissions: "svk_submissions_v1",
  settings: "svk_settings_v1",
  users: "svk_users_v1",
  currentUser: "svk_current_user_v1",
  news: "svk_news_v1"
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

// --- Auth Helpers ---
export function getCurrentUser(): UserProfile | null {
    return safeJsonParse(localStorage.getItem(LS_KEYS.currentUser), null);
}

export function logoutUser() {
    localStorage.removeItem(LS_KEYS.currentUser);
}

export async function apiRegisterUser(user: UserProfile): Promise<UserProfile> {
    // Mock Registration
    await new Promise((r) => setTimeout(r, 800));
    const users: UserProfile[] = safeJsonParse(localStorage.getItem(LS_KEYS.users), []);
    
    // Check duplicate (simple check)
    if (users.find(u => u.email === user.email)) {
        throw new Error("อีเมลนี้ถูกลงทะเบียนแล้ว");
    }

    // Default role is user
    const newUser = { ...user, role: 'user' as const };

    users.push(newUser);
    localStorage.setItem(LS_KEYS.users, JSON.stringify(users));
    localStorage.setItem(LS_KEYS.currentUser, JSON.stringify(newUser)); // Auto login
    return newUser;
}

export async function apiLoginUser(email: string, password?: string): Promise<UserProfile> {
    // Mock Login
    await new Promise((r) => setTimeout(r, 800));

    // 1. Check Hardcoded Admin
    if (email === 'admin' && password === 'admin123') {
        const admin: UserProfile = {
            id: 'admin_001',
            firstName: 'System',
            lastName: 'Administrator',
            email: 'admin@skms.go.th',
            role: 'admin',
            position: 'IT Admin',
            organization: 'SSJ Satun'
        };
        localStorage.setItem(LS_KEYS.currentUser, JSON.stringify(admin));
        return admin;
    }

    // 2. Check Hardcoded Reviewer
    if (email === 'reviewer' && password === 'review123') {
        const reviewer: UserProfile = {
            id: 'reviewer_001',
            firstName: 'กรรมการ',
            lastName: 'ผู้ทรงคุณวุฒิ',
            email: 'committee@skms.go.th',
            role: 'reviewer',
            position: 'Senior Expert',
            organization: 'Ministry of Public Health'
        };
        localStorage.setItem(LS_KEYS.currentUser, JSON.stringify(reviewer));
        return reviewer;
    }

    // 3. Check Registered Users
    const users: UserProfile[] = safeJsonParse(localStorage.getItem(LS_KEYS.users), []);
    const found = users.find(u => u.email === email);
    
    if (!found) throw new Error("ไม่พบข้อมูลผู้ใช้งานนี้");
    
    localStorage.setItem(LS_KEYS.currentUser, JSON.stringify(found));
    return found;
}

// --- News Management (Mock) ---
export function apiGetNews(): NewsItem[] {
    const stored = localStorage.getItem(LS_KEYS.news);
    if (stored) {
        return JSON.parse(stored);
    }
    // Initialize with default constant if empty
    localStorage.setItem(LS_KEYS.news, JSON.stringify(PR_NEWS));
    return PR_NEWS;
}

export async function apiAddNews(item: Omit<NewsItem, 'id'>): Promise<NewsItem> {
    await new Promise((r) => setTimeout(r, 500));
    const news = apiGetNews();
    const newItem = { ...item, id: Date.now() };
    const updated = [newItem, ...news];
    localStorage.setItem(LS_KEYS.news, JSON.stringify(updated));
    return newItem;
}

export async function apiDeleteNews(id: number): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    const news = apiGetNews();
    const updated = news.filter(n => n.id !== id);
    localStorage.setItem(LS_KEYS.news, JSON.stringify(updated));
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

export async function apiListSubmissions(settings: AppSettings, userId?: string): Promise<Submission[]> {
  if (settings.mode === "mock") {
    await new Promise((r) => setTimeout(r, 400)); // Simulate latency
    const all = loadSubmissions();
    // If no userId provided, it might be admin viewing all, 
    // BUT usually we filter by user in the UI for normal users.
    // The Service simply returns filtered if requested.
    if (userId) {
        return all.filter(s => s.userId === userId);
    }
    return all;
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

export async function apiDeleteSubmission(settings: AppSettings, id: string): Promise<void> {
  if (settings.mode === "mock") {
    await new Promise((r) => setTimeout(r, 500));
    const all = loadSubmissions();
    const filtered = all.filter((x) => x.id !== id);
    saveSubmissions(filtered);
    return;
  }

  if (!settings.apiBaseUrl) throw new Error("กรุณาตั้งค่า Base URL ของ API ก่อน");
  await fetchWithBackoff(`${settings.apiBaseUrl}/submissions/${id}`, {
    method: "DELETE",
  });
}