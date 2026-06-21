/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { 
  Settings, 
  Save, 
  Sparkles, 
  Sliders, 
  ShieldAlert, 
  CheckCircle, 
  Download, 
  Trash2, 
  Edit2, 
  Briefcase, 
  MapPin, 
  Plus, 
  DollarSign, 
  Navigation,
  Clock 
} from 'lucide-react';
import { UserSettings, SavedObject, TarifvertragLevel, WorkEntry, EntryType } from '../types';

interface SettingsTabProps {
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  objects: SavedObject[];
  tariffLevels: TarifvertragLevel[];
  onSaveObject: (obj: Omit<SavedObject, 'id'> & { id?: string }) => void;
  onDeleteObject: (id: string) => void;
  onSaveTariffLevel: (tariff: Omit<TarifvertragLevel, 'id'> & { id?: string }) => void;
  onDeleteTariffLevel: (id: string) => void;
  onImportBackupData: (data: Record<string, any>) => void;
  onImportWorkEntries: (entries: WorkEntry[]) => void;
  onClearAllData: () => void;
}

export default function SettingsTab({ 
  settings, 
  onSaveSettings,
  objects,
  tariffLevels,
  onSaveObject,
  onDeleteObject,
  onSaveTariffLevel,
  onDeleteTariffLevel,
  onImportBackupData,
  onImportWorkEntries,
  onClearAllData
}: SettingsTabProps) {
  // General Profile State
  const [employeeName, setEmployeeName] = useState(settings.employeeName);
  const [defaultLocation, setDefaultLocation] = useState(settings.defaultLocation);
  const [objektKostenstelle, setObjektKostenstelle] = useState(settings.objektKostenstelle);
  const [hourlyWage, setHourlyWage] = useState(settings.hourlyWage);
  const [isBreakPaid, setIsBreakPaid] = useState(settings.isBreakPaid !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tarifvertrag Level form State
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  const [tariffName, setTariffName] = useState('');
  const [tariffWage, setTariffWage] = useState('');
  const [tariffSuccess, setTariffSuccess] = useState(false);

  // Object database form State
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [objName, setObjName] = useState('');
  const [objDistance, setObjDistance] = useState('');
  const [objTravelMin, setObjTravelMin] = useState('');
  const [objTariffId, setObjTariffId] = useState('');
  const [objManualWage, setObjManualWage] = useState('');
  const [objectSuccess, setObjectSuccess] = useState(false);

  // FlexR Pro / CSV Importer states
  const [importJsonSuccess, setImportJsonSuccess] = useState(false);
  const [importJsonError, setImportJsonError] = useState('');
  const [csvError, setCsvError] = useState('');
  const [parsedEntries, setParsedEntries] = useState<WorkEntry[]>([]);
  const [importCsvSuccessMessage, setImportCsvSuccessMessage] = useState('');
  const [csvText, setCsvText] = useState('');

  // Danger Zone custom states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Profile save
  const handleSubmitSettings = (e: FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      employeeName: employeeName.trim(),
      defaultLocation: defaultLocation.trim(),
      objektKostenstelle: objektKostenstelle.trim(),
      hourlyWage: Number(hourlyWage) || 12.50,
      taxClass: 1,
      childrenCount: 1,
      hasChurchTax: false,
      healthInsurance: 'IKK Berlin/Brandenburg',
      isBreakPaid,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetAllAppletData = () => {
    onClearAllData();
    setEmployeeName('');
    setDefaultLocation('');
    setObjektKostenstelle('');
    setHourlyWage(12.50);
    setIsBreakPaid(true);
    setShowClearConfirm(false);
    setClearSuccess(true);
    setTimeout(() => {
      setClearSuccess(false);
    }, 4500);
  };

  // Tariff form submit
  const handleSubmitTariff = (e: FormEvent) => {
    e.preventDefault();
    if (!tariffName.trim() || !tariffWage) return;

    onSaveTariffLevel({
      id: editingTariffId || undefined,
      name: tariffName.trim(),
      hourlyWage: Number(tariffWage)
    });

    setTariffName('');
    setTariffWage('');
    setEditingTariffId(null);
    setTariffSuccess(true);
    setTimeout(() => setTariffSuccess(false), 2000);
  };

  // Trigger editing of tariff
  const handleEditTariff = (level: TarifvertragLevel) => {
    setEditingTariffId(level.id);
    setTariffName(level.name);
    setTariffWage(String(level.hourlyWage));
  };

  // Object form submit
  const handleSubmitObject = (e: FormEvent) => {
    e.preventDefault();
    if (!objName.trim()) return;

    const resolvedDistance = Number(objDistance) || 0;
    const resolvedTravel = Number(objTravelMin) || 0;
    
    // Resolve wage rate
    let finalWage = Number(objManualWage) || settings.hourlyWage;
    if (objTariffId) {
      const selectedTariff = tariffLevels.find(t => t.id === objTariffId);
      if (selectedTariff) {
        finalWage = selectedTariff.hourlyWage;
      }
    }

    onSaveObject({
      id: editingObjectId || undefined,
      name: objName.trim(),
      distanceKm: resolvedDistance,
      travelTimeMinutes: resolvedTravel,
      hourlyWage: finalWage,
      tariffLevelId: objTariffId || undefined
    });

    setObjName('');
    setObjDistance('');
    setObjTravelMin('');
    setObjTariffId('');
    setObjManualWage('');
    setEditingObjectId(null);
    setObjectSuccess(true);
    setTimeout(() => setObjectSuccess(false), 2000);
  };

  // Trigger editing of object
  const handleEditObject = (obj: SavedObject) => {
    setEditingObjectId(obj.id);
    setObjName(obj.name);
    setObjDistance(String(obj.distanceKm));
    setObjTravelMin(String(obj.travelTimeMinutes));
    setObjTariffId(obj.tariffLevelId || '');
    setObjManualWage(String(obj.hourlyWage));
  };

  // JSON exporter
  const handleExportData = () => {
    const exportData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            exportData[key] = JSON.parse(value);
          } catch {
            exportData[key] = value;
          }
        }
      }
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    const today = new Date().toISOString().split('T')[0];
    link.download = `backup_zeiterfassung_${today}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import JSON configuration backup
  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportJsonError('');
    setImportJsonSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        // Basic schema verification
        if (typeof data !== 'object') {
          setImportJsonError('Ungültiges Dateiformat. Bitte wählen Sie ein echtes Backup.');
          return;
        }

        onImportBackupData(data);
        setImportJsonSuccess(true);
        setTimeout(() => setImportJsonSuccess(false), 4000);
      } catch (err) {
        setImportJsonError('Fehler beim Einlesen des Backups. Struktur ist ungültig.');
      }
    };
    reader.readAsText(file);
  };

  // Smart Universal CSV parser (FlexR Pro support inside)
  const parseCSVData = (text: string) => {
    setCsvError('');
    setImportCsvSuccessMessage('');
    setParsedEntries([]);
    
    if (!text.trim()) {
      setCsvError('Bitte geben Sie CSV-Daten ein oder laden Sie eine Datei hoch.');
      return;
    }

    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      setCsvError('Die CSV-Daten müssen mindestens eine Header-Zeile und eine Zeile mit Werten enthalten.');
      return;
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes(',') ? ',' : '\t');
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    let dateIdx = -1;
    let startIdx = -1;
    let endIdx = -1;
    let breakIdx = -1;
    let locationIdx = -1;
    let notesIdx = -1;
    let typeIdx = -1;

    headers.forEach((h, idx) => {
      if (h.includes('datum') || h.includes('date') || h.includes('tag')) dateIdx = idx;
      else if (h.includes('start') || h.includes('anfang') || h.includes('beginn') || h.includes('von')) startIdx = idx;
      else if (h.includes('end') || h.includes('ende') || h.includes('bis')) endIdx = idx;
      else if (h.includes('pause') || h.includes('break')) breakIdx = idx;
      else if (h.includes('ort') || h.includes('location') || h.includes('einsatzort') || h.includes('objekt')) locationIdx = idx;
      else if (h.includes('notiz') || h.includes('note') || h.includes('bemerkung') || h.includes('info')) notesIdx = idx;
      else if (h.includes('typ') || h.includes('art') || h.includes('schicht') || h.includes('type')) typeIdx = idx;
    });

    // Fallbacks if columns are not found or mapped
    if (dateIdx === -1) dateIdx = 0;
    if (startIdx === -1) {
      // Find index containing typical time patterns like ":" in first row
      const firstRowCells = lines[1].split(delimiter);
      const cellIdx = firstRowCells.findIndex(cell => cell.includes(':'));
      startIdx = cellIdx !== -1 ? cellIdx : 1;
    }
    if (endIdx === -1) {
      const firstRowCells = lines[1].split(delimiter);
      const afterStartIdx = firstRowCells.slice(startIdx + 1).findIndex(cell => cell.includes(':'));
      endIdx = afterStartIdx !== -1 ? (startIdx + 1 + afterStartIdx) : (startIdx + 1);
    }
    if (breakIdx === -1) breakIdx = 4;

    const newEntries: WorkEntry[] = [];
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#') || line.trim() === '') continue;

      const cells = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cells.length === 0 || !cells[dateIdx]) continue;

      const rawDate = cells[dateIdx];
      let formattedDate = '';
      
      const deDateMatch = rawDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      const isoDateMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      const shortDeMatch = rawDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);

      if (deDateMatch) {
         formattedDate = `${deDateMatch[3]}-${deDateMatch[2].padStart(2, '0')}-${deDateMatch[1].padStart(2, '0')}`;
      } else if (isoDateMatch) {
         formattedDate = `${isoDateMatch[1]}-${isoDateMatch[2].padStart(2, '0')}-${isoDateMatch[3].padStart(2, '0')}`;
      } else if (shortDeMatch) {
         formattedDate = `20${shortDeMatch[3]}-${shortDeMatch[2].padStart(2, '0')}-${shortDeMatch[1].padStart(2, '0')}`;
      } else {
         try {
           const d = new Date(rawDate);
           if (!isNaN(d.getTime())) {
             formattedDate = d.toISOString().split('T')[0];
           }
         } catch {
           // unparseable
         }
      }

      if (!formattedDate) {
        errorCount++;
        continue;
      }

      let startTime = '07:30';
      if (startIdx < cells.length && cells[startIdx]) {
        const match = cells[startIdx].match(/(\d{1,2}):(\d{2})/);
        if (match) startTime = `${match[1].padStart(2, '0')}:${match[2]}`;
      }

      let endTime = '16:00';
      if (endIdx < cells.length && cells[endIdx]) {
        const match = cells[endIdx].match(/(\d{1,2}):(\d{2})/);
        if (match) endTime = `${match[1].padStart(2, '0')}:${match[2]}`;
      }

      let breakMin = 30;
      if (breakIdx < cells.length && cells[breakIdx]) {
         const cleanBreak = cells[breakIdx].replace(',', '.');
         const num = parseFloat(cleanBreak);
         if (!isNaN(num)) {
           // FlexR often has e.g. 0.5 hours or 30 mins
           breakMin = num <= 5 ? Math.round(num * 60) : Math.round(num);
         }
      }

      const location = locationIdx < cells.length && cells[locationIdx] ? cells[locationIdx] : (settings.defaultLocation || 'Objekt');

      let entryType: EntryType = 'Arbeit';
      if (typeIdx < cells.length && cells[typeIdx]) {
        const typeStr = cells[typeIdx].toLowerCase();
        if (typeStr.includes('urlaub') || typeStr.includes('vacation')) entryType = 'Urlaub';
        else if (typeStr.includes('krank') || typeStr.includes('ill') || typeStr.includes('krankheit')) entryType = 'Krank';
        else if (typeStr.includes('feiertag')) entryType = 'Feiertag';
      }

      const notes = notesIdx < cells.length && cells[notesIdx] ? cells[notesIdx] : 'Importiert aus FlexR Pro';

      const matchedObj = objects.find(o => o.name.toLowerCase() === location.toLowerCase());
      const travelTimeMinutes = matchedObj ? matchedObj.travelTimeMinutes : 0;
      const travelDistanceKm = matchedObj ? matchedObj.distanceKm : 0;
      const finalWage = matchedObj ? matchedObj.hourlyWage : settings.hourlyWage;

      newEntries.push({
        id: `flexr-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        date: formattedDate,
        type: entryType,
        location,
        startTime,
        endTime,
        breakMinutes: breakMin,
        notes,
        travelTimeMinutes,
        travelDistanceKm,
        hourlyWage: finalWage,
      });
    }

    if (newEntries.length === 0) {
      setCsvError('Es konnten keine Zeilen mit korrektem Datumsformat eingelesen werden.');
    } else {
      setParsedEntries(newEntries);
      if (errorCount > 0) {
        setCsvError(`Hinweis: ${errorCount} Zeilen hatten ein ungültiges Datum und wurden übersprungen.`);
      }
    }
  };

  const handleImportParsedEntries = () => {
    if (parsedEntries.length === 0) return;
    onImportWorkEntries(parsedEntries);
    setImportCsvSuccessMessage(`Erfolgreich ${parsedEntries.length} Zeilen in den Stundenzettel importiert!`);
    
    // Clear list after import
    setParsedEntries([]);
    setCsvText('');
    
    // Reset file input if bound
    const fileInput = document.getElementById('csv-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    setTimeout(() => {
      setImportCsvSuccessMessage('');
    }, 4500);
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSVData(text);
    };
    reader.readAsText(file);
  };

  return (
    <div id="settings-tab-wrapper" className="max-w-4xl mx-auto space-y-8 font-sans pb-12">
      
      {/* 1. SECTION: Profile Settings */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings size={17} className="text-slate-500" />
            <h3 className="font-extrabold text-sm text-slate-705">Abrechnungs- &amp; Stammdaten</h3>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded uppercase">
            Mitarbeiterprofil
          </span>
        </div>

        <form onSubmit={handleSubmitSettings} className="p-6 space-y-5">
          {saveSuccess && (
            <div id="settings-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle size={15} /> Änderungen wurden erfolgreich lokal auf deinem Gerät gespeichert!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 font-sans">Name des Arbeitnehmers *</label>
              <input
                id="settings-name"
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none text-slate-700"
                placeholder="z.B. Maik Hoyer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 font-sans">Standard-Stundenlohn (€ brutto/Std.) *</label>
              <input
                id="settings-wage"
                type="number"
                step="0.01"
                min="12.00"
                required
                value={hourlyWage}
                onChange={(e) => setHourlyWage(Number(e.target.value))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none text-slate-705 font-mono font-bold"
                placeholder="z.B. 17.50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1 font-sans">
                Objektkostenstelle (für PDF-Header) *
              </label>
              <input
                id="settings-cost-center"
                type="text"
                required
                value={objektKostenstelle}
                onChange={(e) => setObjektKostenstelle(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none text-slate-700 font-semibold"
                placeholder="z.B. Kostenstelle 44-A (IKEA Tempelhof)"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1 font-sans">Standard-Baustelle (Vorgabe)</label>
              <input
                id="settings-default-loc"
                type="text"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outfit outline-none text-slate-700"
                placeholder="Name der Baustelle für Schnellbuchungen"
              />
            </div>

            <div className="sm:col-span-2 bg-slate-100/50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 font-sans">Bezahlte Pausenzeiten</label>
                <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">Sollen Pausenzeiten als Arbeitszeit voll bezahlt werden? (Pausenzeit wird dann bei der Lohnberechnung nicht abgezogen)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  id="settings-is-break-paid"
                  type="checkbox"
                  checked={isBreakPaid}
                  onChange={(e) => setIsBreakPaid(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Sliders size={13} className="text-blue-600" /> Steuerrechtliche Festwerte
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>Steuerklasse:</span>
                <span className="font-bold text-slate-800 font-mono">1 (Ledig, unv.)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span>Kinderfreibetrag:</span>
                <span className="font-bold text-slate-800 font-mono">1 Kind</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 sm:border-0 pb-1 sm:pb-0">
                <span>Kirchensteuer:</span>
                <span className="font-bold text-slate-800 font-mono">Keine Mitgliedschaft</span>
              </div>
              <div className="flex justify-between">
                <span>Zusatzbeitrag KV:</span>
                <span className="font-bold text-slate-800 font-mono">IKK BB (2,19%)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              id="settings-save-submit"
              type="submit"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={13} /> Speichern &amp; Übernehmen
            </button>
          </div>
        </form>
      </div>

      {/* 2. SECTION: Collective Agreement (Tarifvertrag-Lohnklassen) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Briefcase size={17} className="text-slate-500" />
            <h3 className="font-extrabold text-sm text-slate-705">Tarifvertrag &amp; Lohngruppen</h3>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded uppercase">
            Tarifvertrag-Datenbank
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SubForm to Add/Edit */}
          <form onSubmit={handleSubmitTariff} className="space-y-4 md:border-r md:border-slate-100 md:pr-6">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase">
              <Plus size={13} className="text-indigo-600" /> {editingTariffId ? "Tariflohn ändern" : "Ebene hinzufügen"}
            </h4>

            {tariffSuccess && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-750 p-2 text-[11px] font-semibold rounded">
                ✓ Lohngruppe gespeichert
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-550 mb-1">Bezeichnung Lohngruppe</label>
              <input
                type="text"
                required
                value={tariffName}
                onChange={(e) => setTariffName(e.target.value)}
                placeholder="z.B. Lohngruppe 3 (Geselle)"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-550 mb-1">Stundenlohn (€ brutto)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={tariffWage}
                onChange={(e) => setTariffWage(e.target.value)}
                placeholder="z.B. 19.80"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 outline-none text-slate-700 font-mono font-semibold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded shadow-sm transition-all text-center"
              >
                {editingTariffId ? "Aktualisieren" : "Gruppe sichern"}
              </button>
              {editingTariffId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTariffId(null);
                    setTariffName('');
                    setTariffWage('');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-3 rounded"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>

          {/* List of custom tariff levels */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase">
              Angelegte Entgeltstufen ({tariffLevels.length})
            </h4>

            {tariffLevels.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                Keine Tariflöhne angelegt. Standardlohn deines Profils greift.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                {tariffLevels.map((lvl) => (
                  <div key={lvl.id} className="p-3 flex items-center justify-between text-xs bg-slate-50/40 hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-extrabold text-slate-800 block">{lvl.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {lvl.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700 font-mono bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded text-xs select-all">
                        {lvl.hourlyWage.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}/Std.
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditTariff(lvl)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Lohneinstufung bearbeiten"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTariffLevel(lvl.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Lohneinstufung löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. SECTION: Stored Objects (Objekt-Datenbank) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-105 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapPin size={17} className="text-slate-500" />
            <h3 className="font-extrabold text-sm text-slate-707">Objekt- &amp; Baustellen-Datenbank</h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded uppercase">
            Objektstamm
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SubForm to Add/Edit Baustelle */}
          <form onSubmit={handleSubmitObject} className="space-y-3 md:border-r md:border-slate-100 md:pr-6">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase">
              <Plus size={13} className="text-emerald-600" /> {editingObjectId ? "Objekt anpassen" : "Objekt anlegen"}
            </h4>

            {objectSuccess && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-750 p-2 text-[10px] font-semibold rounded">
                ✓ Objekt erfasst &amp; verknüpft
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-550 mb-0.5">Objektbezeichnung (Baustelle)</label>
              <input
                type="text"
                required
                value={objName}
                onChange={(e) => setObjName(e.target.value)}
                placeholder="z.B. IKEA Tempelhof"
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-550 mb-0.5 flex items-center gap-0.5 text-slate-500">
                  <Navigation size={10} /> Weg (km)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={objDistance}
                  onChange={(e) => setObjDistance(e.target.value)}
                  placeholder="z.B. 28"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-550 mb-0.5 flex items-center gap-0.5 text-slate-500">
                  <Clock size={10} /> Fahrzeit (Min)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={objTravelMin}
                  onChange={(e) => setObjTravelMin(e.target.value)}
                  placeholder="z.B. 40"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-550 mb-0.5 flex items-center gap-0.5">
                Tarifvertragsbindung
              </label>
              <select
                value={objTariffId}
                onChange={(e) => {
                  const val = e.target.value;
                  setObjTariffId(val);
                  if (val) {
                    const linked = tariffLevels.find(t => t.id === val);
                    if (linked) {
                      setObjManualWage(String(linked.hourlyWage));
                    }
                  }
                }}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-700 font-semibold"
              >
                <option value="">Manuelle Lohnschätzung (Kein Vertrag)</option>
                {tariffLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name} ({lvl.hourlyWage} €/h)
                  </option>
                ))}
              </select>
            </div>

            {!objTariffId && (
              <div>
                <label className="block text-[11px] font-bold text-slate-550 mb-0.5">Teilespezifischer Stundenlohn (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={objManualWage}
                  onChange={(e) => setObjManualWage(e.target.value)}
                  placeholder="Zieht standardmäßig Profilwert"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-700 font-mono font-semibold"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded shadow-sm transition-all text-center"
              >
                {editingObjectId ? "Objekt sichern" : "Objekt eintragen"}
              </button>
              {editingObjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingObjectId(null);
                    setObjName('');
                    setObjDistance('');
                    setObjTravelMin('');
                    setObjTariffId('');
                    setObjManualWage('');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-3 rounded"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>

          {/* List of saved objects */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase">
              Angelegte Baustellen / Objekte ({objects.length})
            </h4>

            {objects.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                Keine festen Objekte angelegt. Trage links dein erstes Objekt ein.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {objects.map((obj) => {
                  // Resolve hourly wage reactively if bound to a tariff
                  const resolvedWage = obj.tariffLevelId 
                    ? (tariffLevels.find(t => t.id === obj.tariffLevelId)?.hourlyWage ?? obj.hourlyWage)
                    : obj.hourlyWage;

                  const isBoundToTariff = !!obj.tariffLevelId;

                  return (
                    <div key={obj.id} className="p-3 bg-slate-50/40 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-805 block">{obj.name}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-450 font-mono">
                          <span>Weg: {obj.distanceKm} km</span>
                          <span>|</span>
                          <span>Fahrtzeit: {obj.travelTimeMinutes} Min.</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-bold text-slate-700 font-mono bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded text-xs block">
                            {resolvedWage.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}/h
                          </span>
                          {isBoundToTariff && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-500 font-bold px-1.2 py-0.2 rounded mt-0.5 inline-block">
                              Tarifgebunden
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditObject(obj)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Objekt bearbeiten"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteObject(obj.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Objekt löschen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. SECTION: JSON backup & restore */}
      <div id="export-backup-card" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Download size={17} className="text-slate-505" />
            <h3 className="font-extrabold text-sm text-slate-705">Datensicherung (Export &amp; Import)</h3>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded uppercase">
            Backup-Manager
          </span>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            Sichere deine gesamten erfassten Einträge, Einstellungen und Baustellen-Berechnungen. Erstellte Backups können auf anderen Geräten oder nach dem Wechsel des Browsers jederzeit wieder eingelesen werden.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Export */}
            <div className="p-4 border border-dashed border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase">1. Sichern</h4>
              <p className="text-[10px] text-slate-400">Speichert alle unverschlüsselten lokalen App-Daten in einer sicheren `.json` Datei.</p>
              <button
                id="export-data-btn"
                type="button"
                onClick={handleExportData}
                className="text-xs w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={13} /> Backup herunterladen (JSON)
              </button>
            </div>

            {/* Import */}
            <div className="p-4 border border-dashed border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase">2. Wiederherstellen</h4>
              <p className="text-[10px] text-slate-400">Liest eine zuvor exportierte `.json` Backupdatei wieder ein und stellt alle Einstellungen wieder her.</p>
              
              <div className="relative">
                <input
                  type="file"
                  id="json-import-upload"
                  accept=".json"
                  onChange={handleImportJSONFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('json-import-upload')?.click()}
                  className="text-xs w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-4 py-2.5 rounded-lg transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={13} /> Backup-Datei einlesen...
                </button>
              </div>

              {importJsonSuccess && (
                <div className="text-[11px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg text-center">
                  ✔️ Backup erfolgreich eingelesen und geladen!
                </div>
              )}
              {importJsonError && (
                <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg text-center">
                  ❌ {importJsonError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECTION: FlexR Pro & CSV Schnittstelle */}
      <div id="flexr-import-card" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sliders size={17} className="text-slate-550" />
            <h3 className="font-extrabold text-sm text-slate-705">FlexR Pro &amp; CSV Datenimport-Schnittstelle</h3>
          </div>
          <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded uppercase animate-pulse">
            Schnittstelle
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-blue-50 text-blue-900 p-4 rounded-2xl space-y-1.5 border border-blue-100 font-sans">
            <span className="font-extrabold text-xs block">💡 So importierst du deine alten Schichten aus FlexR Pro:</span>
            <ol className="text-[11px] text-slate-600 list-decimal pl-4 space-y-1 font-medium">
              <li>Öffne deine <strong>FlexR Pro</strong> App auf deinem Smartphone.</li>
              <li>Wähle in den Einstellungen / Exporten <strong>"Exportieren als CSV"</strong> oder <strong>"Schichtenbericht"</strong>.</li>
              <li>Sende die Datei an deinen PC/Browser oder kopiere den CSV-Textinhalt direkt.</li>
              <li>Lade die `.csv` Datei hier hoch oder füge den Text unten in das Feld ein.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* File Upload Method */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">
                Methode A: CSV-Datei hochladen
              </label>
              <input
                type="file"
                id="csv-file-upload"
                accept=".csv,.txt"
                onChange={handleCSVFileChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
              />
              <p className="text-[9px] text-slate-400 italic font-medium">Unterstützt automatische Spaltenerkennung für Datums-, Start-, Break- und Baustellenspalten.</p>
            </div>

            {/* Paste Method */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-500 font-bold uppercase">
                Methode B: CSV-Inhalt kopieren &amp; einfügen
              </label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseCSVData(e.target.value);
                }}
                placeholder="Datum;Start;Ende;Pause;Ort;Notiz&#10;21.06.2026;07:30;16:00;30;IKEA Tempelhof;Frühschicht"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-700 min-h-[68px] focus:outline-none"
              />
            </div>
          </div>

          {/* Messages */}
          {csvError && (
            <div className="bg-amber-50 text-amber-800 border border-amber-250 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <span>⚠️ {csvError}</span>
            </div>
          )}

          {importCsvSuccessMessage && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-2.5 rounded-xl text-xs font-black text-center animate-bounce">
              🎉 {importCsvSuccessMessage}
            </div>
          )}

          {/* Preview Parsed rows */}
          {parsedEntries.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex border-b pb-1.5 justify-between items-center">
                <h4 className="text-xs font-black text-slate-700 uppercase">
                  🔍 Gefundene Schichten im Import-Puffer ({parsedEntries.length})
                </h4>
                <button
                  type="button"
                  onClick={handleImportParsedEntries}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition-all shadow active:scale-97 cursor-pointer"
                >
                  Alles in Stundenzettel übernehmen ({parsedEntries.length} Tage)
                </button>
              </div>

              <div className="overflow-x-auto max-h-[220px] border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-[11px] font-sans">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                      <th className="p-2 font-bold select-none text-[10px] uppercase">Datum</th>
                      <th className="p-2 font-bold select-none text-[10px] uppercase">Typ</th>
                      <th className="p-2 font-bold select-none text-[10px] uppercase">Arbeitszeit</th>
                      <th className="p-2 font-bold select-none text-[10px] uppercase">Pause</th>
                      <th className="p-2 font-bold select-none text-[10px] uppercase">Baustelle / Einsatzort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedEntries.slice(0, 10).map((entry, idx) => (
                      <tr key={idx} className="border-b border-slate-50 font-medium text-slate-700 hover:bg-slate-50/50">
                        <td className="p-2 font-bold font-mono">{new Date(entry.date).toLocaleDateString('de-DE')}</td>
                        <td className="p-2 text-[9px]"><span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded uppercase">{entry.type}</span></td>
                        <td className="p-2 font-semibold">{entry.type === 'Arbeit' ? `${entry.startTime} - ${entry.endTime}` : '-'}</td>
                        <td className="p-2">{entry.type === 'Arbeit' ? `${entry.breakMinutes} Min.` : '-'}</td>
                        <td className="p-2 text-slate-500 italic truncate max-w-[150px]">{entry.location}</td>
                      </tr>
                    ))}
                    {parsedEntries.length > 10 && (
                      <tr className="bg-slate-50 text-slate-400 italic">
                        <td colSpan={5} className="p-2 text-center text-[10px] font-bold">
                          ...und {parsedEntries.length - 10} weitere Tage im Puffer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Gefahrenzone: Demodaten löschen / Zurücksetzen */}
      <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trash2 size={17} className="text-red-650" />
            <h3 className="font-extrabold text-sm text-red-700">⚠️ Gefahrenzone (Datenspeicher zurücksetzen)</h3>
          </div>
          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded uppercase">
            Achtung
          </span>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            Wenn du dieses Tool zur eigenen echten Zeiterfassung nutzen möchtest, kannst du die vorinstallierten Demodaten (Muster-Arbeitszeiten, IKEA-Baustellen, Tariflöhne) und all deine Einstellungen löschen, um mit einer leeren App zu starten.
          </p>

          {clearSuccess && (
            <div id="clear-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs font-bold flex items-center gap-2 font-sans">
              ✓ Sämtliche Demodaten, Einstellungen und Stundenzettel wurden erfolgreich gelöscht! Die Anwendung ist jetzt leer und frisch für dich bereit.
            </div>
          )}

          {!showClearConfirm ? (
            <button
              id="btn-show-clear-confirm"
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-extrabold px-4.5 py-3 rounded-lg border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <Trash2 size={13} /> Demodaten &amp; alle Einträge löschen
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3.5 font-sans">
              <div className="flex gap-2">
                <ShieldAlert size={16} className="text-red-650 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-red-800">Bist du dir absolut sicher?</h4>
                  <p className="text-[11px] text-red-600 font-medium leading-normal mt-0.5">
                    Dies löscht unwiderruflich alle Zeiterfassungen, geplanten Dienstpläne, Baustellen-Kataloge und dein Profil aus dem lokalen Speicher deines Browsers. Dies kann nicht rückgängig gemacht werden!
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResetAllAppletData}
                  className="text-xs bg-red-600 hover:bg-red-755 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Ja, alle Daten unwiderruflich löschen
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Local disclaimer notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start text-xs text-amber-850 leading-relaxed font-sans">
        <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-amber-900 block font-sans">🔒 Lokale Datensouveränität (Local Only)</span>
          <p className="text-slate-655 text-xs">
            Sämtliche erfassten Stundendaten, km-Abrechnungen und Unterschriften werden verschlüsselt ausschließlich im lokalen Speicher deines Browsers auf diesem Endgerät abgelegt. Es findet keinerlei unbefugte Übermittlung an Cloud-Server statt.
          </p>
        </div>
      </div>

    </div>
  );
}
