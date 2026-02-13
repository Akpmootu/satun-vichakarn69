
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
    level: data.level, 
    role: data.role || 'user',
    avatarUrl: data.avatar_url || null // Map avatar_url
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

    const { data, error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        // Friendlier error message for schema mismatch
        if (error.message.includes("Could not find the 'level' column")) {
            throw new Error("ระบบฐานข้อมูลยังไม่อัปเดต (Missing Column: level) กรุณาติดต่อผู้ดูแลระบบ");
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
    // Define folder path for this user (User ID as folder name)
    const folderPath = userId;

    // 1. CLEANUP: Try to list and delete ALL existing files in this folder first
    try {
        const { data: existingFiles, error: listError } = await supabase.storage
            .from('avatars')
            .list(folderPath, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (listError) {
            console.warn("Avatar Cleanup: Could not list files (Check RLS Policy SELECT permission):", listError.message);
        } else if (existingFiles && existingFiles.length > 0) {
            // Filter out system placeholders if any
            const filesToRemove = existingFiles
                .filter(x => x.name !== '.emptyFolderPlaceholder')
                .map(x => `${folderPath}/${x.name}`);

            if (filesToRemove.length > 0) {
                // console.log("Avatar Cleanup: Deleting old files:", filesToRemove);
                const { error: removeError } = await supabase.storage
                    .from('avatars')
                    .remove(filesToRemove);
                
                if (removeError) console.error("Avatar Cleanup: Delete failed:", removeError.message);
            }
        }
    } catch (cleanupEx) {
        console.error("Avatar Cleanup Exception:", cleanupEx);
        // Continue to upload even if cleanup fails
    }

    // 2. PREPARE: New filename with timestamp to prevent browser caching
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

    // 3. UPLOAD: Upload new file
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
        });

    if (uploadError) throw new Error("Upload Failed: " + uploadError.message);

    // 4. URL: Get Public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
}

export async function apiRegisterUser(user: UserProfile, password?: string): Promise<UserProfile> {
    const finalPassword = password || 'password123';
    
    // 1. Sign up with Supabase Auth
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

    // 2. Insert extra details into 'profiles' table
    const profilePayload = {
        id: authData.user.id, // Link to auth.users.id
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        position: user.position,
        level: user.level || null, // Insert level
        role: 'user' // Default role is always user
    };

    const { error: dbError } = await supabase
        .from('profiles')
        .insert([profilePayload])
        .select()
        .single();

    if (dbError) {
        // Handle case where profile might already exist
        if (dbError.code === '23505') { 
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
    const finalPassword = password || 'password123';

    // 1. Authenticate with Supabase Auth
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

    // 2. Fetch Profile details
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profileData) {
        console.error("Profile missing for user:", data.user.id);
        throw new Error("ไม่พบข้อมูลโปรไฟล์ (Profile Missing) - กรุณาติดต่อผู้ดูแลระบบ");
    }

    const userProfile = mapProfileFromDB(profileData);
    
    // Save session
    localStorage.setItem("svk_supabase_user", JSON.stringify(userProfile));
    
    return userProfile;
}

// --- User Management API (Admin Only) ---
export async function apiGetAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true });
        
    if (error) throw new Error(error.message);
    return data.map(mapProfileFromDB);
}

export async function apiGetUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('first_name', { ascending: true });
        
    if (error) throw new Error(error.message);
    return data.map(mapProfileFromDB);
}

export async function apiUpdateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select();

    if (error) throw new Error(error.message);
    
    if (!data || data.length === 0) {
        throw new Error("RLS_BLOCK");
    }
}

// --- News Management ---
export function apiGetNews(): NewsItem[] { return PR_NEWS; } 
export async function apiFetchNewsAsync(): Promise<NewsItem[]> {
    const { data, error } = await supabase.from('news').select('*').order('id', { ascending: false });
    if (error) { console.error(error); return PR_NEWS; }
    
    return data.map((d: any) => ({
        id: d.id, 
        title: d.title, 
        date: d.date, 
        desc: d.desc, 
        type: d.type as 'news'|'download', 
        imageUrl: d.image_url, 
        fileType: d.file_type
    }));
}
export async function apiAddNews(item: Omit<NewsItem, 'id'>): Promise<NewsItem> {
    const payload = { 
        title: item.title, 
        date: item.date, 
        desc: item.desc, 
        type: item.type, 
        image_url: item.imageUrl || null, 
        file_type: item.fileType || null 
    };
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
    
    if (userId) { 
        query = query.eq('user_id', userId); 
    }
    
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
        audit: payload.audit
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

    const { data, error } = await supabase.from('submissions').update(dbPatch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapSubmissionFromDB(data);
}

export async function apiDeleteSubmission(settings: AppSettings, id: string): Promise<void> {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// --- Visitor Statistics Service ---
export function subscribeToVisitorPresence(onCountChange: (count: number) => void) {
    const channel = supabase.channel('visitor_presence');

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            onCountChange(count);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });

    return () => {
        supabase.removeChannel(channel);
    };
}

export async function apiRecordVisit(clientId: string, userId?: string) {
    try {
        await supabase.from('visitor_logs').insert([
            { 
                client_id: clientId, 
                user_id: userId || null,
                page_url: window.location.pathname
            }
        ]);
    } catch (e) {
        console.error("Error recording visit:", e);
    }
}

export async function apiGetVisitorStats(): Promise<Omit<VisitorStats, 'online'>> {
    try {
        const { data, error } = await supabase.rpc('get_visitor_stats');
        
        if (error) {
            console.error("Error fetching stats RPC:", error);
            return { today: 0, week: 0, month: 0, year: 0, total: 0 };
        }

        return {
            today: data.today || 0, // Mapped today
            week: data.week || 0,
            month: data.month || 0,
            year: data.year || 0,
            total: data.total || 0
        };
    } catch (e) {
        console.error("API Stats Error:", e);
        return { today: 0, week: 0, month: 0, year: 0, total: 0 };
    }
}
