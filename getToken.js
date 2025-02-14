const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// Charger les credentials
const credentials = JSON.parse(fs.readFileSync("credentials.json"));

// Extraire les informations nécessaires
const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0],
);

// Générer l'URL d'authentification
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
    // "https://www.googleapis.com/auth/gmail.metadata",
  ],
});

console.log("Autorisez cette application en visitant ce lien :", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Entrez le code reçu après authentification : ", (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error("Erreur lors de l'obtention du token", err);
      return;
    }
    fs.writeFileSync("token.json", JSON.stringify(token));
    console.log("Token stocké dans token.json !");
  });
});
