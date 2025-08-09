// api/bot1.js
export const config = {
  api: { bodyParser: false },
};

import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  // читаем тело запроса вручную
  const buf = await new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });

  let update;
  try {
    update = JSON.parse(buf);
  } catch {
    return res.status(400).send("Bad Request");
  }

  if (update.message) {
    const chatId = update.message.chat.id;
    const username = update.message.from.username || "unknown";
    const text = update.message.text || "";

    // Пересылаем во второго бота
    await fetch(`https://api.telegram.org/bot${process.env.BOT2_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.MY_TELEGRAM_ID, // твой Telegram ID
        text: `📩 От @${username} (ID: ${chatId}):\n${text}`
      }),
    });
  }

  return res.status(200).send("ok");
}
