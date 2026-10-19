import AuditLog from '../models/AuditLog.js';

// Records important actions. A failure to write the audit entry is logged but
// does not undo or fail the action the user already completed.
export async function audit(req, { action, entityType, entityId, summary }) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorName: req.user?.name,
      actorRole: req.user?.role || 'system',
      action,
      entityType,
      entityId: entityId?.toString(),
      summary,
      ip: req.ip,
    });
  } catch (error) {
    console.error('[audit] could not write entry:', error.message);
  }
}
