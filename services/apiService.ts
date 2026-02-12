import { AppSettings, Submission, UserProfile, NewsItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import { PR_NEWS } from '../constants';

// --- Helper Types for DB Mapping ---
const mapSubmissionFromDB = (data: any): Submission => ({
    id: data.id,
    userId: data.user_id,
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
    audit: data.audit || []
});

const mapProfileFromDB = (data: any): UserProfile => ({
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    organization: data.organization,
    position: data.position,
    role: data.role
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

export async function apiRegisterUser(user: UserProfile, password?: string): Promise<UserProfile> {
    const finalPassword = password || 'password123';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: finalPassword,
        options: {
            data: {
                first_name: user.firstName,
                last_name: user.lastName
            }
        }
    });

    if (authError) {
        console.error("Supabase Auth Error:", authError);
        // Translate common Supabase errors to Thai
        if (authError.message.includes('already registered')) {
            throw new Error("อีเมลนี้ถูกลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบ");
        }
        if (authError.message.includes('security purposes')) {
            throw new Error("กรุณารอสักครู่แล้วลองใหม่ (ติด Rate Limit ของ Supabase)");
        }
        if (authError.message.includes('Email signups are disabled')) {
            throw new Error("ระบบปิดรับสมัครผ่านอีเมล (กรุณาเปิด Enable Email Provider ใน Supabase)");
        }
        if (authError.message.includes('Password should be')) {
            throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        }
        throw new Error(authError.message);
    }
    
    if (!authData.user) throw new Error("ไม่สามารถสร้างผู้ใช้งานได้");

    const profilePayload = {
        id: authData.user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        position: user.position,
        role: 'user'
    };

    const { error: dbError } = await supabase
        .from('profiles')
        .insert([profilePayload])
        .select()
        .single();

    if (dbError) {
        if (dbError.code === '23505') { // Unique violation
             const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
             
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
    // Admin/Reviewer Mock Logic
    if (email === 'admin' && password === 'admin123') {
        const admin: UserProfile = { id: 'admin_mock', firstName: 'System', lastName: 'Administrator', email: 'admin@skms.go.th', role: 'admin', position: 'IT Admin', organization: 'SSJ Satun' };
        localStorage.setItem("svk_supabase_user", JSON.stringify(admin));
        return admin;
    }
    if (email === 'reviewer' && password === 'review123') {
        const reviewer: UserProfile = { id: 'reviewer_mock', firstName: 'กรรมการ', lastName: 'ผู้ทรงคุณวุฒิ', email: 'committee@skms.go.th', role: 'reviewer', position: 'Senior Expert', organization: 'Ministry of Public Health' };
        localStorage.setItem("svk_supabase_user", JSON.stringify(reviewer));
        return reviewer;
    }

    const finalPassword = password || 'password123';

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: finalPassword,
    });

    if (error) {
         if (error.message.includes('Invalid login')) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
         if (error.message.includes('Email not confirmed')) throw new Error("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (หรือปิด Confirm Email ใน Supabase)");
         throw new Error(error.message);
    }
    
    if (!data.user) throw new Error("ไม่พบผู้ใช้งาน");

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profileData) throw new Error("ไม่พบข้อมูลโปรไฟล์ (Profile Missing)");

    const userProfile = mapProfileFromDB(profileData);
    localStorage.setItem("svk_supabase_user", JSON.stringify(userProfile));
    
    return userProfile;
}

// --- News Management ---
export function apiGetNews(): NewsItem[] { return PR_NEWS; }
export async function apiFetchNewsAsync(): Promise<NewsItem[]> {
    const { data, error } = await supabase.from('news').select('*').order('id', { ascending: false });
    if (error) { console.error(error); return PR_NEWS; }
    return data.map((d: any) => ({
        id: d.id, title: d.title, date: d.date, desc: d.desc, type: d.type as 'news'|'download', imageUrl: d.image_url, fileType: d.file_type
    }));
}
export async function apiAddNews(item: Omit<NewsItem, 'id'>): Promise<NewsItem> {
    const payload = { title: item.title, date: item.date, desc: item.desc, type: item.type, image_url: item.imageUrl || null, file_type: item.fileType || null };
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
    if (userId && !userId.startsWith('admin_') && !userId.startsWith('reviewer_')) { query = query.eq('user_id', userId); }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(mapSubmissionFromDB);
}

export async function apiCreateSubmission(settings: AppSettings, payload: Submission): Promise<Submission> {
    const dbPayload = {
        user_id: payload.userId, budget_year: payload.budgetYear, first_name: payload.firstName, last_name: payload.lastName,
        email: payload.email, phone: payload.phone, position: payload.position, organization: payload.organization,
        work_type: payload.workType, branch_id: payload.branchId, file_url: payload.fileUrl, file_name: payload.fileName,
        status: payload.status, audit: payload.audit
    };
    const { data, error } = await supabase.from('submissions').insert([dbPayload]).select().single();
    if (error) throw new Error(error.message);
    return mapSubmissionFromDB(data);
}

export async function apiUpdateSubmission(settings: AppSettings, id: string, patch: Partial<Submission>): Promise<Submission> {
    const dbPatch: any = { updated_at: new Date().toISOString() };
    
    // Status & Audit
    if (patch.status) dbPatch.status = patch.status;
    if (patch.audit) dbPatch.audit = patch.audit;

    // Personal Info
    if (patch.firstName) dbPatch.first_name = patch.firstName;
    if (patch.lastName) dbPatch.last_name = patch.lastName;
    if (patch.position) dbPatch.position = patch.position;
    if (patch.organization) dbPatch.organization = patch.organization;
    if (patch.email) dbPatch.email = patch.email;
    if (patch.phone) dbPatch.phone = patch.phone;

    // Work Info
    if (patch.workType) dbPatch.work_type = patch.workType;
    if (patch.branchId) dbPatch.branch_id = patch.branchId;
    if (patch.fileUrl) dbPatch.file_url = patch.fileUrl;
    if (patch.fileName) dbPatch.file_name = patch.fileName;

    const { data, error } = await supabase.from('submissions').update(dbPatch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapSubmissionFromDB(data);
}

export async function apiDeleteSubmission(settings: AppSettings, id: string): Promise<void> {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw new Error(error.message);
}