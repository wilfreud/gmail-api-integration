const fs = require("fs");
const MailComposer = require("nodemailer/lib/mail-composer");
const getGmailService = require("./gmailService");

/**
 * Send an email using Gmail API with optional attachments.
 *
 * @param {Object} options - Email sending options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text body.
 * @param {string} [options.html] - Optional HTML body.
 * @param {Array<{ filename: string, path: string }>} [options.attachments] - Optional list of attachments.
 */
const sendMail = async ({ to, subject, text, html, attachments = [] }) => {
  const gmail = getGmailService();

  // Prepare mail options
  const mailOptions = {
    from: "Commodore64 <your-email@gmail.com>",
    to,
    subject,
    text,
    html,
    attachments: attachments.map((file) => ({
      filename: file.filename,
      content: fs.createReadStream(file.path),
    })),
  };

  try {
    // Encode the email in base64
    const mail = new MailComposer(mailOptions);
    const message = await mail.compile().build();
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Send email via Gmail API
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    console.log("✅ Email sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

module.exports = sendMail;
