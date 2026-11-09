import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'private-materials');
const PAPERS = path.join(ROOT, 'papers');
const OUTPUT = path.join(ROOT, 'content.enc.json');
const PBKDF2_ITERATIONS = 310_000;
const encoder = new TextEncoder();

function readPassword() {
  if (process.env.CHAIR_HUB_PASSWORD) return process.env.CHAIR_HUB_PASSWORD;
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) throw new Error('File .env non trovato. Crea .env con PASSWORD=… e rilancia lo script.');
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((entry) => /^\s*PASSWORD\s*=/.test(entry));
  if (!line) throw new Error('Nel file .env manca la variabile PASSWORD.');
  let value = line.replace(/^\s*PASSWORD\s*=\s*/, '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, '').trim();
  }
  if (!value) throw new Error('La password in .env è vuota.');
  return value;
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const fullPath = path.join(directory, name);
    return statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function valueFor(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'im'))?.[1]?.trim() ?? '';
}

function section(text, start, end) {
  const startMatch = text.match(start);
  if (!startMatch) return '';
  const from = startMatch.index + startMatch[0].length;
  const remainder = text.slice(from);
  const endMatch = remainder.match(end);
  return (endMatch ? remainder.slice(0, endMatch.index) : remainder).trim();
}

function questions(text, language) {
  const lines = text.split(/\r?\n/);
  const heading = language === 'it'
    ? /^(?:DOMANDE(?: AGLI AUTORI| SUGGERITE)?)[^\n]*ITALIANO\s*$/i
    : /^(?:QUESTIONS(?: FOR THE AUTHORS)?|SUGGESTED QUESTIONS)[^\n]*ENGLISH\s*$/i;
  const start = lines.findIndex((line) => heading.test(line.trim()));
  if (start < 0) return [];
  const result = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.trim().match(/^\d+\.\s*(.+)$/);
    if (match) result.push(match[1].trim());
    else if (line.trim()) break;
    else if (result.length) break;
  }
  return result;
}

function clockMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function dayNumber(date) {
  return Number(date.match(/\b(\d{1,2})\s+novembre\b/i)?.[1] ?? 99);
}

function parsePapers(text, directory) {
  const blocks = text.split(/={10,}\s*/).slice(1);
  const slots = [];
  for (const block of blocks) {
    const slot = block.match(/^SLOT\s+(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})\s*\|\s*PAPER\s+(\d+)/mi);
    if (!slot) continue;
    const [, start, end, number] = slot;
    const sourcePdf = valueFor(block, 'PDF');
    const sourcePath = path.join(directory, sourcePdf);
    if (!sourcePdf || !existsSync(sourcePath)) {
      throw new Error(`PDF mancante per il paper ${number}: ${sourcePdf || '(nome non indicato)'}`);
    }
    const id = `paper-${number}`;
    const outputName = `${id}.pdf`;
    copyFileSync(sourcePath, path.join(PAPERS, outputName));
    slots.push({
      id,
      number,
      start,
      end,
      durationMinutes: Math.max(1, clockMinutes(end) - clockMinutes(start)),
      title: valueFor(block, 'Titolo / Title'),
      authors: valueFor(block, 'Autori / Authors'),
      presenters: valueFor(block, 'Presentatore/i indicati in grassetto nel programma / Presenter(s) highlighted in programme')
        .split(';').map((name) => name.trim()).filter(Boolean),
      summaryIt: valueFor(block, 'Descrizione (IT)'),
      summaryEn: valueFor(block, 'Description (EN)'),
      questionsIt: questions(block, 'it'),
      questionsEn: questions(block, 'en'),
      pdfUrl: `./papers/${outputName}`,
    });
  }
  return slots;
}

function parseGuide(file) {
  const directory = path.dirname(file);
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  const heading = lines[1]?.trim() ?? 'Sessione';
  const keynote = /^Keynote\s+(\d+)/i.test(heading);
  const number = heading.match(/(?:Sessione|Keynote)\s+(\d+)/i)?.[1] ?? '0';
  const date = valueFor(text, 'Data / Date') || valueFor(text, 'Data') || valueFor(text, 'Date');
  const chair = valueFor(text, 'Chair della sessione / Session chair') || valueFor(text, 'Chair del keynote / Keynote chair');
  const room = valueFor(text, 'Sede') || (/giovedì/i.test(date) ? 'DIET — Sala del Consiglio' : 'DIAG — Aula Magna');
  const openingIt = section(text, /^INTRODUZIONE\s*[—-]\s*ITALIANO\s*\r?\n/im, /^\s*OPENING\s*[—-]\s*ENGLISH/im);
  const openingEn = section(
    text,
    /^OPENING\s*[—-]\s*ENGLISH\s*\r?\n/im,
    /^\s*(?:={10,}|DOMANDE\b|QUESTIONS\b|SUGGESTED QUESTIONS\b|CHIUSURA\b|CLOSING\b)/im,
  );
  const closingIt = section(text, /^CHIUSURA\s*[—-]\s*ITALIANO\s*\r?\n/im, /^\s*CLOSING\s*[—-]\s*ENGLISH/im);
  const closingEn = section(text, /^CLOSING\s*[—-]\s*ENGLISH\s*\r?\n/im, /$^/);
  const order = Number(number);
  let slots = [];

  if (keynote) {
    const interval = valueFor(text, 'Orario').match(/(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})/);
    const speakerLine = valueFor(text, 'Relatrice') || valueFor(text, 'Relatore') || valueFor(text, 'Speaker');
    const speaker = speakerLine.split(/\s*[—–]\s*/)[0].trim();
    const durationMinutes = interval ? clockMinutes(interval[2]) - clockMinutes(interval[1]) : 60;
    slots = [{
      id: `keynote-${number}`,
      number: null,
      start: interval?.[1] ?? '',
      end: interval?.[2] ?? '',
      durationMinutes,
      title: valueFor(text, 'Titolo'),
      authors: speaker,
      presenters: [speaker].filter(Boolean),
      summaryIt: '',
      summaryEn: '',
      bioIt: openingIt,
      bioEn: openingEn,
      questionsIt: questions(text, 'it'),
      questionsEn: questions(text, 'en'),
      pdfUrl: null,
    }];
  } else {
    slots = parsePapers(text, directory);
  }

  if (!slots.length) throw new Error(`Nessuno slot trovato nella guida ${path.basename(file)}.`);
  return {
    id: keynote ? `keynote-${number}` : `session-${number}`,
    number: order,
    kind: keynote ? 'keynote' : 'session',
    title: heading.replace(/\s*[—-]\s*/g, ' — '),
    date,
    day: dayNumber(date),
    timeStart: slots[0].start,
    timeEnd: slots.at(-1).end,
    chair,
    room,
    openingIt,
    openingEn,
    closingIt,
    closingEn,
    slots,
  };
}

function encryptJson(value, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(encoder.encode(JSON.stringify(value))), cipher.final(), cipher.getAuthTag()]);
  return {
    version: 1,
    kdf: 'PBKDF2-SHA-256',
    cipher: 'AES-256-GCM',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

function main() {
  if (!existsSync(SOURCE)) throw new Error('Cartella private-materials/ non trovata. Inserisci lì le guide e i PDF.');
  const guides = walk(SOURCE).filter((file) => /Chair_Guide\.txt$/i.test(path.basename(file))).sort();
  if (!guides.length) throw new Error('Nessuna guida *Chair_Guide.txt trovata in private-materials/.');
  mkdirSync(PAPERS, { recursive: true });
  const sessions = guides.map(parseGuide).sort((a, b) => a.day - b.day || a.timeStart.localeCompare(b.timeStart));
  const paperCount = sessions.reduce((total, session) => total + session.slots.filter((slot) => slot.pdfUrl).length, 0);
  const bundle = { event: 'IIR 2026', city: 'Roma', dates: '12–14 novembre 2026', sessions };
  const password = readPassword();
  const encrypted = encryptJson(bundle, password);
  writeFileSync(OUTPUT, `${JSON.stringify(encrypted)}\n`, { mode: 0o644 });
  console.log(`Contenuti preparati: ${sessions.length} eventi, ${paperCount} paper, ${statSync(OUTPUT).size} byte cifrati.`);
}

try {
  main();
} catch (error) {
  console.error(`Errore: ${error.message}`);
  process.exitCode = 1;
}

