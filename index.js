import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const FILE_PATH = "/tmp/messages.json";

// دریافت پیام از تلگرام
app.post("/webhook", (req, res) => {
  const update = req.body;

  if (update.message && update.message.text) {
    let messages = [];

    if (fs.existsSync(FILE_PATH)) {
      messages = JSON.parse(fs.readFileSync(FILE_PATH));
    }

    messages.push({
      text: update.message.text,
      date: update.message.date
    });

    fs.writeFileSync(FILE_PATH, JSON.stringify(messages, null, 2));
  }

  res.json({ ok: true });
});

// نمایش پیام‌ها برای Worker
app.get("/messages", (req, res) => {
  try {
    if (!fs.existsSync(FILE_PATH)) return res.json([]);
    const messages = JSON.parse(fs.readFileSync(FILE_PATH));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to read messages" });
  }
});

app.get("/", (req, res) => {
  res.send("Render Telegram API is running.");
});

app.listen(3000, () => console.log("Server running on port 3000"));
