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

const processEmail = async (email) => {
  console.log("🛞 Processing email ...", email);
};

exports.getEmailById = getEmailById;
exports.getGmailService = getGmailService;
exports.getEmailHistory = getEmailHistory;
exports.getProfile = getProfile;
exports.getEmails = getEmails;
