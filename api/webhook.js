// api/webhook.js
export const config = {
  api: {
    bodyParser: false,
  },
};

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  try {
    const buf = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
    });

    let update;
    try {
      update = JSON.parse(buf.toString());
    } catch (err) {
      console.error("❌ Ошибка парсинга JSON:", err);
      return res.status(400).send("Bad Request");
    }

    console.log("📩 Update:", JSON.stringify(update, null, 2));

    if (update.message) {
      const chatId = update.message.chat.id;
      const username = update.message.from.username || "unknown";
      const firstName = update.message.from.first_name || "";
      const lastName = update.message.from.last_name || "";

      // Сохраняем пользователя в Redis
      await redis.hset(`user:${chatId}`, {
        chat_id: chatId,
        username,
        first_name: firstName,
        last_name: lastName,
      });

      // Автоответ
      const text = update.message.text || "";
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Ты написал: ${text}`,
        }),
      });
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Ошибка обработчика:", err);
    return res.status(500).send("Internal Server Error");
  }
}
