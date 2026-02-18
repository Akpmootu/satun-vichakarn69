
import { AppSettings, Submission, UserProfile, NewsItem, UserRole, VisitorStats } from '../types';
import { supabase } from '../lib/supabaseClient';
import { PR_NEWS } from '../constants';

// --- Helper Types for DB Mapping ---
const mapSubmissionFromDB = (data: any): Submission => ({
    id: data.id,
    userId: data.user_id,
    reviewerId: data.reviewer_id, 
    budgetYear: data.budget_year,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    position: data.position,
    organization: data.organization,
    workType: data.work_type,
    branchId: data.branch_id,
    fileUrl: data.file_url,
    fileName: data.file_name,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    audit: data.audit || [],
    coAuthors: data.co_authors || [] // Map JSONB
});

const mapProfileFromDB = (data: any): UserProfile => ({
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    organization: data.organization,
    position: data.position,
    level: data.level, 
    role: data.role || 'user',
    avatarUrl: data.avatar_url || null,
    addressInfo: data.address_info || {}, // Map JSONB
    educationHistory: data.education_history || [] // Map JSONB
});

// --- Auth Methods (Supabase Auth) ---

export function getCurrentUser(): UserProfile | null {
    const stored = localStorage.getItem("svk_supabase_user");
    return stored ? JSON.parse(stored) : null;
}

export function logoutUser() {
    supabase.auth.signOut();
    localStorage.removeItem("svk_supabase_user");
}

export async function apiGetUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw new Error(error.message);
    return mapProfileFromDB(data);
}

export async function apiUpdateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const dbPayload: any = {};
    
    // Check for undefined specifically to allow clearing values with empty strings
    if (updates.firstName !== undefined) dbPayload.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbPayload.last_name = updates.lastName;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.organization !== undefined) dbPayload.organization = updates.organization;
    if (updates.position !== undefined) dbPayload.position = updates.position;
    if (updates.level !== undefined) dbPayload.level = updates.level;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    
    // JSON Columns
    if (updates.addressInfo !== undefined) dbPayload.address_info = updates.addressInfo;
    if (updates.educationHistory !== undefined) dbPayload.education_history = updates.educationHistory;

    const { data, error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        if (error.message.includes("Could not find the 'level' column")) {
            throw new Error("ระบบฐานข้อมูลยังไม่อัปเดต (Missing Column) กรุณาติดต่อผู้ดูแลระบบ");
        }
        throw new Error(error.message);
    }
    
    const updatedProfile = mapProfileFromDB(data);
    localStorage.setItem("svk_supabase_user", JSON.stringify(updatedProfile)); // Update local storage
    return updatedProfile;
}

export async function apiChangePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
}

export async function apiUploadAvatar(userId: string, file: File): Promise<string> {
    const folderPath = userId;
    try {
        const { data: existingFiles } = await supabase.storage.from('avatars').list(folderPath);
        if (existingFiles && existingFiles.length > 0) {
            const filesToRemove = existingFiles
                .filter(x => x.name !== '.emptyFolderPlaceholder')
                .map(x => `${folderPath}/${x.name}`);
            if (filesToRemove.length > 0) {
                await supabase.storage.from('avatars').remove(filesToRemove);
            }
        }
    } catch (cleanupEx) { console.error(cleanupEx); }

    const fileExt = file.name.split('.').pop();
    const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

    if (uploadError) throw new Error("Upload Failed: " + uploadError.message);

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
}

export async function apiRegisterUser(user: UserProfile, password?: string): Promise<UserProfile> {
    const finalPassword = password || 'password123';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: finalPassword,
        options: {
            data: { first_name: user.firstName, last_name: user.lastName }
        }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("ไม่สามารถสร้างผู้ใช้งานได้");

    const profilePayload = {
        id: authData.user.id, 
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        position: user.position,
        level: user.level || null, 
        role: 'user',
        address_info: {},
        education_history: []
    };

    const { error: dbError } = await supabase.from('profiles').insert([profilePayload]).select().single();

    if (dbError) {
        if (dbError.code === '23505') { 
             const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
             if (existingProfile) {
                 const mapped = mapProfileFromDB(existingProfile);
                 localStorage.setItem("svk_supabase_user", JSON.stringify(mapped));
                 return mapped;
             }
        }
        throw new Error("บันทึกข้อมูลส่วนตัวไม่สำเร็จ: " + dbError.message);
    }

    const newUser = { ...user, id: authData.user.id, role: 'user' as const };
    localStorage.setItem("svk_supabase_user", JSON.stringify(newUser));
    return newUser;
}

export async function apiLoginUser(email: string, password?: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'password123',
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("ไม่พบผู้ใช้งาน");

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profileData) throw new Error("ไม่พบข้อมูลโปรไฟล์");

    const userProfile = mapProfileFromDB(profileData);
    localStorage.setItem("svk_supabase_user", JSON.stringify(userProfile));
    return userProfile;
}

// --- User Management API (Admin Only) ---
export async function apiGetAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*').order('first_name', { ascending: true });
    if (error) throw new Error(error.message);
    return data.map(mapProfileFromDB);
}

export async function apiGetUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', role).order('first_name', { ascending: true });
    if (error) throw new Error(error.message);
    return data.map(mapProfileFromDB);
}

export async function apiUpdateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const { data, error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId).select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("RLS_BLOCK");
}

// --- News Management ---
export function apiGetNews(): NewsItem[] { return PR_NEWS; } 
export async function apiFetchNewsAsync(): Promise<NewsItem[]> {
    const { data, error } = await supabase.from('news').select('*').order('id', { ascending: false });
    if (error) { return PR_NEWS; }
    return data.map((d: any) => ({
        id: d.id, title: d.title, date: d.date, desc: d.desc, type: d.type, imageUrl: d.image_url, fileType: d.file_type
    }));
}
export async function apiAddNews(item: Omit<NewsItem, 'id'>): Promise<NewsItem> {
    const payload = { title: item.title, date: item.date, desc: item.desc, type: item.type, image_url: item.imageUrl, file_type: item.fileType };
    const { data, error } = await supabase.from('news').insert([payload]).select().single();
    if (error) throw new Error(error.message);
    return { ...item, id: data.id };
}
export async function apiDeleteNews(id: number): Promise<void> {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// --- Settings Helpers ---
export function loadSettings(): AppSettings { return { mode: "real", apiBaseUrl: "SUPABASE" }; }
export function saveSettings(s: AppSettings) { /* No-op */ }
export function nowISO(): string { return new Date().toISOString(); }

// --- API Methods (Submissions) ---
export async function apiListSubmissions(settings: AppSettings, userId?: string): Promise<Submission[]> {
    let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId); 
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(mapSubmissionFromDB);
}

export async function apiCreateSubmission(settings: AppSettings, payload: Submission): Promise<Submission> {
    const dbPayload = {
        user_id: payload.userId, 
        reviewer_id: payload.reviewerId || null,
        budget_year: payload.budgetYear, 
        first_name: payload.firstName, 
        last_name: payload.lastName,
        email: payload.email, 
        phone: payload.phone, 
        position: payload.position, 
        organization: payload.organization,
        work_type: payload.workType, 
        branch_id: payload.branchId, 
        file_url: payload.fileUrl, 
        file_name: payload.fileName,
        status: payload.status, 
        audit: payload.audit,
        co_authors: payload.coAuthors || [] // JSONB
    };
    const { data, error } = await supabase.from('submissions').insert([dbPayload]).select().single();
    if (error) throw new Error(error.message);
    return mapSubmissionFromDB(data);
}

export async function apiUpdateSubmission(settings: AppSettings, id: string, patch: Partial<Submission>): Promise<Submission> {
    const dbPatch: any = { updated_at: new Date().toISOString() };
    if (patch.status) dbPatch.status = patch.status;
    if (patch.audit) dbPatch.audit = patch.audit;
    if (patch.reviewerId !== undefined) dbPatch.reviewer_id = patch.reviewerId;
    if (patch.firstName) dbPatch.first_name = patch.firstName;
    if (patch.lastName) dbPatch.last_name = patch.lastName;
    if (patch.position) dbPatch.position = patch.position;
    if (patch.organization) dbPatch.organization = patch.organization;
    if (patch.email) dbPatch.email = patch.email;
    if (patch.phone) dbPatch.phone = patch.phone;
    if (patch.workType) dbPatch.work_type = patch.workType;
    if (patch.branchId) dbPatch.branch_id = patch.branchId;
    if (patch.fileUrl) dbPatch.file_url = patch.fileUrl;
    if (patch.fileName) dbPatch.file_name = patch.fileName;
    if (patch.coAuthors) dbPatch.co_authors = patch.coAuthors; // Update Co-Authors

    const { data, error } = await supabase.from('submissions').update(dbPatch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapSubmissionFromDB(data);
}

export async function apiDeleteSubmission(settings: AppSettings, id: string): Promise<void> {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// --- Visitor Statistics Service ---

// 1. Presence (Who is online right now)
export function subscribeToVisitorPresence(onCountChange: (count: number) => void) {
    const channel = supabase.channel('visitor_presence');
    channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            onCountChange(count);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
        });
    return () => { supabase.removeChannel(channel); };
}

// 2. Persistent Stats (Listen to DB inserts)
export function subscribeToStatsUpdates(onUpdate: (stats: Omit<VisitorStats, 'online'>) => void) {
    const channel = supabase
      .channel('visitor_stats_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visitor_logs' },
        async () => {
            // When a new log is inserted, re-fetch the aggregated stats
            const stats = await apiGetVisitorStats();
            onUpdate(stats);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
}

export async function apiRecordVisit(clientId: string, userId?: string) {
    try { await supabase.from('visitor_logs').insert([{ client_id: clientId, user_id: userId || null, page_url: window.location.pathname }]); } catch (e) { console.error(e); }
}

export async function apiGetVisitorStats(): Promise<Omit<VisitorStats, 'online'>> {
    try {
        const now = new Date();
        const getISO = (d: Date) => d.toISOString();

        // 1. Start of Day (Today 00:00:00)
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 2. Start of Week (Sunday 00:00:00)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        // 3. Start of Month (1st of current month)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // 4. Start of Year (1st Jan of current year)
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Execute counts in parallel using Supabase Count Option
        const [totalRes, yearRes, monthRes, weekRes, dayRes] = await Promise.all([
            supabase.from('visitor_logs').select('*', { count: 'exact', head: true }),
            supabase.from('visitor_logs').select('*', { count: 'exact', head: true }).gte('created_at', getISO(startOfYear)),
            supabase.from('visitor_logs').select('*', { count: 'exact', head: true }).gte('created_at', getISO(startOfMonth)),
            supabase.from('visitor_logs').select('*', { count: 'exact', head: true }).gte('created_at', getISO(startOfWeek)),
            supabase.from('visitor_logs').select('*', { count: 'exact', head: true }).gte('created_at', getISO(startOfDay))
        ]);

        return { 
            today: dayRes.count || 0, 
            week: weekRes.count || 0, 
            month: monthRes.count || 0, 
            year: yearRes.count || 0, 
            total: totalRes.count || 0 
        };
    } catch (e) { 
        console.error("Exception fetching stats:", e);
        return { today: 0, week: 0, month: 0, year: 0, total: 0 }; 
    }
}
