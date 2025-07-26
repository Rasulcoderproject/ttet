const fetch = require("node-fetch");

// Используем Vercel KV
const { kv } = require("@vercel/kv");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const body = req.body;
  const message = body.message;
  const text = message?.text;
  const chat_id = message?.chat?.id;

  if (!message || !text || !chat_id) {
    return res.status(200).send("No message to process.");
  }

  const sendMessage = async (text, keyboard) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, reply_markup: keyboard, parse_mode: "Markdown" }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Telegram API error:", data);
      }
    } catch (err) {
      console.error("Ошибка отправки сообщения в Telegram:", err);
    }
  };

  if (text === "/start") {
    await kv.del(`session:${chat_id}`);
    await sendMessage("👋 Привет! Выбери тему для теста:", {
      keyboard: [
        [{ text: "История" }, { text: "Математика" }],
        [{ text: "Английский" }]
      ],
      resize_keyboard: true,
    });
    return res.send("OK");
  }

  const sessionKey = `session:${chat_id}`;
  const session = await kv.get(sessionKey);

  if (session?.correctAnswer) {
    const userAnswer = text.trim().toUpperCase();
    const correct = session.correctAnswer.toUpperCase();
    await kv.del(sessionKey); // очищаем

    if (userAnswer === correct) {
      await sendMessage("✅ Правильно! Хочешь ещё вопрос?", {
        keyboard: [
          [{ text: "История" }, { text: "Математика" }],
          [{ text: "Английский" }]
        ],
        resize_keyboard: true,
      });
    } else {
      await sendMessage(`❌ Неправильно. Правильный ответ: ${correct}\nПопробуешь ещё?`, {
        keyboard: [
          [{ text: "История" }, { text: "Математика" }],
          [{ text: "Английский" }]
        ],
        resize_keyboard: true,
      });
    }

    return res.send("OK");
  }

  if (["История", "Математика", "Английский"].includes(text)) {
    const topic = text;
    const prompt = `
Задай один тестовый вопрос с 4 вариантами ответа по теме "${topic}".
Формат:
Вопрос: ...
A) ...
B) ...
C) ...
D) ...
Правильный ответ: X
    `.trim();

    let reply;
    try {
      reply = await askDeepSeek(prompt);
    } catch (error) {
      console.error("Ошибка DeepSeek:", error);
      await sendMessage("⚠️ Ошибка генерации вопроса. Попробуй позже.");
      return res.send("OK");
    }

    const match = reply.match(/Правильный ответ:\s*([A-D])/i);
    const correctAnswer = match ? match[1].trim().toUpperCase() : null;

    if (!correctAnswer) {
      await sendMessage("⚠️ Не удалось сгенерировать вопрос. Попробуй снова.");
      return res.send("OK");
    }

    const questionWithoutAnswer = reply.replace(/Правильный ответ:\s*[A-D]/i, "").trim();

    await kv.set(sessionKey, { correctAnswer });
    await sendMessage(`📚 Вопрос по теме *${topic}*:\n\n${questionWithoutAnswer}`);

    return res.send("OK");
  }

  await sendMessage("⚠️ Напиши /start, чтобы начать сначала.");
  return res.send("OK");
};

// GPT через DeepSeek API
async function askDeepSeek(prompt) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("DeepSeek API error:", data);
    throw new Error(data.error?.message || "Unknown DeepSeek error");
  }

  return data.choices?.[0]?.message?.content || "Ошибка генерации.";
}
