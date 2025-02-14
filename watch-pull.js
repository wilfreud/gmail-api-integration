const { PubSub } = require("@google-cloud/pubsub");
const dotenv = require("dotenv");
dotenv.config(".env");
const { getEmailById } = require("./gmailService");

// Remplace avec ton ID de projet et le nom de ta subscription
const projectId = process.env.GC_PROJECT_ID;
const subscriptionName = process.env.GC_PUBSUB_PULL_SUBSCRIPTION_NAME;

const pubSubClient = new PubSub({ projectId });

async function pullMessages() {
  const subscription = pubSubClient.subscription(subscriptionName);

  console.log("🎯 En attente de nouveaux messages Gmail...");

  subscription.on("message", async (message) => {
    console.log(`📩 Nouveau message reçu : ${message.id}`);

    // 📌 Décoder le message Pub/Sub
    const decodedData = Buffer.from(message.data, "base64").toString();
    console.log("📨 Contenu du message :", decodedData);

    // 🔄 Marquer le message comme traité (sinon Pub/Sub le renverra)
    message.ack();

    // 👉 Extraire l'ID du mail et récupérer son contenu
    const messageJson = JSON.parse(decodedData);
    const messageId = messageJson.emailMessageId; // Adapter selon la structure du message
    console.log(`🔎 ID du mail : ${messageId}`);

    // Récupérer le mail complet via l'API Gmail (optionnel)
    const email = await getEmailById(messageId);
    console.log("📧 Contenu du mail :", email);
  });

  subscription.on("error", (error) => {
    console.error("❌ Erreur Pub/Sub :", error);
  });
}

pullMessages().catch(console.error);
