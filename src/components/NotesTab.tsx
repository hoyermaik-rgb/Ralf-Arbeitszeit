/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Sparkles, 
  Search, 
  Quote, 
  Dice5,
  Calendar,
  CheckCircle,
  Clock,
  BookOpen,
  Info
} from 'lucide-react';

interface AppNote {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  color: string; // Tailwind class background
}

const NOTE_COLORS = [
  { name: 'Gelb', bg: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900', labelBg: 'bg-amber-200' },
  { name: 'Blau', bg: 'bg-blue-150 hover:bg-blue-200 border-blue-300 text-blue-900 bg-blue-50', labelBg: 'bg-blue-100' },
  { name: 'Grün', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900', labelBg: 'bg-emerald-100' },
  { name: 'Rot', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-900', labelBg: 'bg-rose-100' },
  { name: 'Lila', bg: 'bg-violet-50 hover:bg-violet-100 border-violet-300 text-violet-900', labelBg: 'bg-violet-100' },
];

const CALENDAR_QUOTES = [
  { quote: "Morgenstund hat Gold im Mund... oder zumindest heißen Kaffee.", author: "Handwerker-Weisheit" },
  { quote: "Wer nicht aufpasst, zahlt doppelt.", author: "Bauleiter-Gesetz" },
  { quote: "Auf der Baustelle gilt: Dreimal abgeschnitten und immer noch zu kurz!", author: "Klassiker" },
  { quote: "Der Unterschied zwischen Theorie und Praxis ist in der Praxis größer als in der Theorie.", author: "Bauweisheit" },
  { quote: "Es gibt keine Probleme auf der Baustelle, nur geänderte Ausführungspläne.", author: "Planer-Philo" },
  { quote: "Ein guter Handwerker geht nicht weg, er schafft nur Platz für Neues.", author: "Schreiner-Spruch" },
  { quote: "Wer misst, misst Mist!", author: "Messtechnik-Regel" },
  { quote: "Nichts hält ein Projekt so produktiv wie der Abgabetermin am Freitagmittag.", author: "Büro-Weisheit" },
  { quote: "Urlaub ist die schönste Zeit – besonders nach anstrengender, getaner Arbeit!", author: "Lebensweisheit" },
  { quote: "Das haben wir schon immer so gemacht. Das haben wir noch nie so gemacht. Da könnte ja jeder kommen!", author: "Die heilige Dreifaltigkeit der Bürokratie" },
  { quote: "Das Schlimmste am Handwerk sind die ersten 40 Arbeitsjahre.", author: "Humor am Bau" },
  { quote: "Nicht für die Schule, sondern für den Feierabend lernen wir.", author: "Arbeiter-Motto" },
  { quote: "Zwei Dinge sind unendlich: Das Universum und die Liste der Zusatzarbeiten auf dem Stundenzettel.", author: "Nachkalkulation" },
  { quote: "Wer langsam baut, baut auch mit Verstand. Hauptsache, die Kaffemaschine läuft.", author: "Pausen-Philosophie" },
  { quote: "Eine Stunde Schlaf vor Mitternacht ist gut für die Gesundheit. Zwei Stunden Feierabend nach fünf sind gut für die Seele.", author: "Lebenskunst" },
  { quote: "Kein Plan überlebt den ersten Spatenstich.", author: "Projektleiter-Einsicht" },
  { quote: "Kaffee dehydriert den Körper nicht. Sonst wäre ich schon Staub.", author: "Meister-Spruch" },
];

export default function NotesTab() {
  const [notes, setNotes] = useState<AppNote[]>(() => {
    const saved = localStorage.getItem('zeiterfassung_personal_notes');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'note-1',
        title: 'Kundennummer & Telefonnummern',
        content: 'IKEA Tempelhof - Hauptansprechpartner: Herr Müller (0170-1234567)\nErsatzteile-Anfragen immer über die Zentrale Tel.-Durchwahl -102.',
        category: 'Einsatzort',
        createdAt: '2026-06-20',
        color: 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900',
      },
      {
        id: 'note-2',
        title: 'Fahrtkostenpauschalen eintragen',
        content: 'Abstand zur Baustelle Tempelhof beträgt 23 km. Entspricht Hin- und Rückfahrt laut Tarifvertrag: 46 km gesamt.',
        category: 'Wichtig',
        createdAt: '2026-06-21',
        color: 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-900',
      },
    ];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Allgemein');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Quote State
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Load random quote on mount
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * CALENDAR_QUOTES.length);
    setQuoteIndex(randomIdx);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('zeiterfassung_personal_notes', JSON.stringify(notes));
  }, [notes]);

  const selectRandomQuote = () => {
    let nextIdx = Math.floor(Math.random() * CALENDAR_QUOTES.length);
    // Avoid picking identical quote twice in a row if possible
    if (nextIdx === quoteIndex && CALENDAR_QUOTES.length > 1) {
      nextIdx = (nextIdx + 1) % CALENDAR_QUOTES.length;
    }
    setQuoteIndex(nextIdx);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() && !formContent.trim()) return;

    const chosenColorObj = NOTE_COLORS[selectedColorIdx];

    if (editingNoteId) {
      setNotes(prev => prev.map(note => {
        if (note.id === editingNoteId) {
          return {
            ...note,
            title: formTitle || 'Unbenannte Notiz',
            content: formContent,
            category: formCategory || 'Allgemein',
            color: chosenColorObj.bg
          };
        }
        return note;
      }));
      setEditingNoteId(null);
    } else {
      const newNote: AppNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: formTitle || 'Unbenannte Notiz',
        content: formContent,
        category: formCategory || 'Allgemein',
        createdAt: new Date().toISOString().split('T')[0],
        color: chosenColorObj.bg,
      };
      setNotes(prev => [newNote, ...prev]);
    }

    // Reset Form
    setFormTitle('');
    setFormContent('');
    setFormCategory('Allgemein');
    setShowAddForm(false);
  };

  const handleEditNoteClick = (note: AppNote) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    
    // Attempt to map color back to index
    const colorIdx = NOTE_COLORS.findIndex(c => note.color.includes(c.bg.split(' ')[0]));
    if (colorIdx !== -1) {
      setSelectedColorIdx(colorIdx);
    }
    
    setEditingNoteId(note.id);
    setShowAddForm(true);
    
    // Scroll form into view
    document.getElementById('note-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setFormTitle('');
      setFormContent('');
    }
  };

  const filteredNotes = notes.filter(note => {
    const q = searchQuery.toLowerCase();
    return note.title.toLowerCase().includes(q) || 
           note.content.toLowerCase().includes(q) || 
           note.category.toLowerCase().includes(q);
  });

  const activeQuote = CALENDAR_QUOTES[quoteIndex] || CALENDAR_QUOTES[0];

  return (
    <div id="notes-tab-container" className="space-y-6">
      
      {/* 1. HEADER HERO */}
      <div id="notes-hero-card" className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/25 text-amber-400 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-500/25 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulses"></span>
              Notizen &amp; Weisheiten
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2 font-mono uppercase">
            📝 MERKZETTEL &amp; KALENDER
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-xl mt-1">
            Halten Sie wichtige Telefonnummern, Baustellendetails, Absprachen und To-Dos fest. Und genießen Sie zwischendurch einen humorvollen Spruch aus dem Baustellen-Anerkennungskalender.
          </p>
        </div>
      </div>

      {/* 2. LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: QUOTES AND NOTE FORM (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* THE CALENDAR WISDOM CARD */}
          <div id="calendar-quote-box" className="bg-linear-to-br from-amber-50 to-orange-50/70 border-2 border-amber-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute -right-4 -bottom-6 text-amber-200/40 select-none pointer-events-none">
              <Quote size={140} className="transform rotate-12" />
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest">
                    Spruch des Tages
                  </h3>
                  <p className="text-[9px] text-amber-600 font-bold">HUMORVOLLER KALENDERSPRUCH</p>
                </div>
              </div>

              <button
                id="randomize-quote-btn"
                type="button"
                onClick={selectRandomQuote}
                title="Anderen Spruch anzeigen"
                className="p-2 bg-white/80 hover:bg-white text-amber-700 hover:text-amber-900 border border-amber-200 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer hover:rotate-12 duration-200"
              >
                <Dice5 size={14} className="mr-1" />
                <span className="text-[9px] font-black uppercase">Würfeln</span>
              </button>
            </div>

            {/* Wisdom quote container */}
            <div className="min-h-[85px] flex flex-col justify-center relative z-10 pt-2 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2.5"
                >
                  <p className="text-xs md:text-sm font-black italic text-slate-800 leading-relaxed font-serif">
                    „{activeQuote.quote}“
                  </p>
                  <p className="text-[10px] text-amber-700 font-black tracking-wider uppercase font-mono text-right">
                    — {activeQuote.author}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-amber-200/50 flex items-center gap-2 text-[10px] text-amber-800/80 font-semibold relative z-10">
              <Sparkles size={11} className="text-amber-500 animate-pulse shrink-0" />
              <span>Humor hält gesund auf Arbeit und Baustelle!</span>
            </div>
          </div>

          {/* NOTE CREATER/EDITOR FORM */}
          <div id="note-form-anchor" className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Edit3 size={15} />
                </div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  {editingNoteId ? 'Notiz bearbeiten' : 'Neue Schnellnotiz'}
                </h4>
              </div>
              {editingNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setFormTitle('');
                    setFormContent('');
                    setFormCategory('Allgemein');
                  }}
                  className="text-[9px] bg-slate-100 font-black text-slate-600 px-2 py-1 rounded-lg uppercase hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
              )}
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5">
              {/* Title input */}
              <div>
                <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1">
                  Titel / Betreff
                </label>
                <input
                  type="text"
                  placeholder="Z.B. Absprache mit Meister, Telefonnummer, ToDo..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Category input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1">
                    Kategorie / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="Wichtig, Baustelle..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Color Selector */}
                <div>
                  <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1">
                    Farbe des Zettels
                  </label>
                  <div className="flex h-[34px] items-center gap-1 bg-slate-50 border border-slate-250 rounded-xl px-2 justify-between">
                    {NOTE_COLORS.map((col, idx) => {
                      const colorClass = col.bg.split(' ')[0];
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedColorIdx(idx)}
                          className={`w-4 h-4 rounded-full border transition-all cursor-pointer transform ${colorClass} ${
                            selectedColorIdx === idx
                              ? 'ring-2 ring-blue-500 scale-120 border-slate-650'
                              : 'border-slate-300'
                          }`}
                          title={col.name}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Content textarea */}
              <div>
                <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1">
                  Inhalt / Text
                </label>
                <textarea
                  placeholder="Schreibe deinen Text hier..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:bg-white transition-all resize-y min-h-[100px]"
                />
              </div>

              {/* Save button */}
              <button
                type="submit"
                className="w-full bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Save size={14} />
                <span>{editingNoteId ? 'Änderungen speichern' : 'Zettel anstecken'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: SEARCH & STICKY NOTES BOARD (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* SEARCH BAR & SUMMARY */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Notizen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs font-bold text-slate-750 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 font-sans"
              />
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              GESAMT: <strong className="text-slate-700">{notes.length}</strong> | GEFILTERT: <strong className="text-blue-600">{filteredNotes.length}</strong>
            </div>
          </div>

          {/* STICKY NOTES GRID BOARD */}
          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center text-slate-400 space-y-3">
              <FileText className="mx-auto text-slate-300 stroke-1" size={48} />
              <div className="space-y-1">
                <p className="text-xs font-bold">Keine passenden Notizzettel gefunden.</p>
                <p className="text-[10px] text-slate-400 font-medium">Legen Sie links eine Notiz an oder ändern Sie Ihren Suchbegriff.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`rounded-2xl p-4 border flex flex-col justify-between shadow-xs min-h-[170px] ${note.color} transition-all`}
                  >
                    <div>
                      {/* Note Header / Meta */}
                      <div className="flex justify-between items-start gap-2 mb-2 pb-1 border-b border-black/10">
                        <span className="text-[9px] font-black uppercase tracking-wider opacity-65 font-mono">
                          🏷️ {note.category || 'Allgemein'}
                        </span>
                        <span className="text-[9px] font-bold font-mono opacity-65 flex items-center gap-1">
                          <Clock size={9} />
                          {note.createdAt}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-black leading-tight tracking-tight mb-2 uppercase">
                        {note.title}
                      </h4>

                      {/* Content */}
                      <p className="text-[11px] whitespace-pre-wrap font-medium leading-relaxed opacity-90 font-sans">
                        {note.content}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-2 border-t border-black/10 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditNoteClick(note)}
                        title="Notiz bearbeiten"
                        className="p-1.5 rounded-lg hover:bg-black/5 text-black/70 hover:text-black transition-all cursor-pointer flex items-center justify-center"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Notiz wegschmeißen"
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-800/80 hover:text-rose-900 transition-all cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* HELP INFO BAR */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-slate-500 select-none">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-normal font-semibold font-sans">
              <strong>Hinweis zur Datenspeicherung:</strong> Ihre Notizen werden automatisch in Ihrem Webbrowser (Local Storage) gespeichert. Um Ihre Notizen dauerhaft zu sichern, können Sie im Reiter <strong>Optionen</strong> ganz unten eine Datensicherung als JSON-Backup herunterladen.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
