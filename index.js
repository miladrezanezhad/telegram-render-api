import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());

// دریافت پیام‌ها از تلگرام (Webhook)
app.post("/webhook", (req, res) => {
  const update = req.body;

  // اگر پیام متنی بود ذخیره کن
  if (update.message && update.message.text) {
    let messages = [];

    if (fs.existsSync("/tmp/messages.json")) {
      messages = JSON.parse(fs.readFileSync("/tmp/messages.json"));
    }

    messages.push({
      text: update.message.text,
      date: update.message.date
    });

    fs.writeFileSync("/tmp/messages.json", JSON.stringify(messages, null, 2));
  }

  res.json({ ok: true });
});

// نمایش پیام‌ها برای Worker
app.get("/messages", (req, res) => {
  if (!fs.existsSync("/tmp/messages.json")) {
    return res.json([]);
  }

  const messages = JSON.parse(fs.readFileSync("/tmp/messages.json"));
  res.json(messages);
});

app.listen(3000, () => console.log("Server running on port 3000"));
