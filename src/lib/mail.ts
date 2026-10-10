import "server-only";
import nodemailer from "nodemailer";

function transport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export async function sendMail(to: string, subject: string, text: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!process.env.SMTP_HOST || !from || !process.env.SMTP_PASSWORD) throw new Error("ფოსტა არ არის გამართული.");
  await transport().sendMail({
    from: `Animeb <${from}>`,
    to,
    subject,
    text,
    html: `<p>${text.replaceAll("\n", "<br>")}</p>`,
  });
}

export async function sendResetMail(to: string, link: string) {
  await sendMail(to, "პაროლის აღდგენა — Animeb", `პაროლის შესაცვლელად გახსენი ეს ბმული. 30 წუთი იმუშავებს.\n\n${link}\n\nთუ შენ არ გითხოვია, ამ წერილს ყურადღება არ მიაქციო.`);
}
