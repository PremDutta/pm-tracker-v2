// Shared alert sender — used by both the job-scan agent and the weekly link
// health-check. sendAlert() delivers to every channel that has its secrets
// set, so env-var handling, message-length limits and per-channel failures
// live in one place:
//
//   Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//   WhatsApp: WHATSAPP_PHONE (with country code, e.g. +9198XXXXXXXX) +
//             CALLMEBOT_APIKEY, via CallMeBot's free personal WhatsApp API
//             (https://www.callmebot.com/blog/free-api-whatsapp-messages/)
//
// A channel failing never stops the others.

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  // Telegram caps messages at 4096 chars — trim defensively rather than fail the send
  const trimmed = text.length > 4000 ? text.slice(0, 3990) + '\n…(truncated)' : text;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: trimmed, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}: ${await res.text()}`);
  return true;
}

// CallMeBot takes the message as a GET query parameter, so long alerts are
// split on line breaks into chunks that stay inside URL length limits.
export function chunkText(text, max = 1500) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    const piece = line.length > max ? line.slice(0, max - 1) + '…' : line;
    if (current && current.length + 1 + piece.length > max) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// One CallMeBot request; retried once after a pause when rate-limited (it
// answers 503 "Too many requests" to calls a few seconds apart).
async function callMeBot(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const reply = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (res.status === 503 && attempt === 0) {
      await sleep(30000);
      continue;
    }
    // CallMeBot answers HTTP 200 with an HTML page for most errors (bad key,
    // number not activated), so check the body as well as the status.
    if (!res.ok || /error|invalid|not\s+(valid|activated|allowed)|too\s+many/i.test(reply)) {
      throw new Error(`WhatsApp (CallMeBot) HTTP ${res.status}: ${reply.slice(0, 200)}`);
    }
    return;
  }
}

export async function sendWhatsApp(text) {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return false;

  const chunks = chunkText(text, 2500);
  for (const [i, chunk] of chunks.entries()) {
    const body = chunks.length > 1 ? `(${i + 1}/${chunks.length}) ${chunk}` : chunk;
    await callMeBot(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(body)}&apikey=${encodeURIComponent(apikey)}`);
    if (i < chunks.length - 1) await sleep(10000);
  }
  return true;
}

export async function sendAlert(text) {
  const channels = [['Telegram', sendTelegram], ['WhatsApp', sendWhatsApp]];
  let delivered = 0;
  for (const [name, send] of channels) {
    try {
      if (await send(text)) {
        delivered++;
        console.log(`${name}: sent`);
      }
    } catch (err) {
      console.error(`${name} send failed:`, err.message);
    }
  }
  if (delivered === 0) console.log('Alerts: no channel delivered (set Telegram and/or WhatsApp secrets; see agent/README.md)');
  return delivered;
}
