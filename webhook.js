const express = require("express");
const fs = require("fs");
const watchGmail = require("./watch");
const { getEmailHistory, extractEmailDetails } = require("./gmailService");
const sendMail = require("./sendEmail");

// Constants
const HISTORY_ID_FILE = "historyId.state";
const PORT = 17899;

// Initialize Express app
const app = express();
app.use(express.json());

// Middleware for logging incoming requests
app.use((req, res, next) => {
  console.info(`>>> Incoming ${req.method} request from ${req.ip}`);
  next();
});

// Routes
app.get("/", (_, res) => {
  res.status(200).send("<h3>It works dude!</h3>");
});

app.post("/pubsub", async (req, res) => {
  console.log("📩 New Pub/Sub notification:", new Date().toISOString());

  // Validate incoming message
  if (!req.body?.message?.data) {
    console.warn("⚠️ No data in received message.");
    return res.status(400).send("Invalid Pub/Sub message");
  }

  // Decode and parse message
  let decodedMessage;
  try {
    decodedMessage = JSON.parse(
      Buffer.from(req.body.message.data, "base64").toString(),
    );
  } catch (error) {
    console.error("❌ Error decoding Pub/Sub message:", error);
    return res.status(400).send("Invalid data format");
  }

  const queryId = decodedMessage?.historyId;
  if (!queryId) {
    console.log("⚠️ Message does not contain a historyId. Ignored.");
    return res.status(200).send("No action required");
  }

  console.info("🔍 Searching for emails with historyId:", queryId);

  try {
    const emailInfos = await getEmailHistory(previousHistoryId, "SINISTRE");
    console.info("👀 Retrieved emails:", emailInfos.length);
    previousHistoryId = queryId;

    if (emailInfos.length > 0) {
      const emailsDetails = await extractEmailDetails(emailInfos);

      // Forward email details (custom logic)
      await fetch("http://localhost:10000/api/pubsub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailsDetails }),
      })
        .then(() => console.log("📬 Email details sent successfully"))
        .catch((error) =>
          console.error("❌ Error sending email details:", error),
        );

      console.dir(emailsDetails, { depth: null });
    }
  } catch (error) {
    console.error(
      "❌ Error retrieving emails:",
      error?.response?.data?.error || error,
    );
  }

  res.status(200).send("OK");
});

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, attachments } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        error: "Missing required fields: 'to', 'subject', 'text' or 'html'",
      });
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(
          (file) => file.filename && file.path && fs.existsSync(file.path),
        )
      : [];

    const response = await sendMail({
      to,
      subject,
      text,
      html,
      attachments: validAttachments,
    });
    res.status(200).json({ message: "Email sent successfully!", response });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Server initialization
let previousHistoryId = null;
const server = app.listen(PORT, async () => {
  try {
    const res = await watchGmail();
    previousHistoryId = res?.historyId;

    try {
      fs.writeFileSync(HISTORY_ID_FILE, previousHistoryId.toString());
    } catch (error) {
      console.error("❌ Error writing historyId to file:", error);
    }

    console.log(`✅ Pub/Sub server listening on port ${PORT}`);
  } catch (error) {
    console.error("❌ Error activating Gmail watch:", error);
  }
});

// Graceful shutdown
function gracefulShutdown() {
  console.log("⏱️ Shutting down gracefully...");
  server.close(() => {
    console.log("Closed remaining connections.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000); // 10 seconds
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
