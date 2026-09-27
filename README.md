# 📅 Agenda & Calendario con Promemoria WhatsApp

Applicazione Web reattiva e Progressive Web App (PWA) progettata per gestire appuntamenti da **qualsiasi PC** e dal tuo **smartphone**, con invio immediato di promemoria personalizzati su **WhatsApp**.

---

## 🌟 Funzionalità Principali

1. **Integrazione Diretta WhatsApp**:
   - Tasto verde rapido per ogni appuntamento che apre immediatamente WhatsApp (Web su PC o App su smartphone).
   - Formattazione automatica del numero con prefisso (+39).
   - Modelli di messaggio preimpostati e modificabili:
     - 🔔 *Promemoria standard* ("Gentile [Cliente], le ricordiamo il Suo appuntamento...")
     - ✅ *Richiesta di conferma* ("Gentile [Cliente], Le chiediamo gentile conferma...")
     - ❤️ *Ringraziamento post-appuntamento*
     - ✏️ *Messaggio libero*
   - Possibilità di modificare al volo il testo prima di inviarlo.

2. **Accesso da Qualsiasi PC e Smartphone**:
   - Funziona su qualsiasi browser web moderno.
   - **Installabile come App Nativa (PWA)** sul tuo smartphone:
     - **iPhone**: Apri in Safari, tocca il tasto Condividi (⎋) e scegli *"Aggiungi a schermata Home"*.
     - **Android**: Apri in Chrome, tocca i tre puntini in alto e seleziona *"Installa app"* o *"Aggiungi a Home"*.

3. **Viste del Calendario Flessibili**:
   - **Agenda Elenco**: Vista perfetta da smartphone per scorrere rapidamente gli impegni (Oggi, Domani, Questa settimana).
   - **Mese**: Panoramica completa con indicatori di stato (Confermato, In Attesa, Completato).
   - **Settimana**: Griglia settimanale con timeline.
   - **Giorno**: Fasce orarie dettagliate per organizzare al minuto la giornata.

4. **Sincronizzazione Multi-Dispositivo (Cloud Sync)**:
   - Utilizza un **Codice Stanza** condiviso (es. `CAL-9824A`). Inserisci lo stesso codice sul PC dell'ufficio, sul portatile e sullo smartphone per vedere e aggiornare i medesimi appuntamenti!
   - Link rapido condivisibile con parametro `?room=CODICE` per sincronizzarsi all'istante su mobile.

5. **Altri Strumenti Inclusi**:
   - **Rubrica Clienti**: Salvataggio automatico per autocompletare nome e numero nei nuovi appuntamenti.
   - **Integrazione Google Calendar & Apple Calendar**: Esportazione file `.ics` o link diretto ad un clic.
   - **Statistiche & Report**: Conteggio appuntamenti, incassi stimati e servizi più richiesti.
   - **Backup Dati**: Esportazione e importazione in formato `.json`.

---

## 🚀 Come Pubblicare su GitHub e Attivare GitHub Pages (A Costo Zero)

L'applicazione è già pronta con la configurazione di GitHub Actions per il deploy automatico.

### Opzione 1: Con GitHub Desktop (Consigliata per la massima semplicità)
1. Scarica e apri [GitHub Desktop](https://desktop.github.com/).
2. Clicca su **File** > **Add Local Repository** e seleziona la cartella `calendario-app`.
3. Clicca su **Publish repository** per caricarlo sul tuo account GitHub.
4. Vai sul tuo repository su [github.com](https://github.com), clicca su **Settings** > **Pages** e in **Source** seleziona **GitHub Actions**.
5. In meno di un minuto la tua app sarà online all'indirizzo: `https://<tuo-utente>.github.io/<nome-repo>/`.

### Opzione 2: Tramite Web su GitHub.com
1. Crea un nuovo repository su GitHub chiamato ad esempio `calendario-app`.
2. Trascina i file del progetto oppure usa Git da terminale:
   ```bash
   git init
   git add .
   git commit -m "Inizializzazione Calendario WhatsApp"
   git branch -M main
   git remote add origin https://github.com/<tuo-utente>/<tuo-repo>.git
   git push -u origin main
   ```
3. Vai in **Settings** > **Pages** > Seleziona **GitHub Actions** come sorgente.

---

## 💻 Esecuzione Locale (Sviluppo)

Se vuoi provarla o modificarla sul tuo PC:
```bash
npm install
npm run dev
```
Apri il browser su `http://localhost:5173`.
