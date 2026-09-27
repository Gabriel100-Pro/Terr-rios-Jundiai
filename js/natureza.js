(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

  /* Resolve no fim da transição de `prop` em `el` (com limite de segurança). */
  const afterTransition = (el, prop, maxMs) =>
    new Promise((resolve) => {
      if (!el) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("transitionend", onEnd);
        resolve();
      };
      const onEnd = (e) => {
        if (e.target === el && e.propertyName === prop) finish();
      };
      el.addEventListener("transitionend", onEnd);
      setTimeout(finish, maxMs);
    });

  /* Imagem carregada E decodificada: a entrada nunca começa com ela pela metade. */
  const imageReady = (img) => {
    const loaded =
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
    return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : undefined));
  };

  /* =======================================================
     Natureza > Espaços
     Camadas, cada uma com o seu próprio `transform`:
       .s4-intro   entrada da página (só classe CSS)
       .s4-travel  descida ligada ao scroll (JS)
       .s4-float   flutuação contínua (keyframes CSS)
       .s4-stack   pulso leve no meio de cada troca (JS)
       .s4-model   fade + escala/posição de cada modelo na troca (JS)

     UM ÚNICO progresso de scroll controla tudo:
       p (0–1) = quanto da seção alta já foi rolado com o quadro fixo
         0,00–0,70  apresentação: 5 intervalos iguais, um por modelo
                    (vertical > aberto > fechado > mini > esfera)
         0,70–0,76  pausa: a esfera, último modelo, fica parada
         0,76–1,00  a esfera desce rumo ao pódio
       h (0–1) = passagem para a seção Espaços depois que o quadro se solta:
                 o MESMO elemento (a esfera) viaja até .s5-spot e pousa na mesa.
       g = p + h (0 a 2) é suavizado e segue a posição atual do scroll;
       não há fila de animações, então rolagem rápida mostra direto o
       modelo correspondente e subir a página inverte tudo na mesma ordem.
     ======================================================= */
  const s4 = document.querySelector(".s4");
  if (!s4) return;

  const frame = s4.querySelector(".s4-frame");
  const product = s4.querySelector(".s4-product");
  const travel = s4.querySelector(".s4-travel");
  const stack = s4.querySelector(".s4-stack");
  const models = [...s4.querySelectorAll(".s4-model")];
  const titleInner = s4.querySelector(".s4-title-inner");
  const steps = [...s4.querySelectorAll(".s4-step")];
  const counterCurrent = s4.querySelector(".s4-counter-current");
  const counterTotal = s4.querySelector(".s4-counter-total");
  const contact = s4.querySelector(".s4-contact");
  const s5 = document.querySelector(".s5");
  const spot = s5?.querySelector(".s5-spot");
  const s5Content = s5?.querySelector(".s5-content");

  const N = models.length;          // um item da lista por modelo, na mesma ordem
  const SHOW_END = 0.7;             // fim da apresentação dos modelos
  const SLOT = SHOW_END / N;        // intervalo de scroll de cada modelo
  const SWAP = SLOT * 0.4;          // parte do intervalo usada na troca (o resto é pausa)
  const DESCEND_START = 0.76;       // a descida só começa depois da pausa na esfera
  const END_SCALE = 0.8;            // escala ao fim da descida na seção Natureza
  // Área útil da esfera no PNG: 82% da largura; a base visível fica 42,5%
  // abaixo do centro do elemento.
  const SPHERE_VISIBLE_W = 0.82;
  const SPHERE_VISIBLE_H = 0.815;
  const SPHERE_BASE_BELOW_CENTER = 0.425;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const pad = (n) => String(n).padStart(2, "0");

  if (counterTotal) counterTotal.textContent = pad(N);

  // Posição contínua na sequência (0 = primeiro modelo, N-1 = esfera):
  // patamares estáveis ligados por trocas suaves nas fronteiras dos intervalos.
  const modelAt = (p) => {
    let m = 0;
    for (let i = 1; i < N; i++) m += smooth(i * SLOT - SWAP / 2, i * SLOT + SWAP / 2, p);
    return m;
  };
  // Ponto do scroll em que o modelo i está inteiro e parado (meio do patamar).
  const progressFor = (i) => (i + 0.5) * SLOT;

  let frameH = 0;
  let scrollable = 1;
  let descendBy = 0;
  let baseX = 0;       // centro do terrário (sem transformações), relativo ao quadro
  let baseY = 0;
  let baseW = 1;

  /* Medidas reais; refeitas a cada redimensionamento. */
  const measure = () => {
    frameH = frame.clientHeight;
    scrollable = Math.max(1, s4.offsetHeight - frameH);
    const pr = product.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    baseX = pr.left - fr.left + pr.width / 2;
    baseY = pr.top - fr.top + pr.height / 2;
    baseW = pr.width;
    // Desce até perto da base do quadro, sem sair dele e sem passar por baixo
    // das etapas quando elas ficam abaixo do produto (celular/tablet em retrato).
    let floor = frameH * 0.86;
    const list = s4.querySelector(".s4-steps");
    if (list) {
      const lr = list.getBoundingClientRect();
      const half = (baseW * SPHERE_VISIBLE_W * END_SCALE) / 2;
      const overlapsX = lr.left < fr.left + baseX + half && lr.right > fr.left + baseX - half;
      if (overlapsX && lr.top - fr.top > baseY) floor = Math.min(floor, lr.top - fr.top - 12);
    }
    const room = floor - (baseY + SPHERE_BASE_BELOW_CENTER * baseW * END_SCALE);
    descendBy = Math.max(0, Math.min(frameH * 0.22, room));
  };

  let current = 0;
  let target = 0;
  let frameTop = 0;
  let inView = false;
  let running = false;
  let lastTime = 0;
  let activeStep = -1;
  let manualStep = 0;  // movimento reduzido: modelo escolhido no clique
  const cache = new Map();

  const write = (el, transform, opacity) => {
    const prev = cache.get(el);
    if (prev && prev[0] === transform && prev[1] === opacity) return;
    cache.set(el, [transform, opacity]);
    el.style.transform = transform;
    if (opacity !== null) el.style.opacity = opacity;
  };

  const setActiveStep = (step) => {
    if (step === activeStep) return;
    activeStep = step;
    steps.forEach((btn, i) => {
      const on = i === step;
      btn.classList.toggle("is-active", on);
      if (on) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    if (counterCurrent) counterCurrent.textContent = pad(step + 1);
  };

  const readTarget = () => {
    const r = s4.getBoundingClientRect();
    frameTop = frame.getBoundingClientRect().top;
    const p = clamp01(-r.top / scrollable);
    // Passagem: 0 quando o quadro se solta, 1 quando a seção Espaços ocupa a tela.
    const h = s5 ? clamp01((frameH - r.bottom) / frameH) : 0;
    target = p + h;
  };

  /* Mostra o modelo da posição m; o que sai cresce e sobe um pouco,
     o que entra vem menor e de baixo. Em movimento reduzido, troca direta. */
  const renderModels = (m, reduce) => {
    models.forEach((img, i) => {
      const d = m - i;
      const a = Math.abs(d);
      // sobreposição ampla: no meio da troca os dois estão em ~0,74, sem "vazio"
      const vis = reduce ? (a < 0.5 ? 1 : 0) : 1 - smooth(0.3, 0.9, a);
      let transform = "none";
      if (!reduce && a > 0.001) {
        const t = smooth(0, 1, Math.min(a, 1));
        const out = d > 0;
        const sc = out ? 1 + 0.08 * t : 1 - 0.12 * t;
        const y = (out ? -3 : 4) * t;
        transform = `translate3d(0, ${y.toFixed(2)}%, 0) scale(${sc.toFixed(4)})`;
      }
      write(img, transform, vis.toFixed(3));
      // leitores de tela só encontram o modelo exibido
      const hide = vis < 0.5;
      if (img.hasAttribute("aria-hidden") !== hide) img.toggleAttribute("aria-hidden", hide);
    });
    const frac = m - Math.floor(m);
    const pulse = reduce ? 1 : 1 - 0.03 * Math.sin(Math.PI * smooth(0.2, 0.8, frac));
    write(stack, `scale(${pulse.toFixed(4)})`, null);
  };

  const render = (g) => {
    // Movimento reduzido: composição estável, sem percurso; os modelos
    // continuam acessíveis pela lista (troca direta, sem animação).
    if (reduceMotion.matches) {
      renderModels(manualStep, true);
      write(travel, "none", null);
      if (contact) write(contact, "none", "0");
      if (titleInner) write(titleInner, "none", "1");
      s4.classList.remove("is-landed", "is-scrolled");
      setActiveStep(manualStep);
      return;
    }

    const p = Math.min(g, 1);
    const h = Math.max(0, g - 1);
    const m = modelAt(p);
    const e = smooth(DESCEND_START, 1, p);

    renderModels(m, false);

    // Depois da apresentação e da pausa: a esfera desce e diminui um pouco.
    let tx = 0;
    let ty = e * descendBy;
    let sc = 1 - (1 - END_SCALE) * e;
    let landed = 0;

    // Passagem: do ponto final da descida até a mesa da seção Espaços.
    if (h > 0 && spot) {
      const k = smooth(0, 1, h);
      const sr = spot.getBoundingClientRect();
      let landScale = sr.width / (SPHERE_VISIBLE_W * baseW);
      // Texto empilhado acima da mesa (celular/tablet em retrato): a esfera
      // encolhe o necessário para caber entre o texto e o tampo.
      if (s5Content) {
        const cr = s5Content.getBoundingClientRect();
        if (cr.right > sr.left + 8) {
          const free = sr.top - (cr.bottom + 18);
          landScale = Math.min(landScale, Math.max(0.25, free / (SPHERE_VISIBLE_H * baseW)));
        }
      }
      // Onde o centro estava ao fim da descida (quadro ainda fixo no topo)...
      const fromX = baseX;
      const fromY = baseY + descendBy;
      // ...e onde precisa ficar para a base da esfera tocar o tampo.
      const toX = sr.left + sr.width / 2;
      const toY = sr.top - SPHERE_BASE_BELOW_CENTER * baseW * landScale;
      sc = END_SCALE + (landScale - END_SCALE) * k;
      // Posição desejada na tela, convertida para o quadro (que já sobe com a página).
      tx = fromX + (toX - fromX) * k - baseX;
      ty = fromY + (toY - fromY) * k - (frameTop + baseY);
      landed = smooth(0.72, 1, h);

      // No meio da passagem a mesa ainda está abaixo da tela: o terrário
      // nunca desce além da borda inferior (fica inteiro e visível).
      const baseOnScreen = frameTop + baseY + ty + SPHERE_BASE_BELOW_CENTER * baseW * sc;
      const limit = window.innerHeight - 14;
      if (baseOnScreen > limit) ty -= baseOnScreen - limit;
    }
    write(travel, `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`, null);
    if (contact) write(contact, "none", landed.toFixed(3));
    s4.classList.toggle("is-landed", h > 0.96);

    // "Natureza." sobe devagar e perde força conforme o terrário desce.
    if (titleInner) {
      const y = -p * Math.min(40, frameH * 0.02);
      write(titleInner, `translate3d(0, ${y.toFixed(1)}px, 0)`, (1 - 0.5 * e).toFixed(3));
    }

    // Lista, indicador e miniatura seguem o mesmo progresso do modelo exibido.
    setActiveStep(Math.min(N - 1, Math.round(m)));
    s4.classList.toggle("is-scrolled", p > 0.02);
  };

  const tick = (now) => {
    readTarget();
    const dt = Math.min(64, now - (lastTime || now));
    lastTime = now;
    // Suavização independente da taxa de quadros (~140 ms de constante de tempo).
    const k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / 140);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.0002) current = target;
    render(current);
    // Fora de vista, só para depois de assentar (o pouso nunca fica pela metade).
    if (!inView && current === target) running = false;
    if (running) requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastTime = 0;
    requestAnimationFrame(tick);
  };

  const refresh = () => { measure(); readTarget(); current = target; render(current); };

  refresh();
  window.addEventListener("resize", refresh);
  models.forEach((img) => img.addEventListener("load", refresh, { once: true }));
  document.fonts?.ready.then(refresh);
  reduceMotion.addEventListener?.("change", refresh);

  if ("IntersectionObserver" in window) {
    // Loop ativo apenas com a seção Natureza ou a Espaços por perto.
    const near = new Set();
    const nearIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => (en.isIntersecting ? near.add(en.target) : near.delete(en.target)));
        inView = near.size > 0;
        if (inView) start();
      },
      { rootMargin: "20% 0px 60% 0px" }
    );
    nearIo.observe(s4);
    if (s5) nearIo.observe(s5);
  } else {
    inView = true;
    start();
  }

  /* Lista: rola até o intervalo do modelo (mesma lógica do scroll). */
  steps.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      if (reduceMotion.matches) {
        manualStep = i;
        render(current);
        return;
      }
      const p = progressFor(i);
      const top = s4.getBoundingClientRect().top + window.scrollY + p * scrollable;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* =======================================================
     Abertura da página, em ordem:
       1. fundo e cenário   2. títulos e textos
       3. controles e demais elementos   4. por último, o produto
     O produto (o primeiro modelo da sequência, o vertical) só entra depois
     que as etapas anteriores terminaram e a imagem está decodificada.
     Os demais modelos são decodificados em seguida, antes das trocas.
     ======================================================= */
  const opening = async () => {
    if (reduceMotion.matches) {
      s4.classList.add("is-bg-in", "is-text-in", "is-ui-in", "is-in");
      return;
    }
    // Aberta em aba de fundo: as transições ficam paradas, então a
    // sequência só começa quando a página estiver visível.
    if (document.hidden) {
      await new Promise((resolve) => {
        const onVisible = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVisible);
          resolve();
        };
        document.addEventListener("visibilitychange", onVisible);
      });
    }
    await nextFrame();
    await nextFrame();

    s4.classList.add("is-bg-in");
    await wait(250);

    s4.classList.add("is-text-in");
    const textDone = afterTransition(s4.querySelector(".s4-title"), "opacity", 1400);
    await wait(350);

    s4.classList.add("is-ui-in");
    const uiDone = afterTransition(s4.querySelector(".s4-steps"), "opacity", 1400);

    models.slice(1).forEach((img) => imageReady(img));
    await Promise.all([textDone, uiDone, imageReady(models[0])]);
    s4.classList.add("is-in");
  };
  opening();

  /* =======================================================
     Espaços — entrada apenas do texto (uma vez). O fundo fica
     estável e o terrário chega pelo scroll da seção Natureza.
     ======================================================= */
  if (s5) {
    if (!("IntersectionObserver" in window)) {
      s5.classList.add("is-in");
    } else {
      const s5Io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            s5Io.disconnect();
            s5.classList.add("is-in");
          }
        },
        { threshold: 0, rootMargin: "0px 0px -35% 0px" }
      );
      s5Io.observe(s5);
    }
  }
})();
