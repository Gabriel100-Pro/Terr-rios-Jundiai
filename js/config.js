/* =========================================================
   Terrários Jundiaí — CONFIGURAÇÃO DO SITE
   Tudo o que muda com frequência fica aqui: contato, modelos,
   seletor, galeria e perguntas frequentes. js/recursos.js só lê.
   ========================================================= */
window.TJ_CONFIG = {

  /* ---------- Endereço do site e prévia de compartilhamento ----------
     dominio: endereço definitivo, com https e sem barra final
              (ex.: "https://www.seudominio.com.br"). Nunca localhost.
     PENDENTE: domínio ainda não definido. Enquanto estiver vazio, as páginas
     não publicam og:url, canonical nem og:image (que exigem URL absoluta).
     Depois de preencher, rode:  node ferramentas/aplicar-metadados.mjs
     O script regrava o bloco de metadados das duas páginas a partir daqui. */
  site: {
    dominio: "",
    nome: "Terrários Jundiaí",
    imagem: { caminho: "assets/compartilhamento/capa.jpg", width: 1200, height: 630, tipo: "image/jpeg", alt: "Terrário de vidro com samambaias, fitônias e musgo sobre uma pedra, diante de uma parede verde" },
    paginas: {
      "index.html": {
        caminho: "/",
        titulo: "Terrários Jundiaí | Natureza em miniatura",
        descricao: "Conheça nossos terrários e encontre um pequeno universo de natureza para o seu espaço.",
      },
      "nossa-natureza/index.html": {
        caminho: "/nossa-natureza/",
        titulo: "Nossa Natureza | Terrários Jundiaí",
        descricao: "Conheça nossos terrários e encontre um pequeno universo de natureza para o seu espaço.",
      },
    },
  },

  /* ---------- Atendimento (área compacta no contato) ----------
     Preencha SOMENTE com dados confirmados pelo cliente. Campo vazio ("" ou
     null) não aparece no site — nada de texto provisório.
     cidade: confirmada pelo nome da marca (Jundiaí–SP).
     PENDENTE: regiões, retirada, entrega, horários, Instagram e endereço.
     endereco: só um ponto público de atendimento (nunca endereço residencial
     ou aproximado). Com texto E mapa preenchidos, aparece "Como chegar". */
  atendimento: {
    cidade: "Jundiaí–SP",
    regioes: "",        // ex.: "Jundiaí e cidades vizinhas" — só se confirmado
    retirada: "",       // ex.: "Retirada combinada no atendimento"
    entrega: "",        // condições de entrega confirmadas
    horarios: "",       // ex.: "Segunda a sábado, das 9h às 18h"
    instagram: "",      // só o usuário, sem @ (ex.: "terrariosjundiai")
    endereco: { texto: "", mapa: "" },
  },

  /* ---------- Encomenda personalizada (formulário no contato) ----------
     Os tamanhos são preferências de conversa, não medidas nem estoque. */
  encomenda: {
    modelos: ["Vertical", "Aberto", "Fechado", "Mini terrários", "Preciso de orientação"],
    tamanhos: ["Pequeno", "Médio", "Peça de destaque", "Quero orientação"],
    finalidades: ["Para mim", "Presente", "Decoração de ambiente"],
    abertura: "Olá! Gostaria de conversar sobre uma encomenda.",
    aviso: "Disponibilidade, prazo e valor serão confirmados no atendimento.",
  },

  /* ---------- WhatsApp ----------
     numero: só dígitos, com país e DDD (ex.: "5511912345678").
     PENDENTE: nenhum número confirmado no projeto. Enquanto estiver vazio,
     o site não gera links: os botões mostram "Contato disponível em breve"
     e o botão flutuante não aparece.
     Nas mensagens, {modelo}, {ambiente} e {espaco} são substituídos. */
  whatsapp: {
    numero: "",
    mensagens: {
      geral: "Olá! Conheci o site da Terrários Jundiaí e gostaria de saber mais.",
      modelo: "Olá! Gostaria de saber mais sobre o modelo: {modelo}.",
      seletor: "Olá! Fiz o seletor do site e recebi a sugestão de {modelo}. Quero colocar {ambiente} e tenho {espaco}. Pode me ajudar a escolher?",
    },
    emBreve: "Contato por WhatsApp disponível em breve.",
  },

  /* ---------- Modelos da coleção ----------
     descricao: o que se vê na foto (não descreve cuidados nem medidas).
     dimensoes / ambiente / cuidados: preencha SOMENTE com dados confirmados;
     enquanto forem null, a janela mostra o texto de "semDado".
     fotosExtras: outras fotos do MESMO modelo, [{ src, alt }]. */
  modelos: {
    vertical: {
      nome: "Terrário vertical",
      foto: { src: "assets/web/terrario-vertical-800.webp", alt: "Terrário vertical em cilindro de vidro com musgos, samambaias e tronco", width: 800, height: 1200 },
      fotosExtras: [],
      descricao: "Cilindro de vidro alto, com musgos, samambaias e um tronco compondo a paisagem em camadas.",
      dimensoes: null,
      ambiente: null,
      cuidados: null,
    },
    aberto: {
      nome: "Terrário aberto",
      foto: { src: "assets/web/terrario-aberto-800.webp", alt: "Terrário aberto em aquário baixo de vidro com suculentas e tronco", width: 800, height: 533 },
      fotosExtras: [],
      descricao: "Aquário baixo de vidro, sem tampa, com suculentas, pedras e tronco à vista.",
      dimensoes: null,
      ambiente: null,
      cuidados: null,
    },
    fechado: {
      nome: "Terrário fechado",
      foto: { src: "assets/web/terrario-fechado-800.webp", alt: "Terrário fechado em pote de vidro com tampa de cortiça", width: 800, height: 960 },
      fotosExtras: [],
      descricao: "Pote de vidro com tampa de cortiça, com samambaia, musgo e pedras em um pequeno ecossistema.",
      dimensoes: null,
      ambiente: null,
      cuidados: null,
    },
    mini: {
      nome: "Mini terrários",
      foto: { src: "assets/web/mini-terrarios-800.webp", alt: "Conjunto de três mini terrários de vidro: bola, gota e geométrico", width: 800, height: 533 },
      fotosExtras: [],
      descricao: "Pequenas composições em vidro nos formatos bola, gota e geométrico com estrutura metálica.",
      dimensoes: null,
      ambiente: null,
      cuidados: null,
    },
  },
  semDado: {
    dimensoes: "Consulte as dimensões disponíveis no atendimento.",
    ambiente: "A indicação depende da iluminação do local — confirmamos com você no atendimento.",
    cuidados: "As orientações de cuidado são passadas no atendimento, de acordo com a peça.",
  },

  /* ---------- Seletor "Qual terrário combina com você?" ----------
     naMensagem: como a resposta entra na mensagem do WhatsApp.
     noTexto: como a resposta entra na justificativa do resultado. */
  seletor: {
    perguntas: [
      {
        id: "ambiente",
        titulo: "Onde você imagina seu terrário?",
        opcoes: [
          { valor: "sala", rotulo: "Sala de estar", naMensagem: "na sala de estar", noTexto: "na sala de estar" },
          { valor: "trabalho", rotulo: "Espaço de trabalho", naMensagem: "no meu espaço de trabalho", noTexto: "no espaço de trabalho" },
          { valor: "leitura", rotulo: "Cantinho de leitura", naMensagem: "no meu cantinho de leitura", noTexto: "no cantinho de leitura" },
          { valor: "indeciso", rotulo: "Ainda não decidi", naMensagem: "em um lugar que ainda não decidi", noTexto: "em um lugar ainda a definir" },
        ],
      },
      {
        id: "espaco",
        titulo: "Quanto espaço você tem disponível?",
        opcoes: [
          { valor: "pouco", rotulo: "Pouco espaço", naMensagem: "pouco espaço", noTexto: "pouco espaço" },
          { valor: "medio", rotulo: "Espaço médio", naMensagem: "um espaço médio", noTexto: "um espaço médio" },
          { valor: "destaque", rotulo: "Quero uma peça de destaque", naMensagem: "espaço para uma peça de destaque", noTexto: "espaço para uma peça de destaque" },
        ],
      },
      {
        id: "estilo",
        titulo: "Qual estilo mais combina com você?",
        opcoes: [
          { valor: "vertical", rotulo: "Vertical" },
          { valor: "aberto", rotulo: "Aberto" },
          { valor: "fechado", rotulo: "Fechado" },
          { valor: "mini", rotulo: "Mini terrários" },
          { valor: "sugestao", rotulo: "Quero uma sugestão" },
        ],
      },
    ],

    /* Regras: a PRIMEIRA que combinar com as respostas vale.
       "se": pergunta -> valores aceitos. "modelo": chave de "modelos"
       ("{estilo}" = o estilo escolhido). "criterio": o porquê, em uma frase. */
    regras: [
      {
        se: { estilo: ["vertical", "aberto", "fechado", "mini"] },
        modelo: "{estilo}",
        criterio: "Você escolheu esse estilo, então ele vem em primeiro lugar.",
      },
      {
        se: { estilo: ["sugestao"], espaco: ["pouco"] },
        modelo: "mini",
        criterio: "Para pouco espaço, sugerimos as peças menores da coleção: os mini terrários.",
      },
      {
        se: { estilo: ["sugestao"], espaco: ["medio"] },
        modelo: "fechado",
        criterio: "Para um espaço médio, sugerimos uma peça individual: o terrário fechado, em pote com tampa.",
      },
      {
        se: { estilo: ["sugestao"], espaco: ["destaque"] },
        modelo: "vertical",
        criterio: "Para uma peça de destaque, sugerimos o terrário vertical, que chama atenção pela altura do vidro.",
      },
    ],
    aviso: "É uma sugestão de estilo e tamanho, não uma garantia de adequação das plantas ao ambiente. A escolha final depende de detalhes como a iluminação do local, que confirmamos no atendimento.",
  },

  /* ---------- Galeria "Pequenos mundos que já criamos" ----------
     SOMENTE fotos de trabalhos reais do Pedro (ou fornecidas pelo cliente
     para esse fim). As imagens de conceito do site NÃO entram aqui.
     Item: { src, alt, width, height, legenda, trabalhoReal: true }.
     Sem trabalhoReal: true o item NÃO aparece (proteção contra imagens de
     conceito/IA). legenda só com informação confirmada (ou "").
     Com a lista vazia, a seção fica oculta.
     PENDENTE: nenhuma foto real no projeto. */
  galeria: [],

  /* ---------- Depoimentos ----------
     Só depoimentos reais, com o texto exatamente como aprovado.
     Item: { texto, nome, nomeAutorizado, foto, fotoAutorizada, status }
       status "aprovado" = publicado; qualquer outro valor fica oculto.
       nome só aparece com nomeAutorizado: true (senão: "Cliente").
       foto (caminho da imagem) só aparece com fotoAutorizada: true.
     Sem estrelas nem notas. Sem itens aprovados, a seção fica oculta.
     PENDENTE: nenhum depoimento fornecido. */
  depoimentos: [],

  /* ---------- Perguntas frequentes ----------
     status "aprovado" = publicado; qualquer outro valor fica oculto.
     Com nenhum item aprovado, a seção inteira fica oculta.
     PENDENTE: respostas a confirmar com o cliente. */
  faq: [
    { pergunta: "Como escolher meu terrário?", resposta: "", status: "pendente" },
    { pergunta: "Precisa regar?", resposta: "", status: "pendente" },
    { pergunta: "Pode ficar no sol?", resposta: "", status: "pendente" },
    { pergunta: "Como funciona a entrega?", resposta: "", status: "pendente" },
    { pergunta: "Posso encomendar um modelo personalizado?", resposta: "", status: "pendente" },
  ],
};
