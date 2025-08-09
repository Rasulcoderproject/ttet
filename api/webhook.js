export const config = {
  api: { bodyParser: false },
};

import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const buf = await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });

  let update;
  try {
    update = JSON.parse(buf.toString());
  } catch {
    return res.status(400).send("Bad JSON");
  }

  console.log("📩 Update:", update);

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    // Если сообщение пришло от тебя и начинается с /reply
    if (String(chatId) === process.env.MY_TELEGRAM_ID && text.startsWith("/reply ")) {
      const parts = text.split(" ");
      const targetId = parts[1];
      const replyText = parts.slice(2).join(" ");

      if (!targetId || !replyText) {
        await sendMessage(process.env.MY_TELEGRAM_ID, "⚠ Неверный формат. Пример: /reply 123456 Привет");
      } else {
        await sendMessage(targetId, replyText);
        await sendMessage(process.env.MY_TELEGRAM_ID, `✅ Отправлено пользователю ${targetId}`);
      }
      return res.status(200).send("ok");
    }

    // Если сообщение от обычного пользователя — пересылаем тебе
    await sendMessage(
      process.env.MY_TELEGRAM_ID,
      `📨 Сообщение от chat_id: ${chatId}\nТекст: ${text}`
    );
  }

  return res.status(200).send("ok");
}

async function sendMessage(chatId, text) {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
