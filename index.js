import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());

const FILE_PATH = "/tmp/messages.json";

// تابع کمکی برای خواندن پیام‌ها از فایل
function loadMessages() {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH));
  } catch (e) {
    return [];
  }
}

// تابع کمکی برای ذخیره پیام‌ها
function saveMessages(messages) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(messages, null, 2));
}

// Webhook از طرف تلگرام
app.post("/webhook", (req, res) => {
  const update = req.body;
  let messages = loadMessages();

  // پیام‌های چت خصوصی / گروه
  if (update.message) {
    const m = update.message;

    const base = {
      fromChatType: m.chat?.type || null,
      fromChatId: m.chat?.id || null,
      text: m.text || null,
      caption: m.caption || null,
      date: m.date || null,
      source: "message"
    };

    // متن ساده
    if (m.text) {
      messages.push({
        ...base,
        mediaType: null,
        fileId: null
      });
    }

    // عکس
    if (m.photo && m.photo.length > 0) {
      const largestPhoto = m.photo[m.photo.length - 1];
      messages.push({
        ...base,
        mediaType: "photo",
        fileId: largestPhoto.file_id
      });
    }

    // ویدیو
    if (m.video) {
      messages.push({
        ...base,
        mediaType: "video",
        fileId: m.video.file_id
      });
    }

    // فایل (document)
    if (m.document) {
      messages.push({
        ...base,
        mediaType: "document",
        fileId: m.document.file_id,
        fileName: m.document.file_name || null
      });
    }
  }

  // پست‌های کانال
  if (update.channel_post) {
    const p = update.channel_post;

    const base = {
      fromChatType: p.chat?.type || null,
      fromChatId: p.chat?.id || null,
      text: p.text || null,
      caption: p.caption || null,
      date: p.date || null,
      source: "channel_post"
    };

    // متن ساده
    if (p.text) {
      messages.push({
        ...base,
        mediaType: null,
        fileId: null
      });
    }

    // عکس
    if (p.photo && p.photo.length > 0) {
      const largestPhoto = p.photo[p.photo.length - 1];
      messages.push({
        ...base,
        mediaType: "photo",
        fileId: largestPhoto.file_id
      });
    }

    // ویدیو
    if (p.video) {
      messages.push({
        ...base,
        mediaType: "video",
        fileId: p.video.file_id
      });
    }

    // فایل (document)
    if (p.document) {
      messages.push({
        ...base,
        mediaType: "document",
        fileId: p.document.file_id,
        fileName: p.document.file_name || null
      });
    }
  }

  saveMessages(messages);
  res.json({ ok: true });
});

// برگردوندن لیست پیام‌ها برای Worker
app.get("/messages", (req, res) => {
  const messages = loadMessages();

  // اختیاری: مرتب‌سازی از جدید به قدیم
  messages.sort((a, b) => (b.date || 0) - (a.date || 0));

  res.json(messages);
});

// روت اصلی برای تست
app.get("/", (req, res) => {
  res.send("Render Telegram API is running.");
});

app.listen(3000, () => console.log("Server running on port 3000"));
