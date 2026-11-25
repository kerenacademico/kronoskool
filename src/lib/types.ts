// src/lib/types.ts

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type BiometricMethod = "FINGERPRINT" | "FACE";

export type AlertTargetRole = "GUARDIAN" | "TEACHER" | "ADMIN_SCHOOL" | "STUDENT";

export type AlertChannel =
  | "EMAIL"
  | "WHATSAPP"
  | "DASHBOARD"
  | "IN_APP"
  | "STUDENT";

export interface ClassGroup {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  startTime: string;
  graceMinutes: number;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface MedicalEmergencyProfile {
  bloodType: string;
  epsName: string;
  criticalAllergies: string[];
  medicalConditions: string[];
  medications: string[];
  emergencyInstructions: string;
  emergencyContacts: EmergencyContact[];
  lastVerifiedAt: string;
}

export interface Student {
  id: string;
  groupId: string;
  fullName: string;
  documentType: "TI" | "CC" | "NUIP";
  documentNumber: string;
  grade: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail: string;
  address?: string;
  lateCount: number;
  absentCount: number;
  todayStatus?: AttendanceStatus;
  biometricMethod?: BiometricMethod;
  checkInTime?: string;
  minutesAfterStart?: number;
  medical: MedicalEmergencyProfile;
}

export interface AlertEvent {
  id: string;
  studentId: string;
  studentName: string;
  targetRole: AlertTargetRole | string;
  channel: AlertChannel | string;
  message: string;
  createdAt: string;
}

export interface MedicalAuditLog {
  id: string;
  studentId: string;
  studentName: string;
  documentNumber: string;
  reason: string;
  accessedAt: string;
}