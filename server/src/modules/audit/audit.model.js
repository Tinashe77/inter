import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  actorId: String,
  actorName: String,
  actorRole: String,
  action: {
    type: String,
    enum: ['LOGIN', 'RESULT_VIEW', 'PDF_DOWNLOAD', 'WHATSAPP_SHARE', 'REPORT_EXPORT', 'SAMPLE_COLLECTION'],
    required: true
  },
  labNumber: String,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', auditSchema);
