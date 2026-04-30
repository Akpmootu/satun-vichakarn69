
import { AppSettings, Submission, UserProfile, NewsItem, UserRole, VisitorStats, ReviewerScore } from '../types';
import { supabase } from '../lib/supabaseClient';
import { PR_NEWS, BRANCHES, WORK_TYPES } from '../constants';

// --- Helper Types for DB Mapping ---
const mapSubmissionFromDB = (data: any): Submission => ({
    id: data.id,
    userId: data.user_id,
    reviewerId: data.reviewer_id, 
    reviewerIds: data.reviewer_ids || [],
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
    coAuthors: data.co_authors || [], // Map JSONB
    authorPhoto: data.author_photo || null // Map Author Photo
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
    addressInfo: data.address_info || {}, 
    educationHistory: data.education_history || [],
    isVerified: data.is_verified || false,
    verifiedBy: data.verified_by || undefined,
    verifiedAt: data.verified_at || undefined,
    createdAt: data.created_at || new Date().toISOString(),
    prefix: data.prefix,
    branchId: data.branch_id,
    committeeRole: data.committee_role
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

    if (updates.prefix !== undefined) dbPayload.prefix = updates.prefix;
    if (updates.branchId !== undefined) dbPayload.branch_id = updates.branchId;
    if (updates.committeeRole !== undefined) dbPayload.committee_role = updates.committeeRole;

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
        role: user.role || 'user',
        avatar_url: user.avatarUrl || null,
        address_info: user.addressInfo || {},
        education_history: user.educationHistory || [],
        prefix: user.prefix,
        branch_id: user.branchId,
        committee_role: user.committeeRole
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
    let finalEmail = email.trim();
    if (!finalEmail.includes('@')) {
        finalEmail = `${finalEmail}@skms-reviewer.local`;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: password || 'password123',
    });

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            throw new Error('อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
        }
        throw new Error(error.message);
    }
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

export async function apiUpdateUserPasswordAdmin(userId: string, newPassword?: string): Promise<void> {
    const passwordToSet = newPassword || 'Satun@2569';
    try {
        const res = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId: userId, newPassword: passwordToSet })
        });
        const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
        if (!res.ok) {
            throw new Error(data.error || 'Failed to reset password');
        }
    } catch (e: any) {
        if (e.message.includes('Failed to fetch')) {
            throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต)');
        }
        throw new Error(e.message || 'Failed to connect to reset password service');
    }
}

export async function apiUpdateUserProfileAdmin(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const dbPayload: any = {};
    if (updates.firstName !== undefined) dbPayload.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbPayload.last_name = updates.lastName;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.organization !== undefined) dbPayload.organization = updates.organization;
    if (updates.position !== undefined) dbPayload.position = updates.position;
    if (updates.level !== undefined) dbPayload.level = updates.level;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (updates.prefix !== undefined) dbPayload.prefix = updates.prefix;
    if (updates.branchId !== undefined) dbPayload.branch_id = updates.branchId;
    if (updates.committeeRole !== undefined) dbPayload.committee_role = updates.committeeRole;
    if (updates.isVerified !== undefined) {
        dbPayload.is_verified = updates.isVerified;
        if (updates.isVerified && updates.verifiedBy) {
            dbPayload.verified_by = updates.verifiedBy;
            dbPayload.verified_at = new Date().toISOString();
        } else if (!updates.isVerified) {
            dbPayload.verified_by = null;
            dbPayload.verified_at = null;
        }
    }
    
    const { error } = await supabase.from('profiles').update(dbPayload).eq('id', userId);
    if (error) throw new Error(error.message);
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
export async function apiUpdateNews(id: number, item: Partial<NewsItem>): Promise<void> {
    const payload: any = {};
    if (item.title) payload.title = item.title;
    if (item.desc) payload.desc = item.desc;
    if (item.type) payload.type = item.type;
    if (item.imageUrl !== undefined) payload.image_url = item.imageUrl;
    if (item.fileType !== undefined) payload.file_type = item.fileType;

    const { error } = await supabase.from('news').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function apiDeleteNews(id: number): Promise<void> {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function apiDeleteUserProfile(userId: string): Promise<void> {
    const res = await fetch(`/api/admin/delete-user/${userId}`, {
        method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
    }
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

export async function apiSearchUsers(queryText: string): Promise<UserProfile[]> {
    if (!queryText || queryText.trim() === '') return [];
    const search = queryText.trim();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .limit(10);
    
    if (error) {
        console.error("apiSearchUsers Error:", error);
        return [];
    }
    return data ? data.map(mapProfileFromDB) : [];
}

export async function apiCheckTitleUnique(title: string, excludeSubmissionId?: string): Promise<boolean> {
    let query = supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('file_name', title);
    if (excludeSubmissionId) {
        query = query.neq('id', excludeSubmissionId);
    }
    const { count, error } = await query;
    if (error) {
        console.error("apiCheckTitleUnique Error:", error);
        return true; 
    }
    return count === 0;
}

async function notifyTelegram(message: string, url?: string) {
    try {
        const payload: any = { text: message };
        if (url) {
            payload.reply_markup = {
                inline_keyboard: [[{ text: "👉 ไปยังระบบหลังบ้าน", url: url }]]
            };
        }
        const res = await fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            console.warn("Telegram notification API returned non-OK status");
        }
    } catch (e: any) {
        if (e && e.message && e.message.includes('Failed to fetch')) {
            console.error("Telegram notification failed: Could not connect to the backend API.");
        } else {
            console.error("Telegram notification failed:", e);
        }
    }
}

export async function apiCreateSubmission(settings: AppSettings, payload: Submission): Promise<Submission> {
    const dbPayload = {
        user_id: payload.userId, 
        reviewer_id: payload.reviewerId || null,
        reviewer_ids: payload.reviewerIds || [],
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
        co_authors: payload.coAuthors || [], // JSONB
        author_photo: payload.authorPhoto || null // New Field
    };
    const { data, error } = await supabase.from('submissions').insert([dbPayload]).select().single();
    if (error) throw new Error(error.message);
    
    const newSubData = mapSubmissionFromDB(data);

    // Send Telegram Notification
    try {
        const branchName = BRANCHES.find((b: any) => b.id.toString() === newSubData.branchId?.toString())?.label || newSubData.branchId || '-';
        const workTypeName = WORK_TYPES.find((w: any) => w.id === newSubData.workType)?.label || newSubData.workType || '-';
        
        let userLevel = '';
        if (newSubData.userId) {
            const { data: userProfile } = await supabase.from('profiles').select('level').eq('id', newSubData.userId).single();
            if (userProfile && userProfile.level) {
                userLevel = ` ระดับ ${userProfile.level}`;
            }
        }

        notifyTelegram(
            `<b>มีการลงทะเบียนส่งผลงาน</b>\n` +
            `<b>ชื่อเรื่องผลงาน:</b> ${newSubData.fileName || '-'}\n` +
            `<b>เบอร์โทรศัพท์ ของผู้ส่งผลงาน:</b> ${newSubData.phone || '-'}\n` +
            `<b>หน่วยงาน/สังกัด ของผู้ส่งผลงาน:</b> ${newSubData.organization || '-'}\n` +
            `<b>ตำแหน่ง ของผู้ส่งผลงาน:</b> ${newSubData.position || '-'}${userLevel}\n` +
            `<b>ประเภท ของการส่งเข้าประกวด:</b> ${workTypeName}\n` +
            `<b>สาขา ที่ส่งเข้าประกวด:</b> ${branchName}`,
            `https://moph.link/stnvichakarn69`
        );
    } catch(e) {
        console.error('Error sending telegram notify', e);
    }

    return newSubData;
}

export async function apiUpdateSubmission(settings: AppSettings, id: string, patch: Partial<Submission>): Promise<Submission> {
    const dbPatch: any = { updated_at: new Date().toISOString() };
    if (patch.status) dbPatch.status = patch.status;
    if (patch.audit) dbPatch.audit = patch.audit;
    if (patch.reviewerId !== undefined) dbPatch.reviewer_id = patch.reviewerId;
    if (patch.reviewerIds !== undefined) dbPatch.reviewer_ids = patch.reviewerIds;
    if (patch.firstName) dbPatch.first_name = patch.firstName;
    if (patch.lastName) dbPatch.last_name = patch.lastName;
    if (patch.position) dbPatch.position = patch.position;
    if (patch.organization) dbPatch.organization = patch.organization;
    if (patch.email) dbPatch.email = patch.email;
    if (patch.phone) dbPatch.phone = patch.phone;
    if (patch.workType) dbPatch.work_type = patch.workType;
    if (patch.branchId) dbPatch.branch_id = patch.branchId;
    if (patch.fileUrl !== undefined) dbPatch.file_url = patch.fileUrl;
    if (patch.fileName !== undefined) dbPatch.file_name = patch.fileName;
    if (patch.coAuthors !== undefined) dbPatch.co_authors = patch.coAuthors;
    if (patch.authorPhoto !== undefined) dbPatch.author_photo = patch.authorPhoto; // Update Photo

    const { data, error } = await supabase.from('submissions').update(dbPatch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    
    const updatedSub = mapSubmissionFromDB(data);

    // Telegram Notification if status changed
    if (patch.status) {
        let statusEmoji = '🔄';
        let statusWord: string = patch.status;
        if (patch.status === 'accepted') { statusEmoji = '✅'; statusWord = 'ยืนยันเอกสารครบถ้วน'; }
        if (patch.status === 'rejected') { statusEmoji = '❌'; statusWord = 'ปฏิเสธ/ตีตก';}
        if (patch.status === 'revision_requested') { statusEmoji = '⚠️'; statusWord = 'ปลดล็อคให้แก้ไขข้อมูล'; }
        if (patch.status === 'scored') { statusEmoji = '🌟'; statusWord = 'ให้คะแนนประเมินแล้ว'; }
        if (patch.status === 'reviewed') { statusEmoji = '🔍'; statusWord = 'กำลังตรวจสอบ (รับเรื่อง)'; }
        
        const branchName = BRANCHES.find((b: any) => b.id.toString() === updatedSub.branchId?.toString())?.label || updatedSub.branchId || '-';
        const workTypeName = WORK_TYPES.find((w: any) => w.id === updatedSub.workType)?.label || updatedSub.workType || '-';
        const filePayload = updatedSub.fileUrl ? (() => { try { const arr = JSON.parse(updatedSub.fileUrl); return arr.map((a: any) => `<a href="${a.value}">${a.name}</a>`).join(', '); } catch { return updatedSub.fileUrl; } })() : '-';
        notifyTelegram(
            `${statusEmoji} <b>อัปเดตสถานะผลงาน</b>\n\n` +
            `📌 <b>ชื่อเรื่องผลงาน:</b> ${updatedSub.fileName || '-'}\n` +
            `📞 <b>เบอร์โทรศัพท์:</b> ${updatedSub.phone || '-'}\n` +
            `🏢 <b>หน่วยงาน/สังกัด:</b> ${updatedSub.organization || '-'}\n` +
            `💼 <b>ตำแหน่ง:</b> ${updatedSub.position || '-'}\n` +
            `🏷️ <b>ประเภทผลงาน:</b> ${workTypeName}\n` +
            `📂 <b>สาขาการประกวด:</b> ${branchName}\n` +
            `📎 <b>ไฟล์แนบผลงาน:</b> ${filePayload}\n` +
            `🔔 <b>สถานะใหม่:</b> ${statusWord}`,
            `https://moph.link/stnvichakarn69`
        );
    }

    return updatedSub;
}

// --- Reviewer Scoring API ---
const mapReviewerScoreFromDB = (data: any): ReviewerScore => ({
    id: data.id,
    submissionId: data.submission_id,
    reviewerId: data.reviewer_id,
    workType: data.work_type,
    scoreData: data.score_data || {},
    totalScore: data.total_score,
    createdAt: data.created_at
});

export async function apiGetAllScores(): Promise<ReviewerScore[]> {
    const { data, error } = await supabase.from('submission_scores').select('*');
    if (error) {
        console.error("No scores table or error", error);
        return [];
    }
    return data.map(mapReviewerScoreFromDB);
}

export async function apiGetScoresForSubmission(submissionId: string): Promise<ReviewerScore[]> {
    const { data, error } = await supabase.from('submission_scores').select('*').eq('submission_id', submissionId);
    if (error) {
        console.error("No scores table or error", error);
        return [];
    }
    return data.map(mapReviewerScoreFromDB);
}

export async function apiGetScoresByReviewer(reviewerId: string): Promise<ReviewerScore[]> {
    const { data, error } = await supabase.from('submission_scores').select('*').eq('reviewer_id', reviewerId);
    if (error) return [];
    return data.map(mapReviewerScoreFromDB);
}

export async function apiSubmitFeedback(userId: string, rating: number, ratingEase: number, ratingDesign: number, ratingContent: number, comment: string): Promise<void> {
    const { error } = await supabase.from('app_feedbacks').insert([{
        user_id: userId,
        rating,
        rating_ease: ratingEase,
        rating_design: ratingDesign,
        rating_content: ratingContent,
        comment
    }]);
    if (error) throw new Error(error.message);
}

export async function apiGetFeedbacks(): Promise<import('../types').AppFeedback[]> {
    const { data, error } = await supabase.from('app_feedbacks').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data.map(db => ({
        id: db.id,
        userId: db.user_id,
        rating: db.rating,
        ratingEase: db.rating_ease,
        ratingDesign: db.rating_design,
        ratingContent: db.rating_content,
        comment: db.comment,
        createdAt: db.created_at
    }));
}

export async function apiSaveReviewerScore(payload: Omit<ReviewerScore, 'id' | 'createdAt'>): Promise<ReviewerScore> {
    const dbPayload = {
        submission_id: payload.submissionId,
        reviewer_id: payload.reviewerId,
        work_type: payload.workType,
        score_data: payload.scoreData,
        total_score: payload.totalScore
    };
    
    // Upsert logic (checking if exists first to avoid complex on_conflict if not configured)
    const { data: existing } = await supabase
        .from('submission_scores')
        .select('id')
        .eq('submission_id', payload.submissionId)
        .eq('reviewer_id', payload.reviewerId)
        .single();
        
    let result;
    if (existing) {
        const { data, error } = await supabase
            .from('submission_scores')
            .update(dbPayload)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        result = data;
    } else {
        const { data, error } = await supabase
            .from('submission_scores')
            .insert([dbPayload])
            .select()
            .single();
        if (error) throw new Error(error.message);
        result = data;
    }
    
    return mapReviewerScoreFromDB(result);
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
