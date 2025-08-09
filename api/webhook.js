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

    // Отправляем тебе сообщение с ID и текстом
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.MY_TELEGRAM_ID, // твой ID
        text: `📨 Сообщение от chat_id: ${chatId}\nТекст: ${text}`,
      }),
    });
  }

  return res.status(200).send("ok");
}
