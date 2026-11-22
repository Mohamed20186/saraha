import nodemailer from "nodemailer";
import configService from "../../config/config.service.js";

const APP_NAME = configService.APP_NAME || "SARAHA";

// ---------- Transporter ----------
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: configService.EMAIL_USER,
    pass: configService.EMAIL_PASS, 
  },
  pool: true, 
});

export const verifyMailConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Mail server is ready");
  } catch (err) {
    console.error("❌ Mail server connection failed:", err.message);
    throw err;
  }
};

export const sendMail = async ({
  to,
  subject,
  text,
  html,
  cc,
  bcc,
  replyTo,
  attachments = [],
}) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error("sendMail requires: to, subject, and text or html");
  }

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${configService.EMAIL_USER}>`,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      text,
      html,
      attachments,
    });

    return info;
  } catch (err) {
    console.error("Error while sending mail:", err);
    throw err; 
  }
};

// ---------- Templates ----------
const baseTemplate = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
              border: 1px solid #eee; border-radius: 8px; padding: 24px;">
    <h2 style="margin-top: 0;">${title}</h2>
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <small style="color: #888;">© ${new Date().getFullYear()} ${APP_NAME}</small>
  </div>
`;

// ---------- Ready-made emails ----------
export const sendOtpMail = async ({ to, otp, expiresInMinutes = 10 }) =>
  sendMail({
    to,
    subject: `Your verification code: ${otp}`,
    text: `Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    html: baseTemplate(
      "Verify your email",
      `<p>Use this code to continue:</p>
       <p style="font-size: 32px; letter-spacing: 6px; font-weight: bold;">${otp}</p>
       <p>It expires in ${expiresInMinutes} minutes.</p>`
    ),
  });

export const sendWelcomeMail = async ({ to, name }) =>
  sendMail({
    to,
    subject: `Welcome to ${APP_NAME}`,
    text: `Welcome ${name}!`,
    html: baseTemplate(`Welcome, ${name}!`, `<p>Glad to have you with us.</p>`),
  });

export const sendResetPasswordMail = async ({ to, resetLink }) =>
  sendMail({
    to,
    subject: "Reset your password",
    text: `Reset your password using this link: ${resetLink}`,
    html: baseTemplate(
      "Reset your password",
      `<p>Click the button below to choose a new password:</p>
       <a href="${resetLink}"
          style="display:inline-block;padding:10px 20px;background:#2563eb;
                 color:#fff;border-radius:6px;text-decoration:none;">
         Reset password
       </a>
       <p style="color:#888;">If you didn't request this, ignore this email.</p>`
    ),
  });