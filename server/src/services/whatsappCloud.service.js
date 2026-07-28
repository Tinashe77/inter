import axios from 'axios';

function getConfig() {
  const config = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => key !== 'businessAccountId' && !value)
    .map(([key]) => key);
  if (missing.length) {
    const error = new Error(`WhatsApp Cloud API is missing: ${missing.join(', ')}.`);
    error.status = 500;
    error.code = 'WHATSAPP_NOT_CONFIGURED';
    throw error;
  }
  return config;
}

export async function sendWhatsAppResultTemplate({ to, patientName, labNumber, shareUrl }) {
  const config = getConfig();
  const destination = normalizePhone(to);
  if (!destination) {
    const error = new Error('A valid WhatsApp destination is required.');
    error.status = 400;
    error.code = 'INVALID_WHATSAPP_DESTINATION';
    throw error;
  }

  const response = await axios.post(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
      type: 'template',
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: patientName || 'Patient' },
            { type: 'text', text: labNumber },
            { type: 'text', text: shareUrl }
          ]
        }]
      }
    },
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return {
    messageId: response.data?.messages?.[0]?.id || null,
    contactWaId: response.data?.contacts?.[0]?.wa_id || destination,
    response: response.data
  };
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}
