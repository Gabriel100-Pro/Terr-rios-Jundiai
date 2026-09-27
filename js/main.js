(() => {
  "use strict";

  /* =======================================================
     INDICADORES (faixa abaixo de "Nossa essência")
     Configuração única: edite, remova ou acrescente itens aqui.
       valor        número final (inteiro)
       sufixo       "+" só quando o dado for "mais de"; "" para valores exatos
       rotulo       texto curto abaixo do número
       ilustrativo  true = valor de DEMONSTRAÇÃO, ainda não confirmado pela
                    empresa. Aparece com o selo "Valor ilustrativo" e precisa
                    ser substituído (e marcado false) antes da publicação.
     ======================================================= */
  const INDICADORES = [
    { valor: 140, sufixo: "+", rotulo: "Terrários criados",   ilustrativo: true },
    { valor: 100, sufixo: "+", rotulo: "Clientes atendidos",  ilustrativo: true },
    // 4 = linhas exibidas na Coleção do site (vertical, aberto, fechado, mini); confirmar
    { valor: 4,   sufixo: "",  rotulo: "Modelos disponíveis", ilustrativo: true },
    { valor: 5,   sufixo: "",  rotulo: "Anos de experiência", ilustrativo: true },
  ];

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

  /* No desktop os cordões descem pelos vãos finais da navegação, como na
     referência: o 1º antes de "Contato", o 2º entre "Contato" e o ícone. */
  const desktop = window.matchMedia("(min-width: 1101px)");
  const navItems = [...document.querySelectorAll(".site-nav > *")];
  const alignCords = () => {
    const scene = document.querySelector(".hero-scene");
    if (!scene || navItems.length < 3) return;
    if (!desktop.matches) {
      hangers.forEach((h) => h.el.style.removeProperty("--cord-x"));
      return;
    }
    const left = scene.getBoundingClientRect().left;
    const [a, b, c] = navItems.slice(-3).map((el) => el.getBoundingClientRect());
    const cords = [
      a.right + (b.left - a.right) * 0.3, // logo depois de "Nossa Natureza"
      b.right + (c.left - b.right) * 0.62, // perto do ícone
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
    if (!swayVisible || document.hidden || reduceMotion.matches) return;
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
  // Aba oculta: o loop para; ao voltar, retoma na fase certa (depende só do tempo).
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("is-tab-hidden", document.hidden);
    if (!document.hidden) startSway();
  });
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

      // Flutuações só rodam com a coleção na tela (pausadas fora dela).
      new IntersectionObserver(([entry]) => {
        collection.classList.toggle("is-offscreen", !entry.isIntersecting);
      }).observe(collection);
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
     Indicadores — cada número conta de 0 até o seu valor, uma vez,
     quando a faixa entra na tela, com um pequeno atraso entre eles.
     O valor final (invisível) reserva a largura, então o layout não se
     move; leitores de tela leem só a frase final em .sr-only.
     ======================================================= */
  const statsList = document.querySelector("[data-stats]");
  if (statsList && INDICADORES.length) {
    const COUNT_MS = 1700;
    const STAGGER_MS = 160;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const format = (n) => n.toLocaleString("pt-BR");

    const items = INDICADORES.map((cfg) => {
      const end = Math.max(0, Math.round(Number(cfg.valor) || 0));
      const suffix = cfg.sufixo || "";
      const li = document.createElement("li");
      li.className = "stat";
      if (cfg.ilustrativo) li.dataset.illustrative = "";

      const spoken = document.createElement("p");
      spoken.className = "sr-only";
      spoken.textContent = `${suffix === "+" ? "Mais de " : ""}${format(end)} — ${cfg.rotulo}`;

      const value = document.createElement("p");
      value.className = "stat-value";
      value.setAttribute("aria-hidden", "true");
      const number = document.createElement("span");
      number.className = "stat-number";
      const ghost = document.createElement("span");
      ghost.className = "stat-ghost";
      ghost.textContent = format(end);
      const live = document.createElement("span");
      live.className = "stat-live";
      number.append(ghost, live);
      value.append(number);
      if (suffix) {
        const suf = document.createElement("span");
        suf.className = "stat-suffix";
        suf.textContent = suffix;
        value.append(suf);
      }

      const label = document.createElement("p");
      label.className = "stat-label";
      label.setAttribute("aria-hidden", "true");
      label.textContent = cfg.rotulo;

      li.append(spoken, value, label);
      statsList.append(li);
      return { live, end };
    });

    const showFinal = () => items.forEach((it) => (it.live.textContent = format(it.end)));

    const count = () => {
      const t0 = performance.now();
      const step = (now) => {
        let done = true;
        items.forEach((it, i) => {
          const t = Math.min(1, Math.max(0, (now - t0 - i * STAGGER_MS) / COUNT_MS));
          if (t < 1) done = false;
          it.live.textContent = format(Math.round(it.end * easeOutCubic(t)));
        });
        if (!done) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      showFinal();
    } else {
      items.forEach((it) => (it.live.textContent = "0"));
      const statsIo = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            statsIo.disconnect();
            if (reduceMotion.matches) showFinal();
            else count();
          }
        },
        { threshold: 0.45 }
      );
      statsIo.observe(statsList);
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
