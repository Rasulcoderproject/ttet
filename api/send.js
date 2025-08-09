// api/send.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { chat_id, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Поле text обязательно" });
  }

  try {
    let ids = [];

    if (chat_id) {
      ids = [chat_id];
    } else {
      // Получаем всех пользователей из Redis
      const keys = await redis.keys("user:*");
      const users = await Promise.all(keys.map((k) => redis.hgetall(k)));
      ids = users.map((u) => u.chat_id);
    }

    const results = [];
    for (const id of ids) {
      const resp = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: id, text }),
      });
      results.push(await resp.json());
    }

    return res.status(200).json({ success: true, sent: results.length });
  } catch (error) {
    console.error("Ошибка отправки:", error);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}
