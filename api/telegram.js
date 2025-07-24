export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body;

  if (body.message && body.message.chat && body.message.text) {
    const chatId = body.message.chat.id;
    const text = body.message.text;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    let reply = 'Я понимаю только команду /start или нажатие кнопки.';

    if (text === '/start') {
      reply = 'Привет! Вот кнопка.';
      await fetch(`https://api.telegram.org/bot7674189322:AAF0pQjEBALUO1L7_dvrg1LgtKaAsecoQIk/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          reply_markup: {
            keyboard: [['Кнопка']],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }),
      });
    } else if (text === 'Кнопка') {
      reply = 'Ты нажал кнопку!';
      await fetch(`https://api.telegram.org/bot7674189322:AAF0pQjEBALUO1L7_dvrg1LgtKaAsecoQIk/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply }),
      });
    } else {
      await fetch(`https://api.telegram.org/bot7674189322:AAF0pQjEBALUO1L7_dvrg1LgtKaAsecoQIk/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply }),
      });
    }
  }

  res.status(200).send('ok');
}
