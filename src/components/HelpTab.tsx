import { useState } from 'react';
import { BookOpen, AlertCircle, Smartphone, Clock, CalendarRange, PenTool, Key, CheckCircle, Database } from 'lucide-react';
import { motion } from 'motion/react';

export default function HelpTab() {
  const [expandedSection, setExpandedSection] = useState<string | null>('pwa');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const guides = [
    {
      id: 'pwa',
      title: '📱 App auf dem Handy installieren (Offline-Modus)',
      icon: <Smartphone className="text-blue-500" size={20} />,
      summary: 'Wie Sie diese App wie eine echte App aus dem App Store auf Ihrem Smartphone oder PC installieren.',
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Diese Anwendung ist eine moderne <strong>Progressive Web App (PWA)</strong>. Sie benötigt keinen App Store
            und verbraucht fast keinen Speicherplatz auf Ihrem Telefon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span> 
                Android (Chrome)
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Öffnen Sie den Link im <strong>Chrome-Browser</strong>.</li>
                <li>Tippen Sie rechts oben auf die <strong>drei Punkte</strong>.</li>
                <li>Wählen Sie <strong>"Zum Startbildschirm hinzufügen"</strong> oder <strong>"App installieren"</strong>.</li>
              </ol>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                iPhone & iPad (iOS)
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Öffnen Sie den Link im <strong>Safari-Browser</strong>.</li>
                <li>Tippen Sie unten auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben).</li>
                <li>Wählen Sie <strong>"Zum Home-Bildschirm"</strong>.</li>
              </ol>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
                PC & Laptop
              </h4>
              <p className="text-xs">
                Verwenden Sie Google Chrome oder Edge. Klicken Sie ganz rechts in der Web-Adresszeile auf das kleine 
                Desktop-Symbol mit dem Pfeil nach unten, um die App im Vollbildfenster zu installieren.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'logging',
      title: '⏱️ Arbeitszeiten & Fahrzeiten eintragen',
      icon: <Clock className="text-teal-500" size={20} />,
      summary: 'So erfassen Sie Arbeitstage, Urlaub, Krankentage und Fahrtzeiten fehlerfrei.',
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Unter dem Tab <strong>Zeiterfassung</strong> verwalten Sie Ihre tägliche Arbeitsleistung:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>Typ wählen:</strong> Sie können zwischen <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-xs font-semibold">Arbeit</span>, 
              <span className="bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded text-xs font-semibold">Urlaub</span>, 
              <span className="bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded text-xs font-semibold">Krank</span> und 
              <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-xs font-semibold">Feiertag</span> wählen.
            </li>
            <li>
              <strong>Einsatzort / Objekt:</strong> Wählen Sie aus Ihren gespeicherten Orten aus. Kilometer und Fahrtzeiten werden automatisch eingetragen.
            </li>
            <li>
              <strong>Arbeitszeit & Pause:</strong> Geben Sie Arbeitsbeginn, Ende und die Pause (in Minuten) an — z.B. 08:00 bis 16:30 mit 30 min Pause ergibt genau 8,00 Arbeitsstunden.
            </li>
            <li>
              <strong>Reisezeiten:</strong> Tragen Sie Fahrtzeiten (Minuten) und Fahrtstrecken (Soll-Kilometer) ein. Diese werden für die Steuer- oder Fahrtgeldauszahlung herangezogen.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'signatures',
      title: '✍️ Monatsbericht unterschreiben & exportieren',
      icon: <PenTool className="text-purple-500" size={20} />,
      summary: 'Wie Sie den Arbeitsnachweis digital signieren lassen und als PDF herunterladen.',
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Am Monatsende rufen Sie den Tab <strong>Monatsauswertung</strong> auf. Hier können Sie Ihren Zettel fertigstellen:
          </p>
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl space-y-2">
            <h4 className="font-extrabold text-purple-900 text-xs uppercase tracking-wider">Unterschriften einholen</h4>
            <p className="text-xs text-purple-950">
              1. <strong>Arbeitnehmer (Sie):</strong> Unterschreiben Sie direkt im Feld mit dem Finger auf Ihrem Display oder der Maus.
            </p>
            <p className="text-xs text-purple-950">
              2. <strong>Arbeitgeber / Bauleiter:</strong> Vor Ort kann Ihr Vorgesetzte, Vorarbeiter oder Kunde direkt auf Ihrem Handy gegenzeichnen. Damit ist der Zettel offiziell beglaubigt!
            </p>
          </div>
          <p className="text-xs">
            Klicken Sie anschließend auf <strong>„Als PDF generieren“</strong>. Die App erstellt einen perfekt formatierten, 
            druckbereiten Arbeitszeit-Berechnungsbogen inklusive beider Signaturen und Stempelbereiche.
          </p>
        </div>
      ),
    },
    {
      id: 'objects',
      title: '📁 Objekte & Tarife pflegen',
      icon: <Key className="text-orange-500" size={20} />,
      summary: 'Sparen Sie Zeit mit vordefinierten Einsatzorten, festen Wegstrecken und Ihren Tarif-Löhnen.',
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Im Tab <strong>Optionen &amp; Einstellungen</strong> legen Sie Ihre festen Daten an:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>
              <strong>Objekte:</strong> Fügen Sie häufige Kunden oder Einsatzorte hinzu. Hinterlegen Sie dort direkt die einfache Entfernung (km) und die typische Fahrtzeit. Bei der täglichen Erfassung genügt ein Klick, um alles auszufüllen!
            </li>
            <li>
              <strong>Lohngruppen / Tarifverträge:</strong> Pflegen Sie verschiedene Tarif-Stundenlöhne ein. Sie können ein Objekt direkt mit einer Tarif-Lohngruppe verknüpfen, sodass Ihre Stundenabrechnung automatisch den korrekten Lohn anwendet.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'data',
      title: '💾 Wo liegen meine Daten? (Datenschutz & Backup)',
      icon: <Database className="text-blue-600" size={20} />,
      summary: 'Ihre Daten gehören Ihnen. Sie lagern sicher und lokal auf Ihrem eigenen Gerät.',
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div className="flex gap-3 items-start bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="font-bold text-emerald-900 text-xs">100% Datenschutzgarantie</h4>
              <p className="text-xs text-emerald-800 mt-1">
                Keine Datenübertragung an fremde Server. Alle Zeiteinträge, persönlichen Einstellungen und Signaturen 
                werden ausschließlich im gesicherten lokalen Speicher (localStorage) Ihres Browsers gesichert.
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
            <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
              <AlertCircle size={16} /> Wichtiger Hinweis zur Datensicherung (Backups)
            </h4>
            <p className="text-xs text-amber-805 mt-1">
              Beim Löschen Ihres Browserverlaufs oder bei "Aufräum-Apps" kann der Speicher gelöscht werden. 
              <strong> Sichern Sie Ihre Daten regelmäßig!</strong> Gehen Sie dazu in die <strong>Einstellungen</strong> 
              und klicken Sie auf <strong>Daten sichern (Backup erstellen)</strong>. Sie erhalten eine Textdatei, die Sie 
              jederzeit (z.B. auf einem neuen Smartphone) importieren können.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div id="help-tab-container" className="space-y-6">
      
      {/* Tab Header Card */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-6 -translate-y-6 pointer-events-none">
          <BookOpen size={240} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-blue-500/30 text-blue-200 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-blue-400/20">
            Benutzer-Handbuch
          </span>
          <h2 className="text-2xl md:text-3xl font-black mt-3 tracking-tight">
            Hilfe &amp; Bedienungsanleitung
          </h2>
          <p className="text-blue-100 text-xs md:text-sm mt-2 leading-relaxed opacity-90">
            Hier finden Sie alle Antworten zur Erfassung Ihrer Arbeitszeiten, dem digitalen Signieren der Monatsblätter 
            sowie Tipps zur dauerhaften, kostenlosen Speicherung und PWA-Offline-Installation.
          </p>
        </div>
      </div>

      {/* Accordion List with Micro-animations */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md divide-y divide-slate-100">
        <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={18} /> Häufige Fragen &amp; Hilfemenü
        </h3>

        {guides.map((g) => {
          const isOpen = expandedSection === g.id;
          return (
            <div key={g.id} className="py-4 first:pt-0 last:pb-0">
              <button
                onClick={() => toggleSection(g.id)}
                className="w-full flex items-center justify-between text-left gap-4 hover:bg-slate-50/50 p-2 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2.5 rounded-xl shrink-0">
                    {g.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base tracking-tight">
                      {g.title}
                    </h4>
                    <p className="text-slate-450 text-[11px] font-medium mt-0.5 line-clamp-1">
                      {g.summary}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-lg px-2">
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {/* Collapsible Content */}
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 pl-0 md:pl-14 pr-2"
                >
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/80">
                    {g.content}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Troubleshooting Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-950 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <AlertCircle size={16} /> Schnell-Hilfe (Support)
          </h4>
          <p className="text-xs text-slate-350 max-w-xl">
            Sollte etwas nicht geladen werden, hilft meistens ein Neuladen der Internetseite des Gerätes. Bitte stellen Sie sicher, dass Sie Backups Ihrer Daten regelmäßig über die Optionen herunterladen.
          </p>
        </div>
        <div className="shrink-0">
          <span className="text-[10px] font-mono select-all bg-slate-850 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-400 block text-center">
            Maik Hoyer • Version 4.2
          </span>
        </div>
      </div>

    </div>
  );
}
