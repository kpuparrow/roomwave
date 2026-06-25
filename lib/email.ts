export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (process.env.SMTP_HOST || process.env.RESEND_API_KEY) {
    // TODO: подключить SMTP/Resend provider. Dev fallback ниже оставляет токен в логах сервера.
  }

  console.log(`[email:dev] to=${to} subject=${subject}\n${text}`);
}
