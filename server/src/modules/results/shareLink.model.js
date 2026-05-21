import mongoose from 'mongoose';

const shareLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  labNumber: { type: String, required: true },
  createdBy: String,
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
