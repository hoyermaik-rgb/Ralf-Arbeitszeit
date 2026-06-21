/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { WorkEntry, MonthlySignature } from '../types';

interface PDFExportParams {
  employeeName: string;
  monthYearLabel: string; // z.B. "Juni 2026"
  costCenter: string;
  entries: WorkEntry[];
  signature: MonthlySignature | null;
  hourlyWage: number;
  isBreakPaid?: boolean;
}

export function generateArbeitsnachweisPDF({
  employeeName,
  monthYearLabel,
  costCenter,
  entries,
  signature,
  hourlyWage,
  isBreakPaid,
}: PDFExportParams): void {
  // A4 Maße: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Fonts & Styling-Konstanten
  doc.setFont('helvetica', 'normal');

  // --- HEADER (Kopfbereich) ---
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('Arbeitsnachweis', 105, 16, { align: 'center' });

  // Rechtsbündige Metadaten darunter
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(`Mitarbeiter: ${employeeName || 'Nicht angegeben'}`, 195, 23, { align: 'right' });
  doc.text(`Abrechnungsmonat: ${monthYearLabel}`, 195, 28, { align: 'right' });
  doc.text(`Objektkostenstelle: ${costCenter || 'Keine Angabe'}`, 195, 33, { align: 'right' });
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 195, 38, { align: 'right' });

  // Trennlinie
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 41, 195, 41);

  // --- TABELLE ---
  const tableStartY = 46;
  const colX = {
    datum: 15,
    arbeitsort: 38,
    beginnEnde: 100,
    pause: 132,
    fahrzeitKm: 152, // Platzhalter für Finanzamt-Zusatz in kleinerer Spalte
    stunden: 175,
  };

  // Tabellenüberschrift (Header Row)
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(15, tableStartY, 180, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85); // Slate-700

  doc.text('Datum', colX.datum + 2, tableStartY + 5.5);
  doc.text('Arbeitsort / Objekt', colX.arbeitsort + 2, tableStartY + 5.5);
  doc.text('Arbeitszeit', colX.beginnEnde + 2, tableStartY + 5.5);
  doc.text('Pause', colX.pause + 2, tableStartY + 5.5);
  doc.text('Entf. / Weg', colX.fahrzeitKm + 2, tableStartY + 5.5);
  doc.text('Gesamt', colX.stunden + 2, tableStartY + 5.5);

  let currentY = tableStartY + 8;
  let totalHoursSum = 0;
  let totalTravelTime = 0;
  let totalDistance = 0;
  let totalGrossBrutto = 0;

  // Sortierte Einträge für den Monat
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // Black/Slate-900

  // Tabellen-Zeilen füllen
  sortedEntries.forEach((entry, index) => {
    // Falls das Seitenende fast erreicht ist, ein neues Blatt anfangen (A4: 297mm)
    if (currentY > 215) {
      doc.addPage();
      currentY = 20;
      // Header wiederholen
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Datum', colX.datum + 2, currentY + 5.5);
      doc.text('Arbeitsort / Objekt', colX.arbeitsort + 2, currentY + 5.5);
      doc.text('Arbeitszeit', colX.beginnEnde + 2, currentY + 5.5);
      doc.text('Pause', colX.pause + 2, currentY + 5.5);
      doc.text('Entf. / Weg', colX.fahrzeitKm + 2, currentY + 5.5);
      doc.text('Gesamt', colX.stunden + 2, currentY + 5.5);
      doc.setFont('helvetica', 'normal');
      currentY += 8;
    }

    // Zeilen-Hintergrund leicht abwechseln
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(15, currentY, 180, 7, 'F');
    }

    // Datum formatieren (z.B. "Di, 02.06.")
    const dateObj = new Date(entry.date);
    const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'short' });
    const formattedDate = `${dayName}, ${dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    })}`;

    // Arbeitsstunden berechnen
    let rowHours = 0;
    if (entry.type === 'Arbeit') {
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      const startMinCount = sh * 60 + sm;
      const endMinCount = eh * 60 + em;
      const deductBreak = isBreakPaid !== false ? 0 : entry.breakMinutes;
      const rawMin = endMinCount - startMinCount - deductBreak;
      rowHours = Math.max(0, rawMin / 60);
      totalHoursSum += rowHours;
      totalGrossBrutto += rowHours * (entry.hourlyWage ?? hourlyWage);
    } else if (entry.type === 'Urlaub' || entry.type === 'Krank' || entry.type === 'Feiertag') {
      rowHours = 8.0; // Standardmäßig mit 8.0 Std. bewerten fürs Gehalt/Lohnfortzahlung
      totalHoursSum += rowHours;
      totalGrossBrutto += rowHours * (entry.hourlyWage ?? hourlyWage);
    }

    totalDistance += entry.travelDistanceKm || 0;
    totalTravelTime += entry.travelTimeMinutes || 0;

    // Werte schreiben
    doc.text(formattedDate, colX.datum + 2, currentY + 5);

    // Textbegrenzung bei langem Arbeitsort
    let cleanLocation = entry.location || '';
    if (entry.type === 'Urlaub') {
      cleanLocation = '🌴 BEZAHLTER URLAUB';
      doc.setTextColor(16, 185, 129); // Emerald-600
    } else if (entry.type === 'Krank') {
      cleanLocation = '🤒 LOHNFORTZAHLUNG KRANK';
      doc.setTextColor(239, 68, 68); // Red-500
    } else if (entry.type === 'Feiertag') {
      cleanLocation = '🎉 FEIERTAG (Lohnfortzahlung)';
      doc.setTextColor(147, 51, 234); // Purple-500
    } else {
      doc.setTextColor(15, 23, 42); // Black
    }

    doc.text(cleanLocation.substring(0, 32), colX.arbeitsort + 2, currentY + 5);
    doc.setTextColor(15, 23, 42); // Zurücksetzen

    const timeColText =
      entry.type === 'Arbeit' ? `${entry.startTime} - ${entry.endTime}` : '-';
    doc.text(timeColText, colX.beginnEnde + 2, currentY + 5);

    const pauseColText = entry.type === 'Arbeit' ? `${entry.breakMinutes} Min.` : '-';
    doc.text(pauseColText, colX.pause + 2, currentY + 5);

    // Entfernung / Fahrzeit fürs Finanzamt
    const wayText =
      entry.type === 'Arbeit' && (entry.travelDistanceKm || entry.travelTimeMinutes)
        ? `${entry.travelDistanceKm} km / ${entry.travelTimeMinutes}m`
        : '-';
    doc.text(wayText, colX.fahrzeitKm + 2, currentY + 5);

    const hoursText = `${rowHours.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Std.`;
    doc.setFont('helvetica', 'bold');
    doc.text(hoursText, colX.stunden + 2, currentY + 5);
    doc.setFont('helvetica', 'normal');

    // Rahmenlinien unten zeichnen
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY + 7, 195, currentY + 7);

    currentY += 7;
  });

  // --- ZUSAMMENFASSUNG ---
  currentY += 3;
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.4);
  doc.line(15, currentY, 195, currentY);

  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Zusammenfassung & Auswertung (Monat):', 15, currentY);
  
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`• Gesamte Arbeitszeit: ${totalHoursSum.toLocaleString('de-DE', { maximumFractionDigits: 2 })} Std.`, 15, currentY);
  doc.text(`• Reisezeit für Finanzamt: ${Math.floor(totalTravelTime / 60)} Std. ${totalTravelTime % 60} Min.`, 110, currentY);

  currentY += 5;
  doc.text(`• Berechneter Basislohn: ${hourlyWage.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`, 15, currentY);
  doc.text(`• Fahrtstrecke für Finanzamt: ${totalDistance.toLocaleString('de-DE')} km insgesamt`, 110, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`• Bruttogehalt (Prognose): ${totalGrossBrutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`, 15, currentY);
  doc.setFont('helvetica', 'normal');

  // --- UNTERSCHRIFTEN ---
  currentY += 15;
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(15, currentY, 195, currentY);
  currentY += 8;

  // Kopfzeilen für Unterschriften
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Unterschrift des Arbeitnehmers', 15, currentY);
  doc.text('Unterschrift des Arbeitgebers', 110, currentY);

  // Unterschriftsfelder zeichnen oder Bilder einbetten
  const sigBoxY = currentY + 3;
  const sigBoxW = 75;
  const sigBoxH = 25;

  // Box Arbeitnehmer
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.2);
  doc.rect(15, sigBoxY, sigBoxW, sigBoxH);
  if (signature?.employeeSignature) {
    try {
      doc.addImage(signature.employeeSignature, 'PNG', 16, sigBoxY + 1, sigBoxW - 2, sigBoxH - 2);
    } catch (e) {
      doc.text('[Unterschrift Bildfehler]', 20, sigBoxY + 12);
    }
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const signedDate = signature.employeeSignedAt
      ? new Date(signature.employeeSignedAt).toLocaleString('de-DE')
      : 'Freigegeben';
    doc.text(`Digital signiert am: ${signedDate}`, 15, sigBoxY + sigBoxH + 4);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Ausstehend', 15 + sigBoxW / 2 - 8, sigBoxY + 14);
  }

  // Box Arbeitgeber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.rect(110, sigBoxY, sigBoxW, sigBoxH);
  if (signature?.employerSignature) {
    try {
      doc.addImage(signature.employerSignature, 'PNG', 111, sigBoxY + 1, sigBoxW - 2, sigBoxH - 2);
    } catch (e) {
      doc.text('[Unterschrift Bildfehler]', 115, sigBoxY + 12);
    }
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const signedDate = signature.employerSignedAt
      ? new Date(signature.employerSignedAt).toLocaleString('de-DE')
      : 'Freigegeben';
    doc.text(`Digital signiert am: ${signedDate}`, 110, sigBoxY + sigBoxH + 4);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Ausstehend', 110 + sigBoxW / 2 - 8, sigBoxY + 14);
  }

  // PDF speichern
  const filename = `Arbeitsnachweis_${employeeName.replace(/\s+/g, '_')}_${monthYearLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
