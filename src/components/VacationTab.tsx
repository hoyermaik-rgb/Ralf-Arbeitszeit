/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Calendar, Plus, Trash2, Sunset, ClipboardCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { WorkEntry, VacationYear, EntryType } from '../types';

interface VacationTabProps {
  entries: WorkEntry[];
  vacationAllocations: VacationYear[];
  onAddVacationBlock: (dates: string[], notes: string) => void;
  onDeleteEntriesByDates: (dates: string[]) => void;
  onUpdateAllocation: (year: number, entitlement: number) => void;
}

export default function VacationTab({
  entries,
  vacationAllocations,
  onAddVacationBlock,
  onDeleteEntriesByDates,
  onUpdateAllocation,
}: VacationTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Custom quota adjustment state
  const currentAllocation = vacationAllocations.find((v) => v.year === selectedYear)?.entitlement ?? 30;
  const [customEntitlement, setCustomEntitlement] = useState(String(currentAllocation));

  // Find all vacation dates in the database for the selected year
  const vacationEntriesInYear = entries.filter((e) => {
    const entryYear = new Date(e.date).getFullYear();
    return e.type === 'Urlaub' && entryYear === selectedYear;
  });

  // Unique chronological days
  const takenDaysCount = vacationEntriesInYear.length;
  const remainingDaysCount = Math.max(0, currentAllocation - takenDaysCount);

  // Group individual vacation logs into contiguous "blocks" for clean list rendering
  const getVacationBlocks = () => {
    // Sort all individual vacation entries chronologically
    const sortedDays = [...vacationEntriesInYear].sort((a, b) => a.date.localeCompare(b.date));
    if (sortedDays.length === 0) return [];

    const blocks: Array<{ id: string; start: string; end: string; count: number; notes: string; dates: string[] }> = [];
    let currentBlock: typeof blocks[0] | null = null;

    sortedDays.forEach((day) => {
      const dateVal = new Date(day.date);
      
      if (!currentBlock) {
        currentBlock = {
          id: day.id,
          start: day.date,
          end: day.date,
          count: 1,
          notes: day.notes || 'Erholungsurlaub',
          dates: [day.date],
        };
      } else {
        // Evaluate if this day is close enough to append (with weekend gap tolerance)
        const lastDateVal = new Date(currentBlock.end);
        const timeDiff = dateVal.getTime() - lastDateVal.getTime();
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // If dayDiff <= 3 (e.g. Friday to Monday is 3 days), we can merge them into the same block!
        // This makes listing multiple week vacations extremely neat!
        if (dayDiff <= 3 && day.notes === currentBlock.notes) {
          currentBlock.end = day.date;
          currentBlock.count += 1;
          currentBlock.dates.push(day.date);
        } else {
          blocks.push(currentBlock);
          currentBlock = {
            id: day.id,
            start: day.date,
            end: day.date,
            count: 1,
            notes: day.notes || 'Erholungsurlaub',
            dates: [day.date],
          };
        }
      }
    });

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  const vacationBlocks = getVacationBlocks();

  // Handle vacation request / booking
  const handleBookVacation = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!startDate || !endDate) {
      setErrorMsg('Bitte wähle sowohl ein Start- als auch ein Enddatum aus.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('Das Rückkehr-Datum darf nicht vor dem Start-Datum liegen.');
      return;
    }

    // Generate list of dates between start and end (excluding weekends!)
    const targetDates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cursor = new Date(start);

    while (cursor <= end) {
      const dayOfWeek = cursor.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = cursor.toISOString().split('T')[0];
        targetDates.push(dateStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (targetDates.length === 0) {
      setErrorMsg('Der gewählte Zeitraum enthält nur Wochenendtage (Samstag/Sonntag).');
      return;
    }

    // Check for collisions inside the database
    const collisions = entries.filter((e) => targetDates.includes(e.date));
    if (collisions.length > 0) {
      setErrorMsg(`Kollision festgestellt! Es gibt bereits Einträge an folgenden Tagen: ${collisions.map(c => new Date(c.date).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})).join(', ')}.`);
      return;
    }

    // Add vacation
    onAddVacationBlock(targetDates, notes.trim() || 'Erholungsurlaub Sommer');
    
    setSuccessMsg(`Urlaub erfolgreich gebucht! ${targetDates.length} Urlaubstage wurden verbucht (Wochenenden übersprungen).`);
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const handleUpdateAllocation = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(customEntitlement);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateAllocation(selectedYear, parsed);
    }
  };

  return (
    <div id="vacation-planner" className="space-y-6">
      
      {/* Vacation balancing statistics card */}
      <div id="vacation-stats-balance" className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        
        {/* Entitlement Quota */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Jahresanspruch ({selectedYear})
          </span>
          <div>
            <div className="text-3xl font-black text-slate-900 leading-tight">
              {currentAllocation} Tage
            </div>
            {/* Direct Inline Form to update vacation allocation entitlement */}
            <form onSubmit={handleUpdateAllocation} className="flex gap-2 mt-2 pt-2 border-t border-slate-105">
              <input
                id="entitlement-change-input"
                type="number"
                value={customEntitlement}
                onChange={(e) => setCustomEntitlement(e.target.value)}
                className="w-16 text-xs border border-slate-200 rounded-lg px-1.5 py-1 text-center font-bold"
                title="Soll-Tage anpassen"
              />
              <button
                id="entitlement-change-btn"
                type="submit"
                className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-md cursor-pointer"
              >
                Anpassen
              </button>
            </form>
          </div>
        </div>

        {/* Taken Quota */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Genommene Tage ({selectedYear})
          </span>
          <div>
            <div className="text-3xl font-black text-blue-600 leading-tight">
              {takenDaysCount} Tage
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Aufgezeichnete Abwesenheiten im Jahreskalender
            </p>
          </div>
        </div>

        {/* Remaining Quota */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Verbleibender Resturlaub
          </span>
          <div>
            <div className="text-3xl font-black text-emerald-600 leading-tight">
              {remainingDaysCount} Tage
            </div>
            <p className="text-[10px] text-emerald-700 font-bold mt-2 bg-emerald-55 px-2.5 py-1 rounded bg-emerald-50 w-fit uppercase tracking-wider">
              Frei verfügbar für diesen Zeitraum
            </p>
          </div>
        </div>

      </div>

      <div id="vacation-actions-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Book / Request Vacation form (Left 1 Column) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 h-fit">
          <div className="pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Calendar size={16} className="text-blue-600" />
            <h4 className="font-extrabold text-sm text-slate-800">Urlaubsantrag eintragen</h4>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-200">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-205">
              <ClipboardCheck size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleBookVacation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Beginn erster Urlaubstag</label>
              <input
                id="vacation-start-input"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none outline-0 text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Ende letzter Urlaubstag</label>
              <input
                id="vacation-end-input"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none outline-0 text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 inline-flex items-center gap-1">
                <MessageSquare size={11} /> Urlaubszweck (Notiz)
              </label>
              <input
                id="vacation-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Sommererholung, Sonderurlaub"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none outline-0 text-slate-700"
              />
            </div>

            <p className="text-[10px] text-slate-400 leading-snug font-medium italic">
              * Wochenenden (Samstage &amp; Sonntage) werden automatisch als Nulltage bewertet und belasten nicht deinen Bezahlten Urlaubsanspruch!
            </p>

            <button
              id="vacation-book-btn"
              type="submit"
              className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sunset size={14} /> Urlaubstage buchen
            </button>
          </form>
        </div>

        {/* Existing Booked Vacations Block list (Right 2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-105 flex items-center gap-1.5">
            <ClipboardCheck size={16} className="text-emerald-600" />
            <h4 className="font-extrabold text-sm text-slate-800">Gebuchte Urlaubszeiträume</h4>
          </div>

          {vacationBlocks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Sunset className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-sm font-semibold text-slate-600">Keine Urlaubszeiträume eingetragen.</p>
              <p className="text-xs text-slate-400 mt-1">Verwende das linke Formular, um erholsame Tage zu erfassen.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {vacationBlocks.map((block) => {
                const cleanStart = new Date(block.start).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                const cleanEnd = new Date(block.end).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });

                return (
                  <div
                    key={block.id}
                    id={`vacation-block-row-${block.id}`}
                    className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-700"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-850 text-sm">
                          {cleanStart} bis {cleanEnd}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-extrabold px-2 py-0.5 rounded uppercase font-mono">
                          {block.count} Tag{block.count > 1 ? 'e' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium italic font-sans">
                        Notiz: {block.notes}
                      </p>
                    </div>

                    <button
                      id={`delete-vacation-block-btn-${block.id}`}
                      onClick={() => onDeleteEntriesByDates(block.dates)}
                      className="text-xs text-rose-600 hover:bg-rose-50 px-3.5 py-1.5 rounded-lg font-bold border border-rose-100 hover:border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Urlaubstage stornieren"
                    >
                      <Trash2 size={12} /> Stornieren
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
