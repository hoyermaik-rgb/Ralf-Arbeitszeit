/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntryType = 'Arbeit' | 'Urlaub' | 'Krank' | 'Feiertag';

export interface WorkEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: EntryType;
  location: string; // Arbeitsort / Objekt
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakMinutes: number; // Pause in Minuten
  notes?: string;
  
  // Tax / Finanzamt tracking
  travelTimeMinutes: number; // Fahrzeit in Minuten
  travelDistanceKm: number; // Wegstrecke in km

  // Cached hourly wage (from site/tariff) at the time of entry logging
  hourlyWage?: number;
}

export interface TarifvertragLevel {
  id: string;
  name: string; // e.g. "Lohngruppe 1 (Einstiegslohn)", "Lohngruppe 3 (Geselle)"
  hourlyWage: number;
}

export interface SavedObject {
  id: string;
  name: string; // Name des Objekts, z.B. "IKEA Tempelhof"
  distanceKm: number; // Wegstrecke in km
  travelTimeMinutes: number; // Fahrtzeit in Minuten
  hourlyWage: number; // Stundenlohn (eigen oder gezogener Tariflohn)
  tariffLevelId?: string; // Verknüpft mit Tarifvertrag Level ID (falls dynamisch)
}

export interface VacationYear {
  year: number;
  entitlement: number; // Urlaubsanspruch in Tagen, z.B. 30
}

export interface MonthlySignature {
  monthKey: string; // YYYY-MM
  employeeSignature: string | null; // Base64 signature image
  employeeSignedAt: string | null; // ISO Timestamp
  employerSignature: string | null; // Base64 signature image
  employerSignedAt: string | null; // ISO Timestamp
}

export interface UserSettings {
  employeeName: string;
  defaultLocation: string;
  objektKostenstelle: string; // Objektkostenstelle für PDF Header
  hourlyWage: number; // Stundenlohn in Euro
  
  // Standardsteuerdaten (gemäß Benutzervorgabe fest oder anpassbar dargeboten)
  taxClass: number; // standard 1
  childrenCount: number; // standard 1
  hasChurchTax: boolean; // standard false
  healthInsurance: string; // standard "IKK Berlin/Brandenburg"
  isBreakPaid?: boolean; // ob Pausenzeit bezahlt wird
}

export interface RosterShift {
  id: string;
  date: string; // YYYY-MM-DD
  type: EntryType;
  location: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakMinutes: number;
  notes?: string;
  hourlyWage?: number;
}
