const fs = require("fs");
const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");
const getGmailService = require("./gmailService");

const sendMail = async () => {
  const gmail = getGmailService();

  // Création du mail
  const mailOptions = {
    from: "Commodore64",
    to: "example@gmail.com",
    subject: "Test API Gmail",
    text: "Bonjour, ceci est un test d'email via l'API Gmail et OAuth2 !",
  };

  // Utilisation de MailComposer pour encoder l'email en base64
  const mail = new MailComposer(mailOptions);
  const message = await mail.compile().build();
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Envoi via l'API Gmail
  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log("Email envoyé :", response.data);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email", error);
  }
};

sendMail();
