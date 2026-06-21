/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FileText, Printer, CheckCircle2, Award, Briefcase, Navigation, Euro, Sparkles } from 'lucide-react';
import { WorkEntry, UserSettings, MonthlySignature } from '../types';
import { calculateNetSalary } from '../utils/salaryCalculator';
import { generateArbeitsnachweisPDF } from '../utils/pdfGenerator';
import SignaturePad from './SignaturePad';

interface MonthlyReportTabProps {
  entries: WorkEntry[];
  settings: UserSettings;
  currentMonthKey: string; // YYYY-MM
  signature: MonthlySignature | null;
  onSaveSignature: (role: 'employee' | 'employer', base64: string) => void;
  onClearSignature: (role: 'employee' | 'employer') => void;
}

export default function MonthlyReportTab({
  entries,
  settings,
  currentMonthKey,
  signature,
  onSaveSignature,
  onClearSignature,
}: MonthlyReportTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter entries for selected month keys
  const monthlyEntries = entries.filter((e) => e.date.startsWith(currentMonthKey));

  // Months label helper
  const monthsLabelMap: { [key: string]: string } = {
    '01': 'Januar',
    '02': 'Februar',
    '03': 'März',
    '04': 'April',
    '05': 'Mai',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'August',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Dezember',
  };
  const [yearStr, monthStr] = currentMonthKey.split('-');
  const monthLabel = `${monthsLabelMap[monthStr] || monthStr} ${yearStr}`;

  // Metrics computation
  let totalHours = 0;
  let totalKm = 0;
  let totalTravelMinutes = 0;
  let workDays = 0;
  let vacationDays = 0;
  let sickDays = 0;
  let holidayDays = 0;
  let grossSalary = 0;

  monthlyEntries.forEach((entry) => {
    let entryHours = 0;
    if (entry.type === 'Arbeit') {
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const deductBreak = settings.isBreakPaid !== false ? 0 : entry.breakMinutes;
        entryHours = Math.max(0, (endMin - startMin - deductBreak) / 60);
        totalHours += entryHours;
      }
      workDays++;
      grossSalary += entryHours * (entry.hourlyWage ?? settings.hourlyWage);
    } else if (entry.type === 'Urlaub') {
      vacationDays++;
      entryHours = 8.0;
      totalHours += entryHours; // standard 8h pay
      grossSalary += entryHours * (entry.hourlyWage ?? settings.hourlyWage);
    } else if (entry.type === 'Krank') {
      sickDays++;
      entryHours = 8.0;
      totalHours += entryHours; // standard 8h pay
      grossSalary += entryHours * (entry.hourlyWage ?? settings.hourlyWage);
    } else if (entry.type === 'Feiertag') {
      holidayDays++;
      entryHours = 8.0;
      totalHours += entryHours; // standard 8h pay
      grossSalary += entryHours * (entry.hourlyWage ?? settings.hourlyWage);
    }
    totalKm += entry.travelDistanceKm || 0;
    totalTravelMinutes += entry.travelTimeMinutes || 0;
  });

  const pay = calculateNetSalary(grossSalary, settings);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      generateArbeitsnachweisPDF({
        employeeName: settings.employeeName,
        monthYearLabel: monthLabel,
        costCenter: settings.objektKostenstelle,
        entries: monthlyEntries,
        signature,
        hourlyWage: settings.hourlyWage,
        isBreakPaid: settings.isBreakPaid !== false,
      });
      setIsGenerating(false);
    }, 400);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="monthly-report" className="space-y-6">
      {/* Action Buttons Header */}
      <div id="control-panel" className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          <h3 className="font-bold text-slate-850 flex items-center gap-2">
            <FileText className="text-blue-600 animate-pulse" size={17} />
            Arbeitsnachweis &amp; Auswertung erstellen
          </h3>
          <p className="text-xs text-slate-500 font-medium font-sans">
            Entspricht den gesetzlichen Vorgaben für LSt-Klasse 1 und IKK Berlin/Brandenburg.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            id="print-btn"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial text-xs bg-slate-150 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-lg border border-slate-205 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} /> Drucken / PDF Druck
          </button>
          <button
            id="pdf-download-btn"
            onClick={handleDownloadPDF}
            disabled={isGenerating || monthlyEntries.length === 0}
            className="flex-1 sm:flex-initial text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold px-4.5 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isGenerating ? 'Generiert...' : 'Als PDF herunterladen'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left is official spreadsheet, Right is Payroll calculation stub */}
      <div id="report-split-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: PDF Layout Preview */}
        <div id="pdf-view-card" className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6 print:shadow-none print:border-none print:p-0">
          
          {/* Printable Sheet Wrapper */}
          <div className="space-y-6 print:space-y-4 font-sans">
            
            {/* Header Block of Sheet */}
            <div className="flex justify-between items-start border-b border-slate-150 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Arbeitszeitnachweis
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Mitarbeiter: <span className="font-bold text-slate-800">{settings.employeeName}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                  {monthLabel}
                </span>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Status: Gehaltsbereit</p>
              </div>
            </div>

            {/* Cost center Box */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700 font-sans">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Arbeitgeber-Projektstelle
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {settings.objektKostenstelle || 'Kostenstelle IKEA / Baustellen allgemein'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Abrechnungskreis
                </span>
                <span className="font-mono text-slate-800 font-bold block">
                  Steuerklasse 1, 1 Kind, k.K., IKK BB
                </span>
              </div>
            </div>

            {/* Real Columns as requested: Datum, Arbeitsort, Beginn, Ende, Pause, Stunden insgesamt */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-800 font-bold">
                    <th className="p-2.5 rounded-l-lg font-bold">Datum</th>
                    <th className="p-2.5 font-bold">Arbeitsort / Objekt</th>
                    <th className="p-2.5 font-bold">Beginn &amp; Ende</th>
                    <th className="p-2.5 font-bold text-center">Pause</th>
                    <th className="p-2.5 rounded-r-lg text-right font-bold">Arbeitsstunden insgesamt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        Keine Einträge für diesen Monat vorhanden. Erfasse zuerst Arbeitszeiten im Tab &quot;Zeiterfassung&quot;.
                      </td>
                    </tr>
                  ) : (
                    [...monthlyEntries]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((entry) => {
                        const dateObj = new Date(entry.date);
                        const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'short' });
                        const formattedDateStr = dateObj.toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                        });

                        let rowHours = 0;
                        if (entry.type === 'Arbeit') {
                          const [sh, sm] = entry.startTime.split(':').map(Number);
                          const [eh, em] = entry.endTime.split(':').map(Number);
                          const deductBreak = settings.isBreakPaid !== false ? 0 : entry.breakMinutes;
                          rowHours = Math.max(0, ((eh * 60 + em) - (sh * 60 + sm) - deductBreak) / 60);
                        } else {
                          rowHours = 8.0; // Paid absence
                        }

                        let textClass = 'text-slate-800 font-medium';
                        let labelBg = '';
                        if (entry.type === 'Urlaub') {
                          textClass = 'text-emerald-700 font-bold';
                          labelBg = 'bg-emerald-50';
                        } else if (entry.type === 'Krank') {
                          textClass = 'text-rose-700 font-bold';
                          labelBg = 'bg-rose-50';
                        } else if (entry.type === 'Feiertag') {
                          textClass = 'text-purple-700 font-bold';
                          labelBg = 'bg-purple-50';
                        }

                        return (
                          <tr key={entry.id} className={`hover:bg-slate-50/50 ${labelBg} transition-colors`}>
                            <td className="p-2.5 font-mono text-slate-500 font-bold">
                              {dayName}, {formattedDateStr}
                            </td>
                            <td className={`p-2.5 ${textClass}`}>
                              {entry.type === 'Arbeit' ? entry.location : `🌴 ${entry.location}`}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {entry.type === 'Arbeit' ? `${entry.startTime} - ${entry.endTime}` : 'Lohnfortz.'}
                            </td>
                            <td className="p-2.5 font-mono text-slate-500 text-center">
                              {entry.type === 'Arbeit' ? `${entry.breakMinutes} Min.` : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-950 font-mono">
                              {rowHours.toLocaleString('de-DE', { minimumFractionDigits: 1 })} Std.
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Travel Summary for tax office directly in PDF summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs font-sans">
              <h4 className="font-bold text-slate-700 flex items-center gap-1">
                <Navigation size={13} className="text-blue-600" />
                Zusätzlicher Nachweis für das Finanzamt (Wegstrecke / Fahrzeit)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="font-medium text-slate-600">
                  Gesamtstrecke Fahrtenbuch: <span className="text-slate-900 font-bold">{totalKm} km</span>
                </div>
                <div className="font-medium text-slate-600">
                  Gesamtfahrzeit im Monat: <span className="text-slate-900 font-bold">{Math.floor(totalTravelMinutes / 60)} Std. {totalTravelMinutes % 60} Min</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                * Die Fahrzeit und Kilometer werden getrennt vom eigentlichen Baustellenstunden-Arbeitsnachweis ausgewiesen, verbleiben aber auf dem Beleg fürs Finanzamt.
              </p>
            </div>
            
          </div>

          {/* Double Signature Row - Live Canvas in interactive view, beautifully printed in paper view */}
          <div className="border-t border-slate-200 pt-6">
            <h4 className="font-bold text-sm text-slate-800 mb-3 block flex items-center gap-1.5 font-sans">
              <Award size={15} className="text-blue-600" /> Digitale Freigabe &amp; Unterschriften
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad
                id="sig-employee"
                label={`Arbeitnehmer: ${settings.employeeName}`}
                savedSignature={signature?.employeeSignature || null}
                onSave={(base64) => onSaveSignature('employee', base64)}
                onClear={() => onClearSignature('employee')}
              />
              <SignaturePad
                id="sig-employer"
                label="Arbeitgeber / Polier"
                savedSignature={signature?.employerSignature || null}
                onSave={(base64) => onSaveSignature('employer', base64)}
                onClear={() => onClearSignature('employer')}
              />
            </div>
          </div>

        </div>

        {/* Right 1 Column: Advanced Payroll / Salary stub approximation */}
        <div id="salary-stub-card" className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between h-fit self-start font-sans">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-md text-blue-600">
                <Euro size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-tight font-sans">Gehaltsabrechnung</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wide">
                  Prognose: {monthLabel}
                </span>
              </div>
            </div>

            {/* Calculations metrics breakdown */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Stunden (gesamt):</span>
                <span className="font-bold text-slate-900 font-mono">
                  {totalHours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Stundenlohn:</span>
                <span className="font-bold text-slate-950 font-mono">
                  {settings.hourlyWage.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>

              {/* BRUTTO */}
              <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl font-bold text-slate-900 text-sm">
                <span>Brutto-Lohn:</span>
                <span className="font-mono">
                  {grossSalary.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>

              {/* TAX DEDUCTIONS DETAIL */}
              <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sozialabgaben (IKK BB, 1 Kind)
                </span>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Rentenversicherung (9,3%):</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    -{pay.pensionInsurance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Arbeitslosenvers. (1,3%):</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    -{pay.unemploymentInsurance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Krankenversicherung (IKK 8,395%):</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    -{pay.healthInsurance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Pflegeversicherung (1,7%):</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    -{pay.careInsurance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>

              {/* PROGRESSIVE TAX */}
              <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Steuern (LStKl. 1, k. Kirchenst.)
                </span>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Lohnsteuer progressive:</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    -{pay.incomeTax.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Solidaritätszuschlag (0%):</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">0,00 €</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Kirchensteuer (0%):</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">0,00 €</span>
                </div>
              </div>

              {/* NETTO */}
              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-lg font-bold text-blue-900 text-base mt-2.5">
                <span>Netto-Auszahlung:</span>
                <span className="font-mono">
                  {pay.netSalary.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick tips about tax configuration */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex gap-2 items-start text-[10px] text-slate-500 font-sans mt-2">
            <span className="text-amber-500 shrink-0">⚠️</span>
            <p>
              Berechnungsgrundlage: 1 Kind, keine Kirchenzugehörigkeit, Krankenkasse IKK Berlin/Brandenburg. Zusätzliche Werbungskosten-Pauschalen sind gesetzlich geschätzt.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
