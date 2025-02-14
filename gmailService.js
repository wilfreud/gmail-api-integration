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
    // format: "full", // "full", "metadata" ou "raw"
  });
  return res.data;
};

exports.getEmailById = getEmailById;
exports.getGmailService = getGmailService;
