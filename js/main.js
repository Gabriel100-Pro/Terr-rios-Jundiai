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
