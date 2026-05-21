import { AuditLog } from './audit.model.js';

export async function writeAudit(req, action, metadata = {}) {
  await AuditLog.create({
    actorId: req.user?.id,
    actorName: req.user?.name,
    actorRole: req.user?.usertype,
    action,
    labNumber: metadata.labNumber,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
}
