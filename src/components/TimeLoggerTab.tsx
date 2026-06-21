/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Calendar, Plus, MapPin, Navigation, Clock, Trash2, Tag, BookOpen, AlertCircle, Sparkles, Mic, MicOff, Check, Volume2, Edit3 } from 'lucide-react';
import { WorkEntry, EntryType, UserSettings, SavedObject, TarifvertragLevel } from '../types';

interface TimeLoggerTabProps {
  entries: WorkEntry[];
  settings: UserSettings;
  objects: SavedObject[];
  tariffLevels: TarifvertragLevel[];
  onAddEntry: (entry: Omit<WorkEntry, 'id'> & { hourlyWage?: number }) => void;
  onUpdateEntry: (entry: WorkEntry) => void;
  onDeleteEntry: (id: string) => void;
  currentMonthKey: string;
  setCurrentMonthKey: (key: string) => void;
}

export interface ParsedVoiceResult {
  date?: string;
  type?: EntryType;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  travelDistanceKm?: number;
  travelTimeMinutes?: number;
  notes?: string;
  location?: string;
}

const normalizeGermanSpeechText = (rawText: string): string => {
  let text = rawText.toLowerCase().trim();
  
  // Replace spoken words for digits and common time formats in German
  const replacements: { [key: string]: string } = {
    'ein uhr': '1 uhr',
    'zwei uhr': '2 uhr',
    'drei uhr': '3 uhr',
    'vier uhr': '4 uhr',
    'fünf uhr': '5 uhr',
    'sechs uhr': '6 uhr',
    'sieben uhr': '7 uhr',
    'acht uhr': '8 uhr',
    'neun uhr': '9 uhr',
    'zehn uhr': '10 uhr',
    'elf uhr': '11 uhr',
    'zwölf uhr': '12 uhr',
    'dreizehn uhr': '13 uhr',
    'vierzehn uhr': '14 uhr',
    'fünfzehn uhr': '15 uhr',
    'sechzehn uhr': '16 uhr',
    'siebzehn uhr': '17 uhr',
    'achtzehn uhr': '18 uhr',
    'neunzehn uhr': '19 uhr',
    'zwanzig uhr': '20 uhr',
    'null uhr': '0 uhr',
    'halb acht': '07:30',
    'halb neun': '08:30',
    'halb zehn': '09:30',
    'halb elf': '10:30',
    'halb zwölf': '11:30',
    'halb eins': '12:30',
    'halb zwei': '13:30',
    'halb drei': '14:30',
    'halb vier': '15:30',
    'halb fünf': '16:30',
    'halb sechs': '17:30',
    'viertel nach acht': '08:15',
    'viertel nach sieben': '07:15',
    'viertel nach neun': '09:15',
    'viertel vor acht': '07:45',
    'viertel vor neun': '08:45',
    'viertel vor sieben': '06:45',
    'viertel vor vier': '15:45',
    'viertel vor fünf': '16:45'
  };

  for (const [word, replacement] of Object.entries(replacements)) {
    text = text.replaceAll(word, replacement);
  }
  return text;
};

const parseGermanVoiceCommand = (rawText: string, objects: SavedObject[]): ParsedVoiceResult => {
  const text = normalizeGermanSpeechText(rawText);
  const result: ParsedVoiceResult = {};

  // 1. Detect category / Typ
  if (text.includes('urlaub') || text.includes('urlaubstag')) {
    result.type = 'Urlaub';
  } else if (text.includes('krank') || text.includes('au ') || text.includes('krankmeldung') || text.includes('unfähig') || text.includes('arzt')) {
    result.type = 'Krank';
  } else if (text.includes('feiertag')) {
    result.type = 'Feiertag';
  } else {
    result.type = 'Arbeit';
  }

  // 2. Detect Date / Datum
  const today = new Date();
  if (text.includes('heute')) {
    result.date = today.toISOString().split('T')[0];
  } else if (text.includes('gestern')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    result.date = yesterday.toISOString().split('T')[0];
  } else if (text.includes('vorgestern')) {
    const vorgestern = new Date(today);
    vorgestern.setDate(today.getDate() - 2);
    result.date = vorgestern.toISOString().split('T')[0];
  } else if (text.includes('morgen')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    result.date = tomorrow.toISOString().split('T')[0];
  } else {
    const ordinalsMap: { [key: string]: number } = {
      'ersten': 1, 'zweiten': 2, 'dritten': 3, 'vierten': 4, 'fünften': 5, 'sechsten': 6, 'siebten': 7, 'achten': 8, 'neunten': 9, 'zehnten': 10,
      'elften': 11, 'zwölften': 12, 'dreizehnten': 13, 'vierzehnten': 14, 'fünfzehnten': 15, 'sechzehnten': 16, 'siebzehnten': 17, 'achtzehnten': 18, 'neunzehnten': 19,
      'zwanzigsten': 20, 'einundzwanzigsten': 21, 'zweiundzwanzigsten': 22, 'dreiundzwanzigsten': 23, 'vierundzwanzigsten': 24, 'fünfundzwanzigsten': 25,
      'sechundzwanzigsten': 26, 'siebundzwanzigsten': 27, 'achtundzwanzigsten': 28, 'neunundzwanzigsten': 29, 'dreißigsten': 30, 'einunddreißigsten': 31
    };

    const monthsMap: { [key: string]: number } = {
      'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6, 'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
    };

    let dateFound = false;

    // Check ordinal named dates like "am 24. juni" or "am vierundzwanzigsten juni"
    for (const [ordName, ordVal] of Object.entries(ordinalsMap)) {
      if (text.includes(`am ${ordName}`) || text.includes(`der ${ordName}`) || text.includes(`vom ${ordName}`)) {
        for (const [mName, mVal] of Object.entries(monthsMap)) {
          if (text.includes(mName)) {
            const mStr = mVal < 10 ? `0${mVal}` : `${mVal}`;
            const dStr = ordVal < 10 ? `0${ordVal}` : `${ordVal}`;
            result.date = `${today.getFullYear()}-${mStr}-${dStr}`;
            dateFound = true;
            break;
          }
        }
        if (!dateFound) {
          const currentMonth = today.getMonth() + 1;
          const mStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
          const dStr = ordVal < 10 ? `0${ordVal}` : `${ordVal}`;
          result.date = `${today.getFullYear()}-${mStr}-${dStr}`;
          dateFound = true;
        }
        break;
      }
    }

    if (!dateFound) {
      // Look for digital pattern "24.06" or "24.6."
      const numericDateMatch = text.match(/(?:am\s+|vom\s+)?(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.\s*(\d{2,4}))?/);
      if (numericDateMatch) {
        const day = parseInt(numericDateMatch[1], 10);
        const month = parseInt(numericDateMatch[2], 10);
        const year = numericDateMatch[3] ? parseInt(numericDateMatch[3], 10) : today.getFullYear();
        
        const fullYear = year < 100 ? 2000 + year : year;
        const dStr = day < 10 ? `0${day}` : `${day}`;
        const mStr = month < 10 ? `0${month}` : `${month}`;
        result.date = `${fullYear}-${mStr}-${dStr}`;
        dateFound = true;
      } else {
        // Look for single day match: "am 15."
        const dayOnlyMatch = text.match(/(?:am\s+|vom\s+)?(\d{1,2})\s*\./);
        if (dayOnlyMatch) {
          const day = parseInt(dayOnlyMatch[1], 10);
          const currentMonth = today.getMonth() + 1;
          const dStr = day < 10 ? `0${day}` : `${day}`;
          const mStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
          result.date = `${today.getFullYear()}-${mStr}-${dStr}`;
          dateFound = true;
        }
      }
    }

    // Match written month alone, e.g. "24 juni"
    if (!dateFound) {
      const monthMatch = text.match(/(\d{1,2})\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)/i);
      if (monthMatch) {
        const day = parseInt(monthMatch[1], 10);
        const monthWord = monthMatch[2].toLowerCase();
        const monthVal = monthsMap[monthWord];
        if (monthVal) {
          const dStr = day < 10 ? `0${day}` : `${day}`;
          const mStr = monthVal < 10 ? `0${monthVal}` : `${monthVal}`;
          result.date = `${today.getFullYear()}-${mStr}-${dStr}`;
          dateFound = true;
        }
      }
    }
  }

  // 3. Detect Times / Arbeitszeiten
  let parsedStart: string | null = null;
  let parsedEnd: string | null = null;

  // Pattern "von X bis Y"
  const vonBisMatch = text.match(/(?:von|ab|seit|um)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\s*(?:bis|nach|zu|-)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?/);
  if (vonBisMatch) {
    const sh = parseInt(vonBisMatch[1], 10);
    const sm = vonBisMatch[2] ? parseInt(vonBisMatch[2], 10) : 0;
    const eh = parseInt(vonBisMatch[3], 10);
    const em = vonBisMatch[4] ? parseInt(vonBisMatch[4], 10) : 0;

    if (sh >= 0 && sh < 24 && sm >= 0 && sm < 60) {
      parsedStart = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
    }
    if (eh >= 0 && eh < 24 && em >= 0 && em < 60) {
      parsedEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
    }
  } else {
    // Individual "von" match
    const startMatch = text.match(/(?:von|ab|beginn(?: um)?|start(?: um)?)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?/);
    if (startMatch) {
      const sh = parseInt(startMatch[1], 10);
      const sm = startMatch[2] ? parseInt(startMatch[2], 10) : 0;
      if (sh >= 0 && sh < 24 && sm >= 0 && sm < 60) {
        parsedStart = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
      }
    }

    // Individual "bis" match
    const endMatch = text.match(/(?:bis|ende(?: um)?|feierabend(?: um)?)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?/);
    if (endMatch) {
      const eh = parseInt(endMatch[1], 10);
      const em = endMatch[2] ? parseInt(endMatch[2], 10) : 0;
      if (eh >= 0 && eh < 24 && em >= 0 && em < 60) {
        parsedEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
      }
    }
  }

  if (parsedStart) result.startTime = parsedStart;
  if (parsedEnd) result.endTime = parsedEnd;

  // 4. Detect Pause
  const pauseMatch = text.match(/(\d+)\s*(?:minuten|min|m)\s*(?:pause)?/);
  const pauseAlt = text.match(/pause\s*(?:von)?\s*(\d+)/);
  if (pauseMatch) {
    result.breakMinutes = parseInt(pauseMatch[1], 10);
  } else if (pauseAlt) {
    result.breakMinutes = parseInt(pauseAlt[1], 10);
  } else if (text.includes('ohne pause') || text.includes('keine pause')) {
    result.breakMinutes = 0;
  }

  // 5. Detect travel attributes
  const kmMatch = text.match(/(\d+)\s*(?:kilometer|km)/);
  if (kmMatch) {
    result.travelDistanceKm = parseInt(kmMatch[1], 10);
  }

  const fahrtMatch = text.match(/(\d+)\s*(?:minuten|min)\s*(?:fahrt|fahrtzeit|wegzeit|hinfahrt|reisezeit)/);
  if (fahrtMatch) {
    result.travelTimeMinutes = parseInt(fahrtMatch[1], 10);
  }

  // 6. Look for matching objects list
  for (const obj of objects) {
    if (text.includes(obj.name.toLowerCase())) {
      result.location = obj.name;
      result.travelDistanceKm = obj.distanceKm;
      result.travelTimeMinutes = obj.travelTimeMinutes;
      break;
    }
  }

  // Notes
  const notesMatch = text.match(/(?:notiz|bemerkung|aufgabe|bemerkungen|notizen)\s*(?::|ist|war)?\s*([^.,]+)/);
  if (notesMatch && notesMatch[1]) {
    result.notes = notesMatch[1].trim();
  }

  return result;
};

export default function TimeLoggerTab({
  entries,
  settings,
  objects,
  tariffLevels,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  currentMonthKey,
  setCurrentMonthKey,
}: TimeLoggerTabProps) {
  // Local state for the log form
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<EntryType>('Arbeit');
  const [location, setLocation] = useState(settings.defaultLocation);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [travelDistanceKm, setTravelDistanceKm] = useState(28);
  const [travelTimeMinutes, setTravelTimeMinutes] = useState(40);
  const [notes, setNotes] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');

  // Speech Assistant States
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceLogResult, setVoiceLogResult] = useState<ParsedVoiceResult | null>(null);
  const [speechError, setSpeechError] = useState('');

  const startSpeechRecognition = () => {
    setSpeechError('');
    setTranscript('');
    setVoiceLogResult(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Spracherkennung wird von Ihrem Browser leider nicht unterstützt. Bitte verwenden Sie Google Chrome, Safari oder Microsoft Edge.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'de-DE';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error === 'not-allowed') {
          setSpeechError('Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Zugriff in Ihren Browsereinstellungen.');
        } else {
          setSpeechError('Fehler bei der Erkennung. Bitte nochmal versuchen.');
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        
        // Parse raw spoken text using our German assistant logic
        const parsed = parseGermanVoiceCommand(text, objects);
        setVoiceLogResult(parsed);
      };

      rec.start();
    } catch (err) {
      console.error(err);
      setSpeechError('Starten des Mikrofons fehlgeschlagen.');
      setIsListening(false);
    }
  };

  const applyVoiceResult = () => {
    if (!voiceLogResult) return;
    if (voiceLogResult.date) setDate(voiceLogResult.date);
    if (voiceLogResult.type) setType(voiceLogResult.type);
    if (voiceLogResult.location) {
      setLocation(voiceLogResult.location);
      const matched = objects.find(o => o.name === voiceLogResult.location);
      if (matched) {
        setSelectedObjectId(matched.id);
      }
    }
    if (voiceLogResult.startTime) setStartTime(voiceLogResult.startTime);
    if (voiceLogResult.endTime) setEndTime(voiceLogResult.endTime);
    if (voiceLogResult.breakMinutes !== undefined) setBreakMinutes(voiceLogResult.breakMinutes);
    if (voiceLogResult.travelDistanceKm !== undefined) setTravelDistanceKm(voiceLogResult.travelDistanceKm);
    if (voiceLogResult.travelTimeMinutes !== undefined) setTravelTimeMinutes(voiceLogResult.travelTimeMinutes);
    if (voiceLogResult.notes) setNotes(voiceLogResult.notes);

    // Close panel with a nice feedback
    setShowVoicePanel(false);
    setVoiceLogResult(null);
    setTranscript('');
  };

  // Generate list of months for selectors (e.g., current year months)
  const currentYear = new Date().getFullYear();
  const monthsList = [
    { value: `${currentYear}-01`, label: `Januar ${currentYear}` },
    { value: `${currentYear}-02`, label: `Februar ${currentYear}` },
    { value: `${currentYear}-03`, label: `März ${currentYear}` },
    { value: `${currentYear}-04`, label: `April ${currentYear}` },
    { value: `${currentYear}-05`, label: `Mai ${currentYear}` },
    { value: `${currentYear}-06`, label: `Juni ${currentYear}` },
    { value: `${currentYear}-07`, label: `Juli ${currentYear}` },
    { value: `${currentYear}-08`, label: `August ${currentYear}` },
    { value: `${currentYear}-09`, label: `September ${currentYear}` },
    { value: `${currentYear}-10`, label: `Oktober ${currentYear}` },
    { value: `${currentYear}-11`, label: `November ${currentYear}` },
    { value: `${currentYear}-12`, label: `Dezember ${currentYear}` },
  ];

  // Filter and sort entries for selected month
  const filteredEntries = entries
    .filter((e) => e.date.startsWith(currentMonthKey))
    .sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst im Log anzeigen

  const handleCancelForm = () => {
    setEditingEntryId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setType('Arbeit');
    setLocation(settings.defaultLocation);
    setSelectedObjectId('');
    setStartTime('08:00');
    setEndTime('16:30');
    setBreakMinutes(30);
    setTravelDistanceKm(28);
    setTravelTimeMinutes(40);
    setNotes('');
    setFormError('');
    setShowAddForm(false);
  };

  const handleStartEdit = (entry: WorkEntry) => {
    setEditingEntryId(entry.id);
    setDate(entry.date);
    setType(entry.type);
    
    if (entry.type === 'Arbeit') {
      setLocation(entry.location);
      setStartTime(entry.startTime);
      setEndTime(entry.endTime);
      setBreakMinutes(entry.breakMinutes);
      setTravelDistanceKm(entry.travelDistanceKm);
      setTravelTimeMinutes(entry.travelTimeMinutes);
      const matched = objects.find(o => o.name === entry.location);
      setSelectedObjectId(matched ? matched.id : '');
    } else {
      setLocation('');
      setSelectedObjectId('');
    }
    
    setNotes(entry.notes || '');
    setFormError('');
    setShowAddForm(true);

    // Smooth scroll the edit form into view
    setTimeout(() => {
      document.getElementById('time-add-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Berechne Arbeitszeit-Validation
    if (type === 'Arbeit') {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (endMin <= startMin) {
        setFormError('Endzeit muss nach der Startzeit liegen.');
        return;
      }

      const deductBreak = settings.isBreakPaid !== false ? 0 : breakMinutes;
      const totalWorkedMin = endMin - startMin - deductBreak;
      if (totalWorkedMin <= 0) {
        setFormError('Die Pausenzeit überschreitet die gesamte Arbeitszeit.');
        return;
      }
    }

    let resolvedWage: number | undefined = undefined;
    if (type === 'Arbeit') {
      const matchedObj = objects.find(o => o.id === selectedObjectId || o.name === location);
      if (matchedObj) {
        resolvedWage = matchedObj.hourlyWage;
      } else if (editingEntryId) {
        const existingEntry = entries.find(e => e.id === editingEntryId);
        if (existingEntry) {
          resolvedWage = existingEntry.hourlyWage;
        }
      }
    }

    if (editingEntryId) {
      onUpdateEntry({
        id: editingEntryId,
        date,
        type,
        location: type === 'Arbeit' ? location : (type === 'Urlaub' ? '🌴 Urlaub' : type === 'Krank' ? 'AU Krankmeldung' : 'Feiertag'),
        startTime: type === 'Arbeit' ? startTime : '',
        endTime: type === 'Arbeit' ? endTime : '',
        breakMinutes: type === 'Arbeit' ? breakMinutes : 0,
        travelDistanceKm: type === 'Arbeit' ? travelDistanceKm : 0,
        travelTimeMinutes: type === 'Arbeit' ? travelTimeMinutes : 0,
        notes: notes.trim() || undefined,
        hourlyWage: resolvedWage,
      });
    } else {
      onAddEntry({
        date,
        type,
        location: type === 'Arbeit' ? location : (type === 'Urlaub' ? '🌴 Urlaub' : type === 'Krank' ? 'AU Krankmeldung' : 'Feiertag'),
        startTime: type === 'Arbeit' ? startTime : '',
        endTime: type === 'Arbeit' ? endTime : '',
        breakMinutes: type === 'Arbeit' ? breakMinutes : 0,
        travelDistanceKm: type === 'Arbeit' ? travelDistanceKm : 0,
        travelTimeMinutes: type === 'Arbeit' ? travelTimeMinutes : 0,
        notes: notes.trim() || undefined,
        hourlyWage: resolvedWage,
      });
    }

    // Reset Form
    handleCancelForm();
  };

  // Hilfsfunktion zur Stundenberechnung
  const calculateHours = (entry: WorkEntry) => {
    if (entry.type !== 'Arbeit') return 8; // standard 8h
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);
    const deductBreak = settings.isBreakPaid !== false ? 0 : entry.breakMinutes;
    const m = (eh * 60 + em) - (sh * 60 + sm) - deductBreak;
    return Math.max(0, m / 60);
  };

  return (
    <div id="time-logger-wrapper" className="space-y-6">
      {/* Month Filter Bar */}
      <div id="filter-bar" className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="text-blue-600" size={18} />
          <span className="text-sm font-semibold text-slate-800">Abrechnungsmonat wählen:</span>
        </div>
        <div className="flex gap-2">
          <select
            id="month-key-select"
            value={currentMonthKey}
            onChange={(e) => setCurrentMonthKey(e.target.value)}
            className="text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 active:bg-slate-100 cursor-pointer min-w-44 transition-all"
          >
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            id="toggle-add-form-btn"
            onClick={() => {
              if (showAddForm && editingEntryId) {
                // If already open in edit mode, reset to new entry mode
                handleCancelForm();
                setShowAddForm(true);
              } else {
                if (showAddForm) {
                  handleCancelForm();
                } else {
                  setShowAddForm(true);
                  setFormError('');
                }
              }
            }}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Eintrag buchen</span>
          </button>
        </div>
      </div>

      {/* Logging Entry Form (Modal or expandable block) */}
      {showAddForm && (
        <form
          id="time-add-form"
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 shadow-md rounded-lg p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500 animate-pulse" />
              {editingEntryId ? 'Eintrag bearbeiten / korrigieren' : 'Neuen Eintrag erfassen'}
            </h3>
            <button
              id="form-close-btn"
              type="button"
              onClick={handleCancelForm}
              className="text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-2 py-1 rounded"
            >
              Abbrechen
            </button>
          </div>

          {formError && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-200">
              <AlertCircle size={14} /> {formError}
            </div>
          )}

          {/* VOICE SPOKEN COMMAND ASSISTANT SECTOR */}
          <div id="voice-assistant-section" className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowVoicePanel(!showVoicePanel)}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-3 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95"
              >
                <Mic size={14} className="text-blue-600 animate-pulse" />
                <span>{showVoicePanel ? 'Sprach-Assistent ausblenden' : '🎙️ Per Spracheingabe ausfüllen (Diktier-Modus)'}</span>
              </button>
              
              <span className="text-[10px] text-slate-400 font-bold hidden sm:inline-block">
                Einfach einsprechen statt tippen!
              </span>
            </div>

            {showVoicePanel && (
              <div className="pt-2 border-t border-slate-200/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  <strong>Beispiele:</strong> "Heute von 8 Uhr bis 16 Uhr 30 mit 30 Minuten Pause.", <br/>
                  "Gestern von 7:30 bis 15:45 Uhr gearbeitet.", "Urlaub am zwölften Juli."
                </p>

                {speechError && (
                  <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg text-xs font-semibold border border-rose-100">
                    {speechError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={isListening ? () => {} : startSpeechRecognition}
                    disabled={isListening}
                    className={`w-full sm:w-auto px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={14} className="animate-bounce" />
                        <span>Ich höre zu...</span>
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        <span>Mund auf &amp; Diktieren</span>
                      </>
                    )}
                  </button>

                  {isListening && (
                    <div className="flex items-center gap-1.5 py-1 px-4 bg-slate-50 rounded-lg">
                      <span className="w-1 h-3.5 bg-rose-500 rounded animate-bounce [animation-delay:0.1s]"></span>
                      <span className="w-1 h-5.5 bg-rose-600 rounded animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1 h-7.5 bg-indigo-600 rounded animate-bounce [animation-delay:0.3s]"></span>
                      <span className="w-1 h-4.5 bg-rose-600 rounded animate-bounce [animation-delay:0.4s]"></span>
                      <span className="w-1 h-2 bg-rose-500 rounded animate-bounce [animation-delay:0.5s]"></span>
                    </div>
                  )}

                  {!isListening && transcript && (
                    <span className="text-xs text-slate-400 font-semibold italic">
                      Diktat beendet.
                    </span>
                  )}
                </div>

                {transcript && (
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200/50 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-450 block">Erkannter Text:</span>
                    <p className="text-xs font-semibold text-slate-850 font-mono italic">"{transcript}"</p>
                  </div>
                )}

                {voiceLogResult && (
                  <div className="bg-blue-50/55 border border-blue-150/40 p-4 rounded-xl space-y-3">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">
                      Erkannte Formulardaten:
                    </h5>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                      {voiceLogResult.type && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Kategorie</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.type}</span>
                        </div>
                      )}
                      
                      {voiceLogResult.date && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Datum</span>
                          <span className="font-extrabold text-blue-905">
                            {new Date(voiceLogResult.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      )}

                      {voiceLogResult.location && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Ort</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.location}</span>
                        </div>
                      )}

                      {voiceLogResult.startTime && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Beginn</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.startTime} Uhr</span>
                        </div>
                      )}

                      {voiceLogResult.endTime && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Ende</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.endTime} Uhr</span>
                        </div>
                      )}

                      {voiceLogResult.breakMinutes !== undefined && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Pause</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.breakMinutes} Minuten</span>
                        </div>
                      )}

                      {voiceLogResult.travelDistanceKm !== undefined && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Wegstrecke</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.travelDistanceKm} km</span>
                        </div>
                      )}

                      {voiceLogResult.travelTimeMinutes !== undefined && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100">
                          <span className="text-[10px] text-slate-300 block font-bold">Fahrtzeit</span>
                          <span className="font-extrabold text-blue-900">{voiceLogResult.travelTimeMinutes} Min.</span>
                        </div>
                      )}

                      {voiceLogResult.notes && (
                        <div className="bg-white p-2 rounded-xl border border-blue-100 col-span-2 md:col-span-3">
                          <span className="text-[10px] text-slate-400 block font-bold">Notiz</span>
                          <span className="font-extrabold text-blue-900 font-mono">"{voiceLogResult.notes}"</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={applyVoiceResult}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                    >
                      <Check size={14} />
                      <span>Erkannte Werte in Formular übernehmen</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {/* Datum */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Datum</label>
              <input
                id="input-date"
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700"
              />
            </div>

            {/* Typ */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Kategorie</label>
              <select
                id="input-type"
                value={type}
                onChange={(e) => setType(e.target.value as EntryType)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 font-semibold"
              >
                <option value="Arbeit">💼 Arbeitstermin</option>
                <option value="Urlaub">🌴 Urlaubstag</option>
                <option value="Krank">AU Krankmeldung</option>
                <option value="Feiertag">🎉 Feiertag</option>
              </select>
            </div>

            {/* Vorlage aus Objekt-Datenbank (Only for Arbeit) */}
            {type === 'Arbeit' ? (
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1 text-slate-700">
                  Objekt-Datenbank
                </label>
                <select
                  id="select-saved-object"
                  value={selectedObjectId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedObjectId(id);
                    if (id) {
                      const obj = objects.find(o => o.id === id);
                      if (obj) {
                        setLocation(obj.name);
                        setTravelDistanceKm(obj.distanceKm);
                        setTravelTimeMinutes(obj.travelTimeMinutes);
                      }
                    }
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-blue-50/45 hover:bg-blue-50/70 text-slate-805 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">-- Freie Texteingabe --</option>
                  {objects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Objekt-Datenbank</label>
                <div className="text-xs text-slate-400 py-3 border border-dashed border-slate-200 rounded-lg text-center bg-slate-50">
                  Nicht anwendbar
                </div>
              </div>
            )}

            {/* Arbeitsort / Objekt */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {type === 'Arbeit' ? 'Bezeichnung / Ort' : 'Bezeichnung'}
              </label>
              <input
                id="input-location"
                type="text"
                disabled={type !== 'Arbeit'}
                value={type === 'Arbeit' ? location : `${type}-Eintrag`}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setSelectedObjectId(''); // Clear selected preset if typing manually
                }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700"
                placeholder="Name der Baustelle oder des Objekts"
              />
            </div>
          </div>

          {type === 'Arbeit' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-dashed border-slate-200 pt-3.5">
              {/* Arbeitszeiten */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                    <Clock size={11} /> Beginn
                  </label>
                  <input
                    id="input-start-time"
                    type="time"
                    value={startTime}
                    required
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                    <Clock size={11} /> Ende
                  </label>
                  <input
                    id="input-end-time"
                    type="time"
                    value={endTime}
                    required
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
              </div>

              {/* Pause */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pause (Minuten)</label>
                <select
                  id="input-break"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                >
                  <option value={0}>Keine Pause</option>
                  <option value={15}>15 Min. (Frühstick)</option>
                  <option value={30}>30 Min. (Standard)</option>
                  <option value={45}>45 Min. (Standard + Pause)</option>
                  <option value={60}>60 Min. (1 Stunde)</option>
                  <option value={90}>90 Min.</option>
                </select>
              </div>

              {/* Tax commutation (Commute / Finanzamt) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-0.5 flex items-center gap-1 flex-row">
                    <Navigation size={11} /> Wegstrecke (km)
                  </label>
                  <input
                    id="input-distance"
                    type="number"
                    min={0}
                    value={travelDistanceKm}
                    onChange={(e) => setTravelDistanceKm(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-0.5 flex items-center gap-1 flex-row">
                    <Clock size={11} /> Fahrzeit (Min)
                  </label>
                  <input
                    id="input-travel-time"
                    type="number"
                    min={0}
                    value={travelTimeMinutes}
                    onChange={(e) => setTravelTimeMinutes(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notizen */}
          <div className="border-t border-dashed border-slate-200 pt-3.5">
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <BookOpen size={11} /> Bemerkungen / Notiz
            </label>
            <input
              id="input-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Arbeitsaufgabe, Krankenschein-Nummer, etc."
              className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none outline-0 transition-all text-slate-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              id="btn-cancel-add"
              type="button"
              onClick={handleCancelForm}
              className="text-sm text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              id="btn-submit-add"
              type="submit"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow-sm transition-all"
            >
              {editingEntryId ? 'Änderungen speichern' : 'Eintrag buchen'}
            </button>
          </div>
        </form>
      )}

      {/* Work Entries History List / Table */}
      <div id="logs-card" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-slate-500" />
            <h3 className="font-bold text-sm text-slate-700">Arbeitszeit-Protokoll</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono font-bold">
            {filteredEntries.length} Einträge im Monat
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="mx-auto text-slate-300 mb-3" size={44} />
            <p className="text-sm font-semibold text-slate-600">Keine Einträge für diesen Monat vorhanden.</p>
            <p className="text-xs text-slate-400 mt-1">Trage oben eine Buchung ein oder wechsele den Abrechnungsmonat.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredEntries.map((entry) => {
              const hours = calculateHours(entry);
              const formattedDate = new Date(entry.date).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              });

              // Tag Farbtypologisierung
              let typeStyles = 'bg-slate-100 text-slate-700';
              if (entry.type === 'Urlaub') typeStyles = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
              if (entry.type === 'Krank') typeStyles = 'bg-rose-50 text-rose-700 border border-rose-100';
              if (entry.type === 'Feiertag') typeStyles = 'bg-purple-50 text-purple-700 border border-purple-100';

              return (
                <div
                  key={entry.id}
                  id={`entry-row-${entry.id}`}
                  className="p-4 hover:bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Wochentag & Datum */}
                    <div className="w-16 flex-shrink-0 text-center py-1.5 px-2 bg-slate-100 rounded-lg text-slate-800 tracking-tight font-mono">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 leading-tight">
                        {formattedDate.split(',')[0]}
                      </span>
                      <span className="block text-sm font-extrabold text-slate-800 leading-tight">
                        {formattedDate.split(',')[1]?.trim().split('.')[0]}
                      </span>
                    </div>

                    <div>
                      {/* Typ & Arbeitsort */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${typeStyles}`}>
                          {entry.type}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 block flex items-center gap-1">
                          {entry.type === 'Arbeit' && <MapPin size={12} className="text-slate-400" />}
                          {entry.location}
                        </span>
                      </div>

                      {/* Travel Data details & Notes */}
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-1.5 text-xs text-slate-500">
                        {entry.type === 'Arbeit' && (
                          <>
                            <span className="flex items-center gap-0.5 font-medium">
                              🕐 {entry.startTime} - {entry.endTime} (Pause: {entry.breakMinutes} Min)
                            </span>
                            {(entry.travelDistanceKm > 0 || entry.travelTimeMinutes > 0) && (
                              <span className="flex items-center gap-0.5 text-slate-500 font-mono">
                                🚗 Weg: {entry.travelDistanceKm} km ({entry.travelTimeMinutes} Min)
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-blue-600 font-mono font-bold bg-blue-50/50 border border-blue-150/40 px-1.5 py-0.5 rounded text-[10px]">
                              💶 {(entry.hourlyWage ?? settings.hourlyWage).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}/h
                            </span>
                          </>
                        )}
                        {entry.notes && (
                          <span className="text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            💬 {entry.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Hours show */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-0 pt-2.5 sm:pt-0">
                    <div className="text-right">
                      <span className="block text-base font-extrabold text-slate-900 font-mono">
                        {hours.toLocaleString('de-DE', { minimumFractionDigits: 1 })} Std.
                      </span>
                      <span className="block text-[10px] text-slate-400 lowercase font-medium">
                        {entry.type === 'Arbeit' ? 'Arbeitsleistung' : 'Lohnfortzahlung'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        id={`edit-entry-btn-${entry.id}`}
                        onClick={() => handleStartEdit(entry)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/70 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Eintrag bearbeiten"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        id={`delete-entry-btn-${entry.id}`}
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        title="Eintrag löschen"
                      >
                        <Trash2 size={15} />
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
  );
}
