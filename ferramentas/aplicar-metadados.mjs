/* =========================================================
   Regrava o bloco de metadados (título, descrição, Open Graph e
   Twitter/X) das páginas a partir de TJ_CONFIG.site (js/config.js).

       node ferramentas/aplicar-metadados.mjs

   Sem domínio configurado, publica apenas o que não depende de URL
   absoluta e avisa da pendência (og:url, canonical e imagem ficam de fora).
   Sem dependências: só Node.js.
   ========================================================= */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const INICIO = "<!-- METADADOS:INICIO (gerado por ferramentas/aplicar-metadados.mjs a partir de js/config.js) -->";
const FIM = "<!-- METADADOS:FIM -->";

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(RAIZ, "js/config.js"), "utf8"), sandbox);
const SITE = sandbox.window.TJ_CONFIG?.site;
if (!SITE) throw new Error("TJ_CONFIG.site não encontrado em js/config.js");

const dominio = String(SITE.dominio || "").trim().replace(/\/+$/, "");
if (dominio) {
  let url;
  try { url = new URL(dominio); } catch { throw new Error(`Domínio inválido: "${dominio}"`); }
  if (url.protocol !== "https:") throw new Error("O domínio precisa começar com https://");
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])|\.local$/i.test(url.hostname)) {
    throw new Error("Não use localhost ou endereço local nos metadados de produção.");
  }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const abs = (caminho) => dominio + "/" + caminho.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");

for (const [arquivo, pg] of Object.entries(SITE.paginas)) {
  const img = SITE.imagem;
  const linhas = [
    `<title>${esc(pg.titulo)}</title>`,
    `<meta name="description" content="${esc(pg.descricao)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:site_name" content="${esc(SITE.nome)}">`,
    `<meta property="og:title" content="${esc(pg.titulo)}">`,
    `<meta property="og:description" content="${esc(pg.descricao)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(pg.titulo)}">`,
    `<meta name="twitter:description" content="${esc(pg.descricao)}">`,
  ];
  if (dominio) {
    const url = dominio + pg.caminho;
    const imagem = abs(img.caminho);
    linhas.push(
      `<link rel="canonical" href="${esc(url)}">`,
      `<meta property="og:url" content="${esc(url)}">`,
      `<meta property="og:image" content="${esc(imagem)}">`,
      `<meta property="og:image:secure_url" content="${esc(imagem)}">`,
      `<meta property="og:image:type" content="${esc(img.tipo)}">`,
      `<meta property="og:image:width" content="${img.width}">`,
      `<meta property="og:image:height" content="${img.height}">`,
      `<meta property="og:image:alt" content="${esc(img.alt)}">`,
      `<meta name="twitter:image" content="${esc(imagem)}">`,
      `<meta name="twitter:image:alt" content="${esc(img.alt)}">`,
    );
  } else {
    linhas.push("<!-- PENDENTE: defina TJ_CONFIG.site.dominio e rode o script para publicar og:url, canonical e a imagem de compartilhamento (URLs absolutas). -->");
  }

  const caminho = join(RAIZ, arquivo);
  const html = readFileSync(caminho, "utf8");
  const i = html.indexOf(INICIO);
  const f = html.indexOf(FIM);
  if (i < 0 || f < i) throw new Error(`Marcadores de metadados não encontrados em ${arquivo}`);
  const recuo = "  ";
  const bloco = INICIO + "\n" + linhas.map((l) => recuo + l).join("\n") + "\n" + recuo + FIM;
  writeFileSync(caminho, html.slice(0, i) + bloco + html.slice(f + FIM.length));
  console.log(`✓ ${arquivo}`);
}

if (!dominio) {
  console.warn("\nAVISO: TJ_CONFIG.site.dominio está vazio — prévia sem imagem até o domínio ser definido.");
}
