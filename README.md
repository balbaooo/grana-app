# 💚 Grana — Controle Financeiro

App mobile-first de finanças pessoais para brasileiros. PWA-ready, sem dependências externas, 100% localStorage.

## 🚀 Deploy no Vercel (3 passos)

### Opção A — GitHub + Vercel (recomendado)

1. **Suba para o GitHub:**
```bash
git init
git add .
git commit -m "feat: initial grana app"
git remote add origin https://github.com/SEU_USUARIO/grana-app.git
git push -u origin main
```

2. **Conecte na Vercel:**
   - Acesse [vercel.com](https://vercel.com) → **New Project**
   - Importe o repositório do GitHub
   - Clique em **Deploy** (sem configurar nada — funciona direto!)

3. **Pronto!** Seu app estará em `https://grana-app.vercel.app`

### Opção B — Vercel CLI

```bash
npm i -g vercel
vercel deploy
```

---

## 📱 Instalar como app (PWA)

- **Android (Chrome):** Menu → "Adicionar à tela inicial"
- **iPhone (Safari):** Compartilhar → "Adicionar à Tela de Início"

---

## 🗂️ Estrutura de arquivos

```
grana-app/
├── index.html      # Estrutura HTML + modais
├── style.css       # CSS completo (dark theme, mobile-first)
├── app.js          # Toda a lógica JavaScript
├── sw.js           # Service Worker (offline)
├── manifest.json   # PWA manifest
├── vercel.json     # Configuração Vercel
└── icons/
    └── icon.svg    # Ícone do app
```

---

## ✨ Funcionalidades

- ✅ Registrar gastos com categoria, valor e descrição
- ✅ 9 categorias padrão (Alimentação, Delivery, Transporte...)
- ✅ Entradas e saídas
- ✅ Controle de fatura do cartão de crédito
- ✅ Meta de economia mensal com barra de progresso
- ✅ Visão geral: saldo, entradas e saídas do mês
- ✅ Gastos por categoria com gráfico de barra
- ✅ Navegação por mês (meses anteriores/futuros)
- ✅ Filtro por tipo (todos/entradas/saídas)
- ✅ Exportar dados em JSON (backup)
- ✅ Funciona offline (PWA + Service Worker)
- ✅ Dark theme moderno

---

## 🛠️ Tecnologias

- HTML5, CSS3, JavaScript puro (ES6+)
- localStorage (sem banco de dados)
- PWA com Service Worker
- Fontes: Syne + DM Sans (Google Fonts)

---

Feito com 💚 para o Brasil
