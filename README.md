# 🏡 Chá de Casa Nova

Aplicação web estática para evento de Chá de Casa Nova — cardápio de presentes interativo e mural de recados animado com Firebase.

## Estrutura de Arquivos

```
CASA-NOVA/
├── index.html        — Página dos convidados
├── admin.html        — Painel de administração
├── style.css         — Estilos globais + animações
├── firebase.js       — Inicialização do Firebase (ES Modules)
├── index.js          — Lógica da página de convidados
├── admin.js          — Lógica do painel admin
└── firestore.rules   — Regras de segurança do Firestore
```

---

## ⚙️ Configuração Inicial (OBRIGATÓRIO antes de publicar)

### 1. Defina o e-mail do administrador

Em **`index.js`** e **`admin.js`**, localize a linha:
```js
const ADMIN_EMAIL = 'COLOQUE_SEU_EMAIL_AQUI@gmail.com';
```
Substitua pelo seu e-mail Google real.  
Em **`firestore.rules`**, localize:
```js
&& request.auth.token.email == 'COLOQUE_SEU_EMAIL_AQUI@gmail.com';
```
Substitua pelo mesmo e-mail.

### 2. Publique as regras do Firestore

No [Console do Firebase](https://console.firebase.google.com) → **Firestore** → **Regras**,  
cole o conteúdo do arquivo `firestore.rules` e publique.

Ou via Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # aponte para este projeto
firebase deploy --only firestore:rules
```

### 3. Autorize o domínio no Firebase Auth

No Console do Firebase → **Authentication** → **Sign-in method** → **Authorized domains**,  
adicione o domínio do Cloudflare Pages (ex: `seu-app.pages.dev`).

---

## 🚀 Deploy no Cloudflare Pages

1. Faça commit de todos os arquivos em um repositório Git (GitHub/GitLab).
2. No [Cloudflare Pages](https://pages.cloudflare.com/), clique em **Create a project → Connect to Git**.
3. Selecione o repositório.
4. **Build settings**:
   - Framework: `None`
   - Build command: *(deixe vazio)*
   - Build output directory: `/` (raiz)
5. Clique em **Save and Deploy**.

> Sem build step! Tudo é JavaScript puro via ES Modules com CDN.

---

## 🖥️ Teste Local

Use um servidor HTTP local (ES Modules não funcionam com `file://`):

```bash
# Opção 1 — npx serve
npx serve .

# Opção 2 — Python
python -m http.server 8080
```

Acesse: `http://localhost:3000` (ou a porta exibida).

---

## 📦 Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🔑 Login Google | Autenticação obrigatória para interagir |
| 🎁 Cardápio de presentes | 27 itens, 1 por convidado, em tempo real |
| ✏️ Item "Outro" | Campo de texto para descrever presente customizado |
| 💬 Mural de recados | Balões animados flutuantes com foto, nome e mensagem |
| 🔐 Painel Admin | Visão geral de presentes + moderação de mensagens |

---

## 🗄️ Modelo de Dados (Firestore)

**Collection `gifts`**
```
gifts/{giftId}
  name: string
  icon: string
  isOther: boolean
  chosenBy: string | null        (uid)
  chosenByName: string | null
  chosenByPhoto: string | null
  customText: string | null
```

**Collection `messages`**
```
messages/{msgId}
  uid: string
  displayName: string
  photoURL: string | null
  text: string
  createdAt: timestamp
```
