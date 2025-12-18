import express from "express";
import fs from "fs";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const FILE_PATH = "/tmp/messages.json";

// خواندن پیام‌ها از فایل
function loadMessages() {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH));
  } catch (e) {
    return [];
  }
}

// ذخیره پیام‌ها در فایل
function saveMessages(messages) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(messages, null, 2));
}

// Webhook از طرف تلگرام
app.post("/webhook", (req, res) => {
  const update = req.body;
  let messages = loadMessages();

  // پیام‌های چت معمولی / گروه / pv
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

    // فقط متن
    if (m.text) {
      messages.push({
        ...base,
        mediaType: null,
        fileId: null,
        fileName: null
      });
    }

    // عکس
    if (m.photo && m.photo.length > 0) {
      const largestPhoto = m.photo[m.photo.length - 1];
      messages.push({
        ...base,
        mediaType: "photo",
        fileId: largestPhoto.file_id,
        fileName: null
      });
    }

    // ویدیو
    if (m.video) {
      messages.push({
        ...base,
        mediaType: "video",
        fileId: m.video.file_id,
        fileName: null
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

    // متن
    if (p.text) {
      messages.push({
        ...base,
        mediaType: null,
        fileId: null,
        fileName: null
      });
    }

    // عکس
    if (p.photo && p.photo.length > 0) {
      const largestPhoto = p.photo[p.photo.length - 1];
      messages.push({
        ...base,
        mediaType: "photo",
        fileId: largestPhoto.file_id,
        fileName: null
      });
    }

    // ویدیو
    if (p.video) {
      messages.push({
        ...base,
        mediaType: "video",
        fileId: p.video.file_id,
        fileName: null
      });
    }

    // فایل
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

// لیست پیام‌ها برای Worker
app.get("/messages", (req, res) => {
  const messages = loadMessages();
  messages.sort((a, b) => (b.date || 0) - (a.date || 0));
  res.json(messages);
});

// پروکسی مدیا: Render → Telegram → کاربر
app.get("/media/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: "BOT_TOKEN is not set on Render" });
  }

  try {
    // مرحله ۱: گرفتن file_path
    const infoRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const info = await infoRes.json();

    if (!info.ok) {
      return res.status(400).json({ error: "Cannot get file info", details: info });
    }

    const filePath = info.result.file_path;

    // مرحله ۲: دانلود فایل از تلگرام
    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`
    );

    if (!fileRes.ok) {
      return res.status(400).json({ error: "Cannot download file from Telegram" });
    }

    // پاس دادن header نوع محتوا
    res.setHeader("Content-Type", fileRes.headers.get("content-type") || "application/octet-stream");

    // استریم فایل به کلاینت
    fileRes.body.pipe(res);
  } catch (err) {
    console.error("MEDIA PROXY ERROR:", err);
    res.status(500).json({ error: "Proxy failed", details: err.message });
  }
});

// روت اصلی برای تست
app.get("/", (req, res) => {
  res.send("Render Telegram API is running.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
