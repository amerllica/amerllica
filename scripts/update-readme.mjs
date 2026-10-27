import { readFile, writeFile } from 'node:fs/promises';

const SO_USER = 6877799;
const SO_API = 'https://api.stackexchange.com/2.3';
const MEDIUM_FEED = 'https://medium.com/feed/@amerllica';
const ARTICLE_LIMIT = 5;
const ANSWER_LIMIT = 3;
const TECH_TOPIC = /react|css|javascript|typescript|node|expo|ci\/cd|github|laravel|vlc|tinode|web|nitro|native/i;
const README = new URL('../README.md', import.meta.url);
const SO_CARD = new URL('../assets/stackoverflow.svg', import.meta.url);

const decodeEntities = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");

const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeMarkdown = (value) => value.replace(/([[\]|])/g, '\\$1');

const getJson = async (url) => {
  const response = await fetch(url, { headers: { 'accept-encoding': 'gzip' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};

const tagContent = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return match ? match[1].trim() : '';
};

const fetchArticles = async () => {
  const xml = await (await fetch(MEDIUM_FEED)).text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => ({
      title: decodeEntities(tagContent(item, 'title')),
      url: tagContent(item, 'link').split('?')[0],
      date: new Date(tagContent(item, 'pubDate')),
      topics: [...item.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g)].map(([, topic]) => topic),
    }))
    .filter((article) => TECH_TOPIC.test(`${article.title} ${article.topics.join(' ')}`))
    .slice(0, ARTICLE_LIMIT);
};

const fetchStackOverflow = async () => {
  const site = 'site=stackoverflow';
  const [{ items: [user] }, { total: answers }, { items: topAnswers }] = await Promise.all([
    getJson(`${SO_API}/users/${SO_USER}?${site}`),
    getJson(`${SO_API}/users/${SO_USER}/answers?${site}&filter=total`),
    getJson(`${SO_API}/users/${SO_USER}/answers?${site}&sort=votes&order=desc&pagesize=${ANSWER_LIMIT}`),
  ]);
  const questionIds = topAnswers.map((answer) => answer.question_id).join(';');
  const { items: questions } = await getJson(`${SO_API}/questions/${questionIds}?${site}`);
  const titleById = new Map(questions.map((question) => [question.question_id, decodeEntities(question.title)]));
  return {
    reputation: user.reputation,
    badges: user.badge_counts,
    answers,
    memberSince: new Date(user.creation_date * 1000).getFullYear(),
    top: topAnswers.map((answer) => ({
      score: answer.score,
      title: titleById.get(answer.question_id) ?? 'Answer',
      url: `https://stackoverflow.com/a/${answer.answer_id}`,
    })),
  };
};

const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const articlesBlock = (articles) =>
  articles.map((article) => `- [${escapeMarkdown(article.title)}](${article.url}) · ${formatDate(article.date)}`).join('\n');

const answersBlock = (top) =>
  top.map((answer) => `- **▲ ${answer.score}** [${escapeMarkdown(answer.title)}](${answer.url})`).join('\n');

const replaceBlock = (markdown, name, content) =>
  markdown.replace(
    new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`),
    `$1\n${content}\n$2`,
  );

const stat = (x, value, label) => `
  <text x="${x}" y="78" class="value">${escapeXml(value)}</text>
  <text x="${x}" y="100" class="label">${escapeXml(label)}</text>`;

const badge = (x, color, count, label) => `
  <circle cx="${x}" cy="138" r="6" fill="${color}"/>
  <text x="${x + 14}" y="143" class="label">${count} ${label}</text>`;

const stackOverflowCard = ({ reputation, badges, answers, memberSince }) => `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="170" viewBox="0 0 560 170" role="img" aria-label="Stack Overflow: ${reputation} reputation, ${answers} answers">
  <style>
    :root { --bg:#1c1c1c; --line:#2f2f2f; --fg:#e6ffe9; --muted:#8a9a8f; --accent:#00ff66; }
    @media (prefers-color-scheme: light) { :root { --bg:#f6f8fa; --line:#d0d7de; --fg:#1f2328; --muted:#57606a; --accent:#0b7a3e; } }
    text { font-family: 'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; fill:var(--fg); }
    .head { font-size:14px; fill:var(--accent); font-weight:700; }
    .value { font-size:24px; font-weight:700; fill:var(--accent); }
    .label { font-size:12px; fill:var(--muted); }
    .grow { animation: grow 1.2s ease-out both; transform-origin: 0 0; }
    @keyframes grow { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:none; } }
  </style>
  <rect x="0.5" y="0.5" width="559" height="169" rx="12" fill="var(--bg)" stroke="var(--line)"/>
  <path d="M28 22h4v14h-4zm7 0h4v14h-4z" fill="#f48024"/>
  <text x="48" y="34" class="head">stackoverflow.com/users/${SO_USER}</text>
  <g class="grow">
    ${stat(28, reputation.toLocaleString('en-US'), 'reputation')}
    ${stat(170, String(answers), 'answers')}
    ${stat(280, '40M+', 'people reached')}
    ${stat(430, String(memberSince), 'member since')}
    ${badge(34, '#f1b600', badges.gold, 'gold')}
    ${badge(124, '#9a9b9e', badges.silver, 'silver')}
    ${badge(220, '#ab825f', badges.bronze, 'bronze')}
  </g>
</svg>
`;

const [articles, stackOverflow] = await Promise.all([fetchArticles(), fetchStackOverflow()]);

let markdown = await readFile(README, 'utf8');
markdown = replaceBlock(markdown, 'ARTICLES', articlesBlock(articles));
markdown = replaceBlock(markdown, 'SO_ANSWERS', answersBlock(stackOverflow.top));
await writeFile(README, markdown);
await writeFile(SO_CARD, stackOverflowCard(stackOverflow));

console.log(`README updated: ${articles.length} articles, ${stackOverflow.top.length} answers, ${stackOverflow.reputation} reputation`);
