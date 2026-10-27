import { writeFile } from 'node:fs/promises';

const FONT_SIZE = 15;
const CHAR_WIDTH = FONT_SIZE * 0.6;
const LINE_HEIGHT = 24;
const PADDING_X = 24;
const TITLE_BAR = 36;
const TOP = TITLE_BAR + 30;
const WIDTH = 860;
const TYPE_SPEED = 0.055;
const PAUSE = 0.35;
const PROMPT = 'root@amerllica:~$ ';

const script = [
  { command: 'whoami' },
  { output: 'Amer Lotfi Orimi', tone: 'title' },
  { output: 'Senior Frontend Engineer · React / React Native' },
  { output: 'Full-Stack with Node.js & NestJS · AI-powered engineering' },
  { command: 'cat ~/now.txt' },
  { output: 'Altex · Tehran, Iran · since 12/2025 · open to remote', tone: 'accent' },
  { command: 'ls ~/open-source' },
  { output: 'rn-vlc-plyr  react-native-tinode  expo-google-tag-manager', tone: 'accent' },
  { command: 'curl -s stackoverflow.com/users/6877799 | jq .reputation' },
  { output: '33247  # 476 answers · 40M+ people reached', tone: 'muted' },
];

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const textWidth = (value) => [...value].length * CHAR_WIDTH;

const buildFrames = () => {
  let clock = 0.6;
  return script.map((line, index) => {
    const y = TOP + index * LINE_HEIGHT;
    if (line.command) {
      const typed = `${PROMPT}${line.command}`;
      const start = clock;
      const duration = [...line.command].length * TYPE_SPEED;
      clock += duration + PAUSE;
      return { ...line, y, typed, start, duration, promptChars: [...PROMPT].length };
    }
    const start = clock;
    clock += 0.12;
    return { ...line, y, start };
  });
};

const commandLine = (frame, index) => {
  const total = [...frame.typed].length;
  const commandChars = total - frame.promptChars;
  const promptWidth = textWidth(PROMPT);
  return `
  <clipPath id="c${index}"><rect x="${PADDING_X + promptWidth}" y="${frame.y - FONT_SIZE}" height="${LINE_HEIGHT}" width="0" class="type" style="--w:${textWidth(frame.command)}px;animation-delay:${frame.start}s;animation-duration:${frame.duration}s;animation-timing-function:steps(${commandChars})"/></clipPath>
  <g class="reveal" style="animation-delay:${frame.start}s">
    <text x="${PADDING_X}" y="${frame.y}" textLength="${promptWidth}" lengthAdjust="spacingAndGlyphs" class="prompt">${escapeXml(PROMPT.trimEnd())}</text>
    <text x="${PADDING_X + promptWidth}" y="${frame.y}" textLength="${textWidth(frame.command)}" lengthAdjust="spacingAndGlyphs" class="command" clip-path="url(#c${index})">${escapeXml(frame.command)}</text>
  </g>`;
};

const outputLine = (frame) => `
  <text x="${PADDING_X}" y="${frame.y}" textLength="${textWidth(frame.output)}" lengthAdjust="spacingAndGlyphs" class="out ${frame.tone ?? ''} reveal" style="animation-delay:${frame.start}s">${escapeXml(frame.output)}</text>`;

const render = () => {
  const frames = buildFrames();
  const last = frames.at(-1);
  const cursorY = last.y + LINE_HEIGHT;
  const height = cursorY + 28;
  const cursorStart = last.start + 0.3;
  const body = frames.map((frame, index) => (frame.command ? commandLine(frame, index) : outputLine(frame))).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="Terminal: whoami prints Amer Lotfi Orimi, Senior Frontend Engineer">
  <style>
    :root { --bg:#1c1c1c; --bar:#262626; --line:#2f2f2f; --fg:#e6ffe9; --prompt:#00ff66; --title:#00ff66; --accent:#00ffb3; --muted:#8a9a8f; }
    @media (prefers-color-scheme: light) {
      :root { --bg:#f6f8fa; --bar:#eaeef2; --line:#d0d7de; --fg:#1f2328; --prompt:#0b7a3e; --title:#0b7a3e; --accent:#0969da; --muted:#57606a; }
    }
    text { font-family: 'JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:${FONT_SIZE}px; fill:var(--fg); }
    .prompt { fill:var(--prompt); font-weight:700; }
    .title { fill:var(--title); font-weight:700; }
    .accent { fill:var(--accent); }
    .muted { fill:var(--muted); }
    .bar-title { fill:var(--muted); font-size:12px; }
    .reveal { opacity:0; animation:show .01s forwards; }
    .type { animation-name:type; animation-fill-mode:forwards; }
    .cursor { opacity:0; fill:var(--prompt); animation:show .01s ${cursorStart}s forwards, blink 1s steps(1) ${cursorStart}s infinite; }
    @keyframes show { to { opacity:1; } }
    @keyframes type { to { width:var(--w); } }
    @keyframes blink { 50% { opacity:0; } }
  </style>
  <rect width="${WIDTH}" height="${height}" rx="12" fill="var(--bg)" stroke="var(--line)"/>
  <path d="M0 12a12 12 0 0 1 12-12h${WIDTH - 24}a12 12 0 0 1 12 12v${TITLE_BAR - 12}H0z" fill="var(--bar)"/>
  <circle cx="22" cy="18" r="6" fill="#ff5f57"/><circle cx="42" cy="18" r="6" fill="#febc2e"/><circle cx="62" cy="18" r="6" fill="#28c840"/>
  <text x="${WIDTH / 2}" y="22" text-anchor="middle" class="bar-title">amerllica — zsh — ${WIDTH / 10}×${Math.round(height / 10)}</text>
  ${body}
  <text x="${PADDING_X}" y="${cursorY}" class="prompt reveal" style="animation-delay:${cursorStart}s" textLength="${textWidth(PROMPT.trimEnd())}" lengthAdjust="spacingAndGlyphs">${escapeXml(PROMPT.trimEnd())}</text>
  <rect x="${PADDING_X + textWidth(PROMPT)}" y="${cursorY - FONT_SIZE + 2}" width="${CHAR_WIDTH}" height="${FONT_SIZE + 2}" class="cursor"/>
</svg>
`;
};

await writeFile(new URL('../assets/terminal.svg', import.meta.url), render());
console.log('assets/terminal.svg written');
