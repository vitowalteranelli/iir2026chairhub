# IIR 2026 Chair Hub

Web app statica, responsive e in italiano per i session chair di IIR 2026. Programma, biografie, descrizioni e domande di supporto vengono cifrati prima della pubblicazione; i PDF restano file statici scaricabili e consultabili.

## Preparare i contenuti

La cartella `private-materials/` contiene i documenti sorgente in chiaro ed è esclusa da Git. Conservala insieme ai file originali: per rigenerare i contenuti su un'altra macchina, ripristina prima lì le guide e i PDF. Lo script legge `PASSWORD` da `.env`, cifra le guide con PBKDF2-SHA-256 e AES-256-GCM e copia i PDF in `papers/`:

```sh
node scripts/prepare-content.mjs
```

Lo script genera `content.enc.json` e `papers/paper-<numero>.pdf`. Pubblica questi file insieme a `index.html`, `styles.css`, `app.js` e `.nojekyll`. I PDF in `papers/` sono copie statiche predisposte per la lettura e il download dall'app: saranno pubblici su GitHub Pages e non protetti dalla password. Le guide, i riassunti e le domande in chiaro restano nella cartella esclusa. Non pubblicare `.env` o `private-materials/`.

## Installare e pubblicare con GitHub Pages

1. Esegui lo script qui sopra e aggiungi i file statici generati al commit.
2. In GitHub apri **Settings → Pages**.
3. Scegli **Deploy from a branch**, seleziona `main` e la cartella `/(root)`, quindi salva.

Le risorse usano percorsi relativi e funzionano anche nell'URL `/nome-repository/` di GitHub Pages. Il sito non invia password o contenuti a un server: la decifratura avviene nel browser dopo l'inserimento della password. Se è attiva l'opzione **Ricorda su questo dispositivo**, la password viene conservata nel local storage del browser sotto una chiave specifica per il percorso di questa app; deselezionandola viene rimossa. La web app e i contenuti cifrati vengono memorizzati per l'uso offline; i PDF vengono caricati quando si apre il paper.

Una volta pubblicato in HTTPS, su Android apri l'indirizzo con Chrome e usa **Installa app** dal menu del browser. Su iPhone apri l'indirizzo con Safari, tocca **Condividi → Aggiungi alla schermata Home**, lascia attiva l'opzione per aprirla come app web e conferma con **Aggiungi**. L'app appare con il nome **IIR2026 Chair Hub**.

## Aggiornare guide e PDF

Aggiorna i file in `private-materials/` e riesegui lo script. Il programma cifrato viene rigenerato con un nuovo salt casuale; aggiungi i nuovi PDF e il file `content.enc.json` al commit. I vecchi PDF non più presenti nelle guide non vengono cancellati automaticamente.
