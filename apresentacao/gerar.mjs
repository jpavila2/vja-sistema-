// Apresentação: Sistema VJA Reciclagem
// Paleta: teal (#0D9488) + dourado (#C49A00) + navy (#0C2436) + branco/cinza claro
// Motif: retângulo lateral teal em slides de conteúdo + ícones em círculos

import PptxGenJS from "pptxgenjs";

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"

// ── Paleta ─────────────────────────────────────────────────────────────────
const C = {
  teal:       "0D9488",
  tealDark:   "0F766E",
  tealLight:  "CCFBF1",
  gold:       "C49A00",
  goldLight:  "FEF9C3",
  navy:       "0C2436",
  white:      "FFFFFF",
  offWhite:   "F8FAFC",
  slate:      "64748B",
  slateLight: "E2E8F0",
  green:      "16A34A",
  red:        "DC2626",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function addDarkSlide(slide) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.navy } });
}

function addLightSlide(slide) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.offWhite } });
  // barra lateral teal (motif)
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: "100%", fill: { color: C.teal } });
}

function sectionTag(slide, text) {
  slide.addShape(pptx.ShapeType.rect, { x: 0.35, y: 0.28, w: 2.4, h: 0.32, fill: { color: C.teal }, line: { color: C.teal } });
  slide.addText(text.toUpperCase(), {
    x: 0.35, y: 0.28, w: 2.4, h: 0.32,
    fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle",
    fontFace: "Calibri",
  });
}

function slideTitle(slide, text, x = 0.35, y = 0.72, w = 12.6, color = C.navy) {
  slide.addText(text, {
    x, y, w, h: 0.72,
    fontSize: 32, bold: true, color, fontFace: "Calibri",
    align: "left", valign: "top",
  });
}

function iconCircle(slide, emoji, x, y, size = 0.55, bg = C.teal) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: size, h: size, fill: { color: bg } });
  slide.addText(emoji, { x, y: y - 0.02, w: size, h: size, fontSize: 20, align: "center", valign: "middle" });
}

function card(slide, x, y, w, h, bg = C.white) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: bg },
    line: { color: C.slateLight, pt: 1 },
    shadow: { type: "outer", color: "00000018", blur: 6, offset: 2, angle: 270 },
  });
}

// ── SLIDE 1 — Capa ───────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkSlide(s);

  // Barra teal esquerda larga
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 4.8, h: "100%", fill: { color: C.teal } });

  // Emoji leão + nome
  s.addText("♻️", { x: 0.5, y: 1.2, w: 3.8, h: 1.0, fontSize: 64, align: "center" });
  s.addText("VJA", { x: 0.5, y: 2.3, w: 3.8, h: 0.8, fontSize: 44, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });
  s.addText("Reciclagem", { x: 0.5, y: 3.0, w: 3.8, h: 0.7, fontSize: 28, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

  // Título direita
  s.addText("Sistema de Gestão", {
    x: 5.3, y: 1.6, w: 7.5, h: 1.0,
    fontSize: 38, bold: true, color: C.white, fontFace: "Calibri", align: "left",
  });
  s.addText("Controle de compras, estoque e\ncaixa — tudo num só lugar.", {
    x: 5.3, y: 2.7, w: 7.5, h: 1.0,
    fontSize: 18, color: C.tealLight, fontFace: "Calibri", align: "left",
  });
  s.addText("Desenvolvido por João Pedro · Itaguaí/RJ · 2026", {
    x: 5.3, y: 6.6, w: 7.5, h: 0.4,
    fontSize: 11, color: "8EAFC4", fontFace: "Calibri", align: "left",
  });
}

// ── SLIDE 2 — Como funciona hoje ─────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "O problema");
  slideTitle(s, "Como funciona hoje?");

  // Fluxo em 3 passos (setas visuais)
  const steps = [
    { emoji: "⚖️", title: "Balança", desc: "Catador chega. Atendente anota peso, material e valor no papel.", x: 0.55 },
    { emoji: "📋", title: "Papel", desc: "Planilha manual, difícil de calcular, fácil de errar.", x: 4.45 },
    { emoji: "💻", title: "Custom System", desc: "2ª atendente redigita tudo no programa pago, um por um.", x: 8.35 },
  ];

  steps.forEach(({ emoji, title, desc, x }) => {
    card(s, x, 1.8, 3.7, 2.8, C.white);
    iconCircle(s, emoji, x + 1.5, 2.0, 0.7, C.red);
    s.addText(title, { x, y: 2.82, w: 3.7, h: 0.4, fontSize: 17, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    s.addText(desc, { x: x + 0.2, y: 3.28, w: 3.3, h: 1.1, fontSize: 13, color: C.slate, align: "center", fontFace: "Calibri" });
  });

  // Setas entre cards
  [{ x: 4.3, y: 3.1 }, { x: 8.2, y: 3.1 }].forEach(({ x, y }) => {
    s.addShape(pptx.ShapeType.rightArrow, { x, y, w: 0.5, h: 0.35, fill: { color: C.red }, line: { color: C.red } });
  });

  // Problema box
  s.addShape(pptx.ShapeType.rect, { x: 0.55, y: 5.0, w: 12.23, h: 0.75, fill: { color: "FEE2E2" }, line: { color: C.red, pt: 1 } });
  s.addText("⚠️  Resultado: retrabalho, erros de soma, perda de histórico e zero controle de estoque ou caixa físico.", {
    x: 0.75, y: 5.05, w: 12.0, h: 0.65,
    fontSize: 13, color: C.red, fontFace: "Calibri", bold: true,
  });
}

// ── SLIDE 3 — A solução ───────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkSlide(s);

  // Barra teal topo
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: C.teal } });
  s.addText("A SOLUÇÃO", { x: 0.5, y: 0.05, w: 12.3, h: 1.0, fontSize: 11, bold: true, color: C.white, fontFace: "Calibri" });
  s.addText("Um sistema feito pra VJA", { x: 0.5, y: 1.3, w: 12.3, h: 0.8, fontSize: 36, bold: true, color: C.white, fontFace: "Calibri" });

  s.addText("Criado do zero para substituir o papel e o Custom System,\nrespeitando exatamente como a operação funciona aqui.", {
    x: 0.5, y: 2.2, w: 8.0, h: 1.0,
    fontSize: 18, color: C.tealLight, fontFace: "Calibri",
  });

  // 4 pillars
  const pillars = [
    { emoji: "⚖️", label: "Balança touch" },
    { emoji: "📦", label: "Estoque em tempo real" },
    { emoji: "✅", label: "Conferência" },
    { emoji: "💵", label: "Caixa físico" },
  ];
  pillars.forEach(({ emoji, label }, i) => {
    const x = 0.5 + i * 3.2;
    s.addShape(pptx.ShapeType.rect, { x, y: 3.5, w: 2.9, h: 1.6, fill: { color: C.tealDark }, line: { color: C.teal } });
    s.addText(emoji, { x, y: 3.6, w: 2.9, h: 0.7, fontSize: 28, align: "center" });
    s.addText(label, { x, y: 4.35, w: 2.9, h: 0.6, fontSize: 14, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
  });

  s.addText("Acesso via qualquer navegador · Online · Sem instalar nada", {
    x: 0.5, y: 6.6, w: 12.3, h: 0.45,
    fontSize: 12, color: C.tealLight, fontFace: "Calibri", align: "center",
  });
}

// ── SLIDE 4 — Tela da Balança ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "Módulo 1");
  slideTitle(s, "Tela da Balança");

  // Col esquerda: como funciona
  s.addText("Como funciona", { x: 0.35, y: 1.6, w: 5.5, h: 0.4, fontSize: 15, bold: true, color: C.teal, fontFace: "Calibri" });

  const steps = [
    ["1", "Escolhe o catador", "Digita o nome, o sistema sugere. Ou cadastra rápido ali mesmo."],
    ["2", "Toca no material", "Botões grandes com nome, emoji e preço. Feito pra tablet."],
    ["3", "Digita o peso", "Teclado na tela, sem teclado físico. Aplica % de impureza."],
    ["4", "Finaliza", "Valor calculado automaticamente. Toca em PAGAR."],
  ];

  steps.forEach(([num, title, desc], i) => {
    const y = 2.1 + i * 1.12;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.35, y, w: 0.45, h: 0.45, fill: { color: C.teal } });
    s.addText(num, { x: 0.35, y, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle" });
    s.addText(title, { x: 0.92, y, w: 4.8, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(desc, { x: 0.92, y: y + 0.3, w: 4.8, h: 0.4, fontSize: 12, color: C.slate, fontFace: "Calibri" });
  });

  // Col direita: mockup visual da tela
  card(s, 6.2, 1.5, 6.5, 5.35, C.white);
  s.addShape(pptx.ShapeType.rect, { x: 6.2, y: 1.5, w: 6.5, h: 0.55, fill: { color: C.navy } });
  s.addText("VJA Reciclagem  |  Compra — Balança", { x: 6.3, y: 1.54, w: 6.3, h: 0.47, fontSize: 11, color: C.white, fontFace: "Calibri", bold: true });

  // Catador
  s.addText("Catador:  Seu Zé  ✓  Pagando para: Seu Zé", { x: 6.4, y: 2.2, w: 6.1, h: 0.38, fontSize: 12, color: C.tealDark, fontFace: "Calibri", bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 6.4, y: 2.58, w: 6.1, h: 0.04, fill: { color: C.slateLight } });

  // Materiais
  s.addText("1) Toque no material", { x: 6.4, y: 2.72, w: 6.1, h: 0.32, fontSize: 11, color: C.slate, fontFace: "Calibri" });

  const mats = [
    ["🪙\nAlumínio\nR$5,50/kg", "🟧\nCobre\nR$32,00/kg"],
    ["🔩\nFerro\nR$0,90/kg", "📦\nPapelão\nR$0,80/kg"],
  ];
  mats.forEach((row, ri) => {
    row.forEach((mat, ci) => {
      const bx = 6.4 + ci * 3.05, by = 3.1 + ri * 1.12;
      s.addShape(pptx.ShapeType.rect, { x: bx, y: by, w: 2.9, h: 1.0, fill: { color: C.offWhite }, line: { color: C.slateLight } });
      s.addText(mat, { x: bx, y: by, w: 2.9, h: 1.0, fontSize: 12, align: "center", valign: "middle", fontFace: "Calibri", color: C.navy });
    });
  });

  // Botão pagar
  s.addShape(pptx.ShapeType.rect, { x: 6.4, y: 5.45, w: 6.1, h: 0.65, fill: { color: C.green }, line: { color: C.green } });
  s.addText("💵  FINALIZAR E PAGAR", { x: 6.4, y: 5.45, w: 6.1, h: 0.65, fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri" });
}

// ── SLIDE 5 — Conferência & Estoque ──────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "Módulos 2 e 3");
  slideTitle(s, "Conferência e Estoque");

  // Conferência
  card(s, 0.35, 1.7, 5.9, 5.1, C.white);
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.7, w: 5.9, h: 0.5, fill: { color: C.teal } });
  s.addText("Conferência do dia", { x: 0.45, y: 1.74, w: 5.7, h: 0.42, fontSize: 14, bold: true, color: C.white, fontFace: "Calibri" });

  const confItems = [
    ["✅", "Revisão completa", "A atendente vê todas as compras do dia e confirma."],
    ["💳", "Dinheiro ou PIX", "Marca a forma de pagamento real na conferência."],
    ["❌", "Cancelamento", "Cancela com um clique. Estoque é estornado automaticamente."],
  ];
  confItems.forEach(([emoji, title, desc], i) => {
    const y = 2.45 + i * 1.3;
    iconCircle(s, emoji, 0.55, y, 0.5, i === 1 ? C.gold : C.teal);
    s.addText(title, { x: 1.2, y: y, w: 4.8, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(desc, { x: 1.2, y: y + 0.32, w: 4.8, h: 0.55, fontSize: 12, color: C.slate, fontFace: "Calibri" });
  });

  // Estoque
  card(s, 6.6, 1.7, 5.9, 5.1, C.white);
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.7, w: 5.9, h: 0.5, fill: { color: C.gold } });
  s.addText("Estoque em tempo real", { x: 6.7, y: 1.74, w: 5.7, h: 0.42, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri" });

  const estItems = [
    ["📊", "Atualiza sozinho", "Cada compra confirmada entra no estoque automaticamente."],
    ["💰", "Preço congelado", "O preço do dia da compra fica registrado, mesmo se mudar depois."],
    ["📋", "Histórico completo", "Todo movimento registrado — nunca se perde uma entrada."],
  ];
  estItems.forEach(([emoji, title, desc], i) => {
    const y = 2.45 + i * 1.3;
    iconCircle(s, emoji, 6.8, y, 0.5, C.gold);
    s.addText(title, { x: 7.45, y: y, w: 4.8, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(desc, { x: 7.45, y: y + 0.32, w: 4.8, h: 0.55, fontSize: 12, color: C.slate, fontFace: "Calibri" });
  });
}

// ── SLIDE 6 — Caixa do Dia ───────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "Módulo 4");
  slideTitle(s, "Caixa do Dia — Controle de Dinheiro");

  // Fórmula visual — aumentado espaçamento para evitar sobreposição do sinal "="
  s.addText("Fórmula do caixa físico:", { x: 0.35, y: 1.65, w: 12.5, h: 0.35, fontSize: 13, color: C.slate, fontFace: "Calibri" });

  const formulaBlocks = [
    { label: "Saldo anterior\n(contado ontem)", color: C.navy },
    { label: "Saques do\nbanco (+)", color: C.green },
    { label: "Compras em\ndinheiro (−)", color: C.red },
    { label: "Despesas\ndo dia (−)", color: C.red },
    { label: "Saldo\ncalculado", color: C.teal },
  ];
  const signs = ["", "+", "−", "−", "="];
  const blockW = 2.15;
  const signW = 0.38;
  const totalW = formulaBlocks.length * blockW + (formulaBlocks.length - 1) * signW;
  const startX = (13.33 - totalW) / 2;

  formulaBlocks.forEach(({ label, color }, i) => {
    const bx = startX + i * (blockW + signW);
    if (i > 0) {
      s.addText(signs[i], { x: bx - signW, y: 2.05, w: signW, h: 0.9, fontSize: 24, bold: true, color: C.slate, align: "center", valign: "middle" });
    }
    s.addShape(pptx.ShapeType.rect, { x: bx, y: 2.05, w: blockW, h: 0.9, fill: { color }, line: { color } });
    s.addText(label, { x: bx, y: 2.05, w: blockW, h: 0.9, fontSize: 11.5, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri" });
  });

  // 2 colunas de detalhe
  const left = [
    ["💵", "Compras em dinheiro", "Lançadas automaticamente. Ninguém precisa digitar."],
    ["💳", "Compras PIX", "Aparecem separado — não saem da gaveta."],
    ["🏦", "Saque no banco", "Registrado manualmente (3×/semana)."],
  ];
  const right = [
    ["🧾", "Despesas", "Combustível, segurança, alimentação etc — campo livre."],
    ["🔒", "Fechamento", "Conta o dinheiro físico. Sistema registra sobra ou falta."],
    ["📅", "Histórico", "Cada dia fica registrado. Dá pra ver qualquer dia passado."],
  ];

  left.forEach(([emoji, title, desc], i) => {
    const y = 3.25 + i * 1.25;
    iconCircle(s, emoji, 0.35, y, 0.5, C.teal);
    s.addText(title, { x: 1.0, y, w: 5.5, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(desc, { x: 1.0, y: y + 0.32, w: 5.5, h: 0.55, fontSize: 12, color: C.slate, fontFace: "Calibri" });
  });

  right.forEach(([emoji, title, desc], i) => {
    const y = 3.25 + i * 1.25;
    iconCircle(s, emoji, 6.6, y, 0.5, C.gold);
    s.addText(title, { x: 7.25, y, w: 5.5, h: 0.3, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(desc, { x: 7.25, y: y + 0.32, w: 5.5, h: 0.55, fontSize: 12, color: C.slate, fontFace: "Calibri" });
  });
}

// ── SLIDE 7 — Antes vs. Depois ───────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "Comparativo");
  slideTitle(s, "Antes × Depois");

  // ANTES
  card(s, 0.35, 1.7, 5.9, 5.0, "FFF1F2");
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.7, w: 5.9, h: 0.5, fill: { color: C.red } });
  s.addText("❌  Antes — Papel + Custom System", { x: 0.45, y: 1.74, w: 5.7, h: 0.42, fontSize: 13, bold: true, color: C.white, fontFace: "Calibri" });

  const antes = [
    "Papel na balança → erro de leitura",
    "Retrabalho: anotar, depois redigitar",
    "Sem controle de estoque em tempo real",
    "Caixa físico calculado no Excel (ou na memória)",
    "Histórico de catadores inexistente",
    "Programa pago, sem customização",
    "Cancelar = risco de inconsistência",
  ];
  antes.forEach((txt, i) => {
    s.addText("✗  " + txt, { x: 0.55, y: 2.42 + i * 0.56, w: 5.5, h: 0.5, fontSize: 12.5, color: C.red, fontFace: "Calibri" });
  });

  // DEPOIS
  card(s, 6.6, 1.7, 5.9, 5.0, "F0FDF4");
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.7, w: 5.9, h: 0.5, fill: { color: C.green } });
  s.addText("✅  Depois — VJA Reciclagem", { x: 6.7, y: 1.74, w: 5.7, h: 0.42, fontSize: 13, bold: true, color: C.white, fontFace: "Calibri" });

  const depois = [
    "Balança touch → lança na hora, sem papel",
    "Registro único: balança já é o sistema",
    "Estoque atualiza automaticamente",
    "Caixa calculado pelo sistema, com sobra/falta",
    "Histórico completo de cada catador",
    "Sistema próprio, sem mensalidade",
    "Cancelamento reverte o estoque automaticamente",
  ];
  depois.forEach((txt, i) => {
    s.addText("✓  " + txt, { x: 6.8, y: 2.42 + i * 0.56, w: 5.5, h: 0.5, fontSize: 12.5, color: C.green, fontFace: "Calibri" });
  });
}

// ── SLIDE 8 — Perfis de acesso ───────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "Segurança");
  slideTitle(s, "Cada um vê só o que precisa");

  const profiles = [
    {
      emoji: "⚖️",
      title: "Balança",
      sub: "Atendente do pátio",
      items: ["Registra compras", "Vê catálogo de materiais", "Não acessa caixa ou financeiro"],
      color: C.teal,
    },
    {
      emoji: "🗂️",
      title: "Escritório",
      sub: "Atendente administrativa",
      items: ["Confere e confirma compras", "Lança saques e despesas", "Controla o caixa do dia"],
      color: C.gold,
    },
    {
      emoji: "👑",
      title: "Administrador",
      sub: "Gestores / João",
      items: ["Acesso completo ao sistema", "Cadastra materiais e pessoas", "Painel com visão geral"],
      color: C.navy,
    },
  ];

  profiles.forEach(({ emoji, title, sub, items, color }, i) => {
    const x = 0.55 + i * 4.15;
    card(s, x, 1.7, 3.8, 5.0, C.white);
    s.addShape(pptx.ShapeType.rect, { x, y: 1.7, w: 3.8, h: 0.6, fill: { color } });
    iconCircle(s, emoji, x + 1.6, 2.4, 0.65, color);
    s.addText(title, { x, y: 3.2, w: 3.8, h: 0.45, fontSize: 20, bold: true, color, align: "center", fontFace: "Calibri" });
    s.addText(sub, { x, y: 3.65, w: 3.8, h: 0.35, fontSize: 12, color: C.slate, align: "center", fontFace: "Calibri" });
    items.forEach((item, j) => {
      s.addText("• " + item, { x: x + 0.2, y: 4.15 + j * 0.65, w: 3.4, h: 0.58, fontSize: 12.5, color: C.navy, fontFace: "Calibri" });
    });
  });

  s.addText("Login por e-mail e senha · Acesso pelo celular, tablet ou computador", {
    x: 0.35, y: 6.85, w: 12.5, h: 0.35,
    fontSize: 11, color: C.slate, align: "center", fontFace: "Calibri",
  });
}

// ── SLIDE 9 — Próximos Passos ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightSlide(s);
  sectionTag(s, "Roadmap");
  slideTitle(s, "O que vem a seguir");

  // Slide 9: Fase 1 tem 5 itens, Fases 2 e 3 têm 4. Usar step menor e card maior pra consistência.
  const phases = [
    {
      phase: "Fase 1 — Concluído ✓",
      color: C.green,
      items: ["Login e perfis por papel", "Catálogo de materiais e catadores", "Tela da balança touch", "Conferência do dia", "Caixa físico diário"],
    },
    {
      phase: "Fase 2 — Em andamento",
      color: C.gold,
      items: ["Módulo de vendas (saída de estoque)", "Contas a pagar / receber", "Relatório por catador / material", "Alerta de estoque baixo"],
    },
    {
      phase: "Fase 3 — Futuro",
      color: C.teal,
      items: ["Relatórios financeiros (DRE)", "Controle de frota / combustível", "App no celular (modo offline)", "Balança digital integrada"],
    },
  ];

  phases.forEach(({ phase, color, items }, i) => {
    const x = 0.35 + i * 4.22;
    const cardH = 5.4;
    const step = 0.82;
    card(s, x, 1.62, 3.97, cardH, C.white);
    s.addShape(pptx.ShapeType.rect, { x, y: 1.62, w: 3.97, h: 0.5, fill: { color } });
    s.addText(phase, { x: x + 0.1, y: 1.66, w: 3.77, h: 0.42, fontSize: 11.5, bold: true, color: color === C.gold ? C.navy : C.white, fontFace: "Calibri" });
    items.forEach((item, j) => {
      s.addText("→  " + item, { x: x + 0.15, y: 2.3 + j * step, w: 3.65, h: step, fontSize: 12.5, color: C.navy, fontFace: "Calibri" });
    });
  });
}

// ── SLIDE 10 — Encerramento ──────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkSlide(s);

  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.4, fill: { color: C.teal } });
  s.addText("♻️", { x: 0.5, y: 0.02, w: 12.3, h: 1.36, fontSize: 52, align: "center" });

  s.addText("Pronto para começar.", {
    x: 0.5, y: 1.75, w: 12.3, h: 0.9,
    fontSize: 40, bold: true, color: C.white, align: "center", fontFace: "Calibri",
  });
  s.addText("O sistema está funcionando.\nNenhum custo de licença. Nenhum retrabalho.", {
    x: 1.5, y: 2.8, w: 10.3, h: 1.0,
    fontSize: 19, color: C.tealLight, align: "center", fontFace: "Calibri",
  });

  // 3 stats — fundo navy para contraste gold/navy ~6:1 (antes tealDark tinha 2:1)
  const stats = [
    { val: "0", label: "Papel envolvido" },
    { val: "0", label: "Retrabalho" },
    { val: "100%", label: "Controle do caixa físico" },
  ];
  stats.forEach(({ val, label }, i) => {
    const x = 1.2 + i * 3.8;
    s.addShape(pptx.ShapeType.rect, { x, y: 4.1, w: 3.3, h: 1.65, fill: { color: C.navy }, line: { color: C.teal, pt: 1.5 } });
    s.addText(val, { x, y: 4.15, w: 3.3, h: 0.9, fontSize: 42, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });
    s.addText(label, { x, y: 5.0, w: 3.3, h: 0.65, fontSize: 12, color: C.tealLight, align: "center", fontFace: "Calibri" });
  });

  s.addText("João Pedro Teixeira de Ávila · joaopedroteixeiradeavila@gmail.com", {
    x: 0.5, y: 6.7, w: 12.3, h: 0.45,
    fontSize: 11, color: "8EAFC4", align: "center", fontFace: "Calibri",
  });
}

// ── Salvar ──────────────────────────────────────────────────────────────────
const outPath = "/Users/joao/projetos/VJA-SISTEMA/apresentacao/VJA-Reciclagem-Sistema.pptx";
await pptx.writeFile({ fileName: outPath });
console.log("Salvo em:", outPath);
