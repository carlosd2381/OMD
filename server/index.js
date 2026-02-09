const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.send('OMD Server is running');
});

const buildTransporter = (smtpConfig = {}) => {
  const host = smtpConfig.host || process.env.SMTP_HOST;
  const port = Number(smtpConfig.port || process.env.SMTP_PORT || 587);
  const secure = typeof smtpConfig.secure === 'boolean'
    ? smtpConfig.secure
    : String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = smtpConfig.username || process.env.SMTP_USERNAME || process.env.SMTP_USER;
  const pass = smtpConfig.password || process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
};

app.post('/notifications/email', async (req, res) => {
  try {
    const { smtpConfig = {}, sender = {}, message = {} } = req.body || {};

    if (!message.to || !message.subject || (!message.html && !message.text)) {
      return res.status(400).json({ error: 'Missing email payload details.' });
    }

    const transporter = buildTransporter(smtpConfig);
    const fallbackFrom = smtpConfig.username || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME;
    if (!fallbackFrom) {
      throw new Error('Unable to resolve sender email address.');
    }

    const displayName = sender.fromName || process.env.SMTP_FROM_NAME;
    const from = displayName ? `${displayName} <${fallbackFrom}>` : fallbackFrom;

    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: sender.replyTo || fallbackFrom
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to send email notification:', error);
    res.status(500).json({ error: 'Failed to send email notification.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
