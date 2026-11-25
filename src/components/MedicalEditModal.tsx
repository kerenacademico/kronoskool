// src/components/MedicalEditModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { HeartPulse, Save, X } from "lucide-react";
import { MedicalEmergencyProfile, Student } from "@/lib/types";

interface MedicalEditModalProps {
  student: Student | null;
  onClose: () => void;
  onSaveMedical: (studentId: string, updatedMedical: MedicalEmergencyProfile) => void;
}

export default function MedicalEditModal({
  student,
  onClose,
  onSaveMedical,
}: MedicalEditModalProps) {
  const [bloodType, setBloodType] = useState("O+");
  const [epsName, setEpsName] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [medicationsText, setMedicationsText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (student) {
      setBloodType(student.medical.bloodType);
      setEpsName(student.medical.epsName);
      setAllergiesText(student.medical.criticalAllergies.join(", "));
      setConditionsText(student.medical.medicalConditions.join(", "));
      setMedicationsText(student.medical.medications.join(", "));
      setInstructions(student.medical.emergencyInstructions);
      setContactName(student.medical.emergencyContacts[0]?.name ?? "");
      setContactPhone(student.medical.emergencyContacts[0]?.phone ?? "");
    }
  }, [student]);

  if (!student) return null;

  const parseList = (raw: string, fallback: string) => {
    const items = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : [fallback];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const remainingContacts = student.medical.emergencyContacts.slice(1);
    const updatedContacts = contactName.trim()
      ? [
          {
            name: contactName.trim(),
            relation: "Acudiente principal",
            phone: contactPhone.trim() || "Sin número",
          },
          ...remainingContacts,
        ]
      : student.medical.emergencyContacts;

    const updatedMedical: MedicalEmergencyProfile = {
      ...student.medical,
      bloodType,
      epsName: epsName.trim() || "No especificada",
      criticalAllergies: parseList(allergiesText, "Ninguna conocida"),
      medicalConditions: parseList(conditionsText, "Ninguna registrada"),
      medications: parseList(medicationsText, "Ninguno"),
      emergencyInstructions:
        instructions.trim() || "Contactar de inmediato a los acudientes y servicios de emergencia.",
      emergencyContacts: updatedContacts,
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
    };

    onSaveMedical(student.id, updatedMedical);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ficha Médica de Emergencia (Acudiente)
              </h3>
              <p className="text-xs text-slate-500">
                {student.fullName} • {student.documentType}: {student.documentNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-600">
                Tipo de sangre (RH)
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600">
                EPS / Seguro
              </label>
              <input
                type="text"
                value={epsName}
                onChange={(e) => setEpsName(e.target.value)}
                placeholder="Ej: SURA EPS"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600">
              Alergias críticas (separadas por coma)
            </label>
            <input
              type="text"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="Ej: Penicilina, Maní"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600">
              Condiciones médicas (separadas por coma)
            </label>
            <input
              type="text"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              placeholder="Ej: Asma, Epilepsia, Hipoglucemia"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600">
              Medicamentos o inhaladores (separados por coma)
            </label>
            <input
              type="text"
              value={medicationsText}
              onChange={(e) => setMedicationsText(e.target.value)}
              placeholder="Ej: Salbutamol inhalador"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-600">
                Contacto de emergencia
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre del acudiente"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600">
                Teléfono de emergencia
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="300 000 0000"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600">
              Indicaciones rápidas ante emergencia
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              <Save className="h-4 w-4" />
              Guardar Ficha Médica
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}