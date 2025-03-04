const { google } = require("googleapis");
const path = require("path");
const credentials = require("./credentials.json");
const tokens = require("./token.json");

//region **************** AUTHENTICATION SETUP ****************
/**
 * Creates and configures a Gmail API client instance
 * @returns {google.gmail_v1.Gmail} Authenticated Gmail service instance
 */
const initializeGmailClient = () => {
  try {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );
    oAuth2Client.setCredentials(tokens);
    return google.gmail({ version: "v1", auth: oAuth2Client });
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
};
//endregion

//region **************** CORE API METHODS ****************
/**
 * Retrieves user's Gmail profile information
 * @returns {Promise<google.gmail_v1.Schema$Profile>} User profile data
 */
const fetchUserProfile = async () => {
  const gmail = initializeGmailClient();
  try {
    const response = await gmail.users.getProfile({ userId: "me" });
    return response.data;
  } catch (error) {
    throw new Error(`Profile fetch failed: ${error.message}`);
  }
};

/**
 * Fetches a complete email message by ID
 * @param {string} messageId - Target message ID
 * @returns {Promise<google.gmail_v1.Schema$Message>} Full message data
 */
const fetchEmailMessage = async (messageId) => {
  const gmail = initializeGmailClient();
  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    return response.data;
  } catch (error) {
    throw new Error(`Message fetch failed: ${error.message}`);
  }
};

/**
 * Lists recent email messages
 * @param {number} [maxResults=10] - Number of results to return
 * @returns {Promise<google.gmail_v1.Schema$ListMessagesResponse>} Messages list
 */
const listRecentEmails = async (maxResults = 10) => {
  const gmail = initializeGmailClient();
  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults,
    });
    return response.data;
  } catch (error) {
    throw new Error(`Email listing failed: ${error.message}`);
  }
};

/**
 * Retrieves email history since specified history ID
 * @param {string} historyId - Starting history ID
 * @param {string} [searchFilter] - Optional search filter
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.verbose=false] - Enable verbose logging
 * @returns {Promise<Array<google.gmail_v1.Schema$Message>>} Filtered messages
 */
const fetchEmailHistory = async (
  historyId,
  searchFilter,
  options = { verbose: false },
) => {
  const gmail = initializeGmailClient();
  try {
    const response = await gmail.users.history.list({
      userId: "me",
      startHistoryId: historyId,
      labelIds: ["INBOX"],
      historyTypes: ["messageAdded"],
    });

    if (options.verbose) {
      console.debug(
        "History API response:",
        JSON.stringify(response.data, null, 2),
      );
    }

    if (!response.data.history) return [];

    const messages = response.data.history.flatMap((h) => h.messages || []);
    const filteredMessages = [];

    for (const message of messages) {
      const fullMessage = await fetchEmailMessage(message.id);

      if (!searchFilter) {
        filteredMessages.push(fullMessage);
        continue;
      }

      const subjectHeader = fullMessage.payload.headers.find(
        (h) => h.name === "Subject",
      );
      const subject = subjectHeader?.value || "";

      if (subject.toLowerCase().includes(searchFilter.toLowerCase())) {
        filteredMessages.push(fullMessage);
      }
    }

    return filteredMessages;
  } catch (error) {
    throw new Error(`History fetch failed: ${error.message}`);
  }
};
//endregion

//region **************** EMAIL PROCESSING UTILITIES ****************
/**
 * Enhanced email body cleaner with common reply patterns
 * @param {string} content - Raw email content
 * @returns {string} Cleaned email body
 */
const sanitizeEmailContent = (content) => {
  if (!content) return "";

  const REPLY_PATTERNS = [
    /On\s.+?\s\w+:\s?\n/, // English reply pattern
    /Le\s.+?\sécrit\s?:/, // French reply pattern
    /From:\s.+?<\S+@\S+\.\S+>/i,
    /^>\s+/gm,
    /\n-+\sOriginal Message\s-+/i,
    /\n_{10,}/,
  ];

  for (const pattern of REPLY_PATTERNS) {
    const matchIndex = content.search(pattern);
    if (matchIndex > -1) {
      return content.slice(0, matchIndex).trim();
    }
  }

  return content.trim();
};

/**
 * Extracts complete email details including thread context
 * @param {Array<google.gmail_v1.Schema$Message>} messages - Messages to process
 * @returns {Promise<Array<EmailDetail>>} Processed email details
 */
const processEmailMessages = async (messages) => {
  return Promise.all(
    messages.map(async (message) => {
      const headers = message.payload.headers;

      // Sender Information
      const fromHeader = headers.find((h) => h.name.toLowerCase() === "from");
      const sender = extractSenderDetails(fromHeader?.value);

      // Recipient Information
      const extractRecipients = (type) =>
        headers
          .find((h) => h.name.toLowerCase() === type)
          ?.value.split(",")
          .map((v) => v.trim()) || [];

      // Thread Information
      const threadData = {
        messageId: headers.find((h) => h.name === "Message-ID")?.value || "",
        inReplyTo: headers.find((h) => h.name === "In-Reply-To")?.value || "",
        references: headers.find((h) => h.name === "References")?.value || "",
        threadId: message.threadId,
      };

      // Content Extraction
      const bodyContent = extractMessageContent(message.payload);
      const attachments = await extractMessageAttachments(message);

      return {
        id: message.id,
        sender,
        subject:
          headers.find((h) => h.name === "Subject")?.value || "No Subject",
        to: extractRecipients("to"),
        cc: extractRecipients("cc"),
        bcc: extractRecipients("bcc"),
        ...threadData,
        isReply: !!threadData.inReplyTo,
        body: sanitizeEmailContent(bodyContent),
        attachments,
      };
    }),
  );
};

/**
 * Extracts sender details from From header
 * @param {string} headerValue - From header value
 * @returns {Object} Sender information
 */
const extractSenderDetails = (headerValue = "") => {
  const match = headerValue.match(
    /(?:"?([^"]*)"?\s)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/,
  );
  return {
    name: (match?.[1] || "").trim(),
    email: (match?.[2] || headerValue).trim(),
  };
};

/**
 * Recursively extracts text content from email parts
 * @param {google.gmail_v1.Schema$MessagePart} payload - Email payload
 * @returns {string} Extracted text content
 */
const extractMessageContent = (payload) => {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  return findTextContent(payload.parts || []);
};

/**
 * Recursive helper for content extraction
 * @param {Array<google.gmail_v1.Schema$MessagePart>} parts - Email parts
 * @returns {string} Found text content
 */
const findTextContent = (parts) => {
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    if (part.parts) {
      const content = findTextContent(part.parts);
      if (content) return content;
    }
  }
  return "";
};

/**
 * Extracts and processes attachments from message
 * @param {google.gmail_v1.Schema$Message} message - Email message
 * @returns {Promise<Array<Attachment>>} Attachments list
 */
const extractMessageAttachments = async (message) => {
  if (!message.payload.parts) return [];

  const attachments = [];
  for (const part of message.payload.parts) {
    if (part.filename && part.body.attachmentId) {
      try {
        const attachmentData = await fetchAttachmentContent(
          message.id,
          part.body.attachmentId,
        );
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || detectMimeType(part.filename),
          size: part.body.size || 0,
          data: attachmentData,
        });
      } catch (error) {
        console.error(`Attachment failed: ${part.filename}`, error);
      }
    }
  }
  return attachments;
};

/**
 * Retrieves attachment content from Gmail
 * @param {string} messageId - Parent message ID
 * @param {string} attachmentId - Target attachment ID
 * @returns {Promise<string>} Base64 encoded content
 */
const fetchAttachmentContent = async (messageId, attachmentId) => {
  const gmail = initializeGmailClient();
  try {
    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`Attachment fetch failed: ${error.message}`);
  }
};

/**
 * Detects MIME type from filename extension
 * @param {string} filename - Target filename
 * @returns {string} Detected MIME type
 */
const detectMimeType = (filename) => {
  const EXTENSION_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".zip": "application/zip",
    ".txt": "text/plain",
  };

  const extension = path.extname(filename).toLowerCase();
  return EXTENSION_MAP[extension] || "application/octet-stream";
};
//endregion

//region **************** TYPE DEFINITIONS ****************
/**
 * @typedef {Object} EmailDetail
 * @property {string} id - Unique message ID
 * @property {Object} sender - Sender information
 * @property {string} sender.name - Display name
 * @property {string} sender.email - Email address
 * @property {string} subject - Message subject
 * @property {string[]} to - To recipients
 * @property {string[]} cc - CC recipients
 * @property {string[]} bcc - BCC recipients
 * @property {string} messageId - RFC5322 Message-ID
 * @property {string} inReplyTo - Parent message ID
 * @property {string} references - Reference chain
 * @property {string} threadId - Conversation thread ID
 * @property {boolean} isReply - Reply flag
 * @property {string} body - Cleaned message content
 * @property {Attachment[]} attachments - File attachments
 */

/**
 * @typedef {Object} Attachment
 * @property {string} filename - Original filename
 * @property {string} mimeType - File type
 * @property {number} size - File size in bytes
 * @property {string} data - Base64 encoded content
 */
//endregion

module.exports = {
  initializeGmailClient,
  fetchUserProfile,
  fetchEmailMessage,
  listRecentEmails,
  fetchEmailHistory,
  processEmailMessages,
  detectMimeType,
};
