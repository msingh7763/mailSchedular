/**
 * send-emails.js
 * 
 * Standalone script to send emails to all addresses in the CSV file.
 * Uses Gmail SMTP - no backend stack required.
 *
 * SETUP:
 *   Credentials are stored in .env file in the same folder.
 *   Just run:  node send-emails.js
 */

// Auto-load .env file (credentials stored there permanently)
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const GMAIL_USER     = process.env.GMAIL_USER     || "msingh7763@gmail.com";
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASSWORD || "YOUR_16_CHAR_APP_PASSWORD_HERE";

const EMAIL_SUBJECT   = process.env.EMAIL_SUBJECT || "Hello from Outbox22!";
const EMAIL_FROM_NAME = "Outbox22 Mailer";

const EMAIL_BODY_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4F46E5;">Hello from Outbox22!</h2>
  <p>This is a test email sent via the <strong>Outbox22 Email Scheduler</strong>.</p>
  <p>If you received this, Gmail SMTP is working correctly!</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #666; font-size: 14px;">
    Sent at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
  </p>
</body>
</html>
`;

// ─── CSV FILE ─────────────────────────────────────────────────────────────────
const CSV_FILE = path.join(__dirname, "msingh7763@gmail.csv");

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!GMAIL_APP_PASS || GMAIL_APP_PASS === "YOUR_16_CHAR_APP_PASSWORD_HERE") {
    console.error("\n ERROR: Gmail App Password not set!");
    console.error("   Run the script like this:");
    console.error('   $env:GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"; node send-emails.js\n');
    process.exit(1);
  }

  if (!fs.existsSync(CSV_FILE)) {
    console.error("\n ERROR: CSV file not found: " + CSV_FILE + "\n");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_FILE, "utf-8");
  const recipients = csvContent
    .split("\n")
    .map(line => line.trim().replace(/\r/, ""))
    .filter(line => line.includes("@"));

  if (recipients.length === 0) {
    console.error("\n ERROR: No email addresses found in CSV.\n");
    process.exit(1);
  }

  console.log("\nRecipients found: " + recipients.length);
  recipients.forEach((r, i) => console.log("  " + (i+1) + ". " + r));

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  console.log("\nConnecting to Gmail SMTP...");
  try {
    await transporter.verify();
    console.log("Gmail SMTP connection OK!\n");
  } catch (err) {
    console.error("Gmail SMTP connection FAILED: " + err.message);
    console.error("Tip: Use a Gmail App Password, not your regular password.");
    console.error("Get one at: https://myaccount.google.com/apppasswords");
    process.exit(1);
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    try {
      console.log("Sending to " + recipient + " ...");
      const info = await transporter.sendMail({
        from: '"' + EMAIL_FROM_NAME + '" <' + GMAIL_USER + ">",
        to: recipient,
        subject: EMAIL_SUBJECT,
        html: EMAIL_BODY_HTML,
      });
      console.log("  Sent! ID: " + info.messageId);
      ok++;
    } catch (err) {
      console.error("  FAILED: " + err.message);
      fail++;
    }
    if (i < recipients.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log("\n--- Summary ---");
  console.log("Sent:   " + ok);
  if (fail > 0) console.log("Failed: " + fail);
  console.log("Done!\n");
}

main().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
