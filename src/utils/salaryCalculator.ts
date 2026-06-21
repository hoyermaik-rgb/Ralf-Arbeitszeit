/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserSettings } from '../types';

export interface SalaryCalculationResult {
  hoursWorked: number;
  grossSalary: number; // Brutto
  pensionInsurance: number; // Rentenversicherung (9.3%)
  unemploymentInsurance: number; // Arbeitslosenversicherung (1.3%)
  healthInsurance: number; // Krankenversicherung IKK BB (8.395%)
  careInsurance: number; // Pflegeversicherung 1 Kind (1.7%)
  totalSocialDeductions: number; // Summe Sozialabgaben
  incomeTax: number; // Lohnsteuer (Steuerklasse 1)
  solidaritySurcharge: number; // Solidaritätszuschlag
  churchTax: number; // Kirchensteuer (0%)
  netSalary: number; // Netto-Auszahlung
}

/**
 * Berechnet Lohnsteuer, Sozialabgaben und Nettoeinkommen für Steuerklasse 1 in Deutschland
 * (unter Beachtung von 1 Kind, keine Kirche, Krankenkasse IKK Berlin/Brandenburg für 2025/2026).
 * 
 * @param monthlyGross Das Bruttomonatsgehalt in Euro
 * @param settings Die Benutzerkonfiguration (für Kind, Krankenkasse etc.)
 */
export function calculateNetSalary(monthlyGross: number, settings: UserSettings): SalaryCalculationResult {
  const result: SalaryCalculationResult = {
    hoursWorked: 0,
    grossSalary: monthlyGross,
    pensionInsurance: 0,
    unemploymentInsurance: 0,
    healthInsurance: 0,
    careInsurance: 0,
    totalSocialDeductions: 0,
    incomeTax: 0,
    solidaritySurcharge: 0,
    churchTax: 0,
    netSalary: monthlyGross,
  };

  if (monthlyGross <= 0) return result;

  // 1. Sozialversicherungsbeiträge (Arbeitnehmeranteile) 2025/2026
  // Rentenversicherung (RV): 9,3 %
  result.pensionInsurance = Number((monthlyGross * 0.093).toFixed(2));

  // Arbeitslosenversicherung (AV): 1,3 %
  result.unemploymentInsurance = Number((monthlyGross * 0.013).toFixed(2));

  // Krankenversicherung (KV) IKK Berlin/Brandenburg:
  // Allgemeiner Beitragssatz: 14,6% (Hälfte AN = 7,3%)
  // Zusatzbeitrag IKK Berlin-Brandenburg: 2,19% ab 2024/2025 (Hälfte AN = 1,095%)
  // Gesamt-AN-Anteil = 7,3% + 1,095% = 8,395%
  const kvRate = (14.6 + 2.19) / 2 / 100; // 0.08395
  result.healthInsurance = Number((monthlyGross * kvRate).toFixed(2));

  // Pflegeversicherung (PV):
  // Bundeseinheitlicher Satz: 3,4% (Hälfte AN = 1,7%, Hälfte AG = 1,7%)
  // Für Kinderlose gilt ein Zusatzbeitrag von 0,60% (nur von AN getragen).
  // Da der Arbeitnehmer 1 Kind hat ("1 Kind"), entfällt dieser Zusatzbeitrag.
  // Er zahlt also den regulären Arbeitnehmeranteil von genau 1,7%.
  result.careInsurance = Number((monthlyGross * 0.017).toFixed(2));

  // Gesamte Sozialabgaben AN
  result.totalSocialDeductions = Number(
    (
      result.pensionInsurance +
      result.unemploymentInsurance +
      result.healthInsurance +
      result.careInsurance
    ).toFixed(2)
  );

  // 2. Lohnsteuerberechnung (Steuerklasse 1, progressive Einkommensteuer-Formel 2025/2026)
  // Auf das Jahr hochrechnen, um Freibeträge korrekt anzuwenden
  const annualGross = monthlyGross * 12;

  // Abzug des Werbungskosten-Pauschbetrags: 1.230 € pro Jahr
  // Abzug der Vorsorgepauschale (Schätzung ca. 20% des Brutto für RV, KV, PV - gedeckelt)
  const workerAllowance = 1230;
  // Rentenversicherung wird als Sonderausgaben berücksichtigt (Vorsorgepauschale)
  const pensionAllowance = Math.min(annualGross * 0.093, 27500); 
  const kvPvAllowance = Math.min(annualGross * kvRate + annualGross * 0.017, 1900);
  const totalVorsorge = pensionAllowance + kvPvAllowance;

  // Zu versteuerndes Einkommen (zvE) im Jahr:
  const zvE = Math.max(0, annualGross - workerAllowance - totalVorsorge);

  // Progressive Steuerberechnung für das Jahr 2025/2026
  // Grundfreibetrag 2025/2026: ca. 12.348 €
  const grundfreibetrag = 12348;
  let annualTax = 0;

  if (zvE <= grundfreibetrag) {
    annualTax = 0;
  } else if (zvE <= 17400) {
    const y = (zvE - grundfreibetrag) / 10000;
    annualTax = (945.41 * y + 1400) * y;
  } else if (zvE <= 66760) {
    const z = (zvE - 17400) / 10000;
    annualTax = (174.5 * z + 2397) * z + 967;
  } else {
    // Spitzensteuersatz 42% oberhalb von 66.760 €
    annualTax = 0.42 * zvE - 9975;
  }

  // Monatliche Lohnsteuer
  result.incomeTax = Number((annualTax / 12).toFixed(2));

  // Solidaritätszuschlag (fällt erst bei sehr hohem zvE an, Freigrenze ca. 68.400 € zvE)
  if (zvE > 68400) {
    result.solidaritySurcharge = Number((result.incomeTax * 0.055).toFixed(2));
  } else {
    result.solidaritySurcharge = 0;
  }

  // Keine Kirche (Benutzervorgabe)
  result.churchTax = 0;

  // Netto-Auszahlung
  result.netSalary = Number(
    (
      monthlyGross -
      result.totalSocialDeductions -
      result.incomeTax -
      result.solidaritySurcharge -
      result.churchTax
    ).toFixed(2)
  );

  return result;
}
