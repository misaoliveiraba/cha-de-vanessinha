// index.js — Guest page logic for Chá de Casa Nova
import {
    auth, db, provider,
    signInWithPopup, signOut, onAuthStateChanged,
    collection, doc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
    onSnapshot, serverTimestamp, query, orderBy
} from './firebase.js';

// ── Admin emails (anyone with an email in this list sees the Admin link) ─────────
const ADMIN_EMAILS = [
    'nessacarolsp@gmail.com',
    'tiseduc@gmail.com'
].map(e => e.trim().toLowerCase());

// ── Gift seed data ────────────────────────────────────────────────────────
const GIFT_SEEDS = [
    { id: 'g01', name: 'Micro-ondas', icon: '📦' },
    { id: 'g02', name: 'Pipoqueira elétrica (preferência preto)', icon: '🍿' },
    { id: 'g03', name: '4 pratos rasos (preferência Branco)', icon: '🍽️' },
    { id: 'g04', name: '4 pratos fundos (preferência Branco)', icon: '🍜' },
    { id: 'g05', name: '4 pratos para sobremesa (preferência Branco)', icon: '🍰' },
    { id: 'g06', name: '1 boleira de vidro', icon: '🎂' },
    { id: 'g07', name: '1 forma média para assar', icon: '🫙' },
    { id: 'g08', name: '1 jogo de talheres em Inox', icon: '🍴' },
    { id: 'g09', name: '1 escorredor em Inox para pratos', icon: '🧺' },
    { id: 'g10', name: 'Utensílios de cozinha (concha, colher de pau, espátula, pegador etc.)', icon: '🥄' },
    { id: 'g11', name: 'Conjunto de potes herméticos - M e G', icon: '🫙' },
    { id: 'g12', name: 'Vasilhas de Vidro - M e G', icon: '🫗' },
    { id: 'g13', name: 'Marinex (P, M e G)', icon: '🍱' },
    { id: 'g14', name: '6 panos de prato', icon: '🧻' },
    { id: 'g15', name: '1 jogo de balde e bacia', icon: '🪣' },
    { id: 'g16', name: '1 lixeira inox para cozinha', icon: '🗑️' },
    { id: 'g17', name: '1 lixeira inox para banheiro (item 1)', icon: '🗑️' },
    { id: 'g18', name: '1 lixeira inox para banheiro (item 2)', icon: '🗑️' },
    { id: 'g19', name: '1 jogo de toalhas (banho e rosto) (item 1)', icon: '🛁' },
    { id: 'g20', name: '1 jogo de toalhas (banho e rosto) (item 2)', icon: '🛁' },
    { id: 'g21', name: '1 tapete antiderrapante para banheiro (item 1)', icon: '🏠' },
    { id: 'g22', name: '1 tapete antiderrapante para banheiro (item 2)', icon: '🏠' },
    { id: 'g23', name: 'Ferro de passar (preferência preto)', icon: '👔' },
    { id: 'g24', name: '6 Taças', icon: '🥂' },
    { id: 'g25', name: 'Jogo de Facas', icon: '🔪' },
    { id: 'g26', name: 'Abajur ou Luminária de cabeceira', icon: '💡' },
    { id: 'g27', name: 'Outro (descreva o que vai dar!)', icon: '🎁', isOther: true },
];

// ── State ─────────────────────────────────────────────────────────────────
let currentUser = null;
let userChosenGiftId = null; // the gift id this user has chosen (if any)

// ── DOM refs ──────────────────────────────────────────────────────────────
const loginOverlay = document.getElementById('login-overlay');
const appEl = document.getElementById('app');
const userBar = document.getElementById('user-bar');
const userAvatar = document.getElementById('user-avatar');
const userNameEl = document.getElementById('user-name');
const adminLink = document.getElementById('admin-link');
const giftGrid = document.getElementById('gift-grid');
const muralEl = document.getElementById('mural');
const muralEmpty = document.getElementById('mural-empty');
const msgInput = document.getElementById('msg-input');
const btnSendMsg = document.getElementById('btn-send-msg');
const toastEl = document.getElementById('toast');

// ── Toast helper ──────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ── Auth ──────────────────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const email = result.user.email?.trim().toLowerCase();
        if (email && ADMIN_EMAILS.includes(email)) {
            window.location.href = 'admin.html';
        }
    } catch (e) {
        showToast('Erro ao fazer login. Tente novamente.');
        console.error(e);
    }
});

document.getElementById('btn-signout').addEventListener('click', async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginOverlay.classList.add('hidden');
        appEl.style.display = 'flex';
        userBar.classList.remove('hidden');
        userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=1e1e1e&color=c9b07a`;
        userNameEl.textContent = user.displayName || user.email;

        const email = user.email?.trim().toLowerCase();
        if (email && ADMIN_EMAILS.includes(email)) adminLink.style.display = 'inline';

        try {
            await seedGiftsIfNeeded();
        } catch (e) {
            console.warn('Seed skipped:', e.code || e.message);
        }
        subscribeGifts();
        subscribeMessages();
    } else {
        currentUser = null;
        userChosenGiftId = null;
        loginOverlay.classList.remove('hidden');
        appEl.style.display = 'none';
        userBar.classList.add('hidden');
    }
});

// ── Seed gifts ────────────────────────────────────────────────────────────
async function seedGiftsIfNeeded() {
    const snap = await getDocs(collection(db, 'gifts'));
    if (!snap.empty) return; // already seeded
    const batch = GIFT_SEEDS.map(g =>
        setDoc(doc(db, 'gifts', g.id), {
            name: g.name,
            icon: g.icon,
            isOther: g.isOther || false,
            chosenBy: null,
            chosenByName: null,
            chosenByPhoto: null,
            customText: null,
        })
    );
    await Promise.all(batch);
}

// ── Render gifts (real-time) ──────────────────────────────────────────────
function subscribeGifts() {
    onSnapshot(collection(db, 'gifts'), (snap) => {
        userChosenGiftId = null;
        snap.docs.forEach(d => {
            if (d.data().chosenBy === currentUser.uid) userChosenGiftId = d.id;
        });

        giftGrid.innerHTML = '';
        if (snap.empty) {
            giftGrid.innerHTML = '<p style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:2rem;">Carregando presentes…</p>';
            return;
        }
        // Sort by id
        const sorted = snap.docs.slice().sort((a, b) => a.id.localeCompare(b.id));
        sorted.forEach(d => renderGiftCard(d.id, d.data()));
    }, (err) => {
        console.error('Firestore gifts error:', err);
        giftGrid.innerHTML = '<p style="color:#c97a7a;grid-column:1/-1;text-align:center;padding:2rem;">Erro ao carregar presentes. Recarregue a página.</p>';
    });
}

function renderGiftCard(id, data) {
    const isChosen = !!data.chosenBy;
    const isMine = data.chosenBy === currentUser?.uid;
    const isOther = data.isOther;

    const card = document.createElement('div');
    const hasImage = !!data.image;
    card.className = `gift-card${isChosen ? ' is-chosen' : ''}${isMine ? ' is-mine' : ''}${hasImage ? ' has-image' : ''}`;
    card.dataset.id = id;

    card.innerHTML = `
    ${hasImage
            ? `<div class="gift-card-bg" style="background-image: url('${data.image}')"></div><div class="gift-card-overlay"></div>`
            : ''
        }
    <div class="gift-content">
      ${!hasImage ? `<div class="gift-icon">${data.icon || '🎁'}</div>` : ''}
      <div class="gift-name">${escHtml(data.name)}</div>
      <div class="gift-status" id="status-${id}">
        ${isChosen
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
             Escolhido por: <strong>${escHtml(data.chosenByName || 'Alguém')}</strong>${data.customText ? ` — "${escHtml(data.customText)}"` : ''}`
            : ''}
      </div>
      ${isOther && isMine ? `
        <div class="gift-custom-wrap visible" id="custom-wrap-${id}">
          <input
            class="gift-custom-input"
            id="custom-input-${id}"
            type="text"
            placeholder="O que você vai dar?"
            value="${escHtml(data.customText || '')}"
            maxlength="80"
          />
          <button class="btn-choose" id="save-custom-${id}" style="font-size:.78rem;">Salvar descrição</button>
        </div>` : ''}
      ${isOther && !isMine && !isChosen ? `
        <div class="gift-custom-wrap" id="custom-wrap-${id}">
          <input
            class="gift-custom-input"
            id="custom-input-${id}"
            type="text"
            placeholder="O que você vai dar?"
            maxlength="80"
          />
          <button class="btn-choose" id="save-custom-${id}" style="font-size:.78rem;">Salvar e Escolher</button>
        </div>` : ''}
      <div class="gift-actions" id="actions-${id}">
        ${isMine
            ? `<button class="btn-swap" data-id="${id}">Trocar ↩</button>`
            : !isChosen && !isOther
                ? `<button class="btn-choose" data-id="${id}">Escolher →</button>`
                : ''}
      </div>
    </div>
  `;

    // Wiring
    const chooseBtn = card.querySelector(`.btn-choose[data-id="${id}"]`);
    const swapBtn = card.querySelector(`.btn-swap[data-id="${id}"]`);
    const saveBtn = card.querySelector(`#save-custom-${id}`);
    const custWrap = card.querySelector(`#custom-wrap-${id}`);
    const custInput = card.querySelector(`#custom-input-${id}`);

    // "Outro" — show text field when clicking Choose
    if (isOther && chooseBtn) {
        chooseBtn.addEventListener('click', () => {
            if (custWrap) custWrap.classList.add('visible');
            chooseBtn.style.display = 'none';
        });
    }

    if (isOther && custWrap && !isMine && !isChosen) {
        // The user needs to confirm after entering text
        if (!saveBtn) {
            // Add a save button dynamically if not mine
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn-choose';
            confirmBtn.style.fontSize = '.78rem';
            confirmBtn.textContent = 'Confirmar presente';
            custWrap.appendChild(confirmBtn);
            confirmBtn.addEventListener('click', () => chooseGift(id, custInput?.value?.trim()));
        }
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const txt = custInput?.value?.trim();
            if (!txt) { showToast('Descreva o presente antes de salvar!'); return; }
            saveBtn.disabled = true;
            await updateDoc(doc(db, 'gifts', id), { customText: txt });
            showToast('Descrição salva! ✅');
            saveBtn.disabled = false;
        });
    }

    if (chooseBtn && !isOther) {
        chooseBtn.addEventListener('click', () => chooseGift(id, null));
    }

    if (swapBtn) {
        swapBtn.addEventListener('click', () => releaseGift(id));
    }

    giftGrid.appendChild(card);
}

async function chooseGift(id, customText = null) {
    if (!currentUser) return;
    if (userChosenGiftId && userChosenGiftId !== id) {
        showToast('Você já escolheu um item. Troque-o primeiro!');
        return;
    }
    try {
        await updateDoc(doc(db, 'gifts', id), {
            chosenBy: currentUser.uid,
            chosenByName: currentUser.displayName || currentUser.email,
            chosenByPhoto: currentUser.photoURL || null,
            customText: customText,
        });
        showToast('Presente reservado! 🎁');
    } catch (e) {
        showToast('Erro ao escolher. Tente novamente.');
        console.error(e);
    }
}

async function releaseGift(id) {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'gifts', id), {
            chosenBy: null,
            chosenByName: null,
            chosenByPhoto: null,
            customText: null,
        });
        showToast('Escolha liberada. Você pode escolher outro item.');
    } catch (e) {
        showToast('Erro ao trocar. Tente novamente.');
        console.error(e);
    }
}

// ── Messages / Mural ──────────────────────────────────────────────────────
btnSendMsg.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) sendMessage();
});

async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) { showToast('Escreva uma mensagem antes de enviar!'); return; }
    if (!currentUser) return;

    btnSendMsg.disabled = true;
    try {
        await addDoc(collection(db, 'messages'), {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email,
            photoURL: currentUser.photoURL || null,
            text,
            createdAt: serverTimestamp(),
        });
        msgInput.value = '';
        showToast('Mensagem enviada! 🎈');
    } catch (e) {
        showToast('Erro ao enviar mensagem.');
        console.error(e);
    } finally {
        btnSendMsg.disabled = false;
    }
}

function subscribeMessages() {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    onSnapshot(q, (snap) => {
        // Remove all current balloons (keep mural-empty)
        muralEl.querySelectorAll('.balloon').forEach(b => b.remove());

        if (snap.empty) {
            muralEmpty.style.display = 'flex';
        } else {
            muralEmpty.style.display = 'none';
            snap.docs.forEach((d, i) => renderBalloon(d.id, d.data(), i, snap.size));
        }
    });
}

function renderBalloon(id, data, index, total) {
    const balloon = document.createElement('div');
    balloon.className = 'balloon';
    balloon.dataset.id = id;

    // Distribute balloons across the mural width in columns, staggering rows
    const cols = Math.max(3, Math.min(Math.ceil(total / 2), 6));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const leftPct = (col / cols) * 85 + rand(0, 8);
    const topPx = row * 220 + rand(20, 60);

    // Random animation parameters for organic feel
    const dur = rand(9, 17);
    const delay = -rand(0, dur);
    const tx1 = rand(-18, 18);
    const ty1 = rand(-28, -8);
    const tx2 = rand(-14, 14);
    const ty2 = rand(-12, 4);
    const tx3 = rand(-10, 10);
    const ty3 = rand(-26, -6);
    const rotFrom = rand(-2.5, 0);
    const rotMid = rand(0, 2.5);
    const rotTo = rand(-1.5, 2);

    balloon.style.cssText = `
    left: ${leftPct}%;
    top: ${topPx}px;
    --dur: ${dur}s;
    --delay: ${delay}s;
    --tx1: ${tx1}px; --ty1: ${ty1}px;
    --tx2: ${tx2}px; --ty2: ${ty2}px;
    --tx3: ${tx3}px; --ty3: ${ty3}px;
    --rot-from: ${rotFrom}deg;
    --rot-mid: ${rotMid}deg;
    --rot-to: ${rotTo}deg;
  `;

    const avatarSrc = data.photoURL
        ? data.photoURL
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || '?')}&background=1e1e1e&color=c9b07a&size=64`;

    balloon.innerHTML = `
    <div class="balloon-inner">
      <div class="balloon-user">
        <img class="balloon-avatar" src="${avatarSrc}" alt="${escHtml(data.displayName)}" />
        <span class="balloon-name">${escHtml(data.displayName || 'Convidado')}</span>
      </div>
      <p class="balloon-text">${escHtml(data.text)}</p>
    </div>
    <div class="balloon-string"></div>
  `;

    // Expand mural height as needed
    const neededH = topPx + 250;
    if (parseInt(muralEl.style.minHeight || '520') < neededH) {
        muralEl.style.minHeight = (neededH + 60) + 'px';
    }

    muralEl.appendChild(balloon);
}

// ── Utilities ─────────────────────────────────────────────────────────────
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function escHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
