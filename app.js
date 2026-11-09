const state = {
  bundle: null,
  page: 'program',
  language: 'it',
  sessionId: null,
  currentSlot: null,
  remainingMs: 15 * 60_000,
  totalMs: 15 * 60_000,
  deadline: null,
  intervalId: null,
  running: false,
  finished: false,
  alarmPlayed: false,
  stageOpen: false,
  audioContext: null,
  wakeLock: null,
  search: '',
  paperFilter: 'all',
};

const UI = {
  it: {
    programTab: 'Programma', papersTab: 'Paper', ready: 'Pronto per la sessione',
    startTimer: 'Avvia cronometro', pauseTimer: 'Metti in pausa il cronometro', start: 'Avvia cronometro', pause: 'Pausa', resetTimer: 'Azzera cronometro', presenterScreen: 'Apri schermo relatore',
    pdfBack: 'Torna ai contenuti', pdfOpen: 'Apri scheda', pdfDownload: 'Scarica', pdfPreview: 'Anteprima del paper',
    programKicker: 'IIR 2026 · Session Chair', programTitle: 'Il tuo programma', programIntro: 'Scaletta, presentatori e materiali pronti per la sessione.', conferenceDates: 'Roma · 12–14 novembre 2026',
    schedule: 'Programma', scrollSessions: 'Scorri le sessioni', previousSessions: 'Sessioni precedenti', nextSessions: 'Sessioni successive', chooseSession: 'Seleziona una sessione',
    keynote: 'Keynote', topicSession: 'Sessione tematica', chair: 'Chair', venue: 'Sede', agenda: 'Scaletta', detailedSchedule: 'Scaletta dettagliata', talk: 'interventi', slot: 'slot',
    chairScripts: 'Introduzione e chiusura del chair', opening: 'Introduzione', closing: 'Chiusura', supportMaterials: 'Materiali di supporto per i chair · IIR 2026', lockHub: 'Blocca Chair Hub',
    papersKicker: 'Libreria paper · IIR 2026', papersTitle: 'I paper della conferenza', papersIntro: 'Apri o scarica i PDF; consulta le descrizioni e gli spunti per la discussione.', noteTitle: 'Nota per il chair:',
    generatedNotice: 'Le domande sono generate come spunti di supporto. Non sono domande ufficiali e non sostituiscono la valutazione del chair.',
    searchPlaceholder: 'Cerca titolo, autore o argomento…', filterSession: 'Filtra per sessione', allSessions: 'Tutte le sessioni',
    resultOne: 'paper trovato', resultMany: 'paper trovati', noResults: 'Nessun paper corrisponde alla ricerca.', paperFooter: 'PDF consultabili e scaricabili · IIR 2026',
    presenter: 'Presenta', authors: 'Autori', speaker: 'Relatrice', readPdf: 'Leggi PDF', download: 'Scarica', set: 'Timer', notConfirmed: 'Da confermare',
    questionsTitle: 'Domande suggerite', generatedQuestions: 'Spunti generati · solo supporto per il chair', description: 'Descrizione', summaryQuestions: 'Descrizione e domande suggerite',
    bioTitle: 'Bio e presentazione', keynoteQuestions: 'Bio, introduzione e domande', timeTbd: 'Orario da definire',
  },
  en: {
    programTab: 'Schedule', papersTab: 'Paper', ready: 'Ready for the session',
    startTimer: 'Start timer', pauseTimer: 'Pause timer', start: 'Start timer', pause: 'Pause', resetTimer: 'Reset timer', presenterScreen: 'Open presenter screen',
    pdfBack: 'Back to content', pdfOpen: 'Open tab', pdfDownload: 'Download', pdfPreview: 'Paper preview',
    programKicker: 'IIR 2026 · Session Chair', programTitle: 'Your programme', programIntro: 'Schedule, presenters and materials for your session.', conferenceDates: 'Rome · 12–14 November 2026',
    schedule: 'Schedule', scrollSessions: 'Scroll sessions', previousSessions: 'Previous sessions', nextSessions: 'Next sessions', chooseSession: 'Choose a session',
    keynote: 'Keynote', topicSession: 'Topic session', chair: 'Chair', venue: 'Venue', agenda: 'Schedule', detailedSchedule: 'Detailed schedule', talk: 'talks', slot: 'slot',
    chairScripts: 'Chair opening and closing', opening: 'Opening', closing: 'Closing', supportMaterials: 'Chair support materials · IIR 2026', lockHub: 'Lock Chair Hub',
    papersKicker: 'Paper library · IIR 2026', papersTitle: 'Conference papers', papersIntro: 'Open or download PDFs, read summaries and browse discussion prompts.', noteTitle: 'For the chair:',
    generatedNotice: 'Questions are generated as support prompts. They are not official questions and do not replace the chair’s judgment.',
    searchPlaceholder: 'Search titles, authors or topics…', filterSession: 'Filter by session', allSessions: 'All sessions',
    resultOne: 'paper found', resultMany: 'papers found', noResults: 'No papers match this search.', paperFooter: 'PDFs available to view and download · IIR 2026',
    presenter: 'Presents', authors: 'Authors', speaker: 'Speaker', readPdf: 'Read PDF', download: 'Download', set: 'Timer', notConfirmed: 'To be confirmed',
    questionsTitle: 'Suggested questions', generatedQuestions: 'Generated prompts · chair support only', description: 'Summary', summaryQuestions: 'Summary and suggested questions',
    bioTitle: 'Bio and introduction', keynoteQuestions: 'Bio, introduction and questions', timeTbd: 'Time to be confirmed',
  },
};

function tr(key) {
  return UI[state.language][key] ?? UI.it[key] ?? key;
}

function localizedDate(date = '') {
  if (state.language === 'it') return date;
  return date
    .replace(/giovedì/gi, 'Thursday')
    .replace(/venerdì/gi, 'Friday')
    .replace(/sabato/gi, 'Saturday')
    .replace(/novembre/gi, 'November');
}

function localizedRoom(room = '') {
  if (state.language === 'it') return room;
  return room.replace(/Sala del Consiglio/gi, 'Council Room').replace(/Aula Magna/gi, 'Main Hall');
}

function localizedEventTitle(event) {
  let title = event.title;
  if (state.language !== 'it' && event.kind !== 'keynote') title = title.replace(/^Sessione\s+(\d+)/i, 'Session $1');
  return title.replace(/^((?:Sessione|Session|Keynote)\s+\d+)\s*[—–-]\s*/i, '$1: ');
}

const gate = document.querySelector('#gate');
const gateForm = document.querySelector('#unlockForm');
const gateMessage = document.querySelector('#gateMessage');
const passwordInput = document.querySelector('#passwordInput');
const rememberPasswordInput = document.querySelector('#rememberPassword');
const unlockButton = document.querySelector('#unlockButton');
const appShell = document.querySelector('#appShell');
const mainContent = document.querySelector('#mainContent');
const timerBar = document.querySelector('.timer-bar');
const timerDisplay = document.querySelector('#timerDisplay');
const timerContext = document.querySelector('#timerContext');
const timerProgress = document.querySelector('#timerProgress');
const timerToggle = document.querySelector('#timerToggle');
const stage = document.querySelector('#stage');
const stageMessage = document.querySelector('#stageMessage');
const stageKicker = document.querySelector('#stageKicker');
const stageClock = document.querySelector('#stageClock');
const pdfViewer = document.querySelector('#pdfViewer');
const pdfViewerTitle = document.querySelector('#pdfViewerTitle');
const pdfFrame = document.querySelector('#pdfFrame');
const pdfOpenNew = document.querySelector('#pdfOpenNew');
const pdfDownload = document.querySelector('#pdfDownload');
let pdfReturnFocus = null;
const APP_STORAGE_NAMESPACE = `iir2026-chair-hub:${location.pathname.replace(/\/+$/, '') || '/'}`;
const REMEMBERED_PASSWORD_KEY = `${APP_STORAGE_NAMESPACE}:password`;
const REMEMBER_PASSWORD_CHOICE_KEY = `${APP_STORAGE_NAMESPACE}:remember-password`;
const LEGACY_REMEMBERED_PASSWORD_KEY = 'iir2026-chair-hub-password';
const LEGACY_REMEMBER_PASSWORD_CHOICE_KEY = 'iir2026-chair-hub-remember-password';

try {
  const rememberChoice = localStorage.getItem(REMEMBER_PASSWORD_CHOICE_KEY)
    ?? localStorage.getItem(LEGACY_REMEMBER_PASSWORD_CHOICE_KEY);
  if (rememberChoice !== null) rememberPasswordInput.checked = rememberChoice !== 'off';
  const rememberedPassword = localStorage.getItem(REMEMBERED_PASSWORD_KEY)
    ?? (rememberPasswordInput.checked ? localStorage.getItem(LEGACY_REMEMBERED_PASSWORD_KEY) : null);
  if (rememberedPassword && rememberPasswordInput.checked) {
    passwordInput.value = rememberedPassword;
    localStorage.setItem(REMEMBERED_PASSWORD_KEY, rememberedPassword);
  }
} catch { /* Local storage may be disabled by the browser. */ }

rememberPasswordInput.addEventListener('change', () => {
  try {
    localStorage.setItem(REMEMBER_PASSWORD_CHOICE_KEY, rememberPasswordInput.checked ? 'on' : 'off');
    if (!rememberPasswordInput.checked) localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
  } catch { /* Local storage may be disabled by the browser. */ }
});

function decodeBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function decryptBundle(password) {
  const response = await fetch('./content.enc.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Contenuti non disponibili');
  const envelope = await response.json();
  if (envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.cipher !== 'AES-256-GCM') {
    throw new Error('Formato dei contenuti non riconosciuto');
  }
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: decodeBase64(envelope.salt), iterations: envelope.iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(envelope.iv), tagLength: 128 },
    key,
    decodeBase64(envelope.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

gateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  gateMessage.textContent = '';
  if (!passwordInput.value) {
    passwordInput.focus();
    gateMessage.textContent = 'Inserisci la password per continuare.';
    return;
  }
  unlockButton.disabled = true;
  unlockButton.innerHTML = 'Verifica in corso…';
  const password = passwordInput.value;
  try {
    state.bundle = await decryptBundle(password);
    try {
      localStorage.setItem(REMEMBER_PASSWORD_CHOICE_KEY, rememberPasswordInput.checked ? 'on' : 'off');
      if (rememberPasswordInput.checked) localStorage.setItem(REMEMBERED_PASSWORD_KEY, password);
      else localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
    } catch { /* The app can still be used if local storage is disabled. */ }
    const firstSession = state.bundle.sessions.find((entry) => entry.kind === 'session') ?? state.bundle.sessions[0];
    state.sessionId = firstSession?.id ?? null;
    if (firstSession?.slots[0]) setCurrentSlot(firstSession, firstSession.slots[0]);
    gate.hidden = true;
    appShell.hidden = false;
    applyLanguage();
    renderPage();
    updateTimerUI();
    passwordInput.value = '';
  } catch {
    gateMessage.textContent = 'Password non valida o contenuti non disponibili.';
    passwordInput.select();
  } finally {
    unlockButton.disabled = false;
    unlockButton.innerHTML = 'Apri Chair Hub <span aria-hidden="true">↗</span>';
  }
});

document.querySelector('#togglePassword').addEventListener('click', (event) => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  event.currentTarget.textContent = showing ? 'Mostra' : 'Nascondi';
  event.currentTarget.setAttribute('aria-label', showing ? 'Mostra password' : 'Nascondi password');
});

function applyLanguage() {
  document.documentElement.lang = state.language;
  const nextLanguage = state.language === 'it' ? 'en' : 'it';
  document.querySelectorAll('[data-language-toggle]').forEach((button) => {
    button.textContent = nextLanguage === 'en' ? '🇬🇧' : '🇮🇹';
    button.setAttribute('aria-label', nextLanguage === 'en' ? 'Switch to English' : 'Passa all’italiano');
    button.title = nextLanguage === 'en' ? 'Switch to English' : 'Passa all’italiano';
  });
  const labels = { programTab: tr('programTab'), papersTab: tr('papersTab') };
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    if (labels[element.dataset.i18n]) element.textContent = labels[element.dataset.i18n];
  });
  document.querySelector('#pdfBack').innerHTML = `<span aria-hidden="true">←</span><span>${tr('pdfBack')}</span>`;
  pdfOpenNew.textContent = tr('pdfOpen');
  pdfDownload.textContent = tr('pdfDownload');
  pdfFrame.title = tr('pdfPreview');
  timerToggle.setAttribute('aria-label', state.running ? tr('pauseTimer') : tr('startTimer'));
  timerToggle.title = state.running ? tr('pause') : tr('start');
  document.querySelector('#timerReset')?.setAttribute('aria-label', tr('resetTimer'));
  document.querySelector('#stageLaunch')?.setAttribute('aria-label', tr('presenterScreen'));
}

document.querySelectorAll('[data-language-toggle]').forEach((button) => button.addEventListener('click', () => {
  state.language = state.language === 'it' ? 'en' : 'it';
  applyLanguage();
  renderPagePreservingViewState();
  if (state.stageOpen) updateStage();
}));

function renderPagePreservingViewState() {
  const scrollTop = window.scrollY;
  const sessionScrollLeft = mainContent.querySelector('.session-choice-list')?.scrollLeft ?? 0;
  const openDetails = [...mainContent.querySelectorAll('details')].map((details) => details.open);
  renderPage();
  mainContent.querySelectorAll('details').forEach((details, index) => {
    details.open = openDetails[index] ?? false;
  });
  const sessionList = mainContent.querySelector('.session-choice-list');
  if (sessionList) sessionList.scrollLeft = sessionScrollLeft;
  window.scrollTo(0, scrollTop);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function eventTime(event) {
  return event.timeStart && event.timeEnd ? `${event.timeStart}–${event.timeEnd}` : tr('timeTbd');
}

function eventShortTitle(event) {
  if (event.kind === 'keynote') return `${tr('keynote')} ${event.number}`;
  return `${state.language === 'it' ? 'Sessione' : 'Session'} ${event.number}`;
}

function timeRange(slot) {
  return slot.start && slot.end ? `${slot.start}–${slot.end}` : '';
}

function listHtml(items, className = 'questions') {
  if (!items?.length) return '';
  return `<ol class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
}

function questionPanels(slot) {
  const prompts = state.language === 'it' ? slot.questionsIt : (slot.questionsEn?.length ? slot.questionsEn : slot.questionsIt);
  const hasQuestions = prompts?.length;
  if (!hasQuestions) return '';
  return `<div class="question-note"><span aria-hidden="true">✳</span> ${tr('generatedQuestions')}</div><p class="question-lang">${tr('questionsTitle')}</p>${listHtml(prompts)}`;
}

function detailsHtml(slot, event) {
  if (event.kind === 'keynote') {
    const bio = state.language === 'it' ? slot.bioIt : (slot.bioEn || slot.bioIt);
    return `<details class="slot-detail"><summary>${tr('keynoteQuestions')} · ${state.language.toUpperCase()}</summary><div class="slot-detail-body">
      ${bio ? `<p class="keynote-bio">${escapeHtml(bio)}</p>` : ''}${questionPanels(slot)}
    </div></details>`;
  }
  const summary = state.language === 'it' ? slot.summaryIt : (slot.summaryEn || slot.summaryIt);
  const descriptionLabel = tr('description');
  const detailsLabel = tr('summaryQuestions');
  return `<details class="slot-detail"><summary>${detailsLabel}</summary><div class="slot-detail-body">
    ${summary ? `<p class="summary-label">${descriptionLabel}</p><p class="slot-summary">${escapeHtml(summary)}</p>` : ''}
    ${questionPanels(slot)}
  </div></details>`;
}

function slotCard(slot, event, library = false) {
  const presenters = slot.presenters?.length ? slot.presenters.join(' · ') : tr('notConfirmed');
  const scheduledDuration = `${slot.durationMinutes} min`;
  const timerDuration = `${event.kind === 'keynote' ? 45 : 12} min`;
  const paperLabel = event.kind === 'keynote' ? 'KEYNOTE' : `PAPER ${slot.number}`;
  const names = slot.authors ? escapeHtml(slot.authors) : '';
  const presentLabel = tr('presenter');
  const authorLabel = event.kind === 'keynote' ? tr('speaker') : tr('authors');
  const readLabel = tr('readPdf');
  const downloadLabel = tr('download');
  const setLabel = tr('set');
  const actions = slot.pdfUrl
    ? `<button class="mini-button primary-mini" type="button" data-open-pdf="${escapeHtml(slot.pdfUrl)}" data-pdf-title="${escapeHtml(slot.title)}"><span aria-hidden="true">↗</span> ${readLabel}</button>
       <a class="mini-button" href="${escapeHtml(slot.pdfUrl)}" download><span aria-hidden="true">↓</span> ${downloadLabel}</a>
       <button class="mini-button" type="button" data-set-timer="${escapeHtml(event.id)}|${escapeHtml(slot.id)}"><span aria-hidden="true">◷</span> ${setLabel} ${timerDuration}</button>`
    : `<button class="mini-button primary-mini" type="button" data-set-timer="${escapeHtml(event.id)}|${escapeHtml(slot.id)}"><span aria-hidden="true">◷</span> ${setLabel} ${timerDuration}</button>`;
  return `<article class="${library ? 'paper-card' : 'slot-card'}">
    ${library ? `<div class="paper-card-top"><span class="paper-tag">${escapeHtml(paperLabel)}</span><span class="paper-session">${escapeHtml(eventShortTitle(event))}</span></div>` : ''}
    ${!library ? `<div class="slot-time"><span>${escapeHtml(timeRange(slot))}</span><small>${escapeHtml(scheduledDuration)}</small></div>` : ''}
    <div class="slot-content">
      ${!library ? `<div class="slot-meta"><span class="paper-tag">${escapeHtml(paperLabel)}</span>${slot.presenters?.length ? `<span class="presenter-tag">${presentLabel}: ${escapeHtml(presenters)}</span>` : ''}</div>` : ''}
      <h${library ? '2' : '4'}>${escapeHtml(slot.title || event.title)}</h${library ? '2' : '4'}>
      <p class="${library ? 'paper-authors' : 'slot-authors'}">${authorLabel}: ${names}</p>
      ${library ? `<p class="paper-slot"><span aria-hidden="true">◷</span> ${escapeHtml(localizedDate(event.date))} · ${escapeHtml(timeRange(slot))}${slot.presenters?.length ? ` · ${presentLabel} ${escapeHtml(presenters)}` : ''}</p>` : ''}
      <div class="slot-actions">${actions}</div>
      ${detailsHtml(slot, event)}
    </div>
  </article>`;
}

function scriptDisclosure(event) {
  const opening = state.language === 'it' ? event.openingIt : (event.openingEn || event.openingIt);
  const closing = state.language === 'it' ? event.closingIt : (event.closingEn || event.closingIt);
  const openingLabel = tr('opening');
  const closingLabel = tr('closing');
  const summaryLabel = tr('chairScripts');
  const paragraphs = [
    opening ? `<p><strong>${openingLabel}</strong><br>${escapeHtml(opening)}</p>` : '',
    closing ? `<p><strong>${closingLabel}</strong><br>${escapeHtml(closing)}</p>` : '',
  ].join('');
  if (!paragraphs) return '';
  return `<details class="script-card"><summary>${summaryLabel}</summary><div class="script-copy">${paragraphs}</div></details>`;
}

function sessionRail(events, selectedId) {
  return `<aside class="session-rail" aria-label="${tr('chooseSession')}" >
    <div class="rail-title">${tr('schedule')}<div class="session-scroll-controls"><button type="button" data-scroll-sessions="left" aria-label="${tr('previousSessions')}">←</button><span>${tr('scrollSessions')}</span><button type="button" data-scroll-sessions="right" aria-label="${tr('nextSessions')}">→</button></div></div>
    <div class="session-choice-list">${events.map((event) => `<button type="button" class="session-choice ${event.id === selectedId ? 'active' : ''}" data-session="${escapeHtml(event.id)}" aria-pressed="${event.id === selectedId}">
      <span class="choice-number">${event.kind === 'keynote' ? 'K' : String(event.number).padStart(2, '0')}</span>
      <span class="choice-copy"><span class="choice-title">${escapeHtml(localizedEventTitle(event).replace(/^(?:Sessione|Session)\s+\d+\s*[:—–-]\s*/i, '').replace(/^Keynote\s+\d+\s*[:—–-]\s*/i, ''))}</span><span class="choice-meta">${escapeHtml(localizedDate(event.date))} · ${escapeHtml(event.timeStart || '')}</span></span>
    </button>`).join('')}</div>
  </aside>`;
}

function renderProgram() {
  const events = state.bundle.sessions;
  const selected = events.find((event) => event.id === state.sessionId) ?? events[0];
  if (!selected) {
    mainContent.innerHTML = `<div class="page-container"><p>${state.language === 'it' ? 'Il programma non è disponibile.' : 'The schedule is unavailable.'}</p></div>`;
    return;
  }
  const countLabel = selected.kind === 'keynote' ? tr('keynote').toLocaleLowerCase() : `${selected.slots.length} paper`;
  const heroIntro = selected.kind === 'session'
    ? (state.language === 'it' ? selected.openingIt : (selected.openingEn || selected.openingIt))
    : '';
  mainContent.innerHTML = `<div class="page-container">
    <div class="page-heading"><div><span class="eyebrow-main">${tr('programKicker')}</span><h1>${tr('programTitle')}</h1><p>${tr('programIntro')}</p></div><div class="conference-chip"><span></span> ${tr('conferenceDates')}</div></div>
    <div class="program-layout">
      ${sessionRail(events, selected.id)}
      <section class="program-main" aria-label="${state.language === 'it' ? 'Dettagli della sessione' : 'Session details'}">
        <header class="session-hero">
          <div class="session-hero-top"><div class="session-date"><strong>${escapeHtml(eventTime(selected))}</strong><span>${escapeHtml(localizedDate(selected.date))}</span></div><span class="session-type">${selected.kind === 'keynote' ? tr('keynote') : tr('topicSession')}</span></div>
          <h2>${escapeHtml(localizedEventTitle(selected))}</h2>
          <div class="session-facts">
            ${selected.chair ? `<span><b>${tr('chair')}</b> ${escapeHtml(selected.chair)}</span>` : ''}
            ${selected.room ? `<span><b>${tr('venue')}</b> ${escapeHtml(localizedRoom(selected.room))}</span>` : ''}
            <span><b>${tr('agenda')}</b> ${escapeHtml(countLabel)}</span>
          </div>
          ${heroIntro ? `<p class="session-intro">${escapeHtml(heroIntro)}</p>` : ''}
        </header>
        ${scriptDisclosure(selected)}
        <section class="timeline">
          <div class="timeline-heading"><h3>${selected.kind === 'keynote' ? (state.language === 'it' ? 'Intervento' : 'Talk') : tr('detailedSchedule')}</h3><span>${selected.slots.length} ${selected.kind === 'keynote' ? tr('slot') : tr('talk')} · ${escapeHtml(eventTime(selected))}</span></div>
          ${selected.slots.map((slot) => slotCard(slot, selected)).join('')}
        </section>
      </section>
    </div>
    <footer class="page-footer"><span>${tr('supportMaterials')}</span><button class="mini-button" type="button" data-lock>${tr('lockHub')}</button></footer>
  </div>`;
  updateNavigation();
}

function renderPapers() {
  const sessions = state.bundle.sessions.filter((event) => event.kind === 'session');
  const allPapers = sessions.flatMap((event) => event.slots.map((slot) => ({ event, slot })));
  const filtered = allPapers.filter(({ event, slot }) => {
    const matchesSession = state.paperFilter === 'all' || event.id === state.paperFilter;
    const haystack = [slot.title, slot.authors, slot.presenters?.join(' '), slot.summaryIt, slot.summaryEn, slot.questionsIt?.join(' '), slot.questionsEn?.join(' ')].join(' ').toLocaleLowerCase('it');
    return matchesSession && haystack.includes(state.search.toLocaleLowerCase('it'));
  });
  const selectOptions = `<option value="all">${tr('allSessions')}</option>${sessions.map((event) => `<option value="${escapeHtml(event.id)}" ${state.paperFilter === event.id ? 'selected' : ''}>${state.language === 'it' ? 'Sessione' : 'Session'} ${event.number} · ${escapeHtml(localizedEventTitle(event).replace(/^(?:Sessione|Session)\s+\d+\s*[:—–-]\s*/i, ''))}</option>`).join('')}`;
  mainContent.innerHTML = `<div class="page-container">
    <div class="page-heading"><div><span class="eyebrow-main">${tr('papersKicker')}</span><h1>${tr('papersTitle')}</h1><p>${tr('papersIntro')}</p></div><div class="conference-chip"><span></span> ${allPapers.length} paper</div></div>
    <p class="notice"><strong>${tr('noteTitle')}</strong> ${tr('generatedNotice')}</p>
    <div class="paper-toolbar"><label class="search-box"><span aria-hidden="true">⌕</span><input id="paperSearch" type="search" value="${escapeHtml(state.search)}" placeholder="${tr('searchPlaceholder')}" autocomplete="off"></label><label><span class="visually-hidden">${tr('filterSession')}</span><select class="filter-select" id="paperFilter">${selectOptions}</select></label></div>
    <p class="paper-results">${filtered.length} ${filtered.length === 1 ? tr('resultOne') : tr('resultMany')}</p>
    <section class="paper-list" aria-label="${state.language === 'it' ? 'Elenco dei paper' : 'Paper list'}">${filtered.length ? filtered.map(({ event, slot }) => slotCard(slot, event, true)).join('') : `<div class="no-results">${tr('noResults')}</div>`}</section>
    <footer class="page-footer"><span>${tr('paperFooter')}</span><button class="mini-button" type="button" data-lock>${tr('lockHub')}</button></footer>
  </div>`;
  document.querySelector('#paperSearch').addEventListener('input', (event) => {
    state.search = event.currentTarget.value;
    renderPapers();
    const input = document.querySelector('#paperSearch');
    input.focus();
    input.setSelectionRange(state.search.length, state.search.length);
  });
  document.querySelector('#paperFilter').addEventListener('change', (event) => {
    state.paperFilter = event.currentTarget.value;
    renderPapers();
  });
  updateNavigation();
}

function renderPage() {
  if (!state.bundle) return;
  if (state.page === 'papers') renderPapers();
  else renderProgram();
}

function updateNavigation() {
  document.querySelectorAll('[data-page-link]').forEach((button) => {
    const active = button.dataset.pageLink === state.page;
    button.classList.toggle('active', active);
    if (button.tagName === 'BUTTON') button.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

document.querySelectorAll('[data-page-link]').forEach((button) => button.addEventListener('click', (event) => {
  event.preventDefault();
  state.page = button.dataset.pageLink;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

mainContent.addEventListener('click', (event) => {
  const pdfButton = event.target.closest('[data-open-pdf]');
  if (pdfButton) {
    if (/Android/i.test(navigator.userAgent)) {
      window.location.assign(new URL(pdfButton.dataset.openPdf, document.baseURI).href);
    } else {
      openPdf(pdfButton.dataset.openPdf, pdfButton.dataset.pdfTitle, pdfButton);
    }
    return;
  }
  const scrollControl = event.target.closest('[data-scroll-sessions]');
  if (scrollControl) {
    const list = mainContent.querySelector('.session-choice-list');
    const direction = scrollControl.dataset.scrollSessions === 'right' ? 1 : -1;
    list?.scrollBy({ left: direction * 175, behavior: 'smooth' });
    return;
  }
  const sessionButton = event.target.closest('[data-session]');
  if (sessionButton) {
    const selected = state.bundle.sessions.find((item) => item.id === sessionButton.dataset.session);
    if (selected) {
      state.sessionId = selected.id;
      if (selected.slots[0]) setCurrentSlot(selected, selected.slots[0]);
      renderProgram();
    }
    return;
  }
  const timerButton = event.target.closest('[data-set-timer]');
  if (timerButton) {
    const [sessionId, slotId] = timerButton.dataset.setTimer.split('|');
    const selected = state.bundle.sessions.find((item) => item.id === sessionId);
    const slot = selected?.slots.find((item) => item.id === slotId);
    if (selected && slot) {
      state.sessionId = selected.id;
      setCurrentSlot(selected, slot);
      updateTimerUI();
      document.querySelector('.timer-display').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return;
  }
  if (event.target.closest('[data-lock]')) lockHub();
});

function openPdf(url, title, trigger) {
  pdfReturnFocus = trigger;
  pdfViewerTitle.textContent = title || 'Paper';
  pdfOpenNew.href = url;
  pdfDownload.href = url;
  pdfFrame.src = url;
  pdfViewer.hidden = false;
  document.body.classList.add('pdf-viewer-open');
  document.querySelector('#pdfBack').focus();
}

function closePdf() {
  if (pdfViewer.hidden) return;
  pdfViewer.hidden = true;
  pdfFrame.src = 'about:blank';
  document.body.classList.remove('pdf-viewer-open');
  pdfReturnFocus?.focus();
  pdfReturnFocus = null;
}

document.querySelector('#pdfBack').addEventListener('click', closePdf);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !pdfViewer.hidden) closePdf();
});

function setCurrentSlot(event, slot) {
  if (state.running) pauseTimer();
  state.sessionId = event.id;
  state.currentSlot = { event, slot };
  state.totalMs = (event.kind === 'keynote' ? 45 : 12) * 60_000;
  state.remainingMs = state.totalMs;
  state.deadline = null;
  state.finished = false;
  state.alarmPlayed = false;
  updateTimerUI();
  if (state.stageOpen) updateStage();
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateTimerUI() {
  timerDisplay.textContent = formatTime(state.remainingMs);
  const current = state.currentSlot;
  timerContext.textContent = current
    ? `${current.event.kind === 'keynote' ? 'Keynote' : `Paper ${current.slot.number}`} · ${current.slot.start}–${current.slot.end}`
    : (state.language === 'it' ? 'Pronto per la sessione' : 'Ready for the session');
  timerBar.classList.toggle('is-running', state.running);
  timerBar.classList.toggle('is-finished', state.finished);
  timerToggle.textContent = state.running ? 'Ⅱ' : '▶';
  timerToggle.setAttribute('aria-label', state.language === 'it'
    ? (state.running ? 'Metti in pausa il cronometro' : 'Avvia cronometro')
    : (state.running ? 'Pause timer' : 'Start timer'));
  timerToggle.title = state.language === 'it' ? (state.running ? 'Pausa' : 'Avvia cronometro') : (state.running ? 'Pause' : 'Start timer');
  timerProgress.style.transform = `scaleX(${state.totalMs ? Math.max(0, state.remainingMs / state.totalMs) : 0})`;
  if (state.stageOpen) updateStage();
}

async function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!state.audioContext) state.audioContext = new AudioContextClass();
  if (state.audioContext.state === 'suspended') await state.audioContext.resume();
  return state.audioContext;
}

function playAlarm() {
  const context = state.audioContext;
  if (!context || context.state !== 'running') return;
  const startAt = context.currentTime + .02;
  [740, 988, 740].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begin = startAt + index * .27;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.001, begin);
    gain.gain.exponentialRampToValueAtTime(.24, begin + .025);
    gain.gain.exponentialRampToValueAtTime(.001, begin + .21);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(begin + .22);
  });
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { state.wakeLock = await navigator.wakeLock.request('screen'); } catch { state.wakeLock = null; }
}

async function releaseWakeLock() {
  if (!state.wakeLock) return;
  try { await state.wakeLock.release(); } catch { /* The lock may already have been released by the browser. */ }
  state.wakeLock = null;
}

async function startTimer() {
  if (state.running) return;
  if (state.remainingMs <= 0 || state.finished) {
    state.remainingMs = state.totalMs;
    state.finished = false;
    state.alarmPlayed = false;
  }
  try { await ensureAudio(); } catch { /* The timer still works if audio is unavailable. */ }
  state.deadline = Date.now() + state.remainingMs;
  state.running = true;
  state.intervalId = window.setInterval(tickTimer, 200);
  requestWakeLock();
  tickTimer();
}

function pauseTimer() {
  if (!state.running) return;
  state.remainingMs = Math.max(0, state.deadline - Date.now());
  state.running = false;
  state.deadline = null;
  window.clearInterval(state.intervalId);
  state.intervalId = null;
  releaseWakeLock();
  updateTimerUI();
}

function resetTimer() {
  if (state.running) {
    state.running = false;
    window.clearInterval(state.intervalId);
    state.intervalId = null;
    releaseWakeLock();
  }
  state.deadline = null;
  state.remainingMs = state.totalMs;
  state.finished = false;
  state.alarmPlayed = false;
  updateTimerUI();
}

function tickTimer() {
  if (!state.running) return;
  state.remainingMs = Math.max(0, state.deadline - Date.now());
  if (state.remainingMs === 0) {
    state.running = false;
    state.deadline = null;
    state.finished = true;
    window.clearInterval(state.intervalId);
    state.intervalId = null;
    releaseWakeLock();
    if (!state.alarmPlayed) {
      state.alarmPlayed = true;
      playAlarm();
    }
  }
  updateTimerUI();
}

timerToggle.addEventListener('click', () => (state.running ? pauseTimer() : startTimer()));
document.querySelector('#timerReset').addEventListener('click', resetTimer);
document.querySelector('#stageLaunch').addEventListener('click', async () => {
  state.stageOpen = true;
  stage.classList.add('is-open');
  stage.setAttribute('aria-hidden', 'false');
  document.body.classList.add('stage-open');
  updateStage();
  try {
    const standaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!standaloneApp && stage.requestFullscreen && !document.fullscreenElement) await stage.requestFullscreen();
    if (screen.orientation?.lock) await screen.orientation.lock('landscape');
  } catch { /* Full screen or orientation lock may be unavailable on the current device. */ }
});

function closeStage() {
  state.stageOpen = false;
  stage.classList.remove('is-open', 'is-warning', 'is-urgent', 'is-finished');
  stage.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('stage-open');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  try { if (screen.orientation?.unlock) screen.orientation.unlock(); } catch { /* Orientation lock is optional. */ }
}

document.querySelector('#stageClose').addEventListener('click', closeStage);
document.addEventListener('fullscreenchange', () => {
  if (state.stageOpen && !document.fullscreenElement) closeStage();
});

function updateStage() {
  const current = state.currentSlot;
  stageClock.textContent = formatTime(state.remainingMs);
  stageKicker.textContent = current?.slot.title ?? 'IIR 2026';
  stage.classList.remove('is-warning', 'is-urgent', 'is-finished');
  if (state.finished || state.remainingMs <= 0) {
    stageMessage.textContent = state.language === 'it' ? 'Tempo terminato' : 'Time is up';
    stage.classList.add('is-finished');
  } else if (state.remainingMs <= 60_000) {
    stageMessage.textContent = '1 minute left';
    stage.classList.add('is-urgent');
  } else if (state.remainingMs <= 180_000) {
    stageMessage.textContent = '3 minutes left';
    stage.classList.add('is-warning');
  } else if (state.running) {
    stageMessage.textContent = state.language === 'it' ? 'Presentazione in corso' : 'Presentation in progress';
  } else {
    stageMessage.textContent = state.language === 'it' ? 'Pronto' : 'Ready';
  }
}

function lockHub() {
  pauseTimer();
  closeStage();
  state.bundle = null;
  state.currentSlot = null;
  state.sessionId = null;
  state.search = '';
  state.paperFilter = 'all';
  mainContent.innerHTML = '';
  appShell.hidden = true;
  gate.hidden = false;
  gateMessage.textContent = '';
  try { passwordInput.value = localStorage.getItem(REMEMBERED_PASSWORD_KEY) ?? ''; } catch { passwordInput.value = ''; }
  passwordInput.focus();
  state.remainingMs = 15 * 60_000;
  state.totalMs = 15 * 60_000;
  state.finished = false;
  updateTimerUI();
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app remains usable online when service worker installation is unavailable.
    });
  }, { once: true });
}

if (rememberPasswordInput.checked && passwordInput.value) gateForm.requestSubmit();

