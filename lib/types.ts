export type Role = 'super_admin' | 'institute_admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  instituteId: string | null;
  role: Role;
  username: string | null;
  email: string | null;
  phone: string | null;
  studentId: string | null;
  firstName: string;
  lastName: string | null;
  profilePhotoUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  instituteCode: string | null;
}

export interface Institute {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  address: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string;
  postalCode: string | null;
  logoUrl: string | null;
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  contactPersonEmail: string | null;
  status: string;
  studentLimit: number;
  teacherLimit: number;
  adminLimit: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  subscription?: SubscriptionInfo | null;
}

export interface SubscriptionInfo {
  id: string;
  planId: string;
  planName: string;
  planCode: string;
  status: string;
  startDate: string;
  expiryDate: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number;
  studentLimit: number;
  teacherLimit: number;
  adminLimit: number;
  trialDurationDays: number;
  features: string | null;
  status: string;
}

export interface Student {
  id: string;
  instituteId: string;
  userId: string | null;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  address: string | null;
  admissionDate: string;
  academicYear: string | null;
  profilePhotoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  batches?: Batch[];
  parents?: Parent[];
}

export interface Teacher {
  id: string;
  instituteId: string;
  userId: string | null;
  employeeId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  qualification: string | null;
  specialization: string | null;
  joiningDate: string;
  address: string | null;
  profilePhotoUrl: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  batches?: Batch[];
  subjects?: Subject[];
}

export interface Parent {
  id: string;
  instituteId: string;
  userId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  address: string | null;
  relationship: string | null;
  occupation: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  children?: Student[];
}

export interface Batch {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  academicYear: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  students?: Student[];
  teachers?: Teacher[];
  subjects?: Subject[];
}

export interface Subject {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description: string | null;
  maxMarks: number;
  passingMarks: number;
  isActive: boolean;
  createdAt: string;
}

export interface Attendance {
  id: string;
  instituteId: string;
  studentId: string;
  batchId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  remarks: string | null;
  markedBy: string | null;
  student?: Student;
  batch?: Batch;
}

export interface FeeCategory {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface FeeStructure {
  id: string;
  instituteId: string;
  categoryId: string;
  batchId: string | null;
  academicYear: string | null;
  amount: number;
  dueDate: string | null;
  isActive: boolean;
  category?: FeeCategory;
  batch?: Batch;
}

export interface StudentFee {
  id: string;
  instituteId: string;
  studentId: string;
  categoryId: string;
  structureId: string | null;
  totalAmount: number;
  discountAmount: number;
  waivedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string | null;
  status: string;
  notes: string | null;
  student?: Student;
  category?: FeeCategory;
}

export interface FeePayment {
  id: string;
  instituteId: string;
  studentId: string;
  studentFeeId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  receiptNumber: string;
  collectedBy: string | null;
  isReversed: boolean;
  notes: string | null;
  student?: Student;
  studentFee?: StudentFee;
}

export interface Exam {
  id: string;
  instituteId: string;
  batchId: string;
  name: string;
  code: string;
  academicYear: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  status: 'draft' | 'scheduled' | 'completed' | 'published';
  createdAt: string;
  batch?: Batch;
  examSubjects?: ExamSubject[];
}

export interface ExamSubject {
  id: string;
  examId: string;
  subjectId: string;
  instituteId: string;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  maxMarks: number;
  passingMarks: number;
  subject?: Subject;
}

export interface Mark {
  id: string;
  instituteId: string;
  studentId: string;
  examId: string;
  subjectId: string;
  maxMarks: number;
  obtainedMarks: number | null;
  grade: string | null;
  percentage: number | null;
  isPass: boolean;
  remarks: string | null;
  enteredBy: string | null;
  isPublished: boolean;
  student?: Student;
  subject?: Subject;
  exam?: Exam;
}

export interface GradingRule {
  id: string;
  instituteId: string;
  minPercentage: number;
  maxPercentage: number;
  grade: string;
}

export interface Notification {
  id: string;
  instituteId: string | null;
  userId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  instituteId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

export interface DashboardStats {
  [key: string]: number | string;
}
