## Configuration

### 1️⃣ Enable Gmail API on Google Cloud
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **API & Services > Library**.
4. Search for **Gmail API** and enable it.

### 2️⃣ Create OAuth2 Credentials
1. Go to **API & Services > Credentials**.
2. Click **Create Credentials > OAuth 2.0 Client ID**.
3. Select **Web application** as the application type.
4. Configure:
   - **Authorized redirect URIs**: Add `http://localhost`
5. Click **Create** and download the `credentials.json` file.

### 3️⃣ Generate OAuth2 Token
1. Install dependencies if not already installed:
   ```sh
   pnpm Install
   ```
2. Run the following script to generate a token:
   ```sh
   node getToken.js
   ```
3. Follow the instructions:
   - Open the generated URL in your browser.
   - Authorize the application.
   - Copy and paste the provided code into the terminal.
4. The script will generate a `token.json` file, which is required for authentication.

### 4️⃣ Configure API Access in Code
1. Ensure `credentials.json` and `token.json` are in the project directory.
2. Use the following scopes based on your needs:
   ```javascript
   const SCOPES = [
     "https://www.googleapis.com/auth/gmail.send", // To send emails
     "https://www.googleapis.com/auth/gmail.readonly", // To read emails
     "https://www.googleapis.com/auth/gmail.modify" // To read & modify emails
   ];
   ```
3. Initialize Gmail API in your code with OAuth2 authentication.

### ✅ You're all set!
Now you can use the Gmail API to send and monitor emails in your application. 🚀

