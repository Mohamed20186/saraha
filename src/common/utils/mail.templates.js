// بيعمل escape لأي نص جاي من المستخدم عشان نتجنب HTML injection
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Template إيميل احترافي (table-based + inline styles عشان يشتغل في Gmail و Outlook).
 *
 * @param {Object}  opts
 * @param {string}  opts.appName     اسم التطبيق (بيظهر في الهيدر والفوتر)
 * @param {string}  opts.title       العنوان الرئيسي
 * @param {string}  [opts.greeting]  تحية، مثلاً "أهلاً محمد،"
 * @param {string}  opts.message     نص الرسالة
 * @param {string}  [opts.otp]       كود التحقق (اختياري)
 * @param {string}  [opts.buttonText] نص الزرار (اختياري)
 * @param {string}  [opts.buttonUrl]  لينك الزرار (اختياري)
 * @param {string}  [opts.note]      ملاحظة صغيرة تحت المحتوى
 * @param {"rtl"|"ltr"} [opts.dir]   اتجاه النص
 * @param {string}  [opts.brandColor] لون البراند
 */
export const buildEmailHtml = ({
  appName = "My App",
  title,
  greeting,
  message,
  otp,
  buttonText,
  buttonUrl,
  note,
  dir = "ltr",
  brandColor = "#4f46e5",
}) => {
  const align = dir === "rtl" ? "right" : "left";
  const year = new Date().getFullYear();

  const greetingBlock = greeting
    ? `<p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#111827;">${escapeHtml(greeting)}</p>`
    : "";

  const otpBlock = otp
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
        <tr>
          <td align="center" style="background-color:#f3f4f6;border:1px dashed #d1d5db;border-radius:10px;padding:18px 12px;">
            <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:${brandColor};">
              ${escapeHtml(otp)}
            </span>
          </td>
        </tr>
      </table>`
    : "";

  const buttonBlock =
    buttonText && buttonUrl
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
        <tr>
          <td align="center" bgcolor="${brandColor}" style="border-radius:8px;">
            <a href="${escapeHtml(buttonUrl)}" target="_blank"
               style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
              ${escapeHtml(buttonText)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all;">
        ${dir === "rtl" ? "لو الزرار مش شغال، انسخ اللينك ده في المتصفح:" : "If the button doesn't work, copy this link into your browser:"}<br />
        <a href="${escapeHtml(buttonUrl)}" style="color:${brandColor};">${escapeHtml(buttonUrl)}</a>
      </p>`
      : "";

  const noteBlock = note
    ? `<p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(note)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: النص اللي بيظهر جنب العنوان في قائمة الإيميلات -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(message)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f4f5f7">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${brandColor}"
                style="background-color:${brandColor};border-radius:12px 12px 0 0;padding:28px 24px;font-family:Tahoma,Arial,sans-serif;">
              <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">${escapeHtml(appName)}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff"
                style="background-color:#ffffff;padding:36px 32px;text-align:${align};font-family:Tahoma,Arial,sans-serif;">
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.4;color:#111827;">${escapeHtml(title)}</h1>
              ${greetingBlock}
              <p style="margin:0;font-size:15px;line-height:1.8;color:#374151;">${escapeHtml(message)}</p>
              ${otpBlock}
              ${buttonBlock}
              ${noteBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#f9fafb"
                style="background-color:#f9fafb;border-radius:0 0 12px 12px;padding:20px 24px;font-family:Tahoma,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                &copy; ${year} ${escapeHtml(appName)}. ${dir === "rtl" ? "جميع الحقوق محفوظة." : "All rights reserved."}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
};