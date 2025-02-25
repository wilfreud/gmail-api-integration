// docs: https://medium.com/@eagnir/understanding-gmails-push-notifications-via-google-cloud-pub-sub-3a002f9350ef
const express = require("express");
const app = express();
const watchGmail = require("./watch");
const { getEmailHistory, extractEmailDetails } = require("./gmailService");
const sendMail = require("./sendEmail");

// TODO: find a way to save on disk (in case server restarts or stuff like that)
let previousHistoryId = null;

app.use(express.json());

// Log des requêtes entrantes
app.use((req, res, next) => {
  console.info(
    `>>> Incoming ${req.method} request from ${req.hostname} (${req.ip}) ...`,
  );
  next();
});

app.get("/", (_, res) => {
  res.status(200).send("<h3>It works dude!</h3>");
});

app.post("/pubsub", async (req, res) => {
  console.log(
    "📩 Nouvelle notification reçue de Pub/Sub:",
    new Date().toISOString(),
  );

  // Vérification du corps du message
  if (!req.body || !req.body.message || !req.body.message.data) {
    console.warn("⚠️ Aucune donnée dans le message reçu.");
    return res.status(400).send("Invalid Pub/Sub message");
  }

  let decodedMessage;
  try {
    decodedMessage = JSON.parse(
      Buffer.from(req.body.message.data, "base64").toString(),
    );
  } catch (error) {
    console.error("❌ Erreur lors du décodage du message Pub/Sub:", error);
    return res.status(400).send("Invalid data format");
  }

  console.log("📨 Contenu du message décodé:", decodedMessage);

  let message;
  try {
    message = req.body.message;
  } catch (error) {
    console.warn(
      "⚠️ Le message Pub/Sub ne semble pas être du JSON valide. Il sera ignoré.",
    );
    console.log(req.body);
    return res.status(200).send("Ignored");
  }

  const queryId = decodedMessage?.historyId;
  // Vérification si l'on doit traiter ce message
  // TODO: review condition
  if (!queryId) {
    console.log("⚠️ Message reçu ne contenant pas d'id(s). Ignoré.");
    return res.status(200).send("No action required");
  }

  console.info("🔍 Recherche d'email avec ID/historyID:", queryId);

  try {
    const emailInfos = await getEmailHistory(previousHistoryId, "SINISTRE");
    console.info("👀", emailInfos.length, "Emails récupérés");
    previousHistoryId = queryId;

    if (emailInfos.length > 0) {
      const emailsDetails = await extractEmailDetails(emailInfos);

      // This is for some personal use, don't mind
      await fetch("http://localhost:10000/api/pubsub", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailsDetails: emailsDetails }),
      })
        .then((data) => console.log("📬 Email details sent successfully:"))
        .catch((error) =>
          console.error("❌ Error sending email details:", error),
        );
      console.dir(emailsDetails, { depth: null });
    }
  } catch (error) {
    console.error(
      "❌ Erreur lors de la récupération de l'email:",
      error?.response?.data?.error || error,
    );
  }

  res.status(200).send("OK"); // ⚡ Toujours répondre 200 sinon Pub/Sub va renvoyer le message
});

// 📧 Send email endpoint
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, attachments } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res
        .status(400)
        .json({
          error: "Missing required fields: 'to', 'subject', 'text' or 'html'",
        });
    }

    // Validate attachments if provided
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

app.listen(17899, async () => {
  try {
    const res = await watchGmail();
    // NOTE: cf to part where I say to save on disk, this could create gaps if app was down and mails arrived in between
    previousHistoryId = res?.historyId;
    console.log("✅ Serveur Pub/Sub en écoute sur port 17899");
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'activation de la surveillance Gmail:",
      error,
    );
  }
});
