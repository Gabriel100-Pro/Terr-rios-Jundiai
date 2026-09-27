# Terrários Jundiaí — site

Site estático (HTML, CSS e JS, sem build). Páginas: `index.html` e `nossa-natureza/index.html`.

## Onde editar

Todo o conteúdo que muda fica em **`js/config.js`** (`TJ_CONFIG`):

| Bloco | O que controla |
|---|---|
| `site` | domínio, títulos, descrições e imagem de compartilhamento |
| `atendimento` | cidade, regiões, retirada, entrega, horários, Instagram, endereço |
| `encomenda` | opções do formulário de encomenda personalizada |
| `whatsapp` | número e mensagens |
| `modelos`, `seletor` | janelas de detalhes e seletor |
| `galeria`, `depoimentos`, `faq` | seções que ficam ocultas até existir conteúdo real aprovado |

Campos vazios não aparecem no site. Não preencha com textos provisórios.
Os indicadores (números) ficam no início de `js/main.js`.

## Antes de publicar

1. **Domínio**: preencha `TJ_CONFIG.site.dominio` (ex.: `https://www.seudominio.com.br`) e rode
   `node ferramentas/aplicar-metadados.mjs`. O script regrava título, descrição, Open Graph,
   `canonical` e a imagem de compartilhamento (URL absoluta) nas duas páginas. Ele recusa
   `localhost` e endereços sem https.
2. **WhatsApp**: configurado em `TJ_CONFIG.whatsapp.numero` (só dígitos, com 55 e DDD). Se for
   apagado, o formulário de encomenda fica desativado e o botão flutuante não aparece.
3. **Atendimento**: preencha somente os dados confirmados.
4. **Indicadores**: substitua os valores ilustrativos em `js/main.js` e marque `ilustrativo: false`.
5. No servidor, ative a compressão (gzip/brotli) e o cache longo para `assets/web/`.

## Imagens

Os originais ficam em `assets/`. As versões usadas pelo site (WebP em várias larguras) e a capa
de compartilhamento (`assets/compartilhamento/capa.jpg`, 1200 × 630) são geradas por:

```
python ferramentas/otimizar-imagens.py   # requer Pillow
```

Rode de novo sempre que trocar uma imagem original.
