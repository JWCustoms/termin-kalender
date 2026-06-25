# Termin Kalender

Vollständige deutschsprachige Termin-Kalender-App mit Login, lokaler Datenspeicherung und iPhone-Installation per Sideloading.

## Features

- **Kalender-Ansichten:** Monat, Woche, Tag, Agenda, Jahr
- **Termine:** Erstellen, bearbeiten, löschen, duplizieren, Wiederholungen
- **Mehrere Kalender** mit Farben (Privat, Arbeit, Familie)
- **Kategorien/Tags** mit Farbcodierung
- **Erinnerungen** mit lokalen Benachrichtigungen
- **Suche** über Titel, Ort, Beschreibung
- **Import/Export:** .ics und JSON-Backup
- **Deutsche Feiertage** (bundeslandspezifisch)
- **Dark/Light Mode**
- **Offline-first:** Termine werden lokal auf dem Gerät gespeichert
- **Login/Registrierung** für Benutzerkonten

## Voraussetzungen

- Node.js 20+
- npm
- Für iPhone-Installation: [Sideloadly](https://sideloadly.io) + kostenlose Apple-ID

## Installation & Start

```bash
# Abhängigkeiten installieren
npm install

# API und Web-App starten
npm run dev
```

- Web-App: http://localhost:5173
- API: http://localhost:3001

## Auf dem iPhone testen (sofort, ohne IPA)

1. Starte die App mit `npm run dev`
2. Finde deine lokale IP-Adresse (z.B. `ipconfig` → 192.168.x.x)
3. Öffne `http://DEINE-IP:5173` im iPhone-Safari
4. Tippe auf „Teilen" → „Zum Home-Bildschirm"

## Als IPA auf iPhone installieren (Sideloading)

### Option A: GitHub Actions (empfohlen, kein Mac nötig)

1. Projekt auf GitHub pushen
2. Unter **Actions** → **Build iOS IPA** → **Run workflow**
3. Nach dem Build die IPA aus den Artifacts herunterladen
4. Mit **Sideloadly** auf dem PC installieren:
   - iPhone per USB verbinden
   - IPA-Datei in Sideloadly ziehen
   - Deine Apple-ID eingeben
   - „Start" klicken

### Option B: Lokal mit Capacitor (Mac erforderlich)

```bash
npm run build
cd apps/web
npx cap add ios
npx cap sync ios
npx cap open ios
```

In Xcode das Projekt bauen und auf dem Gerät installieren.

### Wichtig: 7-Tage-Limit

Mit einer **kostenlosen Apple-ID** läuft die sideloaded App nach **7 Tagen** ab. Einfach einmal pro Woche in Sideloadly erneut signieren (dauert ~1 Minute).

## Projektstruktur

```
Termin Kalender/
├── apps/
│   ├── web/          # React Frontend + Capacitor
│   └── api/          # Node.js Auth-Backend
├── .github/workflows/ # IPA Build Pipeline
└── package.json      # Monorepo Root
```

## API Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | /auth/register | Registrierung |
| POST | /auth/login | Anmeldung |
| GET | /auth/me | Aktueller Benutzer |
| PATCH | /auth/profile | Name ändern |
| PATCH | /auth/password | Passwort ändern |
| DELETE | /auth/account | Konto löschen |

## Datenschutz

- **Termine** werden ausschließlich lokal auf deinem Gerät gespeichert (IndexedDB)
- Das Backend speichert nur **Benutzerkonten** (E-Mail, gehashtes Passwort, Name)
- Keine Termindaten verlassen dein Gerät

## Technologie-Stack

- React + TypeScript + Vite
- Tailwind CSS
- Dexie.js (IndexedDB)
- Capacitor (iOS Native Wrapper)
- Node.js + Express + SQLite (Auth)
- rrule.js (Wiederholungen)
- ical.js (.ics Import/Export)
