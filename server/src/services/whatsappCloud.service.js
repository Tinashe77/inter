import axios from 'axios';
import crypto from 'node:crypto';

const PROVIDERS = {
  meta: 'meta-cloud-api',
  whatchimp: 'whatchimp-webhook'
};

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

export async function sendWhatsAppResultTemplate({ to, recipientName, patientName, labNumber, shareUrl }) {
  if (whatsAppProvider() === 'whatchimp') {
    return sendViaWhatChimp({ to, recipientName, patientName, labNumber, shareUrl });
  }

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
          components: buildResultTemplateComponents({
            recipientName: recipientName || patientName,
            labNumber,
            shareUrl
          })
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
    provider: PROVIDERS.meta,
    response: response.data
  };
}

async function sendViaWhatChimp({ to, recipientName, patientName, labNumber, shareUrl }) {
  const destination = normalizePhone(to);
  if (!destination) {
    const error = new Error('A valid WhatsApp destination is required.');
    error.status = 400;
    error.code = 'INVALID_WHATSAPP_DESTINATION';
    throw error;
  }

  const webhookUrl = String(process.env.WHATCHIMP_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    const error = new Error('WhatChimp is not configured. Add WHATCHIMP_WEBHOOK_URL.');
    error.status = 500;
    error.code = 'WHATSAPP_NOT_CONFIGURED';
    throw error;
  }
  assertSafeWhatChimpUrl(webhookUrl);

  const displayName = String(recipientName || patientName || 'Doctor').trim() || 'Doctor';
  const payload = {
    phone: destination,
    phone_number: destination,
    recipient_name: displayName,
    doctor_name: displayName,
    lab_number: String(labNumber || ''),
    report_url: String(shareUrl || ''),
    template_name: process.env.WHATSAPP_TEMPLATE_NAME || 'interpath_result_ready',
    template_language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
  };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.WHATCHIMP_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.WHATCHIMP_WEBHOOK_TOKEN}`;
  }

  let response;
  try {
    response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: Number(process.env.WHATCHIMP_TIMEOUT_MS || 30000)
    });
  } catch (cause) {
    const error = new Error(whatChimpErrorMessage(cause));
    error.status = cause.code === 'ECONNABORTED' ? 504 : 502;
    error.code = 'WHATSAPP_SEND_FAILED';
    error.details = {
      provider: 'WhatChimp',
      status: cause.response?.status,
      response: safeProviderResponse(cause.response?.data)
    };
    console.error('WhatChimp send failed', error.details);
    throw error;
  }

  return {
    messageId: extractWhatChimpMessageId(response.data) || `whatchimp:${crypto.randomUUID()}`,
    contactWaId: destination,
    provider: PROVIDERS.whatchimp,
    response: response.data
  };
}

export function whatsAppProvider() {
  return String(process.env.WHATSAPP_PROVIDER || 'meta').trim().toLowerCase();
}

function assertSafeWhatChimpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    const error = new Error('WHATCHIMP_WEBHOOK_URL must be a valid URL.');
    error.status = 500;
    error.code = 'WHATSAPP_NOT_CONFIGURED';
    throw error;
  }
  if (url.protocol !== 'https:') {
    const error = new Error('WHATCHIMP_WEBHOOK_URL must use HTTPS.');
    error.status = 500;
    error.code = 'WHATSAPP_NOT_CONFIGURED';
    throw error;
  }
}

function extractWhatChimpMessageId(data) {
  return data?.message_id
    || data?.messageId
    || data?.id
    || data?.data?.message_id
    || data?.data?.messageId
    || data?.data?.id
    || null;
}

function whatChimpErrorMessage(cause) {
  if (cause.code === 'ECONNABORTED') {
    return 'WhatChimp took too long to accept the WhatsApp message. Please retry.';
  }
  const providerMessage = cause.response?.data?.message || cause.response?.data?.error;
  return providerMessage
    ? `WhatChimp could not accept the WhatsApp message: ${String(providerMessage)}`
    : 'WhatChimp could not accept the WhatsApp message. Check the webhook workflow and retry.';
}

function safeProviderResponse(value) {
  if (!value || typeof value !== 'object') return undefined;
  return {
    message: value.message,
    error: value.error,
    code: value.code,
    status: value.status
  };
}

export function buildResultTemplateComponents({ recipientName, patientName, labNumber, shareUrl }) {
  const displayName = String(recipientName || patientName || 'Doctor').trim() || 'Doctor';
  return [
    {
      type: 'header',
      parameters: [{ type: 'text', text: displayName }]
    },
    {
      type: 'body',
      parameters: [
        { type: 'text', text: displayName },
        { type: 'text', text: String(labNumber || '') },
        { type: 'text', text: String(shareUrl || '') }
      ]
    }
  ];
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
    return `The WhatsApp template parameter count does not match the approved header or body.${reference}`;
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
