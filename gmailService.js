const { google } = require("googleapis");
const credentials = require("./credentials.json");
const tokens = require("./token.json");

const getGmailService = () => {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(tokens);

  return google.gmail({ version: "v1", auth: oAuth2Client });
};

const getProfile = async() => {
	const gmail = getGmailService();
	const response = await gmail.users.getProfile({userId: "me"});
	
	return response.data;
}

const getEmailById = async (messageId) => {
  const gmail = getGmailService();
  const res = await gmail.users.messages.get({
    userId: "me",
    // id: messageId,
    format: "full", // "full", "metadata" ou "raw"
  });
  return res.data;
};

const getEmails = async(maxResults = 10) => {
  const gmail = getGmailService();
  const res = await gmail.users.messages.list({
    userId: "me",
	maxResults,
    // format: "full", // "full", "metadata" ou "raw"
  });
  return res.data;
} 

const getEmailHistory = async (historyId) => {
  const gmail = getGmailService();

  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId: historyId,
    historyTypes: ["messageAdded"] // On veut seulement les nouveaux emails
  });
  
  console.log("++++++++++++++++++++", res.data, "\n+++++++++++++++++++++")
  
  const newEmails = res.data.history?.flatMap(h => h.messages) || [];
  return newEmails;
};


exports.getEmailById = getEmailById;
exports.getGmailService = getGmailService;
exports.getEmailHistory = getEmailHistory;
exports.getProfile = getProfile;
exports.getEmails = getEmails;
