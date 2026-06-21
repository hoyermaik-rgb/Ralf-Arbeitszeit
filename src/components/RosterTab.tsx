/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, ClipboardCopy, Check, AlertCircle, Clock, Tag, HelpCircle, ArrowRightLeft, FileText, Upload, Sparkles, RefreshCw } from 'lucide-react';
import { RosterShift, EntryType, UserSettings, SavedObject, WorkEntry } from '../types';

interface RosterTabProps {
  rosterShifts: RosterShift[];
  onAddRosterShift: (shift: Omit<RosterShift, 'id'>) => void;
  onDeleteRosterShift: (id: string) => void;
  onImportShiftsToTimeLogger: (shifts: RosterShift[], overwrite: boolean) => { added: number; overwritten: number };
  entries: WorkEntry[];
  settings: UserSettings;
  objects: SavedObject[];
  currentMonthKey: string;
  setCurrentMonthKey: (key: string) => void;
}

export default function RosterTab({
  rosterShifts,
  onAddRosterShift,
  onDeleteRosterShift,
  onImportShiftsToTimeLogger,
  entries,
  settings,
  objects,
  currentMonthKey,
  setCurrentMonthKey,
}: RosterTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');

  // PDF / paste parser states
  const [pasteText, setPasteText] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedShifts, setParsedShifts] = useState<Omit<RosterShift, 'id'>[]>([]);
  const [showPdfImportPanel, setShowPdfImportPanel] = useState(false);
  const [pdfImportSuccessMsg, setPdfImportSuccessMsg] = useState('');
  const [pdfDebugLogs, setPdfDebugLogs] = useState<string[]>([]);

  // Dynamically load PDFJS from CDN on-demand
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const win = window as any;
      if (win.pdfjsLib) {
        resolve(win.pdfjsLib);
        return;
      }
      
      const existing = document.getElementById('pdfjs-script');
      if (existing) {
        let interval = setInterval(() => {
          if (win.pdfjsLib) {
            clearInterval(interval);
            resolve(win.pdfjsLib);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.id = 'pdfjs-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        try {
          win.pdfjsLib = win['pdfjs-dist/build/pdf'];
          win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(win.pdfjsLib);
        } catch (e) {
          reject(e);
        }
      };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  interface PDFTextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
  }

  const consolidatePDFItems = (items: PDFTextItem[]): PDFTextItem[] => {
    // Group items on highly similar Y levels (diff <= 2) and sort horizontally (X)
    const groupedByY: { [yKey: string]: PDFTextItem[] } = {};
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const y = item.transform[5];
      // Find a Y key within 2 units
      let foundKey: string | null = null;
      for (const k of Object.keys(groupedByY)) {
        const keyVal = parseFloat(k);
        if (Math.abs(keyVal - y) <= 2) {
          foundKey = k;
          break;
        }
      }
      if (foundKey !== null) {
        groupedByY[foundKey].push(item);
      } else {
        groupedByY[y.toString()] = [item];
      }
    }

    const consolidated: PDFTextItem[] = [];

    // For each horizontal line, sort left-to-right and merge words with small gaps
    const sortedYKeys = Object.keys(groupedByY)
      .map(parseFloat)
      .sort((a, b) => b - a); // Top to bottom

    for (const yKey of sortedYKeys) {
      const lineItems = groupedByY[yKey.toString()].sort((a, b) => a.transform[4] - b.transform[4]);
      if (lineItems.length === 0) continue;

      let current = { ...lineItems[0] };
      for (let i = 1; i < lineItems.length; i++) {
        const next = lineItems[i];
        // Calculate horizontal gap between current right edge and next left edge
        const currentRight = current.transform[4] + current.width;
        const gap = next.transform[4] - currentRight;

        // If the gap is very small (less than 12px) OR next string is a colon or punctuation
        if (gap < 12 || next.str === ':' || current.str.endsWith(':')) {
          // Merge them
          current.str += next.str;
          current.width = (next.transform[4] + next.width) - current.transform[4];
        } else {
          consolidated.push(current);
          current = { ...next };
        }
      }
      consolidated.push(current);
    }

    return consolidated;
  };

  const parseRosterFromPdfCoordinates = (rawItems: any[], log?: (msg: string) => void): Omit<RosterShift, 'id'>[] => {
    log?.("Koordinaten-Parser gestartet...");
    // 1. Cast items & consolidate
    const items: PDFTextItem[] = rawItems.map(it => ({
      str: it.str || '',
      transform: it.transform ? [...it.transform] : [1, 0, 0, 1, 0, 0],
      width: it.width || 0,
      height: it.height || 0
    }));

    const consolidated = consolidatePDFItems(items);
    log?.(`Konservierte PDF-Zeichenketten von ${items.length} auf ${consolidated.length} konsolidiert.`);

    // 2. Identify Day headers (1..31) on their Y-plane
    const yLevelDayCounts: { [yKey: string]: { item: PDFTextItem; num: number }[] } = {};
    for (const item of consolidated) {
      const trimmed = item.str.trim();
      const match = trimmed.match(/^0?([1-9]|[12]\d|3[01])$/);
      if (match) {
        const num = parseInt(match[1]);
        const y = item.transform[5];
        
        let foundYKey: string | null = null;
        for (const k of Object.keys(yLevelDayCounts)) {
          const keyVal = parseFloat(k);
          if (Math.abs(keyVal - y) <= 3) {
            foundYKey = k;
            break;
          }
        }
        if (foundYKey !== null) {
          yLevelDayCounts[foundYKey].push({ item, num });
        } else {
          yLevelDayCounts[y.toString()] = [{ item, num }];
        }
      }
    }

    let headerY: number | null = null;
    let maxDayCount = 0;
    for (const k of Object.keys(yLevelDayCounts)) {
      const keyVal = parseFloat(k);
      const dayList = yLevelDayCounts[k];
      const uniqueDays = new Set(dayList.map(d => d.num));
      if (uniqueDays.size > maxDayCount && uniqueDays.size >= 8) { // must cover at least 8 days to be a calendar row
        maxDayCount = uniqueDays.size;
        headerY = keyVal;
      }
    }

    if (headerY === null) {
      log?.("⚠ Keine Tages-Header (Spalten 1..31) im Koordinatenraum gefunden.");
      return [];
    }

    log?.(`Erkannte Tages-Headerzeile auf Y-Ebene: ${Math.round(headerY)} mit ${maxDayCount} Spaltensuchpunkten.`);

    const headerDays = yLevelDayCounts[headerY.toString()];
    const dayXMap: { [day: number]: number } = {};
    headerDays.forEach(d => {
      dayXMap[d.num] = d.item.transform[4];
    });

    const columns = Object.keys(dayXMap).map(dStr => ({
      day: parseInt(dStr),
      x: dayXMap[parseInt(dStr)]
    })).sort((a, b) => a.x - b.x);

    log?.(`Spalten-X-Koordinaten erfasst: ${columns.map(c => `${c.day}: x=${Math.round(c.x)}`).join(', ')}`);

    // Calculate typical column spacing
    let spacingSum = 0;
    let spacingCount = 0;
    for (let i = 1; i < columns.length; i++) {
      spacingSum += columns[i].x - columns[i - 1].x;
      spacingCount++;
    }
    const avgSpacing = spacingCount > 0 ? (spacingSum / spacingCount) : 18;

    // Helper to find day column for a given X with fallback
    const getDayForX = (x: number): number | null => {
      if (columns.length === 0) return null;
      let closest = columns[0];
      let minDiff = Math.abs(x - closest.x);
      for (let i = 1; i < columns.length; i++) {
        const diff = Math.abs(x - columns[i].x);
        if (diff < minDiff) {
          minDiff = diff;
          closest = columns[i];
        }
      }
      if (minDiff < avgSpacing * 0.8) {
        return closest.day;
      }
      return null;
    };

    // 3. Find month and year from page text
    const activeYearStr = currentMonthKey.split('-')[0];
    const activeMonthStr = currentMonthKey.split('-')[1];
    let pageYear = activeYearStr;
    let pageMonth = activeMonthStr;

    const monthIndexMap: Record<string, string> = {
      jan: '01', feb: '02', mär: '03', apr: '04', mai: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', okt: '10', nov: '11', dez: '12'
    };

    for (const item of consolidated) {
      const txt = item.str.toLowerCase();
      const matchMonth = txt.match(/\b(jan|feb|mär|mar|apr|mai|jun|jul|aug|sep|okt|nov|dez)[a-z]*[.\s-]*(\d{2,4})\b/i);
      if (matchMonth) {
        const mLetters = matchMonth[1].toLowerCase();
        pageMonth = monthIndexMap[mLetters] || activeMonthStr;
        const rawYr = matchMonth[2];
        pageYear = rawYr.length === 2 ? `20${rawYr}` : rawYr;
        break;
      }
    }

    // 4. Find where the "Objekt" (Location) column lives horizontally
    let objektX: number | null = null;
    const objektItem = consolidated.find(it => /objekt/i.test(it.str) && !/lv mvp/i.test(it.str));
    if (objektItem) {
      objektX = objektItem.transform[4];
    } else if (columns.length > 0) {
      objektX = columns[0].x - 110; 
    }

    // 5. Gather unique non-empty location anchors in "Objekt" vertical band
    const targetX = objektX !== null ? objektX : (columns.length > 0 ? columns[0].x - 110 : 50);
    const locationCandidates = consolidated.filter(it => {
      if (headerY !== null && it.transform[5] >= headerY - 5) return false;
      const x = it.transform[4];
      if (x < targetX - 55 || x > targetX + 115) return false;
      
      const str = it.str.trim();
      if (/^\d+(\.\d+)?$/.test(str)) return false;
      if (/^\d{1,2}:\d{2}$/.test(str)) return false;
      if (str.length < 3) return false;
      return true;
    });

    const wordBlacklist = [/ruwe/i, /kruse/i, /objekt/i, /monat/i, /vertrag/i, /std/i, /stunden/i, /arbeitnehmer/i, /gmbh/i, /stand/i, /gesamt/i];
    const locationAnchors: { name: string; y: number }[] = [];

    locationCandidates.forEach(it => {
      let s = it.str.replace(/ruwe/gi, '').replace(/kruse/gi, '').replace(/[|;:\s\-]+$/, '').trim();
      if (s.length >= 4 && !wordBlacklist.some(rx => rx.test(s))) {
        const tooClose = locationAnchors.find(anchor => Math.abs(anchor.y - it.transform[5]) <= 4);
        if (!tooClose) {
          locationAnchors.push({ name: s, y: it.transform[5] });
        }
      }
    });

    locationAnchors.sort((a, b) => b.y - a.y); // top-to-bottom

    log?.(`Erkannte Standort-Zeilenanker (Y-Ebene): ${locationAnchors.map(a => `"${a.name}" auf Y=${Math.round(a.y)}`).join(', ')}`);

    if (locationAnchors.length === 0) {
      locationAnchors.push({ name: settings.defaultLocation || 'Objekt', y: headerY - 50 });
    }

    // 6. Map all time entries and statuses to columns and row anchors
    const gridSpots: { str: string; day: number; anchorName: string; y: number }[] = [];

    for (const item of consolidated) {
      const str = item.str.trim();
      const x = item.transform[4];
      const y = item.transform[5];

      // Must be below headers
      if (headerY !== null && y >= headerY - 3) continue;

      const day = getDayForX(x);
      if (day === null) continue;

      // Check if it is a time or a valid status word
      const isTime = /^\d{1,2}:\d{2}$/.test(str);
      const isStatus = ['u', 'urlaub', 'k', 'krank', 'f', 'feiertag', 'au', 'freigestellt'].includes(str.toLowerCase());

      if (isTime || isStatus) {
        // Find closest row anchor
        let closestAnchor = locationAnchors[0];
        let minDy = Math.abs(y - closestAnchor.y);
        for (let j = 1; j < locationAnchors.length; j++) {
          const dy = Math.abs(y - locationAnchors[j].y);
          if (dy < minDy) {
            minDy = dy;
            closestAnchor = locationAnchors[j];
          }
        }

        // Allow up to 30 units of Y deviation (sub-rows of the same row block)
        if (minDy <= 30) {
          gridSpots.push({
            str,
            day,
            anchorName: closestAnchor.name,
            y
          });
        }
      }
    }

    log?.(`Koordinaten-Zellenanalyse: ${gridSpots.length} gültige Rastereinträge (Zeiten/Abwesenheiten) den Spalten zugeordnet.`);

    // 7. Reconstruct shifts by grouping gridSpots by (anchorName, day)
    const groupedShifts: { [key: string]: typeof gridSpots } = {};
    gridSpots.forEach(spot => {
      const key = `${spot.anchorName}||${spot.day}`;
      if (!groupedShifts[key]) {
        groupedShifts[key] = [];
      }
      groupedShifts[key].push(spot);
    });

    const resultingShifts: Omit<RosterShift, 'id'>[] = [];

    for (const key of Object.keys(groupedShifts)) {
      const parts = key.split('||');
      const anchorName = parts[0];
      const day = parseInt(parts[1]);
      const spots = groupedShifts[key].sort((a, b) => b.y - a.y); // top-to-bottom

      const dateStr = `${pageYear}-${pageMonth}-${String(day).padStart(2, '0')}`;

      // Check for non-work markers
      const hasStatus = spots.find(s => ['u', 'urlaub', 'k', 'krank', 'f', 'feiertag', 'au', 'freigestellt'].includes(s.str.toLowerCase()));
      
      if (hasStatus) {
        const lowerStatus = hasStatus.str.toLowerCase();
        let type: EntryType = 'Urlaub';
        let notes = 'Geplanter Urlaub';
        
        if (lowerStatus.includes('k') || lowerStatus.includes('au')) {
          type = 'Krank';
          notes = 'Geplante Abwesenheit (Krank)';
        } else if (lowerStatus.includes('f') || lowerStatus.includes('feiertag')) {
          type = 'Feiertag';
          notes = 'Gesetzlicher Feiertag';
        }

        resultingShifts.push({
          date: dateStr,
          type,
          location: '-',
          startTime: '00:00',
          endTime: '00:00',
          breakMinutes: 0,
          notes
        });
        continue;
      }

      const times = spots.filter(s => /^\d{1,2}:\d{2}$/.test(s.str)).map(s => s.str);

      if (times.length < 2) {
        continue;
      }

      const start = times[0];
      const end = times[1];
      const duration = times[2] || null;

      let calculatedBreak = 30;
      if (duration) {
        try {
          const parseMin = (ts: string) => {
            const [h, m] = ts.split(':').map(Number);
            return h * 60 + m;
          };
          const startMin = parseMin(start);
          let endMin = parseMin(end);
          if (endMin < startMin) endMin += 1440;
          const durMin = parseMin(duration);
          
          const breakMinCombined = (endMin - startMin) - durMin;
          if (breakMinCombined >= 0 && breakMinCombined < 240) {
            calculatedBreak = breakMinCombined;
          }
        } catch (e) {
          calculatedBreak = 30;
        }
      } else {
        try {
          const parseMin = (ts: string) => {
            const [h, m] = ts.split(':').map(Number);
            return h * 60 + m;
          };
          const startMin = parseMin(start);
          let endMin = parseMin(end);
          if (endMin < startMin) endMin += 1440;
          const diffHour = (endMin - startMin) / 60;
          calculatedBreak = diffHour >= 9 ? 45 : (diffHour >= 6 ? 30 : 0);
        } catch (_) {
          calculatedBreak = 30;
        }
      }

      resultingShifts.push({
        date: dateStr,
        type: 'Arbeit',
        location: anchorName,
        startTime: start,
        endTime: end,
        breakMinutes: calculatedBreak,
        notes: `Automatisch importiert (Soll-Schicht)`
      });
    }

    return resultingShifts;
  };

  const parseRosterFromPdfTextLayout = (fullText: string, currentMonthKey: string, settings: any, objects: any[], log?: (msg: string) => void): Omit<RosterShift, 'id'>[] => {
    log?.("Text-Layout-Parser gestartet...");
    const resultingShifts: Omit<RosterShift, 'id'>[] = [];
    
    const activeYearStr = currentMonthKey.split('-')[0];
    const activeMonthStr = currentMonthKey.split('-')[1];
    let pageYear = activeYearStr;
    let pageMonth = activeMonthStr;

    // Split text into lines
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    log?.(`Gefundene nummerierte Textzeilen zur Rasterung: ${lines.length}`);

    const cleanCell = (c: string) => c.replace(/"/gi, '').replace(/^,|,$/g, '').trim();

    // 1. Headerzeile mit Tagen (1..31) suchen
    let dayHeaders: { day: number; index: number }[] = [];
    let headerLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const cells = lines[i].split(',').map(cleanCell);
      // Suchen nach Indikatoren für die Tabellen-Kopfzeile
      if (cells.some(c => /objekt/i.test(c) || /std.*monat/i.test(c) || /mitarbeiter/i.test(c) || /m\s*a\b/i.test(c))) {
        const tmpHeaders: { day: number; index: number }[] = [];
        cells.forEach((c, idx) => {
          const num = parseInt(c);
          if (num >= 1 && num <= 31 && /^\d+$/.test(c)) {
            tmpHeaders.push({ day: num, index: idx });
          }
        });
        if (tmpHeaders.length >= 8) {
          dayHeaders = tmpHeaders;
          headerLineIdx = i;
          break;
        }
      }
    }

    if (headerLineIdx === -1) {
      // Zweiter Versuch: Einfach nach einer Zeile suchen, die sehr viele fortlaufende Nummern hat
      for (let i = 0; i < lines.length; i++) {
        const cells = lines[i].split(',').map(cleanCell);
        const tmpHeaders: { day: number; index: number }[] = [];
        cells.forEach((c, idx) => {
          const num = parseInt(c);
          if (num >= 1 && num <= 31 && /^\d+$/.test(c)) {
            tmpHeaders.push({ day: num, index: idx });
          }
        });
        if (tmpHeaders.length >= 15) { // z. B. mindestens 15 Tage
          dayHeaders = tmpHeaders;
          headerLineIdx = i;
          break;
        }
      }
    }

    if (headerLineIdx !== -1) {
      log?.(`Tages-Suchraster gefunden in Zeile ${headerLineIdx + 1} mit den Tagen: ${dayHeaders.map(h => h.day).join(',')}`);
    } else {
      log?.("⚠ Keine separate Headerzeile mit Tagesnummern gefunden. Weiche auf sequenzielle Verteilung aus.");
    }

    // Falls wir ein Spaltenmuster haben, nutzen wir die zeilenweise Ausrichtung!
    if (headerLineIdx !== -1 && dayHeaders.length > 0) {
      const dataLinesMap: { [key: string]: string[][] } = {};
      const keyOrder: string[] = [];

      lines.forEach((line) => {
        const cells = line.split(',').map(cleanCell);
        if (cells.length < 4) return;

        // Prüfen, ob die Zeile zu den Schichtdaten eines Mitarbeiters gehört (meistens RUWE GmbH oder PO)
        const isRosterRow = cells.some(c => /ruwe/i.test(c) || /kruse/i.test(c) || /pforte/i.test(c) || /lv mvp/i.test(c));
        if (isRosterRow) {
          const place = cells[1] || settings.defaultLocation || 'RUWE Objekt';
          const emp = cells[2] || 'Mitarbeiter';
          const key = `${place}||${emp}`;

          if (!dataLinesMap[key]) {
            dataLinesMap[key] = [];
            keyOrder.push(key);
          }
          dataLinesMap[key].push(cells);
        }
      });

      log?.(`Tabellenzeilen gruppiert in ${keyOrder.length} Datenblöcke: ${keyOrder.join(', ')}`);

      keyOrder.forEach((key) => {
        const [locationName, employeeName] = key.split('||');
        const rows = dataLinesMap[key];
        log?.(`Analyse Block "${locationName}" für Mitarbeiter "${employeeName}" (${rows.length} Zeilen)...`);

        dayHeaders.forEach((h) => {
          const colIdx = h.index;
          const colValues: string[] = [];

          rows.forEach((r) => {
            if (colIdx < r.length) {
              const val = r[colIdx].trim();
              if (val && val !== '-' && val !== '00:00' && val !== 'Soll') {
                colValues.push(val);
              }
            }
          });

          if (colValues.length === 0) return;

          const dateStr = `${pageYear}-${pageMonth}-${String(h.day).padStart(2, '0')}`;

          // Abwesenheiten prüfen
          const statusVal = colValues.find(v => ['u', 'urlaub', 'k', 'krank', 'f', 'feiertag', 'au'].includes(v.toLowerCase()));
          if (statusVal) {
            const lowerS = statusVal.toLowerCase();
            let type: EntryType = 'Urlaub';
            let notes = 'Urlaub laut Dienstplan';
            if (lowerS.includes('k') || lowerS.includes('au')) {
              type = 'Krank';
              notes = 'Krankheit laut Dienstplan';
            } else if (lowerS.includes('f')) {
              type = 'Feiertag';
              notes = 'Feiertag';
            }
            resultingShifts.push({
              date: dateStr,
              type,
              location: locationName,
              startTime: '00:00',
              endTime: '00:00',
              breakMinutes: 0,
              notes
            });
            return;
          }

          // Uhrzeiten (HH:MM) filtern
          const times: string[] = [];
          colValues.forEach(val => {
            const matchedTimes = val.match(/\b\d{2}:\d{2}\b/g);
            if (matchedTimes) {
              matchedTimes.forEach(t => {
                const [hrs] = t.split(':').map(Number);
                if (hrs <= 23) {
                  times.push(t);
                }
              });
            }
          });

          if (times.length >= 2) {
            const start = times[0];
            const end = times[1];
            const duration = times[2] || null;

            let calculatedBreak = 30;
            if (duration) {
              try {
                const parseMin = (ts: string) => {
                  const [hVal, mVal] = ts.split(':').map(Number);
                  return hVal * 60 + mVal;
                };
                const startMin = parseMin(start);
                let endMin = parseMin(end);
                if (endMin < startMin) endMin += 1440;
                const durMin = parseMin(duration);

                const breakMinCombined = (endMin - startMin) - durMin;
                if (breakMinCombined >= 0 && breakMinCombined < 240) {
                  calculatedBreak = breakMinCombined;
                }
              } catch (_) {
                calculatedBreak = 30;
              }
            }

            resultingShifts.push({
              date: dateStr,
              type: 'Arbeit',
              location: locationName,
              startTime: start,
              endTime: end,
              breakMinutes: calculatedBreak,
              notes: `Dienstplan-Import`
            });
          } else if (times.length === 1) {
            // Falls nur Startzeit bekannt ist, Standard 8,5 Stunden annehmen
            const start = times[0];
            const [hrs, mins] = start.split(':').map(Number);
            const endHrs = (hrs + 8) % 24;
            const end = `${String(endHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

            resultingShifts.push({
              date: dateStr,
              type: 'Arbeit',
              location: locationName,
              startTime: start,
              endTime: end,
              breakMinutes: 30,
              notes: `Dienstplan-Import (Standard 8 Std.)`
            });
          }
        });
      });
    }

    // 3. Fallback: Falls keine Spalten rasterbar waren, nutzen wir die Muster-Uhrzeiten
    if (resultingShifts.length === 0) {
      log?.("⚠ Tabellen-Rasterung unvollständig. Nutze zeitlichen Fallback-Parser...");
      
      const timeMatches: string[] = [];
      const rawTimeMatches = fullText.match(/\b\d{2}:\d{2}\b/g) || [];

      rawTimeMatches.forEach(t => {
        const [h] = t.split(':').map(Number);
        if (h <= 23) {
          timeMatches.push(t);
        }
      });

      let detectedLocation = settings.defaultLocation || 'RUWE Objekt';
      if (fullText.includes('LV MVP/BB')) {
        detectedLocation = 'LV MVP/BB';
      } else if (fullText.includes('Sommerabend Pforte')) {
        detectedLocation = 'LV MVP Sommerabend Pforte';
      }

      const shiftPairs: { start: string; end: string }[] = [];
      for (let i = 0; i < timeMatches.length; i += 2) {
        if (timeMatches[i] && timeMatches[i+1]) {
          shiftPairs.push({ start: timeMatches[i], end: timeMatches[i+1] });
        }
      }

      const daysInMonth = new Date(Number(pageYear), Number(pageMonth), 0).getDate();
      let currentDayPointer = 1;

      shiftPairs.forEach((pair) => {
        if (currentDayPointer > daysInMonth) return;
        const dateStr = `${pageYear}-${pageMonth}-${String(currentDayPointer).padStart(2, '0')}`;

        resultingShifts.push({
          date: dateStr,
          type: 'Arbeit',
          location: detectedLocation,
          startTime: pair.start,
          endTime: pair.end,
          breakMinutes: 30,
          notes: 'Importiert per Mustererkennung'
        });
        currentDayPointer++;
      });
    }

    log?.(`Analyse beendet. Insgesamt ${resultingShifts.length} Schichten für das Ergebnis ermittelt.`);
    return resultingShifts;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError('');
    setPdfImportSuccessMsg('');
    setParsedShifts([]);
    setPdfDebugLogs([]);
    
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setIsParsing(true);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      console.log(`[PDF IMPORT DEBUG] ${msg}`);
    };

    addLog(`➔ Starte Parser für Datei: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);

    try {
      addLog("Lade PDF.js-Bibliothek...");
      const pdfjsLib = await loadPdfJs();
      addLog("PDF.js geladen. Erstelle ArrayBuffer...");
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      addLog("Dokument wird analysiert...");
      const pdf = await loadingTask.promise;
      
      addLog(`PDF geladen mit ${pdf.numPages} Seite(n). Extrahiere Text-Koordinaten...`);
      let accumulatedItems: any[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        addLog(`Lese Seite ${pageNum}/${pdf.numPages}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        accumulatedItems = accumulatedItems.concat(textContent.items);
        addLog(`  Seite ${pageNum}: ${textContent.items.length} Textobjekte extrahiert.`);
      }

      addLog(`Insgesamt ${accumulatedItems.length} Textobjekte gesammelt.`);

      // Tabellen-Struktur basierend auf sortierten Koordinaten erstellen!
      addLog("Sortiere und konsolidiere Textobjekte horizontal von links nach rechts...");
      const consolidated = consolidatePDFItems(accumulatedItems);
      addLog(`Zeilenweise Konsolidierung abgeschlossen. ${consolidated.length} strukturierte Wörter gebildet.`);

      // Erstelle ein sauberes, zeilenbasiertes CSV-Format
      let lastLineY = -1;
      const textLines: string[] = [];
      let currentLine: string[] = [];
      
      consolidated.forEach(item => {
        const y = item.transform[5];
        // Wenn der Y-Unterschied > 4 ist, nehmen wir eine neue Zeile an
        if (lastLineY !== -1 && Math.abs(y - lastLineY) > 4) {
          textLines.push(currentLine.join(','));
          currentLine = [];
        }
        // Anführungszeichen bereinigen, um Parsing-Bugs zu verhüten
        const cleanedStr = item.str.replace(/"/gi, "'");
        currentLine.push(`"${cleanedStr}"`);
        lastLineY = y;
      });
      if (currentLine.length > 0) {
        textLines.push(currentLine.join(','));
      }
      
      const fullText = textLines.join('\n');
      setPasteText(fullText);
      addLog("CSV-ähnlicher Zeilentext erfolgreich generiert.");

      // Phase 1: Versuche Text-Layout-Parser (Zeilenweise Rasterung)
      addLog("Versuche Phase 1: Raster-Layout-Parser (Tage-Ausrichtung)...");
      const extractedShifts = parseRosterFromPdfTextLayout(fullText, currentMonthKey, settings, objects, addLog);

      if (extractedShifts.length > 0) {
        addLog(`Phase 1 erfolgreich! ${extractedShifts.length} Schichten wurden erkannt.`);
        setParsedShifts(extractedShifts.sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        // Fallback Phase 2: Koordinaten-Parser
        addLog("Phase 1 ergab 0 Schichten. Versuche Phase 2: Reiner Koordinaten-Parser...");
        const extractedCoordsShifts = parseRosterFromPdfCoordinates(accumulatedItems, addLog);
        
        if (extractedCoordsShifts.length > 0) {
          addLog(`Phase 2 erfolgreich! ${extractedCoordsShifts.length} Schichten wurden über Koordinaten erkannt.`);
          setParsedShifts(extractedCoordsShifts.sort((a, b) => a.date.localeCompare(b.date)));
        } else {
          // Fallback Phase 3: Textzeilen Mustererkennung
          addLog("Phase 2 ergab 0 Schichten. Fallback zu Phase 3: Textzeilen-Mustererkennung (RegEx)...");
          parseRosterText(fullText);
          addLog("Mustererkennung durchgeführt.");
        }
      }

    } catch (err: any) {
      console.error(err);
      addLog(`🔴 FEHLER BEIM PARSING: ${err.message || err}`);
      setParseError('Fehler beim Extrahieren der PDF: ' + (err.message || 'Die Datei konnte vom PDF-Parser nicht eingelesen werden.'));
    } finally {
      setIsParsing(false);
      setPdfDebugLogs(logs);
    }
  };

  const parseRosterText = (text: string) => {
    setParseError('');
    setParsedShifts([]);
    
    if (!text.trim()) {
      setParseError('Kein Schichtplan-Text zum Analysieren vorhanden.');
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const tempShifts: Omit<RosterShift, 'id'>[] = [];
    
    const activeYearStr = currentMonthKey.split('-')[0];
    const monthIndexMap: Record<string, string> = {
      jan: '01', feb: '02', mär: '03', apr: '04', mai: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', okt: '10', nov: '11', dez: '12'
    };

    lines.forEach((line) => {
      let dateStr = '';
      
      const deDateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);
      const isoDateMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);

      if (deDateMatch) {
        const day = deDateMatch[1].padStart(2, '0');
        const month = deDateMatch[2].padStart(2, '0');
        let year = deDateMatch[3] ? deDateMatch[3] : activeYearStr;
        if (year.length === 2) year = `20${year}`;
        dateStr = `${year}-${month}-${day}`;
      } else if (isoDateMatch) {
        dateStr = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
      } else {
        const writtenMatch = line.match(/(\d{1,2})\s*(Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)[a-z]*/i);
        if (writtenMatch) {
          const day = writtenMatch[1].padStart(2, '0');
          const monthLetters = writtenMatch[2].toLowerCase();
          const month = monthIndexMap[monthLetters] || '07';
          dateStr = `${activeYearStr}-${month}-${day}`;
        }
      }

      if (!dateStr || dateStr.includes('undefined')) return;

      let entryType: EntryType = 'Arbeit';
      let start = '07:30';
      let end = '16:00';
      let breakMin = 30;
      let shiftNotes = '';
      let shiftLoc = settings.defaultLocation || 'Objekt';

      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('urlaub') || lowerLine.includes('vacation') || lowerLine.includes('freigestellt')) {
        entryType = 'Urlaub';
        start = '00:00';
        end = '00:00';
        breakMin = 0;
        shiftNotes = 'Geplanter Urlaub';
        shiftLoc = '-';
      } else if (lowerLine.includes('krank') || lowerLine.includes(' krank') || lowerLine.includes('krankheit') || lowerLine.includes(' au')) {
        entryType = 'Krank';
        start = '00:00';
        end = '00:00';
        breakMin = 0;
        shiftNotes = 'Krankmeldung / AU';
        shiftLoc = '-';
      } else if (lowerLine.includes('feiertag') || lowerLine.includes('gesetzlich')) {
        entryType = 'Feiertag';
        start = '00:00';
        end = '00:00';
        breakMin = 0;
        shiftNotes = 'Gesetzlicher Feiertag';
        shiftLoc = '-';
      } else {
        const timeMatch = line.match(/(\d{1,2}):(\d{2})\s*(?:-|–|bis|to)\s*(\d{1,2}):(\d{2})/i);
        if (timeMatch) {
          start = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          end = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
        } else {
          if (lowerLine.includes('frühschicht') || lowerLine.includes('früh') || lowerLine.includes(' fs')) {
            start = '06:00';
            end = '14:30';
            shiftNotes = 'Frühschicht';
          } else if (lowerLine.includes('spätschicht') || lowerLine.includes('spät') || lowerLine.includes(' ss')) {
            start = '14:00';
            end = '22:30';
            shiftNotes = 'Spätschicht';
          } else if (lowerLine.includes('nachtschicht') || lowerLine.includes('nacht') || lowerLine.includes(' ns')) {
            start = '22:00';
            end = '06:30';
            shiftNotes = 'Nachtschicht';
          } else {
            const deCompactMatch = line.match(/(\d{2})(\d{2})\s*(?:-|–)\s*(\d{2})(\d{2})/);
            if (deCompactMatch) {
              start = `${deCompactMatch[1]}:${deCompactMatch[2]}`;
              end = `${deCompactMatch[3]}:${deCompactMatch[4]}`;
            } else {
              start = '07:30';
              end = '16:00';
            }
          }
        }

        const matchedObj = objects.find(o => lowerLine.includes(o.name.toLowerCase()));
        if (matchedObj) {
          shiftLoc = matchedObj.name;
        } else {
          let cleanNote = line
            .replace(/[0-9]{1,2}\.[0-9]{1,2}\.([0-9]{2,4})?/, '')
            .replace(/[0-9]{1,2}:[0-9]{2}/g, '')
            .replace(/-|–/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanNote.length > 5) {
            const daysPattern = /^(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)\b/i;
            cleanNote = cleanNote.replace(daysPattern, '').trim();
            if (cleanNote.length > 3) {
              shiftNotes = cleanNote;
            }
          }
        }
      }

      tempShifts.push({
        date: dateStr,
        type: entryType,
        location: shiftLoc,
        startTime: start,
        endTime: end,
        breakMinutes: breakMin,
        notes: shiftNotes || undefined
      });
    });

    if (tempShifts.length === 0) {
      setParseError('Es konnten keine gültigen Schichtzeilen mit Datumsangaben im Text erkannt werden. Überprüfe das Tabellenformat.');
    } else {
      tempShifts.sort((a, b) => a.date.localeCompare(b.date));
      setParsedShifts(tempShifts);
    }
  };

  const handleCommitParsedShifts = () => {
    if (parsedShifts.length === 0) return;
    
    // Core callback integration
    parsedShifts.forEach((s) => {
      onAddRosterShift(s);
    });

    setPdfImportSuccessMsg(`Erfolgreich ${parsedShifts.length} Schichten aus der Tabelle in dein Soll-Dienstplan eingetragen!`);
    setParsedShifts([]);
    setPasteText('');
    setPdfFileName('');
    
    setTimeout(() => {
      setPdfImportSuccessMsg('');
    }, 4500);
  };

  // Roster shift form states
  const [date, setDate] = useState(() => {
    // default to first day of currentMonthKey, e.g. "2026-07-01"
    return `${currentMonthKey}-01`;
  });
  const [type, setType] = useState<EntryType>('Arbeit');
  const [location, setLocation] = useState(settings.defaultLocation || '');
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('16:00');
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [notes, setNotes] = useState('');

  // Import Options
  const [importOption, setImportOption] = useState<'only-missing' | 'overwrite'>('only-missing');
  const [importStatus, setImportStatus] = useState<{ show: boolean; added: number; overwritten: number } | null>(null);

  // Filter roster shifts belongs to selected month YYYY-MM
  const monthlyRosterShifts = rosterShifts
    .filter((s) => s.date.startsWith(currentMonthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Regular logged entries in selected month
  const monthlyLoggedEntries = entries.filter((e) => e.date.startsWith(currentMonthKey));

  // Check how many of monthly Roster shifts are already applied (by matching exact date)
  const appliedRosterCount = monthlyRosterShifts.filter((rs) =>
    monthlyLoggedEntries.some((le) => le.date === rs.date)
  ).length;

  const handleSelectObjectChange = (objId: string) => {
    setSelectedObjectId(objId);
    if (objId) {
      const match = objects.find((o) => o.id === objId);
      if (match) {
        setLocation(match.name);
      }
    } else {
      setLocation('');
    }
  };

  const handleAddShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!date) {
      setFormError('Bitte wählen Sie ein Datum.');
      return;
    }

    if (type === 'Arbeit') {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (isNaN(startMin) || isNaN(endMin)) {
        setFormError('Bitte geben Sie gültige Uhrzeiten ein.');
        return;
      }

      if (endMin <= startMin) {
        setFormError('Die Endzeit muss nach der Anfangszeit liegen.');
        return;
      }

      const totalWorkedMin = endMin - startMin - breakMinutes;
      if (totalWorkedMin <= 0) {
        setFormError('Die Pausenzeit überschreitet die gesamte Arbeitszeit.');
        return;
      }
    }

    // Call callback to add
    onAddRosterShift({
      date,
      type,
      location: type === 'Arbeit' ? location || 'Ohne Einsatzort' : '-',
      startTime: type === 'Arbeit' ? startTime : '00:00',
      endTime: type === 'Arbeit' ? endTime : '00:00',
      breakMinutes: type === 'Arbeit' ? breakMinutes : 0,
      notes,
    });

    // Reset some states
    setNotes('');
    setFormError('');
    setShowAddForm(false);
  };

  const triggerImport = () => {
    if (monthlyRosterShifts.length === 0) return;
    const isOverwrite = importOption === 'overwrite';
    const result = onImportShiftsToTimeLogger(monthlyRosterShifts, isOverwrite);
    
    setImportStatus({
      show: true,
      added: result.added,
      overwritten: result.overwritten,
    });

    setTimeout(() => {
      setImportStatus(null);
    }, 5500);
  };

  // Generate list of months with current and next year for options
  const currentYear = new Date().getFullYear();
  const monthsList = [
    { key: `${currentYear}-01`, label: `Januar ${currentYear}` },
    { key: `${currentYear}-02`, label: `Februar ${currentYear}` },
    { key: `${currentYear}-03`, label: `März ${currentYear}` },
    { key: `${currentYear}-04`, label: `April ${currentYear}` },
    { key: `${currentYear}-05`, label: `Mai ${currentYear}` },
    { key: `${currentYear}-06`, label: `Juni ${currentYear}` },
    { key: `${currentYear}-07`, label: `Juli ${currentYear}` },
    { key: `${currentYear}-08`, label: `August ${currentYear}` },
    { key: `${currentYear}-09`, label: `September ${currentYear}` },
    { key: `${currentYear}-10`, label: `Oktober ${currentYear}` },
    { key: `${currentYear}-11`, label: `November ${currentYear}` },
    { key: `${currentYear}-12`, label: `Dezember ${currentYear}` },
    // and next year
    { key: `${currentYear + 1}-01`, label: `Januar ${currentYear + 1}` },
    { key: `${currentYear + 1}-02`, label: `Februar ${currentYear + 1}` },
    { key: `${currentYear + 1}-03`, label: `März ${currentYear + 1}` },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-500/25 text-red-400 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-red-500/25 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              Soll-Schichtenplaner
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2 font-mono uppercase">
            📅 DUP / DIENSTPLAN
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-xl mt-1">
            Planen Sie Ihre Arbeitsschichten im Voraus und übertragen Sie diese mit nur einem Klick vollständig in Ihren offiziellen Stundenzettel.
          </p>
        </div>

        {/* MONTH SELECTOR WITH OPTIONAL PDF IMPORTER TOGGLE */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowPdfImportPanel((prev) => !prev)}
            className={`w-full sm:w-auto text-xs px-4 py-2.5 rounded-xl font-bold border flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all ${
              showPdfImportPanel 
                ? 'bg-blue-600 border-blue-750 text-white hover:bg-blue-700' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-100 border-slate-700/80'
            }`}
          >
            <Upload size={14} />
            <span>PDF-Importeur</span>
          </button>

          <select
            id="roster-month-selector"
            value={currentMonthKey}
            onChange={(e) => {
              setCurrentMonthKey(e.target.value);
              setDate(`${e.target.value}-01`);
            }}
            className="w-full md:w-52 bg-slate-800 border-2 border-slate-700/60 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-black cursor-pointer shadow-md focus:border-blue-500 focus:outline-none transition-all"
          >
            {monthsList.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2026 HIGH-FIDELITY PDF/TEXT TABULAR ROSTER IMPORTER PANEL */}
      {showPdfImportPanel && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/10">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase font-mono tracking-wider text-slate-200">
                  📁 Dienstplan PDF- / Tabellen-Importeur
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed font-sans">
                  Lade eine PDF-Datei hoch oder kopiere einfach die Dienstplantabelle als Text hier hinein.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPdfImportPanel(false);
                setParsedShifts([]);
                setPasteText('');
              }}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-black px-3.5 py-1.5 rounded-lg border border-slate-800 transition-all cursor-pointer font-sans"
            >
              Schließen
            </button>
          </div>

          {pdfImportSuccessMsg && (
            <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 p-4 rounded-xl text-xs font-black animate-bounce text-center font-sans">
              🎉 {pdfImportSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LINKER FLÜGEL: HOCHLADEN & TEXTEINGABE */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase select-none mb-2 tracking-wider font-sans">
                  Option A: PDF Direktupload (Automatische Tabellenerkennung)
                </label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-all rounded-2xl p-6 text-center group cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    disabled={isParsing}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className={`text-blue-500 group-hover:scale-110 transition-all ${isParsing ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-black text-slate-200 font-sans">
                      {isParsing ? 'Extrahiere Tabellentexte...' : 'Dienstplan-PDF auswählen...'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold font-sans">
                      {pdfFileName ? `Gefunden: ${pdfFileName}` : 'Maximale Größe 15 MB. Läuft vollständig lokal ab.'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase select-none tracking-wider font-sans">
                    Option B: Tabellentext reinkopieren (Copy-Paste)
                  </label>
                  {pasteText && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasteText('');
                        setParsedShifts([]);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-black transition-all font-sans"
                    >
                      Leeren
                    </button>
                  )}
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    parseRosterText(e.target.value);
                  }}
                  placeholder="Kopiere die Tabelle aus deinem Dienstplan (z.B. aus einer PDF oder Excel-Tabelle) und füge sie hier ein...&#10;&#10;Beispiel:&#10;01.07.2026   07:30 - 16:30   IKEA Tempelhof&#10;02.07.2026   08:00 - 17:00   Auswärtstermin&#10;03.07.2026   Urlaub"
                  className="w-full bg-slate-905/80 border border-slate-800 rounded-2xl p-4 text-[11px] font-mono font-medium text-slate-300 min-h-[160px] focus:outline-none focus:border-slate-750 transition-all leading-relaxed"
                />
              </div>

              {parseError && (
                <div className="p-3.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center gap-2 font-sans">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>

            {/* RECHTER FLÜGEL: DYNAMIC PARSING LIVE PREVIEW */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide font-sans">
                  🔍 Live-Vorschau der erkannten Schichten
                </label>
                {parsedShifts.length > 0 && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2.5 py-1 rounded border border-blue-500/10 font-sans">
                    {parsedShifts.length} erkannt
                  </span>
                )}
              </div>

              {parsedShifts.length === 0 ? (
                <div className="bg-slate-900/40 rounded-2xl border border-slate-850 p-8 flex flex-col items-center justify-center text-center text-slate-400 min-h-[295px] font-sans">
                  <Clock size={32} className="text-slate-700 mb-2.5" />
                  <span className="text-xs font-extrabold text-slate-400 uppercase">Warte auf Eingabe...</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mt-1.5 font-medium">
                    Sobald du eine PDF auswählst oder Text einfügst, wird unser Algorithmus Datumszeilen, Dienstzeiten (z.B. Frühschicht, Uhrzeiten) und Einsatzorte live herausfiltern.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 min-h-[295px] flex flex-col justify-between">
                  <div className="overflow-y-auto max-h-[250px] border border-slate-850 rounded-2xl bg-slate-950/40">
                    <table className="w-full text-left border-collapse text-[10px] font-sans">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <th className="p-2.5 font-bold uppercase tracking-wide">Datum</th>
                          <th className="p-2.5 font-bold uppercase tracking-wide">Schicht</th>
                          <th className="p-2.5 font-bold uppercase tracking-wide">Uhrzeit</th>
                          <th className="p-2.5 font-bold uppercase tracking-wide">Einsatzort</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedShifts.map((shift, idx) => {
                          const dateObj = new Date(shift.date);
                          const formattedDate = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                          const dow = dateObj.toLocaleDateString('de-DE', { weekday: 'short' });
                          
                          return (
                            <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-900/30 text-slate-300 font-medium font-sans">
                              <td className="p-2.5 font-bold">
                                <span className="text-slate-500 font-bold mr-1.5">{dow}</span>
                                <span className="font-mono">{formattedDate}</span>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                  shift.type === 'Arbeit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' :
                                  shift.type === 'Urlaub' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                  'bg-red-500/10 text-red-400 border border-red-500/10'
                                }`}>
                                  {shift.type}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono">
                                {shift.type === 'Arbeit' ? `${shift.startTime} - ${shift.endTime}` : '-'}
                              </td>
                              <td className="p-2.5 truncate max-w-[120px] text-slate-400 italic">
                                {shift.location}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={handleCommitParsedShifts}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 border border-blue-700 shadow-lg active:scale-98 transition-all cursor-pointer font-sans"
                  >
                    <Check size={14} /> Erkannte {parsedShifts.length} Schichten importieren
                  </button>
                </div>
              )}

            </div>

          </div>

          {/* DIAGNOSE- & SCHNITTSTELLEN-DEBUGGER KONSOLE */}
          {pdfDebugLogs.length > 0 && (
            <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-inner">
              <div className="flex justify-between items-center bg-slate-900 px-4 py-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-300">
                    🔧 Live-Analyse- & Fehlerdiagnose-Konsole
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfDebugLogs([])}
                  className="text-[9px] hover:text-red-400 text-slate-400 font-bold transition-all font-sans uppercase"
                >
                  Konsole leeren
                </button>
              </div>
              <div className="p-4 max-h-[160px] overflow-y-auto font-mono text-[10px] text-zinc-300 space-y-1.5 leading-relaxed bg-black/60 selection:bg-blue-600/35">
                {pdfDebugLogs.map((logLine, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-600 select-none">[{String(idx + 1).padStart(2, '0')}]</span>
                    <span className={
                      logLine.includes('🔴') || logLine.includes('FEHLER') ? 'text-red-400 font-semibold' :
                      logLine.includes('⚠') || logLine.includes('WARNUNG') ? 'text-yellow-400 font-semibold' :
                      logLine.startsWith('➔') ? 'text-blue-400 font-black' :
                      logLine.includes('erfolgreich') ? 'text-emerald-400' : 'text-slate-300'
                    }>
                      {logLine}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* AUTO-IMPORT ACTION AND PROGRESS CARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ClipboardCopy size={18} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase font-sans tracking-wide">
              Massen-Übertragung in Stundenzettel
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Übertragen Sie alle Dienstplaneinträge für <strong className="text-slate-800">{monthsList.find(m => m.key === currentMonthKey)?.label}</strong>.
            Es wurden <strong className="text-blue-600">{monthlyRosterShifts.length} Schichten</strong> eingetragen. 
            Davon sind bereits <strong className="text-emerald-600">{appliedRosterCount} Tage</strong> im Stundenzettel erfasst.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <label className="text-xs font-bold text-slate-600 mr-2">Modus:</label>
            <button
              onClick={() => setImportOption('only-missing')}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border ${
                importOption === 'only-missing'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              Nur fehlende Tage hinzufügen
            </button>
            <button
              onClick={() => setImportOption('overwrite')}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border ${
                importOption === 'overwrite'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              Kompletten Monat ersetzen (überschreiben)
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-3 justify-center w-full">
          <button
            onClick={triggerImport}
            disabled={monthlyRosterShifts.length === 0}
            className={`w-full font-extrabold text-xs py-4 px-5 rounded-2xl flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all cursor-pointer ${
              monthlyRosterShifts.length === 0
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-slate-900 border border-slate-950 text-white hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft size={16} className="text-yellow-450" />
            <span>Jetzt Dienstplan übertragen</span>
          </button>

          {importStatus && (
            <div className="bg-emerald-50 text-emerald-850 border border-emerald-150 p-3 rounded-xl text-center text-xs font-bold animate-pulse">
              🎉 Übertragung erfolgreich! +{importStatus.added} neu angelegt
              {importStatus.overwritten > 0 && `, ${importStatus.overwritten} aktualisiert`}.
            </div>
          )}

          {monthlyRosterShifts.length === 0 && (
            <div className="text-center text-[11px] text-slate-400 font-bold italic">
              * Bitte legen Sie erst Schichten im Dienstplan an.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ADD SHIFT FORM PANEL */}
        <div className="lg:col-span-1 space-y-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md"
          >
            <Plus size={16} />
            <span>{showAddForm ? 'Hinzufügen ausblenden' : 'Schicht im Plan eintragen'}</span>
          </button>

          {(showAddForm || monthlyRosterShifts.length === 0) && (
            <form
              onSubmit={handleAddShiftSubmit}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-150"
            >
              <h4 className="text-xs font-black text-slate-850 uppercase border-b pb-2 tracking-wider">
                Neue Dienstplan-Schicht
              </h4>

              {formError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datum */}
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-750 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Typ */}
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                  Art der Schicht
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EntryType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Arbeit">Arbeitstag</option>
                  <option value="Urlaub">Geplanter Urlaub</option>
                  <option value="Krank">Krank / AU-Soll</option>
                  <option value="Feiertag">Feiertag</option>
                </select>
              </div>

              {type === 'Arbeit' && (
                <>
                  {/* Object Selector */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                      Einsatzort / Objekt
                    </label>
                    <select
                      value={selectedObjectId}
                      onChange={(e) => handleSelectObjectChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none mb-1.5"
                    >
                      <option value="">-- Objekt wählen (für automatische Km/Fahrtzeit) --</option>
                      {objects.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Freitext oder anderes Objekt..."
                      value={location}
                      onChange={(e) => {
                        setSelectedObjectId('');
                        setLocation(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Start / Ende */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                        Beginn
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-750 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                        Ende
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-750 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Pause */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                      Pause (Minuten)
                    </label>
                    <input
                      type="number"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                      min="0"
                      required
                    />
                  </div>
                </>
              )}

              {/* Notiz */}
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">
                  Bemerkung / Notiz
                </label>
                <textarea
                  placeholder="z.B. Frühschicht, Rufbereitschaft..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-750 focus:border-blue-500 focus:outline-none min-h-[50px] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md"
              >
                In Dienstplan eintragen
              </button>
            </form>
          )}
        </div>

        {/* LIST OF ROSTER SHIFTS DETAILS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">
                Schichten im {monthsList.find((m) => m.key === currentMonthKey)?.label} ({monthlyRosterShifts.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                Soll-Planung
              </span>
            </div>

            {monthlyRosterShifts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Calendar className="mx-auto text-slate-300 stroke-1" size={40} />
                <p className="text-xs font-bold">Keine Schichten in diesem Monat geplant.</p>
                <p className="text-[10px] text-slate-400 font-medium">Nutzen Sie den linken Button, um geplante Schichten hinzuzufügen.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                {monthlyRosterShifts.map((shift) => {
                  const hasLoggedEntry = monthlyLoggedEntries.some((e) => e.date === shift.date);
                  
                  return (
                    <div
                      key={shift.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        hasLoggedEntry
                          ? 'bg-emerald-50/45 border-emerald-150/45 text-slate-800'
                          : 'bg-slate-50/70 border-slate-200 text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black font-mono">
                            {new Date(shift.date).toLocaleDateString('de-DE', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                          
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              shift.type === 'Arbeit'
                                ? 'bg-blue-100 text-blue-700'
                                : shift.type === 'Urlaub'
                                ? 'bg-orange-100 text-orange-700'
                                : shift.type === 'Krank'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-150 bg-amber-100 text-amber-800'
                            }`}
                          >
                            {shift.type}
                          </span>

                          {hasLoggedEntry && (
                            <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded flex items-center gap-0.5 animate-in fade-in">
                              <Check size={9} /> Im Stundenzettel
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 text-xs font-semibold space-y-0.5">
                          {shift.type === 'Arbeit' ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-slate-400" />
                              <span className="font-extrabold text-slate-750">
                                {shift.startTime} - {shift.endTime} (Pause: {shift.breakMinutes} Min.)
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] italic font-medium text-slate-400">Ganzzeitiger Abwesenheits-Soll</span>
                          )}

                          {shift.location && shift.location !== '-' && (
                            <div className="flex items-center gap-1">
                              <Tag size={11} className="text-slate-400" />
                              <span className="text-xs font-bold text-slate-700">{shift.location}</span>
                            </div>
                          )}

                          {shift.notes && (
                            <p className="text-[10px] italic font-semibold text-slate-400 font-mono mt-1">
                              "{shift.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteRosterShift(shift.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl transition-all cursor-pointer self-end sm:self-center"
                        title="Schicht löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
