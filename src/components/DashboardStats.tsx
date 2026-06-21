/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, Euro, Calendar, Navigation } from 'lucide-react';
import { calculateNetSalary } from '../utils/salaryCalculator';
import { WorkEntry, UserSettings } from '../types';

interface DashboardStatsProps {
  entries: WorkEntry[];
  settings: UserSettings;
  remainingVacation: number;
  currentMonthKey: string; // YYYY-MM
}

export default function DashboardStats({
  entries,
  settings,
  remainingVacation,
  currentMonthKey,
}: DashboardStatsProps) {
  // Filter entries for current month
  const currentMonthEntries = entries.filter((e) => e.date.startsWith(currentMonthKey));

  // Compute total monthly hours
  let totalHours = 0;
  let totalKm = 0;
  let grossSalary = 0;

  currentMonthEntries.forEach((entry) => {
    let entryMinutes = 0;
    if (entry.type === 'Arbeit') {
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const deductBreak = settings.isBreakPaid !== false ? 0 : entry.breakMinutes;
        const workedMinutes = endMin - startMin - deductBreak;
        entryMinutes = Math.max(0, workedMinutes);
        const hours = entryMinutes / 60;
        totalHours += hours;
        grossSalary += hours * (entry.hourlyWage ?? settings.hourlyWage);
      }
    } else if (entry.type === 'Urlaub' || entry.type === 'Krank' || entry.type === 'Feiertag') {
      // 8 Stunden Lohnfortzahlung
      totalHours += 8.0;
      grossSalary += 8.0 * (entry.hourlyWage ?? settings.hourlyWage);
    }
    totalKm += entry.travelDistanceKm || 0;
  });

  const salaryDetails = calculateNetSalary(grossSalary, settings);

  return (
    <div id="dashboard-stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Stunden-Card */}
      <div id="stat-hours" className="bg-slate-900 text-white rounded-lg p-4 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform border border-slate-850">
        <div className="flex justify-between items-start">
          <div className="bg-slate-800 p-2 rounded-md text-blue-400">
            <Clock size={18} />
          </div>
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase bg-slate-800/60 px-2 py-0.5 rounded-md font-bold">
            Monat
          </span>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight">
            {totalHours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Arbeitszeitgesamt</div>
        </div>
      </div>

      {/* Netto-Gehalt-Card */}
      <div id="stat-salary" className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform">
        <div className="flex justify-between items-start">
          <div className="bg-blue-50 p-2 rounded-md text-blue-600">
            <Euro size={18} />
          </div>
          <span className="text-[10px] font-mono tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md font-bold">
            Netto Est.
          </span>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">
            {salaryDetails.netSalary.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
            Brutto: {grossSalary.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {/* Urlaub-Card */}
      <div id="stat-vacation" className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform">
        <div className="flex justify-between items-start">
          <div className="bg-slate-50 p-2 rounded-md text-slate-600">
            <Calendar size={18} />
          </div>
          <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded-md font-bold">
            Urlaub
          </span>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            {remainingVacation} Tage
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">übrig in diesem Jahr</div>
        </div>
      </div>

      {/* Finanzamt-Card */}
      <div id="stat-travel" className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-32 hover:scale-[1.01] transition-transform">
        <div className="flex justify-between items-start">
          <div className="bg-slate-50 p-2 rounded-md text-slate-600">
            <Navigation size={18} />
          </div>
          <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded-md font-bold">
            Fahrtweg
          </span>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            {totalKm.toLocaleString('de-DE')} km
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Wegstrecke (Monat)</div>
        </div>
      </div>
    </div>
  );
}
