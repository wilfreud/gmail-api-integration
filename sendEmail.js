const fs = require("node:fs");
const MailComposer = require("nodemailer/lib/mail-composer");
const { initializeGmailClient } = require("./gmailService");
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const sendMail = async ({ to, subject, text, html, attachments = [] }) => {
  const gmail = initializeGmailClient();

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
    from: `Commodore64 <${process.env.EMAIL}>`,
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
