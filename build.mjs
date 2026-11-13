import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import MarkdownIt from "markdown-it";

const SITE = "https://ceifa.dev";
const OUT = "dist";

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
// Every line of text is a surface the resident can stand on.
for (const block of ["paragraph", "heading"]) {
  md.renderer.rules[`${block}_open`] = (tokens, i, options, env, self) =>
    self.renderToken(tokens, i, options) + '<span data-land="text">';
  md.renderer.rules[`${block}_close`] = (tokens, i, options, env, self) =>
    "</span>" + self.renderToken(tokens, i, options);
}
const fence = md.renderer.rules.fence;
md.renderer.rules.fence = (...args) =>
  fence(...args).replace("<pre>", '<pre data-land="top">');

const escape = (text) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const longDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

// Pages and posts start with a JSON block, then the content.
function parse(source, file) {
  const end = source.indexOf("\n}") + 2;
  if (end < 2) throw new Error(`${file}: missing JSON header`);
  return {
    meta: JSON.parse(source.slice(0, end)),
    body: source.slice(end).trim(),
  };
}

const nav = [
  ["/projects", "Projects"],
  ["/writing", "Writing"],
  ["/about", "About"],
];

function layout({ path, title, description, section, body }) {
  const links = nav
    .map(
      ([href, label]) =>
        `<a href="${href}"${href === section ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${SITE}${path}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${SITE}${path}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:creator" content="@_ceifa" />
    <link rel="alternate" type="application/atom+xml" title="ceifa" href="/feed.xml" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect x='9' y='8' width='22' height='25' rx='7' fill='%23ab4057'/%3E%3Ccircle cx='17' cy='17' r='2' fill='white'/%3E%3Ccircle cx='24' cy='17' r='2' fill='white'/%3E%3C/svg%3E" />
    <link rel="stylesheet" href="/assets/site.css" />
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <div class="site" id="top">
      <header class="header">
        <a href="/" class="logo">ceifa<i>.</i></a>
        <nav aria-label="Main">${links}</nav>
      </header>
      <main id="main" tabindex="-1">
${body}
      </main>
      <footer class="footer" data-land="top">
        <p>Gabriel Francisco, ceifa.</p>
        <span class="footer-links"><a href="https://github.com/ceifa" rel="me">GitHub ↗</a><a href="https://x.com/_ceifa" rel="me">X ↗</a><a href="/feed.xml">RSS</a></span>
      </footer>
      <noscript><p>The site works without JavaScript. The little resident shows up when it can.</p></noscript>
    </div>
    <button class="resident" id="resident" aria-label="The page's little resident. It follows your reading on its own. Drag it around, or use the arrow keys or WASD to walk, jump and drop, Space to jump and Escape to let go." aria-pressed="false" hidden>
      <span class="sprite"><span class="eyes"></span></span><span class="leg left"></span><span class="leg right"></span>
    </button>
    <div class="whisper" id="whisper" role="status" aria-live="polite" hidden></div>
    <script type="module" src="/assets/navigate.mjs"></script>
    <script type="module" src="/assets/inhabit.mjs"></script>
  </body>
</html>
`;
}

const postList = (posts) =>
  `<div class="writing-list">${posts
    .map(
      (post) =>
        `<a class="post" data-land="bottom" href="/${post.slug}"><strong>${escape(post.title)}</strong><small>${post.date.getUTCFullYear()}</small></a>`,
    )
    .join("")}</div>`;

const posts = [];
for (const file of (await readdir("posts")).filter((f) => f.endsWith(".md"))) {
  const { meta, body } = parse(await readFile(`posts/${file}`, "utf8"), file);
  const html = md.render(body);
  posts.push({
    slug: file.slice(0, -3),
    title: meta.title,
    description:
      meta.description ??
      html
        .match(/<p>([\s\S]*?)<\/p>/)[1]
        .replace(/<[^>]+>/g, "")
        .slice(0, 180)
        .replace(/\s+\S*$/, "…"),
    date: new Date(meta.written),
    html,
  });
}
posts.sort((a, b) => b.date - a.date);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT);
await cp("assets", `${OUT}/assets`, { recursive: true });

const pages = new Set();
for (const file of await readdir("pages")) {
  const name = file.replace(/\.html$/, "");
  const { meta, body } = parse(await readFile(`pages/${file}`, "utf8"), file);
  const path = name === "index" ? "/" : `/${name}`;
  pages.add(name);
  await writeFile(
    `${OUT}/${name}.html`,
    layout({
      ...meta,
      path,
      section: path,
      body: body
        .replace("{{latest-posts}}", postList(posts.slice(0, 3)))
        .replace("{{posts}}", postList(posts)),
    }),
  );
}

for (const post of posts) {
  if (pages.has(post.slug)) throw new Error(`post ${post.slug} clashes with a page`);
  const iso = post.date.toISOString().slice(0, 10);
  await writeFile(
    `${OUT}/${post.slug}.html`,
    layout({
      path: `/${post.slug}`,
      title: `${post.title} · ceifa`,
      description: post.description,
      section: "/writing",
      body: `<a class="back" href="/writing"><span data-land="text">← Writing</span></a>
<header class="article-head">
  <h1><span data-land="text" id="first-perch">${escape(post.title)}</span></h1>
  <p class="article-meta"><time datetime="${iso}">${longDate.format(post.date)}</time></p>
</header>
<article class="article-body">
${post.html}</article>`,
    }),
  );
}

await writeFile(
  `${OUT}/feed.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ceifa</title>
  <id>${SITE}/</id>
  <link href="${SITE}/" />
  <link rel="self" href="${SITE}/feed.xml" />
  <author><name>Gabriel Francisco</name></author>
  <updated>${posts[0].date.toISOString()}</updated>
${posts
  .map(
    (post) => `  <entry>
    <id>${SITE}/${post.slug}</id>
    <title>${escape(post.title)}</title>
    <link href="${SITE}/${post.slug}" />
    <updated>${post.date.toISOString()}</updated>
    <summary>${escape(post.description)}</summary>
    <content type="html">${escape(post.html)}</content>
  </entry>`,
  )
  .join("\n")}
</feed>
`,
);

// The old Sapper site served its feed at /feed.
await writeFile(`${OUT}/_redirects`, "/feed /feed.xml 301\n");

console.log(`built ${pages.size} pages and ${posts.length} posts into ${OUT}/`);
