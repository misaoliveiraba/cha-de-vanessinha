// admin.js — Admin panel logic for Chá de Casa Nova
import {
    auth, db, provider,
    signInWithPopup, signOut, onAuthStateChanged,
    collection, doc, deleteDoc,
    onSnapshot, query, orderBy
} from './firebase.js';
 
// ── Admin e-mails — add allowed admin emails here ───────────────────────
const ADMIN_EMAILS = [
    'nessacarolsp@gmail.com',
    'tiseduc@gmail.com'
];

// ── DOM refs ──────────────────────────────────────────────────────────────
const loginOverlay = document.getElementById('login-overlay');
const adminApp = document.getElementById('admin-app');
const userBar = document.getElementById('user-bar');
const userAvatar = document.getElementById('user-avatar');
const userNameEl = document.getElementById('user-name');
const giftsTbody = document.getElementById('gifts-tbody');
const giftsBadge = document.getElementById('gifts-badge');
const msgsList = document.getElementById('msgs-list');
const msgsBadge = document.getElementById('msgs-badge');
const adminStats = document.getElementById('admin-stats');
const toastEl = document.getElementById('toast');

// ── Toast ─────────────────────────────────────────────────────────────────
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
        await signInWithPopup(auth, provider);
    } catch (e) {
        showToast('Erro ao fazer login.');
        console.error(e);
    }
});

document.getElementById('btn-signout').addEventListener('click', async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!ADMIN_EMAILS.includes(user.email)) {
            // Not an admin — redirect
            showToast('Acesso negado. Redirecionando…');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            return;
        }

        // Authenticated as admin
        loginOverlay.classList.add('hidden');
        adminApp.style.display = 'block';
        userBar.classList.remove('hidden');
        userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=1e1e1e&color=c9b07a`;
        userNameEl.textContent = user.displayName || user.email;

        subscribeGifts();
        subscribeMessages();
    } else {
        loginOverlay.classList.remove('hidden');
        adminApp.style.display = 'none';
        userBar.classList.add('hidden');
    }
});

// ── Gifts subscription ────────────────────────────────────────────────────
function subscribeGifts() {
    onSnapshot(collection(db, 'gifts'), (snap) => {
        const sorted = snap.docs.slice().sort((a, b) => a.id.localeCompare(b.id));
        const chosen = sorted.filter(d => d.data().chosenBy);
        const free = sorted.filter(d => !d.data().chosenBy);

        giftsBadge.textContent = `${chosen.length}/${sorted.length} escolhidos`;
        adminStats.textContent = `${free.length} item(ns) disponível(is)`;

        giftsTbody.innerHTML = sorted.map((d, i) => {
            const data = d.data();
            const statusHtml = data.chosenBy
                ? `<span class="status-badge taken">✔ Reservado</span>`
                : `<span class="status-badge free">Disponível</span>`;

            const chosenByHtml = data.chosenBy
                ? `<div style="display:flex;align-items:center;gap:.4rem;">
             ${data.chosenByPhoto ? `<img src="${escHtml(data.chosenByPhoto)}" style="width:24px;height:24px;border-radius:50%;border:1px solid var(--gold);" />` : ''}
             <span>${escHtml(data.chosenByName || '—')}</span>
           </div>`
                : '<span style="color:var(--text-dim);">—</span>';

            const noteHtml = data.customText
                ? `<em style="color:var(--gold-light);font-size:.78rem;">"${escHtml(data.customText)}"</em>`
                : '<span style="color:var(--text-dim);">—</span>';

            return `
        <tr>
          <td style="color:var(--text-dim);font-size:.75rem;">${String(i + 1).padStart(2, '0')}</td>
          <td>${escHtml(data.name)}</td>
          <td>${statusHtml}</td>
          <td>${chosenByHtml}</td>
          <td>${noteHtml}</td>
        </tr>
      `;
        }).join('');
    });
}

// ── Messages subscription ─────────────────────────────────────────────────
function subscribeMessages() {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    onSnapshot(q, (snap) => {
        msgsBadge.textContent = `${snap.size} recado(s)`;

        if (snap.empty) {
            msgsList.innerHTML = `<p style="padding:1.5rem 1.25rem;color:var(--text-dim);font-size:.85rem;">Nenhum recado ainda.</p>`;
            return;
        }

        msgsList.innerHTML = '';
        snap.docs.forEach(d => {
            const data = d.data();
            const item = document.createElement('div');
            item.className = 'msg-item';

            const avatarSrc = data.photoURL
                ? data.photoURL
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || '?')}&background=1e1e1e&color=c9b07a&size=64`;

            const ts = data.createdAt?.toDate();
            const timeStr = ts ? ts.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

            item.innerHTML = `
        <img class="msg-item-avatar" src="${avatarSrc}" alt="${escHtml(data.displayName)}" />
        <div class="msg-item-body">
          <div class="msg-item-meta">
            <span class="msg-item-name">${escHtml(data.displayName || 'Convidado')}</span>
            <span class="msg-item-time">${timeStr}</span>
          </div>
          <p class="msg-item-text">${escHtml(data.text)}</p>
        </div>
        <button class="btn-delete" data-id="${d.id}">🗑 Excluir</button>
      `;

            item.querySelector('.btn-delete').addEventListener('click', () => deleteMessage(d.id, data.text));
            msgsList.appendChild(item);
        });
    });
}

async function deleteMessage(id, preview) {
    const short = preview?.length > 40 ? preview.substring(0, 40) + '…' : preview;
    if (!confirm(`Tem certeza que deseja excluir esta mensagem?\n\n"${short}"`)) return;
    try {
        await deleteDoc(doc(db, 'messages', id));
        showToast('Mensagem excluída.');
    } catch (e) {
        showToast('Erro ao excluir mensagem.');
        console.error(e);
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
