import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return res.status(500).json({ error: 'Supabase admin keys missing' });
        
        const supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'Missing targetUserId' });

        await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
