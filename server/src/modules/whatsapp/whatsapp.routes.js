import crypto from 'crypto';
import { Router } from 'express';
import { WhatsAppMessage } from './whatsappMessage.model.js';

export const whatsappRouter = Router();

whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(String(challenge || ''));
    return;
  }
  res.sendStatus(403);
});

whatsappRouter.post('/webhook', async (req, res, next) => {
  try {
    if (!isValidMetaSignature(req)) {
      res.sendStatus(401);
      return;
    }

    const changes = (req.body?.entry || []).flatMap((entry) => entry.changes || []);
    const statuses = changes.flatMap((change) => change.value?.statuses || []);

    await Promise.all(statuses.map((status) => WhatsAppMessage.findOneAndUpdate(
      { metaMessageId: status.id },
      {
        $set: {
          recipientWaId: status.recipient_id,
          status: status.status,
          statusTimestamp: status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date(),
          conversationId: status.conversation?.id,
          pricingCategory: status.pricing?.category,
          errorCode: status.errors?.[0]?.code?.toString(),
          errorMessage: status.errors?.[0]?.message || status.errors?.[0]?.title,
          webhookPayload: status
        }
      },
      { upsert: true, new: true }
    )));

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

function isValidMetaSignature(req) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = String(req.get('x-hub-signature-256') || '');
  if (!appSecret || !signature.startsWith('sha256=') || !req.rawBody) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex')}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
