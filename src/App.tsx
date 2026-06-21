/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Clock, CalendarRange, TrendingUp, Sunset, Settings, Hammer, Sparkles, Navigation, Euro, HelpCircle, Zap, Calendar, FileText } from 'lucide-react';
import { EntryType, WorkEntry, VacationYear, MonthlySignature, UserSettings, SavedObject, TarifvertragLevel, RosterShift } from './types';
import { INITIAL_USER_SETTINGS, INITIAL_VACATION_ALOCATION, INITIAL_WORK_ENTRIES, INITIAL_SAVED_OBJECTS, INITIAL_TARIFF_LEVELS, INITIAL_ROSTER_SHIFTS } from './utils/seedData';
import DashboardStats from './components/DashboardStats';
import TimeLoggerTab from './components/TimeLoggerTab';
import RosterTab from './components/RosterTab';
import MonthlyReportTab from './components/MonthlyReportTab';
import YearlyReportTab from './components/YearlyReportTab';
import VacationTab from './components/VacationTab';
import NotesTab from './components/NotesTab';
import SettingsTab from './components/SettingsTab';
import HelpTab from './components/HelpTab';
import { motion, AnimatePresence } from 'motion/react';

type TabID = 'zeit' | 'dienstplan' | 'monat' | 'jahr' | 'urlaub' | 'notizen' | 'settings' | 'help';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabID>('zeit');
  const [currentMonthKey, setCurrentMonthKey] = useState<string>('2026-06'); // Initialisiert für das Seed-Datenpaket

  // --- STATE WITH LOCALSTORAGE SYNCHRONIZATION ---
  const [entries, setEntries] = useState<WorkEntry[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_entries');
    return saved ? JSON.parse(saved) : INITIAL_WORK_ENTRIES;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('zeiterfassung_settings');
    return saved ? JSON.parse(saved) : INITIAL_USER_SETTINGS;
  });

  const [objects, setObjects] = useState<SavedObject[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_objects');
    return saved ? JSON.parse(saved) : INITIAL_SAVED_OBJECTS;
  });

  const [tariffLevels, setTariffLevels] = useState<TarifvertragLevel[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_tariff_levels');
    return saved ? JSON.parse(saved) : INITIAL_TARIFF_LEVELS;
  });

  const [vacationAllocations, setVacationAllocations] = useState<VacationYear[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_vacations');
    return saved ? JSON.parse(saved) : INITIAL_VACATION_ALOCATION;
  });

  const [signatures, setSignatures] = useState<MonthlySignature[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_signatures');
    return saved ? JSON.parse(saved) : [];
  });

  const [rosterShifts, setRosterShifts] = useState<RosterShift[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_roster_shifts');
    return saved ? JSON.parse(saved) : INITIAL_ROSTER_SHIFTS;
  });

  // State elements for Auto-Save visual feedback
  const [lastSaved, setLastSaved] = useState<string>(() => {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  const [showSaveIndicator, setShowSaveIndicator] = useState<boolean>(false);

  const handleAutoSave = () => {
    setLastSaved(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setShowSaveIndicator(true);
  };

  // Sync to localStorage with automatic save feedback
  useEffect(() => {
    localStorage.setItem('zeiterfassung_entries', JSON.stringify(entries));
    handleAutoSave();
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('zeiterfassung_settings', JSON.stringify(settings));
    handleAutoSave();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('zeiterfassung_objects', JSON.stringify(objects));
    handleAutoSave();
  }, [objects]);

  useEffect(() => {
    localStorage.setItem('zeiterfassung_tariff_levels', JSON.stringify(tariffLevels));
    handleAutoSave();
  }, [tariffLevels]);

  useEffect(() => {
    localStorage.setItem('zeiterfassung_vacations', JSON.stringify(vacationAllocations));
    handleAutoSave();
  }, [vacationAllocations]);

  useEffect(() => {
    localStorage.setItem('zeiterfassung_signatures', JSON.stringify(signatures));
    handleAutoSave();
  }, [signatures]);

  useEffect(() => {
    localStorage.setItem('zeiterfassung_roster_shifts', JSON.stringify(rosterShifts));
    handleAutoSave();
  }, [rosterShifts]);

  // Timeout for auto-save state blinker
  useEffect(() => {
    if (showSaveIndicator) {
      const timer = setTimeout(() => {
        setShowSaveIndicator(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showSaveIndicator]);

  // --- MUTATORS ---
  const handleSaveObject = (newObj: Omit<SavedObject, 'id'> & { id?: string }) => {
    setObjects((prev) => {
      const id = newObj.id || `obj-${Date.now()}`;
      const existingIdx = prev.findIndex((o) => o.id === id);
      const saved: SavedObject = { ...newObj, id };
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = saved;
        return copy;
      } else {
        return [...prev, saved];
      }
    });
  };

  const handleDeleteObject = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSaveTariffLevel = (newTariff: Omit<TarifvertragLevel, 'id'> & { id?: string }) => {
    setTariffLevels((prev) => {
      const id = newTariff.id || `tarif-${Date.now()}`;
      const existingIdx = prev.findIndex((t) => t.id === id);
      const saved: TarifvertragLevel = { ...newTariff, id };
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = saved;
        return copy;
      } else {
        return [...prev, saved];
      }
    });
  };

  const handleDeleteTariffLevel = (id: string) => {
    setTariffLevels((prev) => prev.filter((t) => t.id !== id));
    // Also decouple any objects linked to this tariff level
    setObjects((prev) =>
      prev.map((obj) => (obj.tariffLevelId === id ? { ...obj, tariffLevelId: undefined } : obj))
    );
  };

  const handleAddEntry = (newEntry: Omit<WorkEntry, 'id'>) => {
    const entry: WorkEntry = {
      ...newEntry,
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setEntries((prev) => [...prev, entry]);
  };

  const handleUpdateEntry = (updatedEntry: WorkEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddVacationBlock = (dates: string[], notes: string) => {
    const newEntries: WorkEntry[] = dates.map((date, idx) => ({
      id: `vacation-${Date.now()}-${idx}`,
      date,
      type: 'Urlaub',
      location: '🌴 Erholungsurlaub',
      startTime: '',
      endTime: '',
      breakMinutes: 0,
      travelDistanceKm: 0,
      travelTimeMinutes: 0,
      notes,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  };

  const handleDeleteEntriesByDates = (dates: string[]) => {
    setEntries((prev) => prev.filter((e) => !dates.includes(e.date)));
  };

  const handleAddRosterShift = (newShift: Omit<RosterShift, 'id'>) => {
    const shift: RosterShift = {
      ...newShift,
      id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setRosterShifts((prev) => [...prev, shift]);
  };

  const handleDeleteRosterShift = (id: string) => {
    setRosterShifts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleImportRosterShifts = (shifts: RosterShift[], overwrite: boolean) => {
    let currentEntries = [...entries];
    
    if (overwrite) {
      // Lösche alle Einträge für den aktiven Monat
      currentEntries = currentEntries.filter((e) => !e.date.startsWith(currentMonthKey));
    }

    let addedCount = 0;
    let overwrittenCount = 0;

    const newEntries: WorkEntry[] = [];

    shifts.forEach((shift, idx) => {
      // Prüfen, ob für dieses Datum bereits ein Eintrag existiert
      const existingIdx = currentEntries.findIndex((e) => e.date === shift.date);

      if (existingIdx !== -1) {
        if (!overwrite) {
          // Im "only-missing" Modus ignorieren wir existierende Tage
          return;
        }
      }

      // Baustellensuche zur automatischen Vervollständigung von Kilometern und Fahrzeiten
      const matchedObj = objects.find((o) => o.name === shift.location);
      const travelTimeMinutes = matchedObj ? matchedObj.travelTimeMinutes : 0;
      const travelDistanceKm = matchedObj ? matchedObj.distanceKm : 0;
      let hourlyWage = shift.hourlyWage || settings.hourlyWage;
      if (matchedObj) {
        // Falls verknüpft mit Objekt, dessen Tarif benutzen
        hourlyWage = matchedObj.hourlyWage;
      }

      const workEntry: WorkEntry = {
        id: `entry-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        date: shift.date,
        type: shift.type,
        location: shift.location,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        notes: shift.notes || 'Aus Dienstplan importiert',
        travelTimeMinutes,
        travelDistanceKm,
        hourlyWage,
      };

      if (existingIdx !== -1 && overwrite) {
        currentEntries[existingIdx] = workEntry;
        overwrittenCount++;
      } else {
        newEntries.push(workEntry);
        addedCount++;
      }
    });

    setEntries([...currentEntries, ...newEntries]);
    return { added: addedCount, overwritten: overwrittenCount };
  };

  const handleImportBackupData = (backup: Record<string, any>) => {
    Object.entries(backup).forEach(([key, val]) => {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    });
    // Trigger reloading state from localStorage
    const savedEntries = localStorage.getItem('zeiterfassung_entries');
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    
    const savedSettings = localStorage.getItem('zeiterfassung_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    const savedObjects = localStorage.getItem('zeiterfassung_objects');
    if (savedObjects) setObjects(JSON.parse(savedObjects));

    const savedTariffs = localStorage.getItem('zeiterfassung_tariff_levels');
    if (savedTariffs) setTariffLevels(JSON.parse(savedTariffs));

    const savedVacations = localStorage.getItem('zeiterfassung_vacations');
    if (savedVacations) setVacationAllocations(JSON.parse(savedVacations));

    const savedSignatures = localStorage.getItem('zeiterfassung_signatures');
    if (savedSignatures) setSignatures(JSON.parse(savedSignatures));

    const savedRoster = localStorage.getItem('zeiterfassung_roster_shifts');
    if (savedRoster) setRosterShifts(JSON.parse(savedRoster));
  };

  const handleImportWorkEntries = (newEntries: WorkEntry[]) => {
    setEntries((prev) => {
      // Overwrite any with exact same date to prevent duplication, then sort by date
      const filteredPrev = prev.filter(p => !newEntries.some(ne => ne.date === p.date));
      return [...filteredPrev, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleClearAllData = () => {
    setEntries([]);
    setRosterShifts([]);
    setSignatures([]);
    setObjects([]);
    setTariffLevels([]);
    setVacationAllocations([
      { year: 2025, entitlement: 30 },
      { year: 2026, entitlement: 30 },
    ]);
    setSettings({
      employeeName: '',
      defaultLocation: '',
      objektKostenstelle: '',
      hourlyWage: 12.50,
      taxClass: 1,
      childrenCount: 1,
      hasChurchTax: false,
      healthInsurance: 'IKK Berlin/Brandenburg',
      isBreakPaid: true,
    });
  };

  const handleUpdateVacationAllocation = (year: number, entitlement: number) => {
    setVacationAllocations((prev) => {
      const idx = prev.findIndex((v) => v.year === year);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx].entitlement = entitlement;
        return copy;
      } else {
        return [...prev, { year, entitlement }];
      }
    });
  };

  const handleSaveSignature = (role: 'employee' | 'employer', base64: string) => {
    setSignatures((prev) => {
      const currentIdx = prev.findIndex((s) => s.monthKey === currentMonthKey);
      const timestamp = new Date().toISOString();
      
      if (currentIdx !== -1) {
        const copy = [...prev];
        if (role === 'employee') {
          copy[currentIdx].employeeSignature = base64;
          copy[currentIdx].employeeSignedAt = timestamp;
        } else {
          copy[currentIdx].employerSignature = base64;
          copy[currentIdx].employerSignedAt = timestamp;
        }
        return copy;
      } else {
        return [
          ...prev,
          {
            monthKey: currentMonthKey,
            employeeSignature: role === 'employee' ? base64 : null,
            employeeSignedAt: role === 'employee' ? timestamp : null,
            employerSignature: role === 'employer' ? base64 : null,
            employerSignedAt: role === 'employer' ? timestamp : null,
          },
        ];
      }
    });
  };

  const handleClearSignature = (role: 'employee' | 'employer') => {
    setSignatures((prev) => {
      const currentIdx = prev.findIndex((s) => s.monthKey === currentMonthKey);
      if (currentIdx === -1) return prev;
      
      const copy = [...prev];
      if (role === 'employee') {
        copy[currentIdx].employeeSignature = null;
        copy[currentIdx].employeeSignedAt = null;
      } else {
        copy[currentIdx].employerSignature = null;
        copy[currentIdx].employerSignedAt = null;
      }
      return copy;
    });
  };

  // Helper remaining vacation computed
  const currentYearVal = new Date().getFullYear();
  const yearlyAlloc = vacationAllocations.find((v) => v.year === currentYearVal)?.entitlement ?? 30;
  const takenVacationCount = entries.filter(
    (e) => e.type === 'Urlaub' && new Date(e.date).getFullYear() === currentYearVal
  ).length;
  const remainingVacationTotal = Math.max(0, yearlyAlloc - takenVacationCount);

  // Active signature lookup
  const currentMonthSignature = signatures.find((s) => s.monthKey === currentMonthKey) || null;

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-20 md:pb-0 font-sans">
      
      {/* SIDEBAR ON DESKTOP, HEADER ON MOBILE OR TABLET */}
      <aside
        id="app-sidebar"
        className="w-full md:w-64 md:h-screen md:sticky md:top-0 bg-slate-900 text-white border-r border-slate-950 flex flex-col justify-between shrink-0 p-5 shadow-2xl z-40"
      >
        <div className="space-y-6">
          {/* Brand/AppName header logo AC/DC High Voltage Styled */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 p-2 rounded-xl text-white shadow-lg shadow-red-500/40 animate-pulse">
              <Zap size={20} className="fill-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs tracking-widest uppercase font-mono flex items-center text-red-50">
                TIME<span className="text-red-500 font-extrabold text-sm shrink-0 animate-bounce mx-0.5">⚡</span>TRACK
              </h1>
              <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest block">
                HIGH VOLTAGE WORKER
              </span>
            </div>
          </div>

          {/* Desktop Navigation list */}
          <nav id="desktop-navigation" className="hidden md:flex flex-col gap-1.5">
            <button
              id="nav-zeit"
              onClick={() => setActiveTab('zeit')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'zeit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <Clock size={16} /> Zeiterfassung
            </button>

            <button
              id="nav-dienstplan"
              onClick={() => setActiveTab('dienstplan')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dienstplan'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <Calendar size={16} /> Dienstplan (Soll)
            </button>

            <button
              id="nav-monat"
              onClick={() => setActiveTab('monat')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'monat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <CalendarRange size={16} /> Monatsauswertung
            </button>

            <button
              id="nav-jahr"
              onClick={() => setActiveTab('jahr')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'jahr'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <TrendingUp size={16} /> Jahresauswertung
            </button>

            <button
              id="nav-urlaub"
              onClick={() => setActiveTab('urlaub')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'urlaub'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <Sunset size={16} /> Urlaubsplaner
            </button>

            <button
              id="nav-notizen"
              onClick={() => setActiveTab('notizen')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'notizen'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <FileText size={16} /> Notizen &amp; Sprüche
            </button>

            <button
              id="nav-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <Settings size={16} /> Einstellungen
            </button>

            <button
              id="nav-help"
              onClick={() => setActiveTab('help')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'help'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/55'
              }`}
            >
              <HelpCircle size={16} /> Hilfe &amp; Handbuch
            </button>
          </nav>
        </div>

        {/* User Mini-Profile block */}
        <div className="hidden md:block pt-3 border-t border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
            Angemeldet als:
          </span>
          <div className="font-bold text-xs truncate">{settings.employeeName || 'Maik Hoyer'}</div>
          <span className="text-[9px] text-blue-400 font-mono tracking-tight block">
            Stundenlohn: {settings.hourlyWage.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>

          {/* VISUAL DESKTOP AUTO-SAVE INDICATOR */}
          <div className="mt-3 bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 transition-opacity ${showSaveIndicator ? 'opacity-100' : 'opacity-20'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${showSaveIndicator ? 'bg-emerald-400' : 'bg-emerald-600/70'}`}></span>
              </span>
              <span className="text-[9px] font-extrabold text-slate-400 tracking-wide uppercase">Auto-Save</span>
            </div>
            <span className="text-[8px] font-mono text-slate-400 font-semibold">{lastSaved}</span>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <header
        id="mobile-header"
        className="md:hidden bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md border-b border-slate-850"
      >
        <button
          onClick={() => setActiveTab('help')}
          className="flex items-center gap-2 active:opacity-75 transition-opacity"
        >
          <div className="bg-gradient-to-r from-red-650 to-orange-550 p-1.5 rounded-lg text-white">
            <Zap className="fill-white animate-pulse" size={14} />
          </div>
          <span className="font-extrabold text-xs tracking-wider uppercase font-mono text-red-50 flex items-center">
            TIME<span className="text-red-500 font-extrabold mx-0.5">⚡</span>TRACK
          </span>
        </button>
        
        <div className="flex items-center gap-2.5">
          {/* Mobile Auto-Save Indicator */}
          <div className="flex flex-col items-end mr-0.5 text-[8px] font-mono leading-none select-none">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className={`h-1 w-1 rounded-full bg-emerald-400 ${showSaveIndicator ? 'scale-125 animate-pulse' : 'opacity-70'}`}></span>
              <span>Gespeichert</span>
            </span>
            <span className="text-[7px] text-slate-450 mt-0.5">{lastSaved}</span>
          </div>

          <button
            onClick={() => setActiveTab('help')}
            className={`p-1.5 rounded-lg transition-colors ${
              activeTab === 'help' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-300'
            }`}
            title="Hilfe &amp; Handbuch"
          >
            <HelpCircle size={16} />
          </button>
          <div className="text-right text-xs">
            <span className="font-bold text-slate-100 block">{settings.employeeName}</span>
            <span className="text-[9px] text-blue-300 font-mono font-bold">LStKl. 1 + IKK BB</span>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main id="app-main-content-flow" className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Dynamic Month statistics dashboard summary */}
        <DashboardStats
          entries={entries}
          settings={settings}
          remainingVacation={remainingVacationTotal}
          currentMonthKey={currentMonthKey}
        />

        {/* PRIMARY ACTIVE TAB VIEW WITH SMOOTH MOTION FADE TRANSITION */}
        <div className="min-h-[60vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              {activeTab === 'zeit' && (
                <TimeLoggerTab
                  entries={entries}
                  settings={settings}
                  objects={objects}
                  tariffLevels={tariffLevels}
                  onAddEntry={handleAddEntry}
                  onUpdateEntry={handleUpdateEntry}
                  onDeleteEntry={handleDeleteEntry}
                  currentMonthKey={currentMonthKey}
                  setCurrentMonthKey={setCurrentMonthKey}
                />
              )}

              {activeTab === 'dienstplan' && (
                <RosterTab
                  rosterShifts={rosterShifts}
                  onAddRosterShift={handleAddRosterShift}
                  onDeleteRosterShift={handleDeleteRosterShift}
                  onImportShiftsToTimeLogger={handleImportRosterShifts}
                  entries={entries}
                  settings={settings}
                  objects={objects}
                  currentMonthKey={currentMonthKey}
                  setCurrentMonthKey={setCurrentMonthKey}
                />
              )}

              {activeTab === 'monat' && (
                <MonthlyReportTab
                  entries={entries}
                  settings={settings}
                  currentMonthKey={currentMonthKey}
                  signature={currentMonthSignature}
                  onSaveSignature={handleSaveSignature}
                  onClearSignature={handleClearSignature}
                />
              )}

              {activeTab === 'jahr' && (
                <YearlyReportTab
                  entries={entries}
                  settings={settings}
                  vacationAllocations={vacationAllocations}
                />
              )}

              {activeTab === 'urlaub' && (
                <VacationTab
                  entries={entries}
                  vacationAllocations={vacationAllocations}
                  onAddVacationBlock={handleAddVacationBlock}
                  onDeleteEntriesByDates={handleDeleteEntriesByDates}
                  onUpdateAllocation={handleUpdateVacationAllocation}
                />
              )}

              {activeTab === 'notizen' && (
                <NotesTab />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  settings={settings}
                  onSaveSettings={setSettings}
                  objects={objects}
                  tariffLevels={tariffLevels}
                  onSaveObject={handleSaveObject}
                  onDeleteObject={handleDeleteObject}
                  onSaveTariffLevel={handleSaveTariffLevel}
                  onDeleteTariffLevel={handleDeleteTariffLevel}
                  onImportBackupData={handleImportBackupData}
                  onImportWorkEntries={handleImportWorkEntries}
                  onClearAllData={handleClearAllData}
                />
              )}

              {activeTab === 'help' && (
                <HelpTab />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* NATIVE-LIKE MOBILE BOTTOM APP NAVIGATION */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 grid grid-cols-8 text-[8px] items-center justify-items-center font-bold text-slate-500 shadow-xl z-50 px-0.5"
      >
        <button
          id="m-nav-zeit"
          onClick={() => setActiveTab('zeit')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'zeit' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Clock size={15} className={activeTab === 'zeit' ? 'scale-110 text-blue-600' : ''} />
          <span>Eintrag</span>
        </button>

        <button
          id="m-nav-dienstplan"
          onClick={() => setActiveTab('dienstplan')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'dienstplan' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Calendar size={15} className={activeTab === 'dienstplan' ? 'scale-110 text-blue-600' : ''} />
          <span>Dienstpl.</span>
        </button>

        <button
          id="m-nav-monat"
          onClick={() => setActiveTab('monat')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'monat' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <CalendarRange size={15} className={activeTab === 'monat' ? 'scale-110 text-blue-600' : ''} />
          <span>Auswertung</span>
        </button>

        <button
          id="m-nav-jahr"
          onClick={() => setActiveTab('jahr')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'jahr' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <TrendingUp size={15} className={activeTab === 'jahr' ? 'scale-110 text-blue-600' : ''} />
          <span>Jahresb.</span>
        </button>

        <button
          id="m-nav-urlaub"
          onClick={() => setActiveTab('urlaub')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'urlaub' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Sunset size={15} className={activeTab === 'urlaub' ? 'scale-110 text-blue-600' : ''} />
          <span>Urlaub</span>
        </button>

        <button
          id="m-nav-notizen"
          onClick={() => setActiveTab('notizen')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'notizen' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <FileText size={15} className={activeTab === 'notizen' ? 'scale-110 text-blue-600' : ''} />
          <span>Notizen</span>
        </button>

        <button
          id="m-nav-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'settings' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Settings size={15} className={activeTab === 'settings' ? 'scale-110 text-blue-600' : ''} />
          <span>Optionen</span>
        </button>

        <button
          id="m-nav-help"
          onClick={() => setActiveTab('help')}
          className={`flex flex-col items-center gap-1 w-full justify-center h-full active:bg-slate-50 transition-all ${
            activeTab === 'help' ? 'text-blue-600 font-extrabold' : 'text-slate-400'
          }`}
        >
          <HelpCircle size={15} className={activeTab === 'help' ? 'scale-110 text-blue-600' : ''} />
          <span>Hilfe</span>
        </button>
      </nav>


      {/* Dynamic Save Toast Notice */}
      <AnimatePresence>
        {showSaveIndicator && (
          <motion.div
            key="save-toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-20 md:bottom-8 right-4 z-50 bg-slate-900 border border-slate-800 text-slate-100 text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-sm pointer-events-none"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Automatisch lokal gespeichert!</span>
            <span className="text-[10px] font-mono text-slate-400 font-medium ml-1">({lastSaved})</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
