const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

const sessions = {};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.FEEDBACK_EMAIL,
    pass: process.env.FEEDBACK_EMAIL_PASS,
  },
});

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const message = req.body?.message;
  const text = message?.text?.trim();
  const chat_id = message?.chat?.id;

  if (!chat_id || !text) return res.send("No message content");

  const session = sessions[chat_id] || {};

  async function sendMessage(text) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text }),
      });

      const data = await response.json();
      if (!data.ok) console.error("Telegram error:", data);
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  }

  // === Начало: команда /feedback ===
  if (text === "/feedback" || text === "Оставить комментарий") {
    sessions[chat_id] = { step: "name" };
    await sendMessage("👤 Как тебя зовут?");
    return res.send("OK");
  }

  // === Логика сбора данных ===
  if (session.step === "name") {
    session.name = text;
    session.step = "age";
    await sendMessage("📅 Сколько тебе лет?");
    return res.send("OK");
  }

  if (session.step === "age") {
    if (!/^\d{1,3}$/.test(text)) {
      await sendMessage("⚠️ Укажи возраст числом.");
      return res.send("OK");
    }

    session.age = text;
    session.step = "comment";
    await sendMessage("✍️ Напиши свой комментарий:");
    return res.send("OK");
  }

  if (session.step === "comment") {
    const { name, age } = session;
    const comment = text;
    delete sessions[chat_id]; // Завершили сессию

    try {
      await transporter.sendMail({
        from: `"Feedback Bot" <${process.env.FEEDBACK_EMAIL}>`,
        to: process.env.FEEDBACK_RECEIVER || process.env.FEEDBACK_EMAIL,
        subject: `Комментарий от ${name} (${age} лет) — Telegram ID: ${chat_id}`,
        text: `Имя: ${name}\nВозраст: ${age}\nКомментарий:\n${comment}`,
      });

      await sendMessage("✅ Спасибо! Твой комментарий отправлен.");
    } catch (error) {
      console.error("Ошибка отправки письма:", error);
      await sendMessage("❌ Ошибка при отправке. Попробуй позже.");
    }

    return res.send("OK");
  }

  // Неизвестная команда
  await sendMessage("Напиши /feedback или нажми «Оставить комментарий».");
  return res.send("OK");
};
