import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Telegram Webhook / Notify Endpoint
  app.post('/api/notify-telegram', async (req, res) => {
    try {
      const { text, reply_markup } = req.body;
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('Telegram not configured, skipping notification.');
        return res.status(200).json({ status: 'skipped', reason: 'Not configured' });
      }

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          reply_markup: reply_markup,
        }),
      });

      const data = await response.json();
      res.json({ status: 'ok', data });
    } catch (error) {
      console.error('Telegram Notify Error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/admin/reset-password', async (req, res) => {
    try {
      const { targetUserId, newPassword } = req.body;
      const url = process.env.VITE_SUPABASE_URL || 'https://qjkdjwqgnvfcfjsxjjpu.supabase.co';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        return res.status(500).json({ error: 'ไม่พบ SUPABASE_SERVICE_ROLE_KEY หรือ SUPABASE_URL กรุณาตรวจสอบการตั้งค่า Secret' });
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ status: 'ok', data });
    } catch (error) {
      console.error('Password Reset Error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const cron = await import('node-cron');
  const sendTelegramDirectly = async (text: string) => {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
      });
    } catch (err) {
      console.error('Cron Telegram error', err);
    }
  };

  app.post('/api/admin-delete-user', async (req, res) => {
      try {
          const url = process.env.VITE_SUPABASE_URL || 'https://qjkdjwqgnvfcfjsxjjpu.supabase.co';
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!url || !key) return res.status(500).json({ error: 'ไม่พบ SUPABASE_SERVICE_ROLE_KEY กรุณาเพิ่ม Environment Variable ในการตั้งค่า (Settings)' });
          
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
          
          const { targetUserId } = req.body;
          if (!targetUserId) return res.status(400).json({ error: 'Missing targetUserId' });

          // Delete from auth.users (this should cascade to profiles if DB is set up with cascading deletes, otherwise delete profiles first)
          await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
          const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
          
          if (error) {
              return res.status(400).json({ error: error.message });
          }
          res.json({ success: true });
      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  });

  cron.schedule('0 17 * * *', async () => {
    try {
      const url = process.env.VITE_SUPABASE_URL || 'https://qjkdjwqgnvfcfjsxjjpu.supabase.co';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return;

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
      const now = new Date();
      now.setHours(now.getHours() + 7); 
      const todayString = now.toISOString().split('T')[0]; // BKK date string

      const startOfDay = new Date(`${todayString}T00:00:00+07:00`).toISOString();
      const endOfDay = new Date(`${todayString}T23:59:59+07:00`).toISOString();

      // Use a basic direct query to get all submissions created today
      const { data, error } = await supabaseAdmin.from('submissions').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay);
      if (error || !data) return;

      // Get cumulative submissions
      const { data: allData, error: allError } = await supabaseAdmin.from('submissions').select('*');
      if (allError || !allData) return;

      const totalSubmissions = allData.length;
      const uniqueTypes = new Set(allData.map(s => s.work_type).filter(Boolean)).size;
      const uniqueBranches = new Set(allData.map(s => s.branch_id).filter(Boolean)).size;

      const newUsersCount = data.length;
      if (newUsersCount === 0) {
          await sendTelegramDirectly(`📊 <b>สรุปรายงานประจำวันที่ ${todayString}</b>\n\nยังไม่มีผู้ส่งผลงานใหม่ในวันนี้\n\n<b>สรุปยอดสะสมในระบบ:</b>\n- จำนวนผลงานทั้งหมด: ${totalSubmissions} ผลงาน\n- หมวดหมู่ประเภท: ${uniqueTypes} ประเภท\n- สาขาการประกวด: ${uniqueBranches} สาขา`);
          return;
      }

      // We need constants for labels
      const WORK_TYPES: Record<string, string> = {
        "oral": "ประเภทวาจา (Oral Presentation)",
        "eposter": "ประเภท E-poster",
        "innovation": "ประเภทนวัตกรรมและสิ่งประดิษฐ์"
      };
      
      const BRANCHES: Record<string, string> = {
        "1": "การแพทย์ทั่วไป", "2": "การแพทย์เฉพาะ", "3": "ทันตสาธารณสุข",
        "4": "เภสัชกรรมและการคุ้มครองผู้บริโภค", "5": "การพยาบาลระดับปฐมภูมิ ทุติยภูมิ",
        "6": "การพยาบาลระดับตติยภูมิ (ระดับ S+A)", "7": "การบริหารการพยาบาล",
        "8": "งานวิทยาศาสตร์การแพทย์ฯ", "9": "สหเวชศาสตร์",
        "10": "การแพทย์แผนไทยและการแพทย์ทางเลือก", "11": "การส่งเสริมสุขภาพและอนามัยสิ่งแวดล้อม",
        "12": "การป้องกันและควบคุมโรค", "13": "สุขภาพจิต ยาเสพติด",
        "14": "บริหารสาธารณสุขฯ", "15": "ดิจิทัลสุขภาพ"
      };

      const typeCount: Record<string, number> = {};
      const branchCount: Record<string, number> = {};

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

      const msg = `📊 <b>สรุปรายงานผู้ส่งผลงานประจำวันที่ ${todayString}</b>\n\n` +
                  `👥 <b>ผู้ส่งผลงานใหม่วันนี้:</b> ${newUsersCount} ราย\n\n` +
                  `🏷️ <b>แยกตามประเภทผลงาน:</b>\n${typeMsg}\n` +
                  `📂 <b>แยกตามสาขาการประกวด:</b>\n${branchMsg}\n` +
                  `📈 <b>สรุปยอดสะสมในระบบ:</b>\n` +
                  `- ผลงานทั้งหมด: ${totalSubmissions} ผลงาน\n` +
                  `- ครอบคลุมประเภท: ${uniqueTypes} ประเภท\n` +
                  `- ครอบคลุมสาขา: ${uniqueBranches} สาขา`;
      
      await sendTelegramDirectly(msg);
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  }, { timezone: "Asia/Bangkok" });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
