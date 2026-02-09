export type SubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'accepted' | 'rejected';
export type UserRole = 'user' | 'admin' | 'reviewer';

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
  phone?: string;
  organization?: string;
  position?: string;
  role: UserRole;
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
  fileName?: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  audit: AuditLog[];
}

export interface NewsItem {
  id: number;
  title: string;
  date: string;
  desc: string;
  type: 'news' | 'download';
  imageUrl?: string;
  fileType?: string;
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