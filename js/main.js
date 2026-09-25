(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* Resolve no fim da transição de `prop` em `el` (com limite de segurança). */
  const afterTransition = (el, prop, maxMs) =>
    new Promise((resolve) => {
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

  /* =======================================================
     Terrários pendurados — pêndulo
     A descida é CSS em .hanger-drop; o balanço roda em .hanger-sway.
     O balanço começa com amplitude zero e cresce suavemente após a
     chegada, então não há salto entre descida e pêndulo.
     ======================================================= */
  const hangers = [
    // amplitude (graus), período (s), fase (rad)
    { el: document.querySelector(".hanger--1"), amp: 2.6, period: 4.7, phase: 0 },
    { el: document.querySelector(".hanger--2"), amp: 2.2, period: 5.6, phase: 0 },
  ].filter((h) => h.el);

  /* No desktop os cordões descem pelos vãos da navegação, como na referência:
     o 1º entre "Nossa essência" e "Contato", o 2º entre "Contato" e o ícone. */
  const desktop = window.matchMedia("(min-width: 1101px)");
  const navItems = [...document.querySelectorAll(".site-nav > *")];
  const alignCords = () => {
    const scene = document.querySelector(".hero-scene");
    if (!scene || navItems.length < 4) return;
    if (!desktop.matches) {
      hangers.forEach((h) => h.el.style.removeProperty("--cord-x"));
      return;
    }
    const left = scene.getBoundingClientRect().left;
    const r = navItems.map((el) => el.getBoundingClientRect());
    const cords = [
      r[1].right + (r[2].left - r[1].right) * 0.3, // perto de "Nossa essência"
      r[2].right + (r[3].left - r[2].right) * 0.62, // perto do ícone
    ];
    hangers.forEach((h, i) => h.el.style.setProperty("--cord-x", `${(cords[i] - left).toFixed(1)}px`));
  };
  alignCords();
  window.addEventListener("resize", alignCords);
  document.fonts?.ready.then(alignCords);

  const RAMP_MS = 2400;
  let swayVisible = true;
  let swayRaf = 0;

  hangers.forEach((h) => {
    h.sway = h.el.querySelector(".hanger-sway");
    h.start = null;
    const drop = h.el.querySelector(".hanger-drop");
    const begin = () => { if (h.start === null) h.start = performance.now(); };
    drop.addEventListener("animationend", begin, { once: true });
    // Segurança: se a animação de descida não disparar (ex.: movimento reduzido).
    setTimeout(begin, 3600);
  });

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const swayFrame = (now) => {
    swayRaf = 0;
    if (!swayVisible || reduceMotion.matches) return;
    for (const h of hangers) {
      if (h.start === null) continue;
      const t = now - h.start;
      const env = easeInOut(Math.min(t / RAMP_MS, 1));
      const w = (2 * Math.PI * t) / (h.period * 1000);
      // Pequeno harmônico secundário evita um movimento mecânico demais.
      const angle = env * h.amp * (Math.sin(w + h.phase) * 0.9 + Math.sin(w * 0.5 + 1.3) * 0.1);
      h.sway.style.transform = `rotate(${angle.toFixed(3)}deg)`;
    }
    swayRaf = requestAnimationFrame(swayFrame);
  };
  const startSway = () => { if (!swayRaf) swayRaf = requestAnimationFrame(swayFrame); };

  const hero = document.querySelector(".hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      swayVisible = entry.isIntersecting;
      if (swayVisible) startSway();
    }).observe(hero);
  }
  startSway();
  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches) hangers.forEach((h) => (h.sway.style.transform = ""));
    else startSway();
  });

  /* =======================================================
     Coleção — sequência de entrada (roda uma única vez)
     1. título  2. fundos, um por vez  3. produtos, um por vez  4. flutuação
     ======================================================= */
  const collection = document.querySelector(".collection");
  const cards = [...document.querySelectorAll(".mosaic .card")]; // vertical, aberto, fechado, mini
  const STAGGER = 220;

  const revealAllInstantly = () => {
    collection.classList.add("is-title-in");
    cards.forEach((c) => c.classList.add("is-bg-in", "is-product-in"));
  };

  const imageReady = (img) =>
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });

  const runSequence = async () => {
    if (reduceMotion.matches) return revealAllInstantly();

    collection.classList.add("is-title-in");
    await wait(450);

    // Fundos, um por vez.
    const bgDone = cards.map((card, i) =>
      wait(i * STAGGER).then(() => {
        card.classList.add("is-bg-in");
        return afterTransition(card.querySelector(".card-bg"), "opacity", 1400);
      })
    );
    await Promise.all(bgDone);

    // Só então os produtos, um por vez (cards sem produto são ignorados).
    const withProduct = cards.filter((c) => c.querySelector(".product"));
    await Promise.all(withProduct.map((c) => imageReady(c.querySelector(".product img"))));

    withProduct.forEach((card, i) => {
      setTimeout(() => {
        card.classList.add("is-product-in");
        afterTransition(card.querySelector(".product-enter"), "transform", 1600).then(() =>
          card.classList.add("is-floating")
        );
      }, i * STAGGER);
    });
  };

  if (collection) {
    if (!("IntersectionObserver" in window)) {
      revealAllInstantly();
      cards.forEach((c) => c.classList.add("is-floating"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            runSequence();
          }
        },
        { threshold: 0, rootMargin: "0px 0px -22% 0px" }
      );
      io.observe(collection);
    }
  }

  /* =======================================================
     Nossa essência — foto pela esquerda, conteúdo pela direita
     (atrasos em sequência definidos no CSS por --i). Roda uma vez.
     ======================================================= */
  const essence = document.querySelector(".essence");
  if (essence) {
    if (!("IntersectionObserver" in window)) {
      essence.classList.add("is-in");
    } else {
      const essenceIo = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            essenceIo.disconnect();
            essence.classList.add("is-in");
          }
        },
        { threshold: 0, rootMargin: "0px 0px -20% 0px" }
      );
      essenceIo.observe(essence);
    }
  }

  /* =======================================================
     Natureza — scroll storytelling
     Progresso p (0–1) = quanto da seção alta já foi rolado enquanto o
     quadro está fixo. Linha do tempo:
       0,00–0,08  esfera parada, flutuando
       0,08–0,68  transformações entre os formatos (um por <img.s4-shape>)
       0,72–1,00  o terrário desce e desacelera sobre o pódio
     Depois que o quadro se solta, começa a passagem para a seção Espaços
     (h de 0 a 1, enquanto ela sobe até ocupar a tela): o MESMO elemento
     volta a ser a esfera, viaja até .s5-spot e pousa sobre a mesa.
     Tudo é um só progresso suavizado (g = p + h, de 0 a 2), então não há
     emenda entre as duas seções. O loop só roda com as seções por perto,
     e o movimento nunca salta junto com a roda do mouse.
     ======================================================= */
  const s4 = document.querySelector(".s4");
  if (s4) {
    const frame = s4.querySelector(".s4-frame");
    const product = s4.querySelector(".s4-product");
    const travel = s4.querySelector(".s4-travel");
    const stack = s4.querySelector(".s4-stack");
    const hotspots = s4.querySelector(".s4-hotspots");
    const titleInner = s4.querySelector(".s4-title-inner");
    const shapes = [...s4.querySelectorAll(".s4-shape")];
    const steps = [...s4.querySelectorAll(".s4-step")];
    const counterCurrent = s4.querySelector(".s4-counter-current");
    const counterTotal = s4.querySelector(".s4-counter-total");
    const contact = s4.querySelector(".s4-contact");
    const s5 = s4.nextElementSibling?.matches(".s5") ? s4.nextElementSibling : null;
    const spot = s5?.querySelector(".s5-spot");
    const s5Content = s5?.querySelector(".s5-content");

    const N = shapes.length;
    const MORPH_START = 0.08;
    const MORPH_END = 0.68;
    const DESCEND_START = 0.72;
    const END_SCALE = 0.8;
    // Área útil da esfera no PNG: 82% da largura; a base visível fica 42,5%
    // abaixo do centro do elemento.
    const SPHERE_VISIBLE_W = 0.82;
    const SPHERE_BASE_BELOW_CENTER = 0.425;
    const SPHERE_VISIBLE_H = 0.815;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
    const pad = (n) => String(n).padStart(2, "0");

    // Só existem etapas para os formatos presentes.
    steps.forEach((btn, i) => { if (i >= N) btn.closest("li").hidden = true; });
    if (counterTotal) counterTotal.textContent = pad(N);

    let frameH = 0;
    let scrollable = 1;
    let descendBy = 0;
    let baseX = 0;       // centro do terrário (sem transformações), relativo ao quadro
    let baseY = 0;
    let baseW = 1;

    const measure = () => {
      frameH = frame.clientHeight;
      scrollable = Math.max(1, s4.offsetHeight - frameH);
      // Descida: o último formato termina baixo, sobre o pódio, sem sair da tela.
      const pr = product.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const centerY = pr.top - fr.top + pr.height / 2;
      baseX = pr.left - fr.left + pr.width / 2;
      baseY = centerY;
      baseW = pr.width;
      const last = shapes[N - 1];
      const halfVisible = (last.offsetHeight * 0.94 * END_SCALE) / 2;
      const room = frameH * 0.9 - (centerY + halfVisible);
      descendBy = Math.max(frameH * 0.05, Math.min(frameH * 0.26, room));
    };

    let current = 0;
    let target = 0;
    let frameTop = 0;
    let inView = false;
    let running = false;
    let lastTime = 0;
    let activeStep = -1;
    const cache = new Map();

    const write = (el, transform, opacity) => {
      const prev = cache.get(el);
      if (prev && prev[0] === transform && prev[1] === opacity) return;
      cache.set(el, [transform, opacity]);
      el.style.transform = transform;
      if (opacity !== null) el.style.opacity = opacity;
    };

    const readTarget = () => {
      const r = s4.getBoundingClientRect();
      frameTop = frame.getBoundingClientRect().top;
      const p = clamp01(-r.top / scrollable);
      // Passagem: 0 quando o quadro se solta, 1 quando a seção Espaços ocupa a tela.
      const h = s5 ? clamp01((frameH - r.bottom) / frameH) : 0;
      target = p + h;
    };

    const render = (g) => {
      const reduce = reduceMotion.matches;
      const p = Math.min(g, 1);
      const h = Math.max(0, g - 1);
      // Na passagem, o último formato volta a ser a esfera (tratada como o
      // formato seguinte ao último), com a mesma transição das outras trocas.
      const back = N > 1 ? smooth(0.04, 0.62, h) : 0;
      const s = clamp01((p - MORPH_START) / (MORPH_END - MORPH_START)) * (N - 1) + back;
      const e = smooth(DESCEND_START, 1, p);

      // Formatos: sobrepostos no mesmo centro; o que sai cresce e gira um pouco,
      // o que entra vem menor e girado para o outro lado.
      shapes.forEach((img, i) => {
        const d = s - (i === 0 && back > 0 ? N : i);
        const a = Math.abs(d);
        // Sobreposição ampla: no meio da troca os dois estão em ~0,75, então
        // o objeto nunca fica "vazado".
        const vis = 1 - smooth(0.3, 0.9, a);
        let transform = "none";
        if (!reduce && a > 0.001) {
          const t = smooth(0, 1, a);
          const out = d > 0;
          const sc = out ? 1 + 0.1 * t : 1 - 0.16 * t;
          const rot = (out ? -5 : 5) * t;
          const y = (out ? -3 : 4) * t;
          transform = `translate3d(0, ${y.toFixed(2)}%, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        }
        write(img, transform, vis.toFixed(3));
      });

      // Pulso leve no meio de cada troca: o objeto "respira" ao mudar.
      const frac = s - Math.floor(s);
      const pulse = reduce ? 1 : 1 - 0.035 * Math.sin(Math.PI * smooth(0.2, 0.8, frac));
      write(stack, `scale(${pulse.toFixed(4)})`, null);

      if (hotspots) write(hotspots, "none", (clamp01(1 - s * 2.5) * (1 - e)).toFixed(3));

      // Percurso: desce durante o fim da seção Natureza...
      const drop = reduce ? 0 : descendBy;
      const endScale = reduce ? 1 : END_SCALE;
      let tx = 0;
      let ty = (reduce ? 0 : e) * descendBy;
      let sc = reduce ? 1 : 1 - (1 - END_SCALE) * e;
      let landed = 0;

      // ...e, na passagem, viaja do ponto final dela até a mesa.
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
        const fromY = baseY + drop;
        // ...e onde precisa ficar para a base da esfera tocar o tampo.
        const toX = sr.left + sr.width / 2;
        const toY = sr.top - SPHERE_BASE_BELOW_CENTER * baseW * landScale;
        sc = endScale + (landScale - endScale) * k;
        // Posição desejada na tela, convertida para o quadro (que já sobe com a página).
        tx = fromX + (toX - fromX) * k - baseX;
        ty = fromY + (toY - fromY) * k - (frameTop + baseY);
        landed = smooth(0.72, 1, h);
      }
      write(travel, `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`, null);
      if (contact) write(contact, "none", landed.toFixed(3));
      s4.classList.toggle("is-landed", h > 0.96);

      // "Natureza." sobe devagar e perde força quando o terrário desce.
      if (titleInner) {
        // Parallax proporcional à altura, para não encostar no texto de cima em telas baixas.
        const ty = reduce ? 0 : -p * Math.min(40, frameH * 0.02);
        write(titleInner, `translate3d(0, ${ty.toFixed(1)}px, 0)`, (1 - 0.55 * e).toFixed(3));
      }

      const step = Math.min(N - 1, Math.round(s - back));
      if (step !== activeStep) {
        activeStep = step;
        steps.forEach((btn, i) => {
          const on = i === step;
          btn.classList.toggle("is-active", on);
          if (on) btn.setAttribute("aria-current", "step");
          else btn.removeAttribute("aria-current");
        });
        if (counterCurrent) counterCurrent.textContent = pad(step + 1);
      }
      s4.classList.toggle("is-scrolled", p > 0.02);
      // Se a seção foi pulada (link, rolagem muito rápida), a entrada nunca
      // disparou: garante o terrário visível quando ele chega à mesa.
      if (g > 0 && !s4.classList.contains("is-in")) s4.classList.add("is-in");
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

    measure();
    readTarget();
    current = target;
    render(current);

    window.addEventListener("resize", () => { measure(); readTarget(); render(current); });
    shapes.forEach((img) => img.addEventListener("load", measure, { once: true }));

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

      const s4In = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            s4In.disconnect();
            s4.classList.add("is-in");
          }
        },
        { threshold: 0, rootMargin: "0px 0px -25% 0px" }
      );
      s4In.observe(s4);
    } else {
      s4.classList.add("is-in");
      inView = true;
      start();
    }

    // Etapas: rolam até o ponto em que aquele formato está inteiro.
    steps.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        const p = N > 1 ? MORPH_START + (i / (N - 1)) * (MORPH_END - MORPH_START) : 0;
        const top = s4.getBoundingClientRect().top + window.scrollY + p * scrollable;
        window.scrollTo({ top, behavior: reduceMotion.matches ? "auto" : "smooth" });
      });
    });
  }

  /* =======================================================
     Espaços — entrada apenas do texto (uma vez). O fundo fica
     estável e o terrário chega pelo scroll da seção Natureza.
     ======================================================= */
  const s5Section = document.querySelector(".s5");
  if (s5Section) {
    if (!("IntersectionObserver" in window)) {
      s5Section.classList.add("is-in");
    } else {
      const s5Io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            s5Io.disconnect();
            s5Section.classList.add("is-in");
          }
        },
        { threshold: 0, rootMargin: "0px 0px -35% 0px" }
      );
      s5Io.observe(s5Section);
    }
  }

  /* =======================================================
     Giro no hover
     A área de hover é .product (não se move); o giro roda em .product-spin.
     Um giro em andamento nunca é interrompido nem reiniciado, então sair
     ou entrar de novo com o mouse não causa saltos.
     ======================================================= */
  document.querySelectorAll(".product").forEach((product) => {
    const spin = product.querySelector(".product-spin");
    if (!spin) return;

    const trigger = () => {
      if (reduceMotion.matches || spin.classList.contains("is-spinning")) return;
      spin.classList.add("is-spinning");
    };
    spin.addEventListener("animationend", (e) => {
      if (e.animationName === "spin-y") spin.classList.remove("is-spinning");
    });
    product.addEventListener("pointerenter", trigger);
  });
})();
