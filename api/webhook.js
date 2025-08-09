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
    const chatId = String(update.message.chat.id);
    const text = update.message.text || "";
    const firstName = update.message.from.first_name || "";
    const username = update.message.from.username || "";

    // Только владелец может использовать /reply
    if (chatId === process.env.MY_TELEGRAM_ID && text.startsWith("/reply ")) {
      const parts = text.split(" ");
      const targetId = parts[1];
      const replyText = parts.slice(2).join(" ");

      if (!targetId || !replyText) {
        await sendMessage(chatId, "⚠ Формат: /reply <chat_id> <текст>");
      } else {
        await sendMessage(targetId, replyText);
        await sendMessage(chatId, `✅ Сообщение отправлено пользователю ${targetId}`);
      }
      return res.status(200).send("ok");
    }

    // Любое сообщение от пользователя пересылается владельцу
    if (chatId !== process.env.MY_TELEGRAM_ID) {
      await sendMessage(
        process.env.MY_TELEGRAM_ID,
        `📨 Сообщение от ${firstName} (@${username || "нет"})\nID: ${chatId}\nТекст: ${text}`
      );
    }
  }

  return res.status(200).send("ok");
}

// Функция отправки сообщения
async function sendMessage(chatId, text) {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
