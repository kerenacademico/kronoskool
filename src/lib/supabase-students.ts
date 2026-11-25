// src/lib/supabase-students.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_STUDENTS, CLASS_GROUPS } from "./mock-data";
import {
  AttendanceStatus,
  BiometricMethod,
  MedicalEmergencyProfile,
  Student,
} from "./types";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!browserClient) {
    browserClient = createClient(url, key);
  }
  return browserClient;
}

interface StudentRow {
  id: string;
  group_id: string;
  full_name: string;
  document_type: "TI" | "CC" | "NUIP";
  document_number: string;
  grade: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email: string;
  address?: string | null;
  late_count: number;
  absent_count: number;
  today_status: AttendanceStatus | null;
  biometric_method: BiometricMethod | null;
  check_in_time: string | null;
  minutes_after_start: number | null;
  webauthn_credential_id?: string | null;
  medical: MedicalEmergencyProfile;
}

function mapRowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    groupId: row.group_id,
    fullName: row.full_name,
    documentType: row.document_type,
    documentNumber: row.document_number,
    grade: row.grade,
    guardianName: row.guardian_name ?? "",
    guardianPhone: row.guardian_phone ?? "",
    guardianEmail: row.guardian_email,
    address: row.address ?? "",
    lateCount: row.late_count ?? 0,
    absentCount: row.absent_count ?? 0,
    todayStatus: row.today_status ?? undefined,
    biometricMethod: row.biometric_method ?? undefined,
    checkInTime: row.check_in_time ?? undefined,
    minutesAfterStart: row.minutes_after_start ?? 0,
    webauthnCredentialId: row.webauthn_credential_id ?? undefined,
    medical: row.medical,
  };
}

function mapStudentToRow(student: Student) {
  return {
    id: student.id,
    group_id: student.groupId,
    full_name: student.fullName,
    document_type: student.documentType,
    document_number: student.documentNumber,
    grade: student.grade,
    guardian_name: student.guardianName ?? "",
    guardian_phone: student.guardianPhone ?? "",
    guardian_email: student.guardianEmail,
    address: student.address ?? "",
    late_count: student.lateCount,
    absent_count: student.absentCount,
    today_status: student.todayStatus ?? null,
    biometric_method: student.biometricMethod ?? null,
    check_in_time: student.checkInTime ?? null,
    minutes_after_start: student.minutesAfterStart ?? 0,
    webauthn_credential_id: student.webauthnCredentialId ?? null,
    medical: student.medical,
  };
}

export async function seedInitialDataToSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const groupRows = CLASS_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    subject: g.subject,
    teacher_name: g.teacherName,
    start_time: g.startTime,
    grace_minutes: g.graceMinutes,
    is_open: true,
  }));

  await supabase.from("class_groups").upsert(groupRows, { onConflict: "id" });
  await supabase
    .from("students")
    .upsert(INITIAL_STUDENTS.map(mapStudentToRow), { onConflict: "id" });
}

export async function fetchAllStudentsFromSupabase(): Promise<Student[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return INITIAL_STUDENTS;

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error leyendo students de Supabase:", error.message);
    return INITIAL_STUDENTS;
  }

  if (!data || data.length === 0) {
    await seedInitialDataToSupabase();
    return INITIAL_STUDENTS;
  }

  return (data as StudentRow[]).map(mapRowToStudent);
}

export async function upsertStudentInSupabase(student: Student): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(
      "No hay conexión configurada con Supabase (revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel)."
    );
  }

  const { error } = await supabase
    .from("students")
    .upsert(mapStudentToRow(student), { onConflict: "id" });

  if (error) {
    console.error("Error guardando estudiante en Supabase:", error);
    throw new Error(`Supabase rechazó el guardado: ${error.message}`);
  }
}

export async function deleteStudentFromSupabase(studentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) {
    console.error("Error eliminando estudiante de Supabase:", error.message);
  }
}

export async function updateStudentAttendanceInSupabase(
  student: Student
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("students")
    .update({
      today_status: student.todayStatus ?? null,
      biometric_method: student.biometricMethod ?? null,
      check_in_time: student.checkInTime ?? null,
      minutes_after_start: student.minutesAfterStart ?? 0,
      late_count: student.lateCount,
      absent_count: student.absentCount,
    })
    .eq("id", student.id);

  if (error) {
    console.error("Error actualizando asistencia en Supabase:", error.message);
  }
}

export async function updateStudentMedicalInSupabase(
  studentId: string,
  medical: MedicalEmergencyProfile
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("students")
    .update({ medical })
    .eq("id", studentId);

  if (error) {
    console.error("Error actualizando datos médicos en Supabase:", error.message);
  }
}

export async function linkWebAuthnCredentialToStudent(
  studentId: string,
  credentialIdBase64: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("students")
    .update({ webauthn_credential_id: credentialIdBase64 })
    .eq("id", studentId);

  if (error) {
    console.error("Error vinculando huella en Supabase:", error.message);
  }
}

export async function findStudentByWebAuthnCredential(
  credentialIdBase64: string
): Promise<Student | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("webauthn_credential_id", credentialIdBase64)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToStudent(data as StudentRow);
}

export async function resetSupabaseDemoData(): Promise<Student[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return INITIAL_STUDENTS;

  await supabase.from("students").delete().neq("id", "");
  await seedInitialDataToSupabase();
  return INITIAL_STUDENTS;
}