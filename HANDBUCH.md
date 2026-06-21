# Handbuch: Arbeitszeit- & Urlaubsplaner (TimeTrack Pro)

Willkommen beim Benutzerhandbuch für **TimeTrack Pro** (Version 4.2). Diese Anwendung wurde speziell für Arbeitnehmer entwickelt, um Arbeitszeiten, Einsatzorte, Fahrtwege, Urlaubsansprüche und Verdienste übersichtlich zu verwalten, monatlich abzuzeichnen und als fehlerfreien Arbeitsnachweis zu exportieren.

---

## Inhaltsverzeichnis
1. [Installation & Offline-Nutzung (Smartphone & PC)](#1-installation--offline-nutzung-smartphone--pc)
2. [Überleben auf GitHub Pages (Dauerhafter kostenloser Betrieb)](#2-überleben-auf-github-pages-dauerhafter-kostenloser-betrieb)
3. [Funktionen im Detail](#3-funktionen-im-detail)
   - [A. Zeiterfassung (Einträge erfassen)](#a-zeiterfassung-einträge-erfassen)
   - [B. Objekte & Tarife (Einsatzorte & Lohngruppen)](#b-objekte--tarife-einsatzorte--lohngruppen)
   - [C. Monatsauswertung & Digitale Unterschrift](#c-monatsauswertung--digitale-unterschrift)
   - [D. Jahresauswertung & Verdienstprognosen](#d-jahresauswertung--verdienstprognosen)
   - [E. Urlaubsplaner](#e-urlaubsplaner)
4. [Datenhaltung & Datensicherheit](#4-datenhaltung--datensicherheit)
5. [Fehlerbehebung (Troubleshooting)](#5-fehlerbehebung-troubleshooting)

---

## 1. Installation & Offline-Nutzung (Smartphone & PC)

Diese Anwendung ist als moderne **Progressive Web App (PWA)** konzipiert. Das bedeutet, sie verhält sich auf Ihrem Smartphone oder PC wie eine echte App aus dem App Store und erfordert keine komplexe Installation über Google Play.

### Auf Android-Geräten (z.B. Google, Samsung, Xiaomi)
1. Öffnen Sie den Anwendungslink in Ihrem **Google Chrome**- oder **Samsung Internet**-Browser.
2. Tippen Sie auf die **drei Punkte** (Menü) oben rechts oder unten rechts im Browser.
3. Wählen Sie **„Zum Startbildschirm hinzufügen“** (oder **„App installieren“**).
4. Bestätigen Sie die Installation. Nun erscheint das **⏱️ TimeTrack Pro**-Icon auf Ihrem Startbildschirm und kann direkt im Vollbildmodus genutzt werden.

### Auf dem iPhone oder iPad (iOS)
1. Öffnen Sie den Link im **Safari**-Browser.
2. Tippen Sie unten im Menü auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben).
3. Scrollen Sie nach unten und wählen Sie **„Zum Home-Bildschirm“**.
4. Vergeben Sie einen Wunschnamen und tippen Sie auf **„Hinzufügen“**.

### Am PC oder Mac (Desktop)
1. Nutzen Sie **Google Chrome** oder **Microsoft Edge**.
2. Rechts in der Adressleiste erscheint ein kleines Monitor-Symbol mit einem Pfeil nach unten („App installieren“).
3. Klicken Sie darauf, um TimeTrack Pro als eigenständiges Desktop-Fenster zu installieren.

---

## 2. Überleben auf GitHub Pages (Dauerhafter kostenloser Betrieb)

Wenn Sie das Projekt in Ihr eigenes GitHub-Repository hochgeladen haben, wird die App **dauerhaft und völlig kostenlos** betrieben.

### Automatische Veröffentlichung (GitHub Actions)
Wir haben vorkonfigurierte Einstellungen (`.github/workflows/deploy.yml`) integriert. Sobald Sie Änderungen in Ihr Repository pushen, baut GitHub die App automatisch im Hintergrund und veröffentlicht sie auf einer speziellen Internetadresse (`https://ihr-username.github.io/ihr-repo-name/`).

**Wichtige Voraussetzungen auf GitHub:**
1. Gehen Sie in Ihrem GitHub-Repository auf **Settings** -> **Actions** -> **General**.
2. Scrollen Sie ganz nach unten zu **Workflow permissions** und stellen Sie sicher, dass **„Read and write permissions“** aktiviert ist.
3. Gehen Sie auf **Settings** -> **Pages**.
4. Stellen Sie sicher, dass als Quelle (Source) **„Deploy from a branch“** ausgewählt ist und wählen Sie als Branch **`gh-pages`** (nicht main!) sowie den Ordner **`/root`** aus.

---

## 3. Funktionen im Detail

### A. Zeiterfassung (Einträge erfassen)
Im Tab **„Zeiterfassung“** pflegen Sie Ihr tägliches Logbuch.
* **🎙️ INTELLIGENTE SPRACHEINGABE (Diktier-Modus)**: Ein herausragendes Feature! Klicken Sie im Erfassungs-Formular einfach auf den Button *„🎙️ Per Spracheingabe ausfüllen (Diktier-Modus)“*, erteilen Sie Mikrofon-Vollmacht und sprechen Sie Ihren Arbeitstag fließend auf Deutsch ein (z.B. „Heute von 8 Uhr bis 16 Uhr 30 mit 30 Minuten Pause“ oder „Feiertag am ersten Mai“). Die integrierte Offline-KI erkennt Datum, Arbeitsbeginn, Arbeitsende, Pausenzeit, Objekte sowie Urlaubs- und Krankheitstage vollautomatisch und befüllt das Formular auf Knopfdruck!
* **Eintragstyp wählen**: Es stehen Ihnen die Typen *Arbeit*, *Urlaub*, *Krank* und *Feiertag* zur Verfügung.
* **Objekt/Ort verknüpfen**: Wählen Sie aus zuvor angelegten Einsatzorten oder tragen Sie einen freien Text ein. Entfernungen und Fahrzeiten werden automatisch vervollständigt.
* **Stechuhr / Zeiten eintragen**: Tragen Sie Beginn und Ende Ihrer Arbeitszeit sowie die Pausendauer in Minuten ein. Die Nettoarbeitszeit wird automatisch ermittelt.
* **Erweiterte Fahrzeitdaten**: Pflegen Sie optional Ihre Hin- und Rückfahrtzeiten sowie Kilometerstände für die Steuererklärung.

### B. Objekte & Tarife (Einsatzorte & Lohngruppen)
Über die **Optionen / Einstellungen** können Sie Arbeitsorte (Objekte) und Tarifverträge definieren:
1. **Lohngruppen**: Hinterlegen Sie Tarifstufen (z.B. Lohngruppe 1, Lohngruppe 3...) mit dem jeweiligen Stundenlohn.
2. **Objektprofile**: Erstellen Sie feste Profile für regelmäßig besuchte Einsatzorte (Z.B. „Lager Werk II“). Verknüpfen Sie diese optional mit einer Tarifstufe. Fahrstrecke (km) und normale Reisezeiten werden dort einmalig hinterlegt, sodass die Zeiterfassung im Alltag mit nur einem Klick erfolgt.

### C. Monatsauswertung & Digitale Unterschrift
Im Tab **„Monatsauswertung“** sehen Sie das fertige Monatsblatt.
* **PDF-Generierung**: Exportieren Sie das Monatsblatt als sauberen PDF-Berechnungsbogen für Ihren Arbeitgeber oder das Steuerbüro.
* **Monatssignierung**: Ein besonderes Highlight ist die digitale Unterschrift. Es gibt dedizierte Felder für die Unterschrift des **Arbeitnehmers** und des **Arbeitgebers** (z.B. Vorarbeiter/Bauleiter vor Ort).
* Ihre Unterschrift wird direkt mit dem Finger oder der Maus auf dem Bildschirm gezeichnet und dauerhaft als Base64-Verschlüsselung im Browser gespeichert.

### D. Jahresauswertung & Verdienstprognosen
Hier erhalten Sie eine komprimierte Jahresübersicht über:
* Gesamte Bruttoverdienste.
* Gesamt geleistete Arbeitsstunden und angefallene Überstunden.
* Krankheits- und Urlaubstage auf einen Blick.
* Steuer-Netto-Prognosen basierend auf Ihrer Steuerklasse und Krankenkasse.

### E. Urlaubsplaner
Im Tab **„Urlaubsplaner“**:
* Tragen Sie Ihren vertraglichen Urlaubsanspruch für das jeweilige Jahr ein (z.B. 30 Tage).
* Reservieren oder buchen Sie zusammenhängende Urlaubsblöcke mit Start- und Enddatum.
* Die App berechnet automatisch die verbleibenden Urlaubstage, um Ihnen unerwartete Überraschungen bei der Urlaubsplanung zu ersparen.

---

## 4. Datenhaltung & Datensicherheit

Deine Privatsphäre steht an erster Stelle:
* **Keine Cloud-Übertragung**: Diese App lädt keine Arbeitszeiten auf externe fremde Server hoch. Alle erfassten Daten, Passwörter und Unterschriften verbleiben verschlüsselt im **`localStorage`** Ihres Webbrowsers oder Ihres Smartphones.
* **Backup & Datenrettung**: Sie können im Einstellungs-Tab jederzeit eine Sicherungsdatei erstellen (Export) und diese bei einem Handywechsel oder Datenverlust wieder einspielen (Import).

---

## 5. Fehlerbehebung (Troubleshooting)

### Fehler: „Cannot find module .../vite.js“ auf dem eigenen PC
Dieser Fehler tritt auf Ihrem privaten Computer auf, wenn Sie versuchen, die App auszuführen, die Node-Module (Abhängigkeiten) jedoch nicht korrekt installiert wurden.
* **Lösung**: Öffnen Sie das Terminal (Eingabeaufforderung / PowerShell) im Projektordner und führen Sie folgenden Befehl aus:
  ```bash
  npm install
  ```
  Danach starten Sie den lokalen Entwicklungsserver mit:
  ```bash
  npm run dev
  ```

### Meine Daten sind nach dem Browser-Bereinigen weg
* **Ursache**: Der `localStorage` wurde durch ein Bereinigungs-Tool („Cleaner“-App, Verlauf löschen im Browser) gelöscht.
* **Lösung**: Nutzen Sie regelmäßig die Export-Funktion im Menü **Einstellungen**, um ein lokales Backup Ihrer Einträge zu speichern.

---
*Erstellt für Maik Hoyer • TimeTrack Pro v4.2*
