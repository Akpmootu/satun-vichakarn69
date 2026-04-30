export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    try {
      const { text, reply_markup } = req.body;
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;

      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
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
      res.status(500).json({ error: String(error) });
    }
}
