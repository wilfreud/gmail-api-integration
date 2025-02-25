const fs = require("fs");
const MailComposer = require("nodemailer/lib/mail-composer");
const getGmailService = require("./gmailService");

const sendMail = async ({ to, subject, text, html, attachments = [] }) => {
  const gmail = getGmailService();

  // Validate and read file attachments
  const validAttachments = attachments
    .filter((file) => file.filename && file.path && fs.existsSync(file.path))
    .map((file) => ({
      filename: file.filename,
      content: fs.readFileSync(file.path).toString("base64"), // Convert file to Base64
      encoding: "base64",
    }));

  // Create email
  const mailOptions = {
    from: "Commodore64",
    to,
    subject,
    text,
    html,
    attachments: validAttachments,
  };

  // Encode email using MailComposer
  const mail = new MailComposer(mailOptions);
  const message = await mail.compile().build();
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Send email via Gmail API
  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log("✅ Email sent:", response.data);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

module.exports = sendMail;

module.exports = sendMail;
