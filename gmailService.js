const { google } = require("googleapis");
const credentials = require("./credentials.json");
const tokens = require("./token.json");

const getGmailService = () => {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );
  oAuth2Client.setCredentials(tokens);

  return google.gmail({ version: "v1", auth: oAuth2Client });
};

// TODO: implement later
const getProfile = async () => {
  const gmail = getGmailService();
  const response = await gmail.users.getProfile({ userId: "me" });

  return response.data;
};

const getEmailById = async (messageId) => {
  const gmail = getGmailService();
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full", // "full", "metadata" ou "raw"
  });
  return res.data;
};

const getEmails = async (maxResults = 10) => {
  const gmail = getGmailService();
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    // format: "full", // "full", "metadata" ou "raw"
  });
  return res.data;
};

const getEmailHistory = async (
  historyId,
  keyword,
  config = { verbose: false },
) => {
  const gmail = getGmailService();

  try {
    const res = await gmail.users.history.list({
      userId: "me",
      startHistoryId: historyId,
      labelIds: ["INBOX"],
      historyTypes: ["messageAdded"],
    });

    if (config.verbose) {
      console.log(
        "🔄 Réponse de l'API history.list:",
        JSON.stringify(res.data, null, 2),
      );
    }

    if (!res.data.history) {
      console.warn("⚠️ Aucune entrée history détectée.");
      return [];
    }

    // Récupération des emails ajoutés
    const newEmails = res.data.history.flatMap((h) => h.messages || []);

    // 📩 Récupérer les détails des emails pour filtrer sur l'objet
    const filteredEmails = [];
    for (const email of newEmails) {
      const fullEmail = await getEmailById(email.id);

      // early stop if no keyword is provided
      if (!keyword) {
        filteredEmails.push(fullEmail);
        continue;
      }

      const subjectHeader = fullEmail.payload.headers.find(
        (h) => h.name === "Subject",
      );
      const subject = subjectHeader ? subjectHeader.value : "";

      console.log(`📌 Sujet de l'email: "${subject}"`);

      if (!keyword) reutnr;

      if (subject.toLowerCase().includes(keyword.toLowerCase())) {
        filteredEmails.push(fullEmail);
      }
    }

    return filteredEmails;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'historique:", error);
    return [];
  }
};

const cleanEmailBody = (body) => {
  if (!body) return "";

  // 📌 Modèles de séparation des emails précédents
  const delimiters = [
    /On .* wrote:/, // Ex: "On Jan 1, 2024, John Doe wrote:"
    /Le .* a écrit :/, // Ex: "Le 1 Janvier 2024, Jean Dupont a écrit :"
    /De : .*@.*\..*/, // Ex: "De: john@example.com"
    />+ /, // Ex: "> Quoted text"
  ];

  for (const delimiter of delimiters) {
    const index = body.search(delimiter);
    if (index !== -1) {
      return body.substring(0, index).trim(); // ✂️ Conserver uniquement le message original
    }
  }

  return body.trim();
};

/**
 * Extracts detailed information from a list of email objects.
 *
 * @param {Array<Object>} emails - The list of email objects to extract details from.
 * @param {Object} emails[].payload - The payload of the email.
 * @param {Array<Object>} emails[].payload.headers - The headers of the email.
 * @param {Object} emails[].payload.body - The body of the email.
 * @param {Array<Object>} [emails[].payload.parts] - The parts of the email, if any.
 * @param {string} emails[].id - The unique identifier of the email.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of email details.
 * @returns {Object} return[].sender - The sender information.
 * @returns {string} return[].sender.name - The name of the sender.
 * @returns {string} return[].sender.email - The email address of the sender.
 * @returns {string} return[].subject - The subject of the email.
 * @returns {Array<string>} return[].to - The list of "To" recipients.
 * @returns {Array<string>} return[].cc - The list of "Cc" recipients.
 * @returns {Array<string>} return[].bcc - The list of "Bcc" recipients.
 * @returns {string} return[].body - The body content of the email.
 * @returns {Array<Object>} return[].attachments - The list of attachments.
 * @returns {string} return[].attachments[].filename - The filename of the attachment.
 * @returns {string} return[].attachments[].attachmentId - The attachment ID.
 * @returns {string} return[].attachments[].mimeType - The MIME type of the attachment.
 */
const extractEmailDetails = async (emails) => {
  return emails.map((email) => {
    const headers = email.payload.headers;

    // 🔍 Récupération du champ "From"
    const fromHeader = headers.find((h) => h.name.toLowerCase() === "from");
    let sender = { name: "", email: "" };

    if (fromHeader && fromHeader.value) {
      const match = fromHeader.value.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        sender.name = match[1].replace(/"/g, "").trim(); // Suppression des guillemets éventuels
        sender.email = match[2].trim();
      } else {
        sender.email = fromHeader.value.trim(); // Cas où il n'y a que l'email
      }
    }

    // 🏷️ Récupération du sujet
    const subjectHeader = headers.find((h) => h.name === "Subject");
    const subject = subjectHeader ? subjectHeader.value : "Sans objet";

    // 📧 Récupération des destinataires
    const getHeaderValue = (name) => {
      const header = headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase(),
      );
      return header ? header.value.split(",").map((addr) => addr.trim()) : [];
    };

    const to = getHeaderValue("To");
    const cc = getHeaderValue("Cc");
    const bcc = getHeaderValue("Bcc");

    // 📝 Extraction du corps du mail
    let bodyContent = "";

    const extractTextFromParts = (parts) => {
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }
        if (part.parts) {
          const extracted = extractTextFromParts(part.parts);
          if (extracted) return extracted;
        }
      }
      return "";
    };

    if (email.payload.body.data) {
      bodyContent = Buffer.from(email.payload.body.data, "base64").toString(
        "utf-8",
      );
    } else if (email.payload.parts) {
      bodyContent = extractTextFromParts(email.payload.parts);
    }

    bodyContent = cleanEmailBody(bodyContent);

    // 📎 Extraction des pièces jointes
    const attachments = [];
    if (email.payload.parts) {
      email.payload.parts.forEach((part) => {
        if (part.filename && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId,
            mimeType: part.mimeType,
          });
        }
      });
    }

    return {
      id: email.id,
      sender, // 👈 Ajout de l'expéditeur (nom + email)
      subject,
      to,
      cc,
      bcc,
      body: bodyContent,
      attachments,
    };
  });
};

exports.getEmailById = getEmailById;
exports.getGmailService = getGmailService;
exports.getEmailHistory = getEmailHistory;
exports.getProfile = getProfile;
exports.getEmails = getEmails;
exports.extractEmailDetails = extractEmailDetails;
