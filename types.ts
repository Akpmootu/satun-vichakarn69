
export type SubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'accepted' | 'rejected' | 'revision_requested' | 'scored';
export type UserRole = 'user' | 'admin' | 'reviewer';

export interface AuditLog {
  at: string;
  action: string;
  note: string;
}

export interface AddressInfo {
  houseNo: string;
  moo: string;
  road: string;
  soi: string;
  subDistrict: string;
  district: string;
  province: string;
  zipCode: string;
}

export interface Education {
  id: string; // generated uuid
  degree: string; // ปริญญาตรี, โท, เอก
  major: string; // สาขา
  institution: string; // สถาบัน
  year: string; // ปีที่จบ
}

export interface CoAuthor {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  organization: string;
  province: string;
  phone: string;
  email: string;
  lineId: string;
  photoUrl?: string;
  isVerified?: boolean;
  isSystemUser?: boolean;
}

export interface ReviewerScore {
  id: string;
  submissionId: string;
  reviewerId: string;
  workType: string;
  scoreData: Record<string, { score: number; comment: string }>;
  totalScore: number;
  createdAt: string;
}

export interface AppFeedback {
  id?: string;
  userId: string;
  rating: number;
  ratingEase?: number;
  ratingDesign?: number;
  ratingContent?: number;
  comment: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  position?: string;
  level?: string; 
  role: UserRole;
  avatarUrl?: string;
  addressInfo?: AddressInfo;
  educationHistory?: Education[];
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  prefix?: string;
  branchId?: string;
  committeeRole?: string;
}

export interface Submission {
  id: string;
  userId?: string; 
  reviewerId?: string; // deprecated, use reviewerIds
  reviewerIds?: string[];
  budgetYear: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  organization: string;
  workType: string;
  branchId: number;
  fileUrl?: string; 
  fileName?: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  audit: AuditLog[];
  coAuthors?: CoAuthor[]; // Replaced string with structured array
  authorPhoto?: string | null; // New: Official Photo Base64/URL
  presentationUrl?: string; // New: URL for Presentation (Google Drive / Canva)
}

export interface NewsItem {
  id: number;
  title: string;
  date: string;
  desc: string;
  type: 'news' | 'download' | 'welcome_banner'; // Added welcome_banner type
  imageUrl?: string;
  fileType?: string;
}

export interface AppSettings {
  mode: 'demo' | 'real' | 'mock';
  apiBaseUrl: string;
  currentYear?: number;
  openRegistration?: boolean;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface WorkTypeOption {
  id: string;
  label: string;
  description?: string; 
  icon: string;
}

export interface BranchOption {
  id: number;
  label: string;
}

export interface VisitorStats {
  online: number;
  today: number; 
  week: number;
  month: number;
  year: number;
  total: number;
}

export interface HealthOrg {
  code: string;
  name: string;
  type: string;
  district: string;
  subDistrict: string;
  moo?: string;
}
