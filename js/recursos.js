/* =========================================================
   Recursos da página principal: WhatsApp, detalhes dos modelos,
   seletor, galeria e perguntas frequentes.
   Todo o conteúdo vem de js/config.js (window.TJ_CONFIG).
   ========================================================= */
(() => {
  "use strict";

  const CFG = window.TJ_CONFIG;
  if (!CFG) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- utilitários ---------- */
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    node.append(...children.filter(Boolean));
    return node;
  };
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));
  const ARROW = '<svg class="arrow" viewBox="0 0 28 12" aria-hidden="true"><path d="M0 6h26M21 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

  /* =======================================================
     WhatsApp — número único em TJ_CONFIG.whatsapp.numero.
     Sem número confirmado: nenhum link é gerado.
     ======================================================= */
  const WA = CFG.whatsapp || {};
  const waNumber = String(WA.numero || "").replace(/\D/g, "");
  const hasWhatsApp = waNumber.length >= 10;

  const waLink = (message) =>
    hasWhatsApp ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null;

  /* Botão de contato com a mensagem certa, ou o aviso de "em breve". */
  const contactAction = (message, label) => {
    const href = waLink(message);
    if (href) {
      return el("a", { class: "btn wa-btn", href, target: "_blank", rel: "noopener", html: `${label} ${ARROW}` });
    }
    return el("p", { class: "wa-soon", text: WA.emBreve || "Contato disponível em breve." });
  };

  document.querySelectorAll("[data-whatsapp]").forEach((slot) => {
    const msg = (WA.mensagens || {})[slot.dataset.whatsapp] || "";
    const label = slot.dataset.whatsappLabel || "Conversar pelo WhatsApp";
    // Variante "link": ação secundária discreta; sem número, não aparece
    // (o aviso de "em breve" já é dado pela ação principal da seção).
    if (slot.dataset.whatsappVariant === "link") {
      const href = waLink(msg);
      if (href) slot.replaceChildren(el("a", { class: "contact-alt", href, target: "_blank", rel: "noopener", text: label }));
      else slot.hidden = true;
      return;
    }
    slot.replaceChildren(contactAction(msg, label));
  });

  /* Abre o WhatsApp em nova aba a partir de um clique (nunca automaticamente). */
  const openWhatsApp = (href) => {
    const win = window.open(href, "_blank");
    if (win) win.opener = null;
    else window.location.href = href;
  };

  const waFloat = document.querySelector("[data-whatsapp-float]");
  if (waFloat && hasWhatsApp) {
    waFloat.href = waLink(WA.mensagens.geral);
    waFloat.hidden = false;
    // Sai de cena no contato e no rodapé: lá já existe o botão principal
    // e ele não cobre textos nem links.
    const zones = [...document.querySelectorAll("#contato, .site-footer")];
    if (zones.length && "IntersectionObserver" in window) {
      const visible = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
        document.body.classList.toggle("wa-float-off", visible.size > 0);
      });
      zones.forEach((z) => io.observe(z));
    }
  }

  /* =======================================================
     Janelas (<dialog> nativo): Escape fecha, o resto da página fica
     inerte enquanto aberta (foco preso dentro), a rolagem do fundo
     é bloqueada e o foco volta para quem abriu.
     ======================================================= */
  const root = document.documentElement;
  const openers = new Map();

  /* Bloqueio de rolagem que também vale no Safari do iPhone: o body fica
     fixo na posição atual e a rolagem é devolvida, sem animação, ao fechar. */
  let lockedY = 0;
  const lockScroll = (on) => {
    const body = document.body;
    if (on) {
      lockedY = window.scrollY;
      const gap = window.innerWidth - root.clientWidth;
      root.style.setProperty("--scrollbar-gap", `${gap}px`);
      body.style.top = `-${lockedY}px`;
      root.classList.add("is-locked");
    } else {
      root.classList.remove("is-locked");
      root.style.removeProperty("--scrollbar-gap");
      body.style.top = "";
      window.scrollTo({ top: lockedY, left: 0, behavior: "instant" });
    }
  };

  const openDialog = (dialog, opener) => {
    if (!dialog || dialog.open) return;
    openers.set(dialog, opener || document.activeElement);
    lockScroll(true);
    document.body.classList.add("has-dialog");
    dialog.showModal();
    const first = dialog.querySelector("[data-autofocus]") || dialog.querySelector("button, a[href]");
    first?.focus();
  };

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      lockScroll(false);
      document.body.classList.remove("has-dialog");
      const opener = openers.get(dialog);
      openers.delete(dialog);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    });
    // clique no fundo escurecido (fora da caixa) também fecha
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    // Tab e Shift+Tab circulam só pelos controles da janela
    dialog.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const items = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    });
  });

  /* =======================================================
     Encomenda personalizada (seção Contato)
     Monta uma mensagem organizada e abre o WhatsApp só no clique do
     botão. Sem número configurado, o botão fica desativado com aviso.
     Opções em TJ_CONFIG.encomenda.
     ======================================================= */
  const ENC = CFG.encomenda || {};
  const orderSlot = document.querySelector("[data-encomenda]");
  let orderForm = null;

  // Chaves usadas pelo seletor/coleção -> opções do formulário
  const ORDER_MODEL = { vertical: "Vertical", aberto: "Aberto", fechado: "Fechado", mini: "Mini terrários" };
  const ORDER_SIZE = { pouco: "Pequeno", medio: "Médio", destaque: "Peça de destaque" };

  const pad2 = (n) => String(n).padStart(2, "0");
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const brDate = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

  if (orderSlot && ENC.modelos?.length) {
    let uid = 0;
    const choiceGroup = (name, legend, options, hint) => {
      const hintId = hint ? `enc-${name}-hint` : null;
      const errId = `enc-${name}-erro`;
      return el("fieldset", { class: "order-group", "data-group": name },
        el("legend", { class: "order-label", text: legend }),
        hint ? el("p", { class: "order-hint", id: hintId, text: hint }) : null,
        el("div", { class: "order-chips" },
          ...options.map((label) => {
            const id = `enc-${name}-${uid++}`;
            return el("span", { class: "order-chip" },
              el("input", { type: "radio", name, id, value: label, "aria-describedby": [hintId, errId].filter(Boolean).join(" ") }),
              el("label", { for: id, text: label }));
          })),
        el("p", { class: "order-error", id: errId, hidden: true, text: `Escolha uma opção de ${legend.toLowerCase()}.` }));
    };
    const textField = (name, label, control, hint) => {
      const hintId = hint ? `enc-${name}-hint` : null;
      control.id = `enc-${name}`;
      control.name = name;
      if (hintId) control.setAttribute("aria-describedby", hintId);
      return el("div", { class: "order-field" },
        el("label", { class: "order-label", for: control.id, html: `${label} <span class="order-optional">(opcional)</span>` }),
        hint ? el("p", { class: "order-hint", id: hintId, text: hint }) : null,
        control);
    };

    const submit = el("button", {
      type: "submit", class: "btn order-submit", disabled: !hasWhatsApp,
      html: `Conversar sobre minha encomenda ${ARROW}`,
    });
    const title = el("h3", { class: "order-title", id: "encomenda-title", tabindex: "-1", text: "Encomenda personalizada" });

    orderForm = el("form", { class: "order", id: "encomenda", novalidate: true, "aria-labelledby": "encomenda-title" },
      title,
      el("p", { class: "order-intro", text: "Descreva o terrário que você imagina. A conversa continua pelo WhatsApp." }),
      choiceGroup("modelo", "Modelo", ENC.modelos),
      choiceGroup("tamanho", "Tamanho desejado", ENC.tamanhos, "É uma preferência: medidas e opções são combinadas no atendimento."),
      choiceGroup("finalidade", "Finalidade", ENC.finalidades),
      el("div", { class: "order-row" },
        textField("ambiente", "Ambiente onde pretende colocar",
          el("input", { type: "text", class: "order-input", maxlength: "80", autocomplete: "off", placeholder: "Ex.: mesa do escritório" })),
        textField("data", "Data desejada",
          el("input", { type: "date", class: "order-input", min: todayISO() }),
          "Para presente ou ocasião especial.")),
      textField("observacoes", "Observações",
        el("textarea", { class: "order-input order-textarea", rows: "3", maxlength: "500" })),
      el("div", { class: "order-actions" },
        submit,
        hasWhatsApp ? null : el("p", { class: "wa-soon", text: WA.emBreve || "Contato disponível em breve." })),
      el("p", { class: "order-note", text: ENC.aviso }));

    const value = (name) => orderForm.elements[name]?.value?.trim() || "";
    const checked = (name) => orderForm.querySelector(`input[name="${name}"]:checked`)?.value || "";

    // Erro some assim que o grupo recebe uma resposta
    orderForm.addEventListener("change", (e) => {
      const group = e.target.closest("[data-group]");
      if (group && e.target.type === "radio") {
        group.classList.remove("is-invalid");
        group.querySelector(".order-error").hidden = true;
      }
    });

    orderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!hasWhatsApp) return;
      const required = ["modelo", "tamanho", "finalidade"];
      const missing = required.filter((n) => !checked(n));
      required.forEach((n) => {
        const group = orderForm.querySelector(`[data-group="${n}"]`);
        const bad = missing.includes(n);
        group.classList.toggle("is-invalid", bad);
        group.querySelector(".order-error").hidden = !bad;
      });
      if (missing.length) {
        orderForm.querySelector(`input[name="${missing[0]}"]`).focus();
        return;
      }
      const data = value("data");
      const lines = [
        ENC.abertura || "Olá! Gostaria de conversar sobre uma encomenda.",
        `Modelo: ${checked("modelo")}`,
        `Tamanho desejado: ${checked("tamanho")}`,
        `Finalidade: ${checked("finalidade")}`,
        value("ambiente") && `Ambiente: ${value("ambiente")}`,
        /^\d{4}-\d{2}-\d{2}$/.test(data) && `Data desejada: ${brDate(data)}`,
        value("observacoes") && `Observações: ${value("observacoes")}`,
      ].filter(Boolean);
      openWhatsApp(waLink(lines.join("\n")));
    });

    orderSlot.replaceChildren(orderForm);
  }

  /* Leva ao formulário já com o modelo (e o tamanho) escolhidos. */
  const prefillOrder = ({ modelo, espaco } = {}) => {
    if (!orderForm) return;
    const pick = (name, label) => {
      const input = label && orderForm.querySelector(`input[name="${name}"][value="${label}"]`);
      if (input) { input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); }
    };
    pick("modelo", ORDER_MODEL[modelo]);
    pick("tamanho", ORDER_SIZE[espaco]);
    orderForm.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    orderForm.querySelector("#encomenda-title").focus({ preventScroll: true });
  };

  const orderLink = (label, prefill, before) => orderForm
    ? el("button", {
        type: "button", class: "quiz-link", text: label,
        onclick: () => {
          before?.();
          // depois do fechamento da janela (que devolve a rolagem)
          requestAnimationFrame(() => prefillOrder(prefill));
        },
      })
    : null;

  /* =======================================================
     Atendimento — só os dados confirmados em TJ_CONFIG.atendimento.
     ======================================================= */
  const AT = CFG.atendimento || {};
  const infoList = document.querySelector("[data-atendimento]");
  if (infoList) {
    const items = [];
    const add = (label, ...content) => items.push(el("div", { class: "contact-info-item" }, el("dt", { text: label }), el("dd", {}, ...content)));
    const phone = waNumber.startsWith("55") ? waNumber.slice(2) : waNumber;
    const phoneText = phone.length >= 10 ? `(${phone.slice(0, 2)}) ${phone.slice(2, -4)}-${phone.slice(-4)}` : waNumber;

    if (AT.cidade) add("Cidade", AT.cidade);
    if (AT.regioes) add("Regiões atendidas", AT.regioes);
    if (AT.retirada) add("Retirada", AT.retirada);
    if (AT.entrega) add("Entrega", AT.entrega);
    if (AT.horarios) add("Horários", AT.horarios);
    if (AT.endereco?.texto) {
      const map = /^https:\/\//.test(AT.endereco.mapa || "")
        ? el("a", { href: AT.endereco.mapa, target: "_blank", rel: "noopener", class: "contact-info-link", text: "Como chegar" })
        : null;
      add("Endereço", AT.endereco.texto, map ? " · " : null, map);
    }
    if (hasWhatsApp) add("WhatsApp", el("a", { href: waLink(WA.mensagens?.geral || ""), target: "_blank", rel: "noopener", class: "contact-info-link", text: phoneText }));
    const ig = String(AT.instagram || "").replace(/^@/, "").trim();
    if (ig) add("Instagram", el("a", { href: `https://www.instagram.com/${encodeURIComponent(ig)}/`, target: "_blank", rel: "noopener", class: "contact-info-link", text: `@${ig}` }));

    if (items.length) infoList.replaceChildren(...items);
    else infoList.closest(".contact-info")?.setAttribute("hidden", "");
  }

  /* =======================================================
     Detalhes dos modelos (cards da coleção)
     ======================================================= */
  const modelDialog = document.getElementById("modelo-dialog");
  const modelBox = modelDialog?.querySelector("[data-modelo-content]");

  const fact = (label, value, fallback) =>
    el("div", { class: "modal-fact" },
      el("dt", { text: label }),
      el("dd", { class: value ? null : "is-pending", text: value || fallback }));

  const openModel = (key, opener) => {
    const m = CFG.modelos?.[key];
    if (!m || !modelDialog) return;
    const photos = [m.foto, ...(m.fotosExtras || [])];
    const main = el("img", { class: "modal-img", src: m.foto.src, alt: m.foto.alt, width: m.foto.width, height: m.foto.height, decoding: "async" });

    const thumbs = photos.length > 1
      ? el("div", { class: "modal-thumbs", role: "group", "aria-label": "Fotos do modelo" },
          ...photos.map((ph, i) => el("button", {
            type: "button", class: "modal-thumb", "aria-pressed": i === 0 ? "true" : "false",
            "aria-label": `Foto ${i + 1} de ${photos.length}`,
            onclick: (e) => {
              main.src = ph.src; main.alt = ph.alt;
              e.currentTarget.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
            },
          }, el("img", { loading: "lazy", src: ph.src, alt: "" }))))
      : null;

    const semDado = CFG.semDado || {};
    modelBox.replaceChildren(
      el("button", { type: "button", class: "modal-close", "aria-label": "Fechar", html: CLOSE, onclick: () => modelDialog.close() }),
      el("div", { class: "modal-grid" },
        el("div", { class: "modal-media" }, el("div", { class: "modal-photo" }, main), thumbs),
        el("div", { class: "modal-info" },
          el("p", { class: "eyebrow modal-eyebrow", text: "Coleção" }),
          el("h2", { class: "modal-title", id: "modelo-dialog-title", text: m.nome }),
          el("p", { class: "modal-desc", text: m.descricao }),
          el("dl", { class: "modal-facts" },
            fact("Dimensões", m.dimensoes, semDado.dimensoes),
            fact("Ambiente", m.ambiente, semDado.ambiente),
            fact("Cuidados", m.cuidados, semDado.cuidados)),
          el("div", { class: "modal-cta" },
            contactAction(fill(WA.mensagens?.modelo || "", { modelo: m.nome }), "Tenho interesse neste modelo"),
            orderLink("Descrever uma encomenda deste modelo", { modelo: key }, () => modelDialog.close())))));
    openDialog(modelDialog, opener);
  };

  // O clique vale para o card inteiro (sem cobrir o produto, que mantém o
  // giro no hover); o botão do título é o acesso por teclado.
  document.querySelectorAll(".card[data-modelo]").forEach((card) => {
    const button = card.querySelector(".card-open");
    card.addEventListener("click", () => openModel(card.dataset.modelo, button));
  });

  /* =======================================================
     Seletor "Qual terrário combina com você?"
     Regras e textos em TJ_CONFIG.seletor.
     ======================================================= */
  const quizBody = document.querySelector("[data-quiz]");
  const Q = CFG.seletor;
  if (quizBody && Q?.perguntas?.length) {
    const total = Q.perguntas.length;
    const answers = {};
    let step = 0;

    const option = (q, id) => q.opcoes.find((o) => o.valor === answers[id]);

    const recommend = () => {
      const rule = Q.regras.find((r) =>
        Object.entries(r.se).every(([qid, values]) => values.includes(answers[qid])));
      if (!rule) return null;
      const key = fill(rule.modelo, answers);
      return CFG.modelos[key] ? { key, model: CFG.modelos[key], rule } : null;
    };

    // Troca o conteúdo; se a altura mudar (ex.: resultado no celular),
    // ela é animada em vez de pular.
    const swap = (content, focusTarget) => {
      // Primeira renderização: sem medir nem animar (evita layout forçado no carregamento)
      if (!quizBody.dataset.ready) {
        quizBody.dataset.ready = "1";
        quizBody.replaceChildren(content);
        return;
      }
      const from = quizBody.getBoundingClientRect().height;
      quizBody.style.height = "";
      quizBody.classList.remove("is-in");
      quizBody.replaceChildren(content);
      const to = quizBody.getBoundingClientRect().height;
      if (!reduceMotion.matches && from && Math.abs(to - from) > 2) {
        quizBody.style.height = `${from}px`;
        void quizBody.offsetWidth;
        quizBody.classList.add("is-resizing");
        quizBody.style.height = `${to}px`;
        const done = (e) => {
          if (e && e.target !== quizBody) return;
          quizBody.classList.remove("is-resizing");
          quizBody.style.height = "";
          quizBody.removeEventListener("transitionend", done);
        };
        quizBody.addEventListener("transitionend", done);
        setTimeout(done, 600);
      }
      // força o estado inicial antes de animar a entrada
      void quizBody.offsetWidth;
      quizBody.classList.add("is-in");
      focusTarget?.focus({ preventScroll: true });
    };

    const renderStep = (moveFocus) => {
      const q = Q.perguntas[step];
      const name = `quiz-${q.id}`;
      const legendId = `quiz-q-${q.id}`;
      const next = el("button", {
        type: "button", class: "btn quiz-next", disabled: !answers[q.id],
        html: `${step === total - 1 ? "Ver sugestão" : "Avançar"} ${ARROW}`,
        onclick: () => {
          if (!answers[q.id]) return;
          if (step < total - 1) { step += 1; renderStep(true); } else renderResult();
        },
      });
      const options = q.opcoes.map((o) => {
        const input = el("input", {
          type: "radio", name, value: o.valor, class: "quiz-radio",
          checked: answers[q.id] === o.valor,
          onchange: () => { answers[q.id] = o.valor; next.disabled = false; },
        });
        return el("label", { class: "quiz-option" }, input,
          el("span", { class: "quiz-option-mark", "aria-hidden": "true" }),
          el("span", { class: "quiz-option-text", text: o.rotulo }));
      });
      const legend = el("legend", { class: "quiz-question", id: legendId, tabindex: "-1", text: q.titulo });
      swap(el("div", { class: "quiz-panel" },
        el("div", { class: "quiz-progress" },
          el("span", { class: "quiz-count", text: `${step + 1} de ${total}` }),
          el("span", { class: "quiz-bar", "aria-hidden": "true" },
            el("i", { style: `--p: ${((step + 1) / total).toFixed(3)}` }))),
        el("fieldset", { class: "quiz-step" }, legend, el("div", { class: "quiz-options" }, ...options)),
        el("div", { class: "quiz-nav" },
          el("button", {
            type: "button", class: "quiz-back", disabled: step === 0,
            html: `<svg class="arrow" viewBox="0 0 28 12" aria-hidden="true"><path d="M28 6H2M7 1 2 6l5 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg> Voltar`,
            onclick: () => { if (step > 0) { step -= 1; renderStep(true); } },
          }),
          next)), moveFocus ? legend : null);
    };

    const renderResult = () => {
      const rec = recommend();
      if (!rec) return;
      const amb = option(Q.perguntas[0], "ambiente");
      const esp = option(Q.perguntas[1], "espaco");
      const why = `Você imagina o terrário ${amb?.noTexto || ""}, com ${esp?.noTexto || ""}. ${rec.rule.criterio}`;
      const message = fill(WA.mensagens?.seletor || "", {
        modelo: rec.model.nome.toLowerCase(),
        ambiente: amb?.naMensagem || "",
        espaco: esp?.naMensagem || "",
      });
      const title = el("h3", { class: "quiz-result-title", tabindex: "-1", text: rec.model.nome });
      swap(el("div", { class: "quiz-result" },
        el("figure", { class: "quiz-result-media" },
          el("img", { src: rec.model.foto.src, alt: rec.model.foto.alt, width: rec.model.foto.width, height: rec.model.foto.height, decoding: "async" })),
        el("div", { class: "quiz-result-info" },
          el("p", { class: "eyebrow quiz-result-eyebrow", text: "Nossa sugestão" }),
          title,
          el("p", { class: "quiz-result-why", text: why }),
          el("p", { class: "quiz-result-note", text: Q.aviso }),
          el("div", { class: "quiz-result-actions" },
            contactAction(message, "Conversar sobre esse modelo"),
            el("button", { type: "button", class: "quiz-link", text: "Ver detalhes do modelo", onclick: (e) => openModel(rec.key, e.currentTarget) }),
            orderLink("Personalizar minha encomenda", { modelo: rec.key, espaco: answers.espaco }),
            el("button", {
              type: "button", class: "quiz-link", text: "Refazer",
              onclick: () => { Object.keys(answers).forEach((k) => delete answers[k]); step = 0; renderStep(true); },
            })))), title);
      quizBody.dataset.result = rec.key;
    };

    renderStep(false);
  }

  /* =======================================================
     Galeria — só trabalhos reais (TJ_CONFIG.galeria).
     Lista vazia: a seção continua oculta.
     ======================================================= */
  const photos = (CFG.galeria || []).filter((ph) => ph && ph.src && ph.trabalhoReal === true);
  const gallerySection = document.getElementById("trabalhos");
  const galleryGrid = document.querySelector("[data-gallery]");
  const lightbox = document.getElementById("galeria-dialog");
  const lightboxBox = lightbox?.querySelector("[data-lightbox-content]");
  if (photos.length && gallerySection && galleryGrid && lightbox) {
    let index = 0;
    const img = el("img", { class: "lightbox-img", alt: "" });
    const caption = el("p", { class: "lightbox-caption" });
    const counter = el("p", { class: "lightbox-count", "aria-live": "polite" });
    const show = (i) => {
      index = (i + photos.length) % photos.length;
      const ph = photos[index];
      img.src = ph.src; img.alt = ph.alt || "";
      if (ph.width && ph.height) { img.width = ph.width; img.height = ph.height; }
      caption.textContent = ph.legenda || "";
      caption.hidden = !ph.legenda;
      counter.textContent = `${index + 1} de ${photos.length}`;
    };
    const nav = photos.length > 1;
    lightboxBox.replaceChildren(
      el("button", { type: "button", class: "modal-close lightbox-close", "aria-label": "Fechar", html: CLOSE, onclick: () => lightbox.close() }),
      el("figure", { class: "lightbox-figure" }, img, caption),
      el("div", { class: "lightbox-bar" },
        nav ? el("button", { type: "button", class: "lightbox-nav", "aria-label": "Foto anterior", text: "‹", onclick: () => show(index - 1) }) : null,
        counter,
        nav ? el("button", { type: "button", class: "lightbox-nav", "aria-label": "Próxima foto", text: "›", onclick: () => show(index + 1) }) : null));
    lightbox.addEventListener("keydown", (e) => {
      if (!nav) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
    });

    photos.forEach((ph, i) => {
      const button = el("button", { type: "button", class: "gallery-item", "aria-label": `Ampliar foto ${i + 1}${ph.legenda ? `: ${ph.legenda}` : ""}`, onclick: (e) => { show(i); openDialog(lightbox, e.currentTarget); } },
        el("img", { loading: "lazy", src: ph.src, alt: ph.alt || "", decoding: "async", width: ph.width || null, height: ph.height || null }));
      galleryGrid.append(el("li", {}, el("figure", { class: "gallery-figure" }, button,
        ph.legenda ? el("figcaption", { class: "gallery-caption", text: ph.legenda }) : null)));
    });
    gallerySection.hidden = false;
  }

  /* =======================================================
     Depoimentos — só aprovados, texto preservado, sem estrelas.
     Nome e foto apenas com autorização registrada na configuração.
     ======================================================= */
  const reviews = (CFG.depoimentos || []).filter((d) => d && d.status === "aprovado" && String(d.texto || "").trim());
  const reviewsSection = document.getElementById("depoimentos");
  const reviewsList = document.querySelector("[data-depoimentos]");
  if (reviews.length && reviewsSection && reviewsList) {
    reviews.forEach((d) => {
      const name = d.nomeAutorizado === true && d.nome ? d.nome : "Cliente";
      const photo = d.fotoAutorizada === true && d.foto
        ? el("img", { loading: "lazy", class: "review-photo", src: d.foto, alt: "", width: "56", height: "56", decoding: "async" })
        : null;
      reviewsList.append(el("li", { class: "review" },
        el("figure", { class: "review-figure" },
          el("blockquote", { class: "review-text" }, el("p", { text: d.texto })),
          el("figcaption", { class: "review-author" }, photo, el("span", { text: name })))));
    });
    reviewsSection.hidden = false;
  }

  /* =======================================================
     Perguntas frequentes — só itens aprovados.
     Acordeão: botões reais, aria-expanded, setas/Home/End.
     ======================================================= */
  const faqItems = (CFG.faq || []).filter((f) => f.status === "aprovado" && f.resposta);
  const faqSection = document.getElementById("perguntas");
  const faqList = document.querySelector("[data-faq]");
  if (faqItems.length && faqSection && faqList) {
    const buttons = faqItems.map((f, i) => {
      const panelId = `faq-a-${i}`;
      const buttonId = `faq-q-${i}`;
      const panel = el("div", { class: "faq-a", id: panelId, role: "region", "aria-labelledby": buttonId },
        el("div", { class: "faq-a-inner" }, el("p", { text: f.resposta })));
      panel.inert = true;
      const button = el("button", {
        type: "button", class: "faq-q", id: buttonId, "aria-expanded": "false", "aria-controls": panelId,
        onclick: () => {
          const open = button.getAttribute("aria-expanded") !== "true";
          button.setAttribute("aria-expanded", String(open));
          panel.classList.toggle("is-open", open);
          panel.inert = !open;
        },
      }, el("span", { text: f.pergunta }), el("span", { class: "faq-icon", "aria-hidden": "true" }));
      faqList.append(el("div", { class: "faq-item" }, el("h3", { class: "faq-h" }, button), panel));
      return button;
    });
    faqList.addEventListener("keydown", (e) => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      buttons[(to + buttons.length) % buttons.length].focus();
    });
    faqSection.hidden = false;
  }
})();
