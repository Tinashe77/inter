import mongoose from 'mongoose';

const whatsappMessageSchema = new mongoose.Schema({
  metaMessageId: { type: String, required: true, unique: true, index: true },
  recipientWaId: String,
  labNumber: String,
  status: String,
  statusTimestamp: Date,
  conversationId: String,
  pricingCategory: String,
  errorCode: String,
  errorMessage: String,
  webhookPayload: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
