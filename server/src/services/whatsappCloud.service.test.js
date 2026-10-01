import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { sendWhatsAppResultTemplate } from './whatsappCloud.service.js';

test('sends the result fields expected by a WhatChimp webhook workflow', async () => {
  const originalPost = axios.post;
  const originalEnvironment = {
    provider: process.env.WHATSAPP_PROVIDER,
    webhookUrl: process.env.WHATCHIMP_WEBHOOK_URL,
    webhookToken: process.env.WHATCHIMP_WEBHOOK_TOKEN
  };
  let captured;

  process.env.WHATSAPP_PROVIDER = 'whatchimp';
  process.env.WHATCHIMP_WEBHOOK_URL = 'https://example.test/whatchimp-hook';
  process.env.WHATCHIMP_WEBHOOK_TOKEN = 'test-token';
  axios.post = async (...args) => {
    captured = args;
    return { data: { message_id: 'wc-message-1' } };
  };

  try {
    const result = await sendWhatsAppResultTemplate({
      to: '+263 77 123 4567',
      recipientName: 'Harare Clinic',
      labNumber: 'ILH260924001',
      shareUrl: 'https://inter-8puh.onrender.com/api/results/share/token/pdf#report'
    });

    assert.equal(captured[0], 'https://example.test/whatchimp-hook');
    assert.deepEqual(captured[1], {
      phone: '263771234567',
      phone_number: '263771234567',
      recipient_name: 'Harare Clinic',
      doctor_name: 'Harare Clinic',
      lab_number: 'ILH260924001',
      report_url: 'https://inter-8puh.onrender.com/api/results/share/token/pdf#report',
      template_name: 'interpath_result_ready',
      template_language: 'en'
    });
    assert.equal(captured[2].headers.Authorization, 'Bearer test-token');
    assert.equal(result.messageId, 'wc-message-1');
    assert.equal(result.contactWaId, '263771234567');
    assert.equal(result.provider, 'whatchimp-webhook');
  } finally {
    axios.post = originalPost;
    restoreEnvironment('WHATSAPP_PROVIDER', originalEnvironment.provider);
    restoreEnvironment('WHATCHIMP_WEBHOOK_URL', originalEnvironment.webhookUrl);
    restoreEnvironment('WHATCHIMP_WEBHOOK_TOKEN', originalEnvironment.webhookToken);
  }
});

test('rejects an insecure WhatChimp webhook URL', async () => {
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalWebhookUrl = process.env.WHATCHIMP_WEBHOOK_URL;
  process.env.WHATSAPP_PROVIDER = 'whatchimp';
  process.env.WHATCHIMP_WEBHOOK_URL = 'http://example.test/whatchimp-hook';

  try {
    await assert.rejects(
      sendWhatsAppResultTemplate({ to: '263771234567' }),
      (error) => error.code === 'WHATSAPP_NOT_CONFIGURED' && /HTTPS/.test(error.message)
    );
  } finally {
    restoreEnvironment('WHATSAPP_PROVIDER', originalProvider);
    restoreEnvironment('WHATCHIMP_WEBHOOK_URL', originalWebhookUrl);
  }
});

function restoreEnvironment(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
