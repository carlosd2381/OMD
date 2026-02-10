import nodemailer from 'nodemailer';

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { smtpConfig, sender, message } = JSON.parse(event.body || '{}');

    if (!smtpConfig?.host || !smtpConfig?.username || !smtpConfig?.password) {
      return jsonResponse(400, { error: 'SMTP settings are incomplete.' });
    }

    if (!message?.to || !message?.subject || !message?.html) {
      return jsonResponse(400, { error: 'Email message is incomplete.' });
    }

    const port = Number(smtpConfig.port) || 465;
    const secure = typeof smtpConfig.secure === 'boolean' ? smtpConfig.secure : port === 465;

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port,
      secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    const fromName = sender?.name || 'Oh My Churros MX';
    const fromEmail = sender?.email || smtpConfig.username;

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return jsonResponse(200, { ok: true });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
};
