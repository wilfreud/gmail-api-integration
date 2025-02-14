const express = require("express");
const app = express();
const watchGmail = require("./watch");
const { getEmailById } = require("./gmailService");

app.use(express.json());

app.use((req, res, next) => {
	console.info(">>> Incoming GET request from ", req.hostname, "(", req.ip, ")",  " ...");

	next();
})

app.get("/", (_, res) => {
	res.status(200).send("<h3>It works dude!</h3>");
})

let hasStartedWatching = false;

const today = new Date();
app.post("/pubsub", async (req, res) => {
  if(!hasStartedWatching) {
    await watchGmail();
    hasStartedWatching = true;
  }

  console.log("📩 Nouvelle notification reçue de Pub/Sub: ", today.toString());

  const decodedMessage = Buffer.from(req.body.message.data, "base64").toString();
  console.log(req.body)
  
  const message = req.body?.message;;
  
  console.log("📨 Contenu du message décodé :",decodedMessage);

  // 👉 Ici, tu peux traiter le message (récupérer l'email, envoyer un webhook, etc.)
  if(message?.messageId){
	  console.info("🔍 Querying message infos with id: ", message?.messageId);
	  try {
		const emailInfos = await getEmailById(message.messageId);
		console.info("👀", emailInfos)
	  }catch(error) {
		  console.error(error?.response?.data?.error || error);
	  }
  }

  res.status(200).send("OK"); // ⚡ Toujours répondre 200 sinon Pub/Sub va renvoyer le message
});

app.listen(17899, async() => {
  await watchGmail();
  hasStartedWatching = true;
  console.log("✅ Serveur Pub/Sub en écoute sur port 17899");
  }
);
