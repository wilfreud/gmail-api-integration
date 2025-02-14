const dotenv = require("dotenv");
dotenv.config(".env");
const { getGmailService } = require("./gmailService")

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

module.exports = watchGmail;

