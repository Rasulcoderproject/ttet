// api/webhook.js
export const config = {
  api: {
    bodyParser: false, // отключаем встроенный парсер, чтобы точно не было ошибок
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    // Читаем сырое тело запроса
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

    console.log("📩 Получено сообщение:", JSON.stringify(update, null, 2));

    // Отвечаем Telegram, что всё ок
    return res.status(200).send("ok");

  } catch (err) {
    console.error("❌ Ошибка обработчика:", err);
    return res.status(500).send("Internal Server Error");
  }
}
