# Gmail API Integration Toolkit

_(note: a lot of this code is ai generated. thanks chatGPT :v)_

## 📦 Project Overview

A Node.js toolkit for Gmail integration featuring:

- Email sending capabilities
- Mailbox watch/push notifications
- OAuth2 authentication flow
- Pre-configured service layers

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Google Cloud Project with Gmail API enabled

```bash
pnpm install
```

## 🔧 Configuration

### Environment Setup

```env
# .env
PORT=3000
GMAIL_USER=your_email@gmail.com
```

### Credential Setup

1. Place `credentials.json` in project root
2. Run token setup:

```bash
node getToken.js
```

## ☁️ Google Cloud Configuration

### 1. Enable Required Services

1. **Gmail API**:
   - Navigation: APIs & Services > Library > Gmail API > Enable
2. **Cloud Pub/Sub**:
   - Navigation: APIs & Services > Library > Cloud Pub/Sub API > Enable

### 2. OAuth Consent Screen Setup

1. Navigation: APIs & Services > OAuth consent screen
2. Configure:
   - User Type: Internal
   - Scopes: Add `../auth/gmail.send` and `../auth/gmail.modify`
   - Authorized domains: `localhost`

### 3. Create Pub/Sub Resources

```bash
gcloud pubsub topics create gmail-notifications
gcloud pubsub subscriptions create gmail-sub \
  --topic=gmail-notifications \
  --push-endpoint=https://your-domain.com/webhook
```

### 4. Service Account Configuration

1. Navigation: IAM & Admin > Service Accounts
2. Create account with:
   - Roles: Pub/Sub Publisher
   - Key Type: JSON
3. Save key as `gc-service-account.json` in project root

## 📋 Script Reference

| File           | Purpose                      | Usage Example                                                      |
| -------------- | ---------------------------- | ------------------------------------------------------------------ |
| `sendEmail.js` | Send emails with attachments | `node sendEmail.js --to=recipient@domain.com --subject='Test'`     |
| `watch.js`     | Monitor mailbox changes      | `node watch.js --topic=projects/your-project/topics/gmail-updates` |
| `webhook.js`   | Handle push notifications    | `node webhook.js --port=3000`                                      |

## 🔄 Watch Implementation Comparison

| Implementation    | Mechanism              | Best For               |
| ----------------- | ---------------------- | ---------------------- |
| `watch.js`        | Cloud Pub/Sub Push     | Production (real-time) |
| `watch-pull.js`   | Manual History Polling | Debugging/Testing      |
| `watch-simple.js` | Basic Interval Polling | Simple monitoring      |

## 📨 API Usage Examples

### Sending Emails with Attachments

```bash
node sendEmail.js \
  --to=client@company.com \
  --subject='Project Update' \
  --body='Attached latest reports' \
  --attachment=./reports/q3.pdf
```

### Configuring Watch Parameters

```bash
# Monitor specific label changes
node watch.js \
  --label=INBOX \
  --interval=60000 \
  --max-retries=5
```

## 📦 Dependency Matrix

| Package                | Version  | Purpose                 |
| ---------------------- | -------- | ----------------------- |
| `googleapis`           | ^120.0.0 | Gmail API Client        |
| `dotenv`               | ^16.3.1  | Environment Management  |
| `@google-cloud/pubsub` | ^3.3.0   | Real-time Notifications |
| `open`                 | ^9.1.0   | OAuth2 Flow Handling    |

## 🔄 Webhook Deployment

### Local Testing

```bash
node webhook.js --port=3000
# In separate terminal:
ngrok http 3000
```

### Production Setup

1. Upload `webhook.js` to Cloud Functions
2. Set environment variables:
   - GMAIL_USER
   - GC_PROJECT_ID
3. Connect Pub/Sub subscription to function endpoint

## 🔒 Security Notes

- Never commit `credentials.json` or `token.json`
- Store secrets in `.env`
- Use IAM roles in production

## 🛠️ Troubleshooting

```bash
# Debug authentication
DEBUG=google-auth-library node gmailService.js

# Test email sending
node sendEmail.js --dry-run
```

## 📚 API Reference

See [Gmail API Documentation](https://developers.google.com/gmail/api)
