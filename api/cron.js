import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
    
    // Allow triggering via Authorization header if needed, but usually Vercel crons are triggered by Vercel
    if (
        process.env.CRON_SECRET &&
        req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;

        if (!url || !key || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.status(500).json({ error: 'Missing environment variables' });
        }

        const supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        const now = new Date();
        now.setHours(now.getHours() + 7); 
        const todayString = now.toISOString().split('T')[0]; // BKK date string

        const startOfDay = new Date(`${todayString}T00:00:00+07:00`).toISOString();
        const endOfDay = new Date(`${todayString}T23:59:59+07:00`).toISOString();

        const { data, error } = await supabaseAdmin.from('submissions').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay);
        if (error || !data) return res.status(500).json({ error: error?.message || 'No data' });

        const newUsersCount = data.length;
        
        let msg = '';
        if (newUsersCount === 0) {
            msg = `📊 <b>สรุปรายงานประจำวันที่ ${todayString}</b>\n\nยังไม่มีผู้ส่งผลงานใหม่ในวันนี้`;
        } else {
            const WORK_TYPES = {
                "oral": "ประเภทวาจา (Oral Presentation)",
                "eposter": "ประเภท E-poster",
                "innovation": "ประเภทนวัตกรรมและสิ่งประดิษฐ์"
            };
            
            const BRANCHES = {
                "1": "การแพทย์ทั่วไป", "2": "การแพทย์เฉพาะ", "3": "ทันตสาธารณสุข",
                "4": "เภสัชกรรมและการคุ้มครองผู้บริโภค", "5": "การพยาบาลระดับปฐมภูมิ ทุติยภูมิ",
                "6": "การพยาบาลระดับตติยภูมิ (ระดับ S+A)", "7": "การบริหารการพยาบาล",
                "8": "งานวิทยาศาสตร์การแพทย์ฯ", "9": "สหเวชศาสตร์",
                "10": "การแพทย์แผนไทยและการแพทย์ทางเลือก", "11": "การส่งเสริมสุขภาพและอนามัยสิ่งแวดล้อม",
                "12": "การป้องกันและควบคุมโรค", "13": "สุขภาพจิต ยาเสพติด",
                "14": "บริหารสาธารณสุขฯ", "15": "ดิจิทัลสุขภาพ"
            };

            const typeCount = {};
            const branchCount = {};

            data.forEach(sub => {
                typeCount[sub.work_type] = (typeCount[sub.work_type] || 0) + 1;
                branchCount[sub.branch_id] = (branchCount[sub.branch_id] || 0) + 1;
            });

            let typeMsg = '';
            for (const [k, v] of Object.entries(typeCount)) {
                typeMsg += `- ${WORK_TYPES[k] || k}: ${v} ผลงาน\n`;
            }

            let branchMsg = '';
            for (const [k, v] of Object.entries(branchCount)) {
                branchMsg += `- ${BRANCHES[k] || k}: ${v} ผลงาน\n`;
            }

            msg = `📊 <b>สรุปรายงานผู้ส่งผลงานประจำวันที่ ${todayString}</b>\n\n` +
                        `👥 <b>ผู้ส่งผลงานใหม่วันนี้:</b> ${newUsersCount} ราย\n\n` +
                        `🏷️ <b>แยกตามประเภทผลงาน:</b>\n${typeMsg}\n` +
                        `📂 <b>แยกตามสาขาการประกวด:</b>\n${branchMsg}`;
        }

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: msg,
                parse_mode: 'HTML'
            }),
        });

        res.json({ success: true, result: await response.json() });
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}
