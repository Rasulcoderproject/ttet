// api/webhook.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  // Проверка секретного токена
  const secretToken = req.headers["x-telegram-bot-api-secret-token"];
  if (!process.env.WEBHOOK_SECRET || secretToken !== process.env.WEBHOOK_SECRET) {
    console.warn("❌ Неверный секретный токен");
    return res.status(401).send("Unauthorized");
  }

  const update = req.body;
  console.log("📩 Update:", update);

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
}
