/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CalendarDays, Navigation, TrendingUp, Clock, Euro, Tag, HelpCircle, Download } from 'lucide-react';
import { WorkEntry, UserSettings, VacationYear } from '../types';
import { calculateNetSalary } from '../utils/salaryCalculator';

interface YearlyReportTabProps {
  entries: WorkEntry[];
  settings: UserSettings;
  vacationAllocations: VacationYear[];
}

export default function YearlyReportTab({
  entries,
  settings,
  vacationAllocations,
}: YearlyReportTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Filter entries for the selected calendar year
  const yearlyEntries = entries.filter((e) => {
    const entryYear = new Date(e.date).getFullYear();
    return entryYear === selectedYear;
  });

  // Calculate year totals
  let totalHours = 0;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let totalRegularDays = 0;
  let totalVacationDays = 0;
  let totalSickDays = 0;
  let totalHolidays = 0;

  // Monthly buckets
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthIndexStr = String(i + 1).padStart(2, '0');
    return {
      monthKey: `${selectedYear}-${monthIndexStr}`,
      name: [
        'Januar',
        'Februar',
        'März',
        'April',
        'Mai',
        'Juni',
        'Juli',
        'August',
        'September',
        'Oktober',
        'November',
        'Dezember',
      ][i],
      hours: 0,
      distanceKm: 0,
      travelMin: 0,
      gross: 0,
    };
  });

  let yearGross = 0;

  yearlyEntries.forEach((entry) => {
    const dateObj = new Date(entry.date);
    const monthIdx = dateObj.getMonth(); // 0-11
    
    let hoursWorked = 0;
    if (entry.type === 'Arbeit') {
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      const deductBreak = settings.isBreakPaid !== false ? 0 : entry.breakMinutes;
      hoursWorked = Math.max(0, ((eh * 60 + em) - (sh * 60 + sm) - deductBreak) / 60);
      totalRegularDays++;
    } else if (entry.type === 'Urlaub') {
      hoursWorked = 8.0;
      totalVacationDays++;
    } else if (entry.type === 'Krank') {
      hoursWorked = 8.0;
      totalSickDays++;
    } else if (entry.type === 'Feiertag') {
      hoursWorked = 8.0;
      totalHolidays++;
    }

    const wageRate = entry.hourlyWage ?? settings.hourlyWage;
    const entryGross = hoursWorked * wageRate;
    yearGross += entryGross;

    totalHours += hoursWorked;
    totalDistanceKm += entry.travelDistanceKm || 0;
    totalTravelMinutes += entry.travelTimeMinutes || 0;

    if (monthIdx >= 0 && monthIdx < 12) {
      monthlyStats[monthIdx].hours += hoursWorked;
      monthlyStats[monthIdx].distanceKm += entry.travelDistanceKm || 0;
      monthlyStats[monthIdx].travelMin += entry.travelTimeMinutes || 0;
      monthlyStats[monthIdx].gross += entryGross;
    }
  });

  // Total earnings
  // Let's proxy progressive calculation for the entire year's earnings
  // Estimate Netto on the progressive annual scale
  const yearSalaryAnalysis = calculateNetSalary(yearGross / 12, settings); 
  const yearNet = yearSalaryAnalysis.netSalary * 12;

  // Vacation entitlement for this year
  const alloc = vacationAllocations.find((v) => v.year === selectedYear)?.entitlement || 30;
  const remainingVacation = Math.max(0, alloc - totalVacationDays);

  // Entfernungspauschale projection (0.30 € per km Wegstrecke, Finanzamt)
  const taxRefundCommutation = totalDistanceKm * 0.30;

  return (
    <div id="yearly-report" className="space-y-6">
      {/* Year Selection Selector */}
      <div id="year-filter-bar" className="bg-white p-4 rounded-lg border border-slate-205 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 font-sans">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-blue-600" size={18} />
          <span className="text-sm font-semibold text-slate-800">Kalenderjahr auswerten:</span>
        </div>
        <select
          id="select-year-tracker"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 active:bg-slate-100 cursor-pointer transition-all"
        >
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
          <option value={2027}>2027</option>
        </select>
      </div>

      {/* Grid of Yearly Statistics Metrics */}
      <div id="year-stats-container" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Yearly Working metrics */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between font-sans">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Jahresarbeitsleistung
            </span>
            <div className="p-2 rounded-md bg-slate-100 text-slate-800">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {totalHours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Aufgeteilt auf: {totalRegularDays} Arbeitstage, {totalHolidays} Feiertage, {totalSickDays} AU-Tage.
            </p>
          </div>
        </div>

        {/* Card 2: Projected Annual Income */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between font-sans">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Jahres-Kalkulation (Netto Est.)
            </span>
            <div className="p-2 rounded-md bg-blue-50 text-blue-600">
              <Euro size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600 leading-tight">
              {yearNet.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
              Geschätztes Jahrestotal Brutto: {yearGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
        </div>

        {/* Card 3: Tax Commutation Estimation */}
        <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between text-white font-sans">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Finanzamt Pauschale (Est.)
            </span>
            <div className="p-2 rounded-md bg-slate-800 text-blue-400">
              <Navigation size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-400 leading-tight">
              {taxRefundCommutation.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Basierend auf insgesamt {totalDistanceKm} km Wegstrecke x 0,30 € km-Geld.
            </p>
          </div>
        </div>

      </div>

      {/* Mid row layout: Tax travel ledger & Chart summary */}
      <div id="yearly-grid-details" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Left List of Months Overview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-blue-600" /> Monatsübersicht &amp; Fahrtenauszug
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-md uppercase">
              Finanzamt Nachweise
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {monthlyStats.map((ms) => {
              const estimatedMonthGross = ms.gross;
              return (
                <div key={ms.monthKey} id={`year-month-row-${ms.monthKey}`} className="py-3 flex items-center justify-between text-xs text-slate-705">
                  <div className="w-1/4">
                    <span className="font-bold text-slate-900 text-sm block">{ms.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{ms.monthKey}</span>
                  </div>

                  <div className="text-center w-1/4 font-mono">
                    <span className="font-bold block text-slate-805">
                      {ms.hours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.
                    </span>
                    <span className="text-[10px] text-slate-450 block font-sans">Gesamtzeit</span>
                  </div>

                  <div className="text-center w-1/4 font-mono">
                    <span className="font-bold block text-blue-600">
                      {ms.distanceKm} km
                    </span>
                    <span className="text-[10px] text-slate-450 block font-sans">Fahrtstrecke</span>
                  </div>

                  <div className="text-right w-1/4 font-mono">
                    <span className="font-bold text-slate-900 text-sm block">
                      {estimatedMonthGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <span className="text-[10px] text-slate-450 block font-sans">Verdienst (Brutto)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Help Box: explanation of Finanzamt commuting guidelines */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-4 self-start font-sans">
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <HelpCircle size={15} className="text-amber-500" /> Steuer-Hinweise (Finanzamt)
          </h4>
          
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
            <p>
              In Deutschland können Arbeitnehmer für Fahrten zwischen Wohnung und erster Tätigkeitsstätte (Arbeitsort/Baustelle) eine **Entfernungspauschale** von **0,30 € pro vollen Kilometer** geltend machen.
            </p>
            <p>
              Ab dem 21. Kilometer erhöht sich diese Fernpendlerpauschale für gewöhnlich auf 0,38 € pro Kilometer (je nach aktuellem Steuerjahr).
            </p>
            <p>
              **Fahrzeiten** werden beim Finanzamt in der Regel nicht direkt ausgezahlt, sind aber für den Nachweis von Reisetätigkeiten bei unregelmäßigen Einsatzorten (Dienstreisen, Baustellenwechsel) zur Verpflegungspauschale (Spesen) enorm wichtig!
            </p>
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
              <span className="font-semibold text-slate-800 text-[11px] block">Dein Urlaubsstatistik-Auszug:</span>
              <div className="flex justify-between">
                <span>Urlaubsanspruch {selectedYear}:</span>
                <span className="font-bold text-slate-800">{alloc} Tage</span>
              </div>
              <div className="flex justify-between">
                <span>Genommene Tage:</span>
                <span className="font-bold text-rose-600">{totalVacationDays} Tage</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1">
                <span>Resturlaub übrig:</span>
                <span className="font-bold text-emerald-600">{remainingVacation} Tage</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
