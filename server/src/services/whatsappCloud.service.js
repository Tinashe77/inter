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

  let response;
  try {
    response = await axios.post(
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
  } catch (cause) {
    throw toWhatsAppError(cause);
  }

  return {
    messageId: response.data?.messages?.[0]?.id || null,
    contactWaId: response.data?.contacts?.[0]?.wa_id || destination,
    response: response.data
  };
}

function toWhatsAppError(cause) {
  const metaError = cause.response?.data?.error || {};
  const metaCode = Number(metaError.code || 0);
  const metaSubcode = Number(metaError.error_subcode || 0);
  const error = new Error(whatsAppErrorMessage(metaCode, metaSubcode));
  error.status = cause.code === 'ECONNABORTED' ? 504 : 502;
  error.code = 'WHATSAPP_SEND_FAILED';
  error.details = {
    provider: 'Meta WhatsApp Cloud API',
    metaCode: metaCode || undefined,
    metaSubcode: metaSubcode || undefined,
    requestId: metaError.fbtrace_id || undefined
  };
  console.error('Meta WhatsApp send failed', error.details);
  return error;
}

function whatsAppErrorMessage(metaCode, metaSubcode) {
  const reference = metaCode
    ? ` (Meta ${metaCode}${metaSubcode ? `/${metaSubcode}` : ''})`
    : '';
  if (metaCode === 190) {
    return `WhatsApp authentication failed. The administrator must refresh the Meta access token.${reference}`;
  }
  if (metaCode === 131030) {
    return `This phone number is not currently permitted as a WhatsApp test recipient.${reference}`;
  }
  if ([131031, 131042].includes(metaCode)) {
    return `The WhatsApp Business account cannot send messages right now. Check its account and billing status.${reference}`;
  }
  if ([130429, 131048, 131049].includes(metaCode)) {
    return `WhatsApp has temporarily limited message delivery. Please retry later.${reference}`;
  }
  if (metaCode === 132000) {
    return `The approved WhatsApp template does not have the three body variables expected by the app.${reference}`;
  }
  if (metaCode === 132001) {
    return `The configured WhatsApp template name or language does not match an approved template.${reference}`;
  }
  if (metaCode === 132012) {
    return `A WhatsApp template variable has the wrong format.${reference}`;
  }
  if ([132015, 132016].includes(metaCode)) {
    return `The WhatsApp template is paused or disabled in Meta Business Manager.${reference}`;
  }
  if ([131026, 131047].includes(metaCode)) {
    return `WhatsApp could not deliver this message to the doctor’s number.${reference}`;
  }
  return `WhatsApp could not send the result. Please retry or contact an administrator.${reference}`;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}
