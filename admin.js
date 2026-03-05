// admin.js — Admin panel logic for Chá de Casa Nova
import {
    auth, db, provider,
    signInWithPopup, signOut, onAuthStateChanged,
    collection, doc, deleteDoc, setDoc, updateDoc,
    onSnapshot, query, orderBy
} from './firebase.js';

// ── Admin e-mails — add allowed admin emails here ───────────────────────
const ADMIN_EMAILS = [
    'nessacarolsp@gmail.com',
    'tiseduc@gmail.com'
].map(e => e.trim().toLowerCase());

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
const customList = document.getElementById('custom-gifts-list');
const customBadge = document.getElementById('custom-badge');
const toastEl = document.getElementById('toast');

// Modal refs
const giftModal = document.getElementById('gift-modal');
const giftModalTitle = document.getElementById('gift-modal-title');
const giftForm = document.getElementById('gift-form');
const giftIdInput = document.getElementById('gift-id');
const giftIconInput = document.getElementById('gift-icon');
const giftNameInput = document.getElementById('gift-name');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnAddGift = document.getElementById('btn-add-gift');
const btnSaveGift = document.getElementById('btn-save-gift');
const giftImageInput = document.getElementById('gift-image-input');
const giftImagePreview = document.getElementById('gift-image-preview');

let currentImageBase64 = null;

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ── Auth ──────────────────────────────────────────────────────────────────
let isLoggingIn = false;
document.getElementById('btn-login').addEventListener('click', async () => {
    if (isLoggingIn) return;
    isLoggingIn = true;
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        if (e.code === 'auth/popup-blocked') {
            showToast('O login foi bloqueado pelo navegador. Ative os pop-ups.');
        } else if (e.code === 'auth/cancelled-popup-request') {
            console.warn('Login popup request was superseded.');
        } else {
            showToast('Erro ao fazer login.');
            console.error(e);
        }
    } finally {
        isLoggingIn = false;
    }
});

document.getElementById('btn-signout').addEventListener('click', async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        const email = user.email?.trim().toLowerCase();
        if (!email || !ADMIN_EMAILS.includes(email)) {
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
        subscribeCustomGifts();
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

            const iconHtml = data.image
                ? `<img src="${data.image}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;" />`
                : `<span style="font-size:1.2rem;">${escHtml(data.icon || '🎁')}</span>`;

            return `
        <tr>
          <td style="color:var(--text-dim);font-size:.75rem;">${String(i + 1).padStart(2, '0')}</td>
          <td>
            <div style="display:flex;align-items:center;gap:.5rem;">
               ${iconHtml}
               <span>${escHtml(data.name)}</span>
            </div>
          </td>
          <td>${statusHtml}</td>
          <td>${chosenByHtml}</td>
          <td>${noteHtml}</td>
          <td style="text-align:right;">
             <button class="btn-edit-gift" data-id="${d.id}" data-name="${escHtml(data.name)}" title="Editar" style="background:transparent; border:none; font-size:1.1rem; cursor:pointer;">✏️</button>
             <button class="btn-del-gift" data-id="${d.id}" data-name="${escHtml(data.name)}" title="Excluir" style="background:transparent; border:none; font-size:1.1rem; cursor:pointer; margin-left:.5rem;">🗑️</button>
          </td>
        </tr>
      `;
        }).join('');

        // Wire up buttons
        giftsTbody.querySelectorAll('.btn-edit-gift').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                const data = sorted[idx].data();
                giftModalTitle.textContent = 'Editar Presente';
                giftIdInput.value = btn.dataset.id;
                giftNameInput.value = data.name;
                giftIconInput.value = data.icon || '';

                currentImageBase64 = data.image || null;
                if (currentImageBase64) {
                    giftImagePreview.src = currentImageBase64;
                    giftImagePreview.style.display = 'block';
                } else {
                    giftImagePreview.src = '';
                    giftImagePreview.style.display = 'none';
                }
                if (giftImageInput) giftImageInput.value = ''; // clear file selection
                giftModal.classList.remove('hidden');
            });
        });

        giftsTbody.querySelectorAll('.btn-del-gift').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm(`Excluir o presente:\n"${btn.dataset.name}"?`)) return;
                try {
                    await deleteDoc(doc(db, 'gifts', btn.dataset.id));
                    showToast('Presente excluído.');
                } catch (e) {
                    showToast('Erro ao excluir.');
                    console.error(e);
                }
            });
        });
    });
}

// ── Gifts Actions (Create / Edit) ─────────────────────────────────────────
if (giftImageInput) {
    giftImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            if (!currentImageBase64) giftImagePreview.style.display = 'none';
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 400; // Constrain to 400px to keep Base64 size tiny for Firestore (<1MB limit)
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                currentImageBase64 = canvas.toDataURL('image/webp', 0.85); // WebP format for better compression
                giftImagePreview.src = currentImageBase64;
                giftImagePreview.style.display = 'block';
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

if (btnAddGift) {
    btnAddGift.addEventListener('click', () => {
        giftModalTitle.textContent = 'Novo Presente';
        giftForm.reset();
        giftIdInput.value = '';
        currentImageBase64 = null;
        if (giftImagePreview) {
            giftImagePreview.src = '';
            giftImagePreview.style.display = 'none';
        }
        giftModal.classList.remove('hidden');
    });
}

if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
        giftModal.classList.add('hidden');
    });
}

if (giftForm) {
    giftForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = giftIdInput.value;
        const icon = giftIconInput.value.trim() || '🎁';
        const name = giftNameInput.value.trim();
        if (!name) return;

        btnSaveGift.disabled = true;
        try {
            if (id) {
                await updateDoc(doc(db, 'gifts', id), { name, icon, image: currentImageBase64 });
                showToast('Presente atualizado!');
            } else {
                const newId = 'x' + Date.now(); // sorts at the end naturally
                await setDoc(doc(db, 'gifts', newId), {
                    name,
                    icon,
                    image: currentImageBase64,
                    chosenBy: null,
                    chosenByName: null,
                    chosenByPhoto: null,
                    customText: null,
                });
                showToast('Presente adicionado!');
            }
            giftModal.classList.add('hidden');
        } catch (err) {
            showToast('Erro ao salvar.');
            console.error(err);
        } finally {
            btnSaveGift.disabled = false;
        }
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

// ── Custom Gifts subscription ─────────────────────────────────────────────
function subscribeCustomGifts() {
    onSnapshot(query(collection(db, 'customGifts'), orderBy('createdAt', 'desc')), (snap) => {
        customBadge.textContent = `${snap.size} item(ns)`;

        if (snap.empty) {
            customList.innerHTML = `<p style="padding:1.5rem 1.25rem;color:var(--text-dim);font-size:.85rem;">Nenhuma contribuição extra ainda.</p>`;
            return;
        }

        customList.innerHTML = '';
        snap.docs.forEach(d => {
            const data = d.data();
            const item = document.createElement('div');
            item.className = 'msg-item';

            const avatarSrc = data.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.userName || '?')}&background=1e1e1e&color=c9b07a`;

            item.innerHTML = `
        <img class="msg-item-avatar" src="${avatarSrc}" alt="${escHtml(data.userName)}" />
        <div class="msg-item-body">
          <div class="msg-item-meta">
            <span class="msg-item-name">${escHtml(data.userName || 'Convidado')}</span>
          </div>
          <p class="msg-item-text">${escHtml(data.text)}</p>
        </div>
        <button class="btn-delete" data-id="${d.id}">🗑 Excluir</button>
      `;

            item.querySelector('.btn-delete').addEventListener('click', async () => {
                if (!confirm(`Excluir contribuição de ${data.userName}:\n"${data.text}"?`)) return;
                try {
                    await deleteDoc(doc(db, 'customGifts', d.id));
                    showToast('Contribuição excluída.');
                } catch (e) {
                    showToast('Erro ao excluir.');
                    console.error(e);
                }
            });
            customList.appendChild(item);
        });
    });
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
