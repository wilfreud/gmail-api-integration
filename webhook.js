const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
	console.info(">>> Incoming GET request from ", req.hostname, "(", req.ip, ")",  " ...");

	res.status(200).send("<h3>It works dude!</h3>");
})

app.post("/pubsub", (req, res) => {
  console.log("📩 Nouvelle notification reçue de Pub/Sub:", JSON.stringify(req.body, null, 2));

  const message = Buffer.from(req.body.message.data, "base64").toString();
  console.log("📨 Contenu du message décodé :", message);

  // 👉 Ici, tu peux traiter le message (récupérer l'email, envoyer un webhook, etc.)
  
  res.status(200).send("OK"); // ⚡ Toujours répondre 200 sinon Pub/Sub va renvoyer le message
});

app.listen(17899, () => console.log("✅ Serveur Pub/Sub en écoute sur por 17899"));
