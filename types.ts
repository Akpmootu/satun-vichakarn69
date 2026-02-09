export type SubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'accepted' | 'rejected';

export interface AuditLog {
  at: string;
  action: string;
  note: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  position: string;
}

export interface Submission {
  id: string;
  userId?: string; // Link to user
  budgetYear: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  organization: string;
  workType: string;
  branchId: number;
  fileUrl?: string; // Base64 or URL of the uploaded file
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