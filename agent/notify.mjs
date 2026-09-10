// Shared Telegram sender — used by both the job-scan agent and the weekly
// link health-check, so the env-var handling and message-length trimming
// only lives in one place instead of being copy-pasted per script.

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('Telegram: skipped (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set)');
    return;
  }

  // Telegram caps messages at 4096 chars — trim defensively rather than fail the send
  const trimmed = text.length > 4000 ? text.slice(0, 3990) + '\n…(truncated)' : text;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: trimmed, disable_web_page_preview: true }),
  });
  if (!res.ok) console.error('Telegram send failed:', await res.text());
}
