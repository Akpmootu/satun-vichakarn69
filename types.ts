export type SubmissionStatus = 'draft' | 'submitted';

export interface AuditLog {
  at: string;
  action: string;
  note: string;
}

export interface Submission {
  id: string;
  budgetYear: number;
  firstName: string;
  lastName: string;
  position: string;
  organization: string;
  workType: string;
  branchId: number;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  audit: AuditLog[];
}

export interface AppSettings {
  mode: 'mock' | 'real';
  apiBaseUrl: string;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface WorkTypeOption {
  id: string;
  label: string;
  icon: string;
}

export interface BranchOption {
  id: number;
  label: string;
}