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

    if (!message?.to || !message?.subject || (!message?.html && !message?.text)) {
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

    const attachments = Array.isArray(message.attachments)
      ? message.attachments
          .filter((attachment) => attachment?.filename && attachment?.content)
          .map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            encoding: 'base64',
            contentType: attachment.contentType || 'application/octet-stream',
          }))
      : [];

    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: sender?.replyTo,
      inReplyTo: message.inReplyTo,
      references: message.references,
      attachments,
    });

    return jsonResponse(200, { ok: true, message_id: info?.messageId || null });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
};
