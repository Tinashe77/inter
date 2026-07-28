import axios from 'axios';

const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/msg';

export async function sendGupshupTextMessage({ destination, text }) {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const source = normalizePhone(process.env.GUPSHUP_SOURCE);
  const appName = process.env.GUPSHUP_APP_NAME;

  if (!apiKey || !source || !appName) {
    const error = new Error('Gupshup is not configured.');
    error.status = 500;
    error.code = 'GUPSHUP_NOT_CONFIGURED';
    throw error;
  }

  const form = new URLSearchParams({
    channel: 'whatsapp',
    source,
    destination: normalizePhone(destination),
    'src.name': appName,
    message: JSON.stringify({
      type: 'text',
      text
    })
  });

  const response = await axios.post(gupshupUrl, form, {
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 30000
  });

  return response.data;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}
