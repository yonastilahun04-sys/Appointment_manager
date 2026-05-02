import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendBookingConfirmation(opts: {
  to: string;
  fullName: string;
  staff: string;
  when: string;
  reason: string;
  phone: string;
  lang?: string;
}): Promise<void> {
  const transport = createTransport();
  if (!transport) return;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@clinic.local";
  const isAm = opts.lang === "am";

  const subject = isAm
    ? "ቀጠሮዎ ተቀብሏል"
    : "Appointment Booking Confirmed";

  const html = isAm
    ? `
<div style="font-family:sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#4f46e5;padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:22px">ቀጠሮዎ ተቀብሏል ✓</h1>
  </div>
  <div style="padding:28px;color:#111827">
    <p>ውድ <strong>${opts.fullName}</strong>፣</p>
    <p>ቀጠሮዎ በተሳካ ሁኔታ ተመዝግቧል። ዝርዝሩ ከዚህ በታች ይገኛል።</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;width:40%">ሐኪም</td><td style="padding:8px 0;font-weight:600">${opts.staff}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">ቀን / ሰዓት</td><td style="padding:8px 0;font-weight:600">${opts.when}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">ምክንያት</td><td style="padding:8px 0">${opts.reason}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">ስልክ</td><td style="padding:8px 0">${opts.phone}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:14px">ነገር ቢለወጥ እንጠራዎታለን።</p>
  </div>
</div>`
    : `
<div style="font-family:sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#4f46e5;padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:22px">Appointment Confirmed ✓</h1>
  </div>
  <div style="padding:28px;color:#111827">
    <p>Dear <strong>${opts.fullName}</strong>,</p>
    <p>Your appointment has been successfully booked. Here are your details:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280;width:40%">Doctor</td><td style="padding:8px 0;font-weight:600">${opts.staff}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Date &amp; Time</td><td style="padding:8px 0;font-weight:600">${opts.when}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#6b7280">Reason</td><td style="padding:8px 0">${opts.reason}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Phone</td><td style="padding:8px 0">${opts.phone}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:14px">We will reach out at your phone if anything changes.</p>
  </div>
</div>`;

  await transport.sendMail({ from, to: opts.to, subject, html });
}
