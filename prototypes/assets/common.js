(() => {
  const pages = [
    ["editorial", "Margem"],
    ["desktop", "Mesa"],
    ["notebook", "Caderno"],
    ["map", "Afinidades"],
    ["indexer", "Índice"],
  ];
  const slug = document.body.dataset.prototype;
  if (slug) {
    const i = pages.findIndex((p) => p[0] === slug);
    const bar = document.createElement("nav");
    bar.className = "proto-bar";
    bar.setAttribute("aria-label", "Navegação dos protótipos");
    bar.innerHTML = `<a href="index.html">← Todas as direções</a><span class="bar-meta">${i + 1}/5 · ${pages[i][1]} · protótipo</span><span class="bar-arrows"><a aria-label="Protótipo anterior" href="${pages[(i + 4) % 5][0]}.html">←</a><a aria-label="Próximo protótipo" href="${pages[(i + 1) % 5][0]}.html">→</a></span>`;
    document.body.prepend(bar);
  }
  const reader = document.createElement("dialog");
  reader.className = "reader";
  reader.setAttribute("aria-labelledby", "reader-title");
  reader.innerHTML =
    '<div class="reader-top"><span id="reader-kind"></span><button type="button" aria-label="Fechar leitura">Fechar ×</button></div><article class="reader-copy"><h2 id="reader-title"></h2><div id="reader-body"></div><small id="reader-note"></small></article>';
  document.body.append(reader);
  reader.querySelector("button").onclick = () => reader.close();
  reader.addEventListener("click", (e) => {
    if (e.target === reader) {
      const r = reader.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        reader.close();
    }
  });
  window.openReader = (key) => {
    const c = window.CONTENT[key];
    if (!c) return;
    document.getElementById("reader-kind").textContent = c.kind;
    document.getElementById("reader-title").textContent = c.title;
    document.getElementById("reader-body").innerHTML =
      c.body +
      (c.url
        ? `<a href="${c.url}" target="_blank" rel="noopener">${c.label} ↗</a>`
        : "");
    document.getElementById("reader-note").textContent = c.kind.startsWith(
      "Texto",
    )
      ? "Trecho do arquivo original. A opinião e a redação são da época da publicação."
      : "Exploração de conteúdo e navegação. Não é a versão final do site.";
    reader.showModal();
  };
  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-open]");
    if (button) window.openReader(button.dataset.open);
  });
})();
