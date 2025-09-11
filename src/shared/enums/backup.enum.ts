export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RESTORED = 'restored',
  CANCELLED = 'cancelled',
}

export enum BackupType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}
