const { google } = require("googleapis");
const credentials = require("./credentials.json");
const tokens = require("./token.json");

const getGmailService = () => {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(tokens);

  return google.gmail({ version: "v1", auth: oAuth2Client });
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

const watchGmail = async () => {
  console.warn("⏳ Attempting to watch emails...");
  const gmail = getGmailService(); // On récupère le service Gmail avec la fonction existante

  // Le nom de ton Topic Pub/Sub que tu as créé dans Google Cloud
  const topicName = process.env.GC_PUBSUB_TOPIC_NAME;

  try {
    const res = await gmail.users.watch({
      userId: "me",
      resource: {
        labelIds: ["INBOX"], // Tu peux filtrer les emails dans la boîte de réception
        topicName: topicName, // Le topic Pub/Sub où tu recevras les notifications
      },
    });
    console.log("🚀 Watch activée avec succès:", res.data);
  } catch (error) {
    console.error("Erreur lors de l'activation de la surveillance:");
    console.dir(error, { depth: null });
  }
};

module.exports = getGmailService;
module.exports = { getEmailById, watchGmail };
