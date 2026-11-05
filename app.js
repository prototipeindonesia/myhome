/* =========================================================
   Dreamland — Property Management CRM
   FIREBASE EDITION (Super Admin, Admin, Legal, User)
   ========================================================= */

// Pastikan Firebase sudah ter-load dari index.html
if (!window.FirebaseApp) {
  console.error("Firebase belum siap! Pastikan index.html sudah memuat Firebase SDK.");
  throw new Error("FirebaseApp is not defined");
}

const { auth, db, storage, fb } = window.FirebaseApp;
const { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, onSnapshot, serverTimestamp, addDoc,
  ref, uploadBytes, getDownloadURL 
} = fb;

/* ---------------- Status & Konstanta ---------------- */
const STATUS = {
  diajukan:    { label: 'Diajukan',    short: 'Diajukan',    color: '#94a3b8', bg: '#f1f5f9' },
  verifikasi:  { label: 'Verifikasi',  short: 'Verifikasi',  color: '#f59e0b', bg: '#fef3c7' },
  survei:      { label: 'Survei',      short: 'Survei',      color: '#3b82f6', bg: '#dbeafe' },
  pengerjaan:  { label: 'Pengerjaan',  short: 'Pengerjaan',  color: '#6366f1', bg: '#e0e7ff' },
  pemeriksaan: { label: 'Pemeriksaan', short: 'Pemeriksaan', color: '#06b6d4', bg: '#cffafe' },
  selesai:     { label: 'Selesai',     short: 'Selesai',     color: '#10b981', bg: '#d1fae5' },
  ditolak:     { label: 'Ditolak',     short: 'Ditolak',     color: '#ef4444', bg: '#fee2e2' },
};
const STATUS_FLOW = ['diajukan', 'verifikasi', 'survei', 'pengerjaan', 'pemeriksaan', 'selesai'];
const STATUS_ALL  = [...STATUS_FLOW, 'ditolak'];

const CATEGORIES = [
  'Retensi Struktur', 'Retensi Atap', 'Retensi Plafon',
  'Retensi Plumbing', 'Retensi Listrik', 'Retensi Pengecatan',
  'Retensi Keramik', 'Retensi Taman', 'Lainnya'
];
const PRIORITIES = ['Rendah', 'Sedang', 'Tinggi'];

const ROLE = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  LEGAL: 'legal',
  USER: 'user'
};

const DOC_LABELS = {
  ktp: 'KTP & NPWP Suami Istri *', bukuNikah: 'Buku Nikah *', skKerja: 'SK Kerja',
  slipGaji: 'Slip Gaji 3 Bulan', rekKoran: 'Rek Koran 3 Bulan', kk: 'Kartu Keluarga',
  shm: 'SHM *', imb: 'IMB', pbb: 'PBB *', fotoRumah: 'Foto Rumah'
};
const DOC_KEYS = Object.keys(DOC_LABELS);
const REQUIRED_DOCS = ['ktp', 'bukuNikah', 'shm', 'pbb'];

/* ---------------- State ---------------- */
const state = {
  session: null,
  page: 'dashboard',
  users: [],
  perumahan: [],
  requests: [],
  notifications: [],
  isSuperAdmin: false,
  isAdmin: false,
  isLegal: false,
};

let unsubRequests = null;
let unsubUsers = null;
let unsubNotifs = null;

/* ---------------- Helpers ---------------- */
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const initials = (name) => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const statusBadge = (s) => `<span class="status ${s}">${STATUS[s]?.label || s}</span>`;

// Fungsi Format Tanggal (Aman dari Firestore Timestamp)
function formatDate(val) {
  if (!val) return '-';
  const date = val.toDate ? val.toDate() : new Date(val);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(val) {
  if (!val) return '-';
  const date = val.toDate ? val.toDate() : new Date(val);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(val) {
  if (!val) return '-';
  const date = val.toDate ? val.toDate() : new Date(val);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return formatDate(val);
}

function getWarrantyStatus(tglSerahTerima) {
  if (!tglSerahTerima) return { daysLeft: 0, expired: true, text: 'Tanggal serah terima belum diatur' };
  const handover = new Date(tglSerahTerima).getTime();
  const now = new Date().getTime();
  const limit = handover + (100 * 24 * 60 * 60 * 1000);
  const diff = limit - now;
  
  if (diff <= 0) {
    return { daysLeft: 0, expired: true, text: 'Masa retensi telah habis' };
  }
  const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return { daysLeft, expired: false, text: `Sisa masa retensi: ${daysLeft} hari lagi` };
}

/* ---------------- Toast ---------------- */
function toast(msg, type = 'info') {
  const wrap = $('#toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
  el.innerHTML = `<span>${icon}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(24px)';
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

/* ---------------- AUTH & INIT ---------------- */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        state.session = { id: user.uid, ...data };
        state.isSuperAdmin = data.role === ROLE.SUPERADMIN;
        state.isAdmin = data.role === ROLE.ADMIN || state.isSuperAdmin;
        state.isLegal = data.role === ROLE.LEGAL;

        $('#loginScreen').classList.add('hidden');
        $('#app').classList.remove('hidden');
        
        setupRealtimeListeners();
        renderNav();
        renderShellUser();
        goTo('dashboard');
      } else {
        toast("Akun login valid, tapi profil data tidak ditemukan di Firestore.", "error");
        alert("Anda berhasil login, tetapi data user tidak ditemukan di Firestore (collection 'users' dengan ID: " + user.uid + "). Pastikan Super Admin sudah membuatkan profil Anda.");
        signOut(auth);
      }
    } catch (err) {
      console.error(err);
      toast("Gagal memuat data user. Cek aturan (Rules) Firestore.", "error");
      signOut(auth);
    }
  } else {
    state.session = null;
    if(unsubRequests) unsubRequests();
    if(unsubUsers) unsubUsers();
    if(unsubNotifs) unsubNotifs();
    $('#loginScreen').classList.remove('hidden');
    $('#app').classList.add('hidden');
  }
});

$('#loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#loginEmail').value;
  const pass = $('#loginPassword').value;
  const btn = $('#btnLogin');
  const errDiv = $('#loginError');
  
  btn.textContent = 'Memproses...';
  btn.disabled = true;
  if (errDiv) errDiv.style.display = 'none';

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    console.error("Login Error:", err);
    let msg = "Terjadi kesalahan. Silakan coba lagi.";
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = "Email atau password salah.";
    } else if (err.code === 'auth/invalid-email') {
      msg = "Format email tidak valid.";
    } else if (err.code === 'auth/too-many-requests') {
      msg = "Terlalu banyak percobaan. Tunggu beberapa saat.";
    } else if (err.code === 'auth/operation-not-allowed') {
      msg = "Metode login Email/Password belum diaktifkan di Firebase.";
    }
    if (errDiv) {
      errDiv.textContent = msg;
      errDiv.style.display = 'block';
    }
  } finally {
    btn.textContent = 'Masuk';
    btn.disabled = false;
  }
});

$('#btnLogout')?.addEventListener('click', () => {
  signOut(auth);
  toast('Anda telah keluar', 'info');
});

/* ---------------- REALTIME LISTENERS ---------------- */
function setupRealtimeListeners() {
  // 1. Users Listener
  unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
    state.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (['pemilik', 'users', 'dashboard'].includes(state.page)) renderPage();
  });

  // 2. Requests Listener
  let reqQuery = collection(db, "requests");
  if (!state.isAdmin && !state.isLegal) {
    reqQuery = query(collection(db, "requests"), where("pemilikId", "==", state.session.id));
  }
  unsubRequests = onSnapshot(reqQuery, (snap) => {
    state.requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (['dashboard', 'requests'].includes(state.page)) renderPage();
  });

  // 3. Notifications Listener
  const notifTarget = (state.isAdmin || state.isLegal) ? 'admin' : state.session.id;
  unsubNotifs = onSnapshot(query(collection(db, "notifications"), where("userId", "==", notifTarget)), (snap) => {
    state.notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Urutkan manual
    state.notifications.sort((a, b) => {
      const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tB - tA;
    });
    updateNotifBadge();
    renderNotifDropdown();
  });
}

/* ---------------- NAVIGATION & SHELL ---------------- */
function renderNav() {
  let items = [];
  if (state.isSuperAdmin) {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'perumahan', label: 'Perumahan', icon: '🏘️' },
      { id: 'pemilik', label: 'Data Pembeli', icon: '👥' },
      { id: 'requests', label: 'Pengajuan Retensi', icon: '📋' },
      { id: 'users', label: 'Kelola Akun', icon: '🔐' },
      { id: 'help', label: 'Panduan', icon: '💡' },
    ];
  } else if (state.isAdmin) {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'perumahan', label: 'Perumahan', icon: '🏘️' },
      { id: 'pemilik', label: 'Data Pembeli', icon: '👥' },
      { id: 'requests', label: 'Pengajuan Retensi', icon: '📋' },
      { id: 'help', label: 'Panduan', icon: '💡' },
    ];
  } else if (state.isLegal) {
    items = [
      { id: 'dashboard', label: 'Dashboard Legal', icon: '⚖️' },
      { id: 'pemilik', label: 'Dokumen Hukum', icon: '📄' },
      { id: 'help', label: 'Panduan', icon: '💡' },
    ];
  } else {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'program', label: 'Program Retensi', icon: '🎁' },
      { id: 'new', label: 'Ajukan Retensi', icon: '➕' },
      { id: 'requests', label: 'Pengajuan Saya', icon: '📋' },
      { id: 'help', label: 'Panduan', icon: '💡' },
    ];
  }

  const navList = $('#navList');
  if(navList) navList.innerHTML = items.map(it => `
    <button class="nav-item ${it.id === state.page ? 'active' : ''}" data-action="nav" data-page="${it.id}">
      <span class="ico">${it.icon}</span><span>${it.label}</span>
    </button>`).join('');
}

function renderShellUser() {
  const s = state.session;
  const roleLabel = (s.role || 'user').toUpperCase();
  const chip = $('#userChip');
  if(chip) chip.innerHTML = `
    <div class="avatar">${esc(initials(s.nama))}</div>
    <div class="uc-text">
      <strong>${esc(s.nama)}</strong>
      <small>${roleLabel}</small>
    </div>`;
  const badge = $('#roleBadge');
  if(badge) {
    badge.textContent = roleLabel;
    badge.className = 'role-badge ' + (state.isAdmin || state.isSuperAdmin ? 'admin' : '');
  }
}

function goTo(page) { state.page = page; renderNav(); renderPage(); }

function renderPage() {
  const meta = {
    dashboard: { title: state.isLegal ? 'Dashboard Legal' : 'Dashboard', sub: 'Ringkasan sistem Dreamland' },
    perumahan: { title: 'Perumahan', sub: 'Kelola data perumahan' },
    pemilik:   { title: state.isLegal ? 'Dokumen Hukum' : 'Data Pembeli', sub: 'Kelola data pembeli & dokumen' },
    requests:  { title: 'Pengajuan Retensi', sub: 'Pantau seluruh pengajuan' },
    new:       { title: 'Ajukan Retensi', sub: 'Lengkapi formulir pengajuan' },
    program:   { title: 'Program Retensi', sub: 'Informasi garansi retensi 100 hari' },
    users:     { title: 'Kelola Akun', sub: 'Manajemen akses pengguna sistem' },
    help:      { title: 'Panduan', sub: 'Cara menggunakan Dreamland' },
  }[state.page] || { title: 'Dashboard', sub: '' };

  const pt = $('#pageTitle'); if(pt) pt.textContent = meta.title;
  const ps = $('#pageSubtitle'); if(ps) ps.textContent = meta.sub;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    switch (state.page) {
      case 'dashboard': 
        if (state.isLegal) renderLegalDashboard();
        else if (state.isAdmin) renderAdminDashboard();
        else renderUserDashboard();
        break;
      case 'perumahan': return renderPerumahan();
      case 'pemilik':   return state.isLegal ? renderLegalDokumen() : renderPemilik();
      case 'new':       return renderNewRequest();
      case 'requests':  return (state.isAdmin || state.isSuperAdmin) ? renderAdminRequests() : renderUserRequests();
      case 'program':   return renderProgram();
      case 'users':     return renderKelolaAkun();
      case 'help':      return renderHelp();
    }
  } catch (error) {
    console.error("Render Error:", error);
    $('#content').innerHTML = `<div class="card card-pad"><div class="empty"><h4>Terjadi Kesalahan Sistem</h4><p>${error.message}</p></div></div>`;
  }
}

/* ---------------- NOTIFIKASI ---------------- */
function updateNotifBadge() {
  const unread = state.notifications.filter(n => !n.isRead).length;
  const badge = $('#notifBadge');
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function renderNotifDropdown() {
  const list = $('#notifList');
  if (!list) return;
  if (state.notifications.length === 0) {
    list.innerHTML = `<div class="empty" style="padding: 30px 20px;"><p class="muted" style="font-size: 13px;">Belum ada notifikasi.</p></div>`;
    return;
  }
  list.innerHTML = state.notifications.map(n => `
    <div class="notif-item ${n.isRead ? '' : 'unread'}" data-action="open-notif" data-id="${n.id}" data-req="${n.requestId || ''}">
      <div class="notif-icon">🔔</div>
      <div class="notif-content">
        <p>${esc(n.message)}</p>
        <span class="notif-time">${timeAgo(n.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

$('#notifBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  $('#notifDropdown').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  const dd = $('#notifDropdown');
  const btn = $('#notifBtn');
  if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.classList.add('hidden');
  }
});

$('#markAllRead')?.addEventListener('click', async (e) => {
  e.stopPropagation();
  const unread = state.notifications.filter(n => !n.isRead);
  for (const n of unread) {
    await updateDoc(doc(db, "notifications", n.id), { isRead: true });
  }
});

/* ---------------- SHARED HELPERS ---------------- */
const countBy = (list) => {
  const c = {};
  STATUS_ALL.forEach(s => c[s] = 0);
  list.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
  return c;
};
const getMyRequests = () => state.requests.filter(r => r.pemilikId === state.session.id).sort((a, b) => {
  const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
  const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
  return tB - tA;
});
const getAllRequests = () => [...state.requests].sort((a, b) => {
  const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
  const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
  return tB - tA;
});
const getPerumahanName = (id) => (state.perumahan || []).find(p => p.id === id)?.nama || '—';

function statGrid(items) {
  return `<div class="stats">${items.map(i => `
    <div class="stat">
      <div class="icon ${i.cls}">${i.icon}</div>
      <div><div class="val">${i.value}</div><div class="lbl">${i.label}</div></div>
    </div>`).join('')}</div>`;
}

function emptyState(icon, title, desc, btnLabel, btnPage) {
  return `<div class="empty">
    <div class="e-icon">${icon}</div>
    <h4>${esc(title)}</h4><p>${esc(desc)}</p>
    ${btnLabel ? `<button class="btn btn-primary" data-action="nav" data-page="${btnPage}">${esc(btnLabel)}</button>` : ''}
  </div>`;
}

async function uploadFile(file, path) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function renderAdminDashboard() {
  const all = getAllRequests();
  const c = countBy(all);
  const total = all.length || 1;
  const totalPemilik = state.users.filter(u => u.role === ROLE.USER).length;
  
  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Perumahan',   value: (state.perumahan || []).length, icon: '🏘️', cls: 'icon-indigo' },
      { label: 'Total Pembeli',     value: totalPemilik, icon: '👥', cls: 'icon-blue' },
      { label: 'Pengajuan Aktif',   value: c.pengerjaan + c.pemeriksaan + c.survei, icon: '🔧', cls: 'icon-purple' },
      { label: 'Perlu Verifikasi',  value: c.diajukan + c.verifikasi, icon: '⏳', cls: 'icon-amber' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head"><h3>Pengajuan Terbaru</h3><button class="link" data-action="nav" data-page="requests">Lihat semua</button></div>
        ${all.filter(r => ['diajukan','verifikasi','survei'].includes(r.status)).length
          ? `<div class="mini-list">${all.filter(r => ['diajukan','verifikasi','survei'].includes(r.status)).slice(0,5).map(miniRow).join('')}</div>`
          : emptyState('🎉', 'Semua sudah ditangani', 'Tidak ada pengajuan baru.', null, null)}
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:18px">Distribusi Status</h3>
        <div class="bars">
          ${STATUS_ALL.map(s => {
            const v = c[s], pct = Math.round((v / total) * 100);
            return `<div class="bar-row">
              <span class="bar-label">${STATUS[s].short}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${STATUS[s].color}"></div></div>
              <span class="bar-val">${v}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderUserDashboard() {
  const mine = getMyRequests();
  const firstName = (state.session.nama || 'User').split(' ')[0];
  const warranty = getWarrantyStatus(state.session.tanggalSerahTerima);

  $('#content').innerHTML = `
    <div class="countdown-widget ${warranty.expired ? 'expired' : ''}">
      <div>
        <h4>Status Garansi Retensi (100 Hari)</h4>
        <div class="cd-days">${warranty.expired ? 'Kedaluwarsa' : warranty.daysLeft + ' Hari'}</div>
        <div class="cd-desc">${warranty.text}</div>
        <div class="cd-desc" style="font-size:11px;margin-top:8px;opacity:0.7">Tgl Serah Terima: ${formatDate(state.session.tanggalSerahTerima)}</div>
      </div>
      <div class="cd-icon">${warranty.expired ? '⚠️' : '🛡️'}</div>
    </div>

    ${statGrid([
      { label: 'Total Pengajuan',  value: mine.length, icon: '📋', cls: 'icon-indigo' },
      { label: 'Dalam Proses',     value: mine.filter(r => !['selesai','ditolak'].includes(r.status)).length, icon: '🔧', cls: 'icon-blue' },
      { label: 'Selesai',          value: mine.filter(r => r.status === 'selesai').length, icon: '✅', cls: 'icon-green' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head"><h3>Pengajuan Terbaru</h3></div>
        ${mine.length
          ? `<div class="mini-list">${mine.slice(0, 5).map(miniRow).join('')}</div>`
          : emptyState('📭', 'Belum ada pengajuan', 'Ajukan retensi rumah Anda sekarang.', 'Ajukan Retensi', 'new')}
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Butuh Retensi?</h3>
        <button class="btn btn-primary btn-block" data-action="nav" data-page="new" style="margin-bottom:10px">➕ Ajukan Retensi</button>
        <button class="btn btn-ghost btn-block" data-action="nav" data-page="program">🎁 Info Program Retensi</button>
      </div>
    </div>
  `;
}

function renderLegalDashboard() {
  const pemilik = state.users.filter(u => u.role === ROLE.USER);
  const totalDok = pemilik.filter(u => u.dokumen && Object.keys(u.dokumen).length > 0).length;
  
  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Pemilik', value: pemilik.length, icon: '👥', cls: 'icon-indigo' },
      { label: 'Dokumen Lengkap', value: totalDok, icon: '✅', cls: 'icon-green' },
    ])}
    <div class="card card-pad">
      <h3>Akses Cepat</h3>
      <p class="muted" style="margin:10px 0;">Gunakan menu <b>Dokumen Hukum</b> di sidebar untuk memverifikasi KTP, SHM, PBB, dan Buku Nikah.</p>
      <button class="btn btn-primary" data-action="nav" data-page="pemilik">Lihat Dokumen Hukum</button>
    </div>
  `;
}

function miniRow(r) {
  return `
    <div class="mini-row" data-action="open-detail" data-id="${r.id}">
      <span class="mini-dot" style="background:${STATUS[r.status]?.color || '#ccc'}"></span>
      <div class="mini-body"><strong>${esc(r.title)}</strong><small>${esc(r.category)} · ${timeAgo(r.createdAt)}</small></div>
      ${statusBadge(r.status)}
    </div>`;
}

/* =========================================================
   PERUMAHAN
   ========================================================= */
async function renderPerumahan() {
  $('#content').innerHTML = `<div style="text-align:center; padding:50px;">Memuat data perumahan...</div>`;
  try {
    const snap = await getDocs(collection(db, "perumahan"));
    state.perumahan = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { toast("Gagal memuat perumahan", "error"); }

  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input class="input" id="searchPerumahan" placeholder="Cari perumahan..."></div>
      <div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="add-perumahan">➕ Tambah Perumahan</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Nama</th><th>Lokasi</th><th>Unit</th><th>Pemilik</th><th>Aksi</th></tr></thead>
          <tbody id="perumahanTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  $('#searchPerumahan').addEventListener('input', applyFilterPerumahan);
  applyFilterPerumahan();
}

function applyFilterPerumahan() {
  const q = ($('#searchPerumahan')?.value || '').toLowerCase().trim();
  const list = state.perumahan.filter(p => !q || String(p.nama || '').toLowerCase().includes(q));
  const tbody = $('#perumahanTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Belum ada data.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => {
    const count = state.users.filter(u => u.role === ROLE.USER && u.perumahanId === p.id).length;
    return `<tr>
      <td><span class="mono">${p.id.slice(0, 6)}</span></td>
      <td><strong>${esc(p.nama)}</strong></td>
      <td>${esc(p.lokasi)}</td>
      <td>${p.totalUnit || 0}</td>
      <td>${count}</td>
      <td class="row-actions">
        <button class="btn btn-primary btn-sm" data-action="view-pemilik-perumahan" data-id="${p.id}">Cek Pemilik</button>
        <button class="btn btn-ghost btn-sm" data-action="edit-perumahan" data-id="${p.id}">Ubah</button>
        <button class="btn btn-danger btn-sm" data-action="delete-perumahan" data-id="${p.id}">Hapus</button>
      </td>
    </tr>`;
  }).join('');
}

function openPerumahanModal(id) {
  const p = id ? state.perumahan.find(x => x.id === id) : null;
  const isEdit = !!p;
  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop">
      <div class="modal modal-narrow">
        <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Perumahan</h3><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body">
          <form id="perumahanForm">
            <div class="field"><label>Nama Perumahan *</label><input class="input" id="pNama" required value="${esc(p?.nama || '')}"></div>
            <div class="field"><label>Lokasi *</label><input class="input" id="pLokasi" required value="${esc(p?.lokasi || '')}"></div>
            <div class="field"><label>Total Unit *</label><input class="input" type="number" id="pUnit" required value="${p?.totalUnit || ''}"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  $('#perumahanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nama: $('#pNama').value.trim(),
      lokasi: $('#pLokasi').value.trim(),
      totalUnit: Number($('#pUnit').value),
    };
    try {
      if (isEdit) {
        await updateDoc(doc(db, "perumahan", p.id), data);
      } else {
        await addDoc(collection(db, "perumahan"), data);
      }
      toast('Berhasil disimpan', 'success');
      closeModal(); renderPerumahan();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function openPemilikPerumahanModal(perumahanId) {
  const p = state.perumahan.find(x => x.id === perumahanId);
  const users = state.users.filter(u => u.role === ROLE.USER && u.perumahanId === perumahanId);
  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop">
      <div class="modal modal-narrow">
        <div class="modal-head"><h3>Pemilik: ${esc(p.nama)}</h3><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body">
          ${users.length ? users.map(u => `
            <div style="display:flex;justify-content:space-between;padding:10px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;">
              <div><strong>${esc(u.nama)}</strong><br><small>Blok ${u.blok || '-'}</small></div>
              <button class="btn btn-ghost btn-sm" data-action="view-documents" data-id="${u.id}">Lihat Dokumen</button>
            </div>
          `).join('') : '<p class="muted">Belum ada pemilik.</p>'}
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
}

/* =========================================================
   PEMILIK & DOKUMEN
   ========================================================= */
function renderPemilik() {
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input class="input" id="searchPemilik" placeholder="Cari pemilik..."></div>
      <div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="add-pemilik">➕ Tambah Pembeli</button>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Nama</th><th>Email</th><th>Blok</th><th>Masa Retensi</th><th>Aksi</th></tr></thead>
      <tbody id="pemilikTbody"></tbody>
    </table></div></div>
  `;
  $('#searchPemilik').addEventListener('input', applyFilterPemilik);
  applyFilterPemilik();
}

function applyFilterPemilik() {
  const q = ($('#searchPemilik')?.value || '').toLowerCase().trim();
  let list = state.users.filter(u => u.role === ROLE.USER);
  if (q) list = list.filter(u => String(u.nama || '').toLowerCase().includes(q));
  
  const tbody = $('#pemilikTbody');
  if (!tbody) return;
  tbody.innerHTML = list.length ? list.map(u => {
    const w = getWarrantyStatus(u.tanggalSerahTerima);
    return `<tr>
      <td><strong>${esc(u.nama)}</strong></td>
      <td>${esc(u.email || '—')}</td>
      <td>${esc(u.blok || '—')}</td>
      <td>${w.expired ? '<span class="status ditolak">Habis</span>' : `<span class="status selesai">${w.daysLeft} Hari</span>`}</td>
      <td class="row-actions">
        <button class="btn btn-ghost btn-sm" data-action="view-documents" data-id="${u.id}">Dokumen</button>
        <button class="btn btn-ghost btn-sm" data-action="edit-pemilik" data-id="${u.id}">Ubah</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty">Belum ada data.</div></td></tr>`;
}

function renderLegalDokumen() {
  const list = state.users.filter(u => u.role === ROLE.USER);
  $('#content').innerHTML = `
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Nama Pemilik</th><th>KTP</th><th>SHM</th><th>PBB</th><th>Buku Nikah</th></tr></thead>
      <tbody>
        ${list.map(u => {
          const d = u.dokumen || {};
          const link = (url) => url ? `<a href="${url}" target="_blank" class="btn btn-ghost btn-sm">Lihat</a>` : `<span class="status ditolak">Kosong</span>`;
          return `<tr>
            <td><strong>${esc(u.nama)}</strong></td>
            <td>${link(d.ktp)}</td><td>${link(d.shm)}</td>
            <td>${link(d.pbb)}</td><td>${link(d.bukuNikah)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div></div>
  `;
}

function openPemilikModal(id) {
  const u = id ? state.users.find(x => x.id === id) : null;
  const isEdit = !!u;
  const docFields = DOC_KEYS.map(k => {
    const isReq = REQUIRED_DOCS.includes(k);
    return `<div class="field"><label>${DOC_LABELS[k]} ${isReq ? '*' : ''}</label>
      <input class="input" type="file" id="doc_${k}" ${isReq && !isEdit ? 'required' : ''}></div>`;
  }).join('');

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop">
      <div class="modal modal-lg">
        <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Pemilik</h3><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body">
          ${!isEdit ? `<div style="background:#fef3c7; color:#b45309; padding:10px; border-radius:8px; margin-bottom:15px; font-size:13px;">
            ⚠️ Untuk membuat akun login baru, daftarkan dulu email & password di <b>Firebase Console &gt; Authentication</b>, lalu masukkan profilnya di sini.
          </div>` : ''}
          <form id="pemilikForm">
            <div class="form-grid">
              <div class="field"><label>Nama *</label><input class="input" id="uNama" required value="${esc(u?.nama || '')}"></div>
              <div class="field"><label>Email (UID Auth) *</label><input class="input" type="email" id="uEmail" required value="${esc(u?.email || '')}" ${isEdit ? 'disabled' : ''}></div>
              <div class="field"><label>Blok *</label><input class="input" id="uBlok" required value="${esc(u?.blok || '')}"></div>
              <div class="field"><label>No. HP</label><input class="input" id="uPhone" value="${esc(u?.phone || '')}"></div>
              <div class="field full"><label>Tanggal Serah Terima *</label><input class="input" type="date" id="uTglSerah" required value="${u?.tanggalSerahTerima ? new Date(u.tanggalSerahTerima).toISOString().split('T')[0] : ''}"></div>
            </div>
            <h4 style="margin:20px 0 10px;">Dokumen</h4>
            <div class="form-grid">${docFields}</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';

  $('#pemilikForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Mengupload...';
    btn.disabled = true;

    try {
      const dokumenBaru = { ...(u?.dokumen || {}) };
      for (const k of DOC_KEYS) {
        const file = $(`#doc_${k}`).files[0];
        if (file) {
          dokumenBaru[k] = await uploadFile(file, `dokumen/${Date.now()}_${k}_${file.name}`);
        }
      }
      
      const data = {
        nama: $('#uNama').value.trim(),
        email: $('#uEmail').value.trim(),
        blok: $('#uBlok').value.trim(),
        phone: $('#uPhone').value.trim(),
        tanggalSerahTerima: new Date($('#uTglSerah').value).toISOString(),
        dokumen: dokumenBaru,
        role: ROLE.USER
      };

      if (isEdit) {
        await updateDoc(doc(db, "users", u.id), data);
      } else {
        toast('Untuk akun baru, buat di Firebase Auth terlebih dahulu.', 'info');
        // Simpan profile saja. User harus dibuat manual di Auth, atau via Backend.
        await addDoc(collection(db, "users"), { ...data, createdAt: serverTimestamp() });
      }
      toast('Berhasil disimpan', 'success');
      closeModal(); renderPemilik();
    } catch (err) {
      toast(err.message, 'error');
      btn.textContent = 'Simpan'; btn.disabled = false;
    }
  });
}

function openDocModal(userId) {
  const u = state.users.find(x => x.id === userId);
  const docsHtml = DOC_KEYS.map(k => {
    const src = u.dokumen?.[k];
    return `<div class="doc-card">
      <div class="doc-name">${DOC_LABELS[k].replace(' *', '')}</div>
      ${src ? `<img src="${src}" data-action="zoom-src" data-src="${src}">` : `<div class="empty-doc">Kosong</div>`}
    </div>`;
  }).join('');
  
  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop">
      <div class="modal modal-lg">
        <div class="modal-head"><h3>Dokumen: ${esc(u.nama)}</h3><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body"><div class="doc-grid">${docsHtml}</div></div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
}

/* =========================================================
   KELOLA AKUN (SUPER ADMIN)
   ========================================================= */
function renderKelolaAkun() {
  $('#content').innerHTML = `
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Aksi</th></tr></thead>
      <tbody>
        ${state.users.map(u => `
          <tr>
            <td><strong>${esc(u.nama)}</strong></td>
            <td>${esc(u.email)}</td>
            <td><span class="status ${u.role === 'superadmin' ? 'ditolak' : (u.role === 'admin' ? 'pengerjaan' : 'selesai')}">${u.role.toUpperCase()}</span></td>
            <td>${u.id !== state.session.id ? `<button class="btn btn-danger btn-sm" data-action="delete-user" data-id="${u.id}">Hapus Akses</button>` : '<em>(Anda)</em>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div></div>
  `;
}

/* =========================================================
   PENGAJUAN
   ========================================================= */
function renderNewRequest() {
  $('#content').innerHTML = `
    <div style="max-width:800px">
      <div class="card card-pad">
        <h3>Formulir Pengajuan Retensi</h3>
        <form id="requestForm" style="margin-top:20px;">
          <div class="field"><label>Judul *</label><input class="input" id="fTitle" required></div>
          <div class="field"><label>Kategori *</label>
            <select class="input" id="fCategory" required>
              ${CATEGORIES.map(c => `<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Deskripsi *</label><textarea class="input" id="fDesc" required></textarea></div>
          <div class="field"><label>Foto</label><input class="input" type="file" id="fPhotos" multiple accept="image/*"></div>
          <button type="submit" class="btn btn-primary">Kirim Pengajuan</button>
        </form>
      </div>
    </div>
  `;
  $('#requestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = 'Mengirim...'; btn.disabled = true;

    try {
      const photos = [];
      const files = $('#fPhotos').files;
      for (let i = 0; i < files.length; i++) {
        photos.push(await uploadFile(files[i], `requests/${Date.now()}_${i}`));
      }

      await addDoc(collection(db, "requests"), {
        pemilikId: state.session.id,
        ownerName: state.session.nama,
        perumahanNama: state.session.perumahanNama || '—',
        blok: state.session.blok || '—',
        title: $('#fTitle').value,
        category: $('#fCategory').value,
        description: $('#fDesc').value,
        photos,
        status: 'diajukan',
        assignedTo: '',
        estimatedCost: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        timeline: [{ status: 'diajukan', note: 'Pengajuan dibuat.', by: state.session.nama, role: 'user', at: new Date().toISOString(), photos: [] }]
      });

      await addDoc(collection(db, "notifications"), {
        userId: 'admin',
        message: `Pengajuan baru dari ${state.session.nama}`,
        requestId: 'NEW',
        isRead: false,
        createdAt: serverTimestamp()
      });

      toast('Pengajuan terkirim!', 'success');
      goTo('requests');
    } catch (err) { toast(err.message, 'error'); btn.textContent = 'Kirim'; btn.disabled = false; }
  });
}

function renderAdminRequests() {
  $('#content').innerHTML = `
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Pemilik</th><th>Judul</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>
        ${state.requests.map(r => `
          <tr>
            <td><span class="mono">#${r.id.slice(0,6)}</span></td>
            <td>${esc(r.ownerName)}</td>
            <td>${esc(r.title)}</td>
            <td>${statusBadge(r.status)}</td>
            <td><button class="btn btn-ghost btn-sm" data-action="open-detail" data-id="${r.id}">Kelola</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table></div></div>
  `;
}

function renderUserRequests() {
  const mine = getMyRequests();
  $('#content').innerHTML = `
    <div class="req-list">
      ${mine.length ? mine.map(r => `
        <div class="req-card" data-action="open-detail" data-id="${r.id}">
          <div class="req-thumb">🛠️</div>
          <div class="req-body">
            <h4>${esc(r.title)}</h4>
            <div class="req-meta">${statusBadge(r.status)}</div>
          </div>
        </div>
      `).join('') : emptyState('📭', 'Belum ada pengajuan', 'Ajukan retensi rumah Anda sekarang.', 'Ajukan Retensi', 'new')}
    </div>
  `;
}

async function openDetail(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  
  const timelineHtml = (r.timeline || []).map(t => `
    <div class="tl-item">
      <span class="tl-dot"></span>
      <strong>${STATUS[t.status]?.label || t.status}</strong> - ${esc(t.note)}<br>
      <small>${formatDateTime(t.at)}</small>
      ${t.photos && t.photos.length ? `<div class="tl-photos">${t.photos.map(p => `<img src="${p}" data-action="zoom-src" data-src="${p}">`).join('')}</div>` : ''}
    </div>
  `).join('');

  const adminPanel = (state.isAdmin || state.isSuperAdmin) ? `
    <div class="side-box">
      <h4>Kelola Pengajuan</h4>
      <div class="field">
        <label>Status</label>
        <select class="input" id="mStatus">
          ${STATUS_ALL.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Catatan Progres</label><textarea class="input" id="mNote"></textarea></div>
      <div class="field"><label>Foto Dokumentasi</label><input class="input" type="file" id="mPhoto" accept="image/*"></div>
      <button class="btn btn-primary btn-block" data-action="save-request" data-id="${r.id}">Simpan Perubahan</button>
    </div>
  ` : '';

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop">
      <div class="modal modal-lg">
        <div class="modal-head"><h3>${esc(r.title)}</h3><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body">
          <div class="detail-grid">
            <div>
              <div style="margin-bottom:20px;">${statusBadge(r.status)}</div>
              <h4>Deskripsi</h4><p>${esc(r.description)}</p>
              <h4 style="margin-top:20px;">Timeline</h4>
              <div class="timeline">${timelineHtml}</div>
            </div>
            <aside>${adminPanel}</aside>
          </div>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
}

async function saveRequestChanges(id) {
  const r = state.requests.find(x => x.id === id);
  const newStatus = $('#mStatus').value;
  const note = $('#mNote').value;
  const photoFile = $('#mPhoto').files[0];
  
  if (!note) return toast('Catatan wajib diisi', 'error');

  let photoUrl = null;
  if (photoFile) photoUrl = await uploadFile(photoFile, `progress/${Date.now()}`);

  const newTimeline = [...(r.timeline || []), {
    status: newStatus, note, by: state.session.nama, role: 'admin',
    at: new Date().toISOString(), photos: photoUrl ? [photoUrl] : []
  }];

  await updateDoc(doc(db, "requests", id), {
    status: newStatus, timeline: newTimeline, updatedAt: serverTimestamp()
  });

  if (newStatus !== r.status) {
    await addDoc(collection(db, "notifications"), {
      userId: r.pemilikId,
      message: `Pengajuan "${r.title}" diupdate ke: ${STATUS[newStatus].label}`,
      requestId: id, isRead: false, createdAt: serverTimestamp()
    });
  }
  
  closeModal(); toast('Disimpan', 'success');
}

/* ---------------- PROGRAM & HELP ---------------- */
function renderProgram() {
  $('#content').innerHTML = `
    <div class="program-hero">
      <h2>🛡️ Program Garansi Retensi 100 Hari</h2>
      <p>Perbaikan gratis untuk kerusakan yang timbul dalam 100 hari pertama sejak serah terima kunci.</p>
    </div>
    <div class="card card-pad">
      <h3>Ketentuan</h3>
      <ul style="margin:15px 0 15px 20px; line-height: 1.8;">
        <li>Berlaku 100 hari sejak Tanggal Serah Terima.</li>
        <li>Gratis biaya jasa & material untuk cacat produksi.</li>
        <li>Setelah 100 hari, dikenakan biaya tambahan (diverifikasi Admin).</li>
      </ul>
      <button class="btn btn-primary" data-action="nav" data-page="new">Ajukan Retensi Sekarang</button>
    </div>
  `;
}

function renderHelp() {
  $('#content').innerHTML = `
    <div class="card card-pad">
      <h3>Panduan Singkat</h3>
      <p style="margin-top:10px; line-height:1.8;">
        1. Login menggunakan Email & Password yang didaftarkan.<br>
        2. Pemilik rumah dapat mengajukan retensi via menu "Ajukan Retensi".<br>
        3. Admin/Superadmin akan memverifikasi dan mengubah status.<br>
        4. Pantau notifikasi di ikon lonceng 🔔.
      </p>
    </div>
  `;
}

/* ---------------- SIDEBAR & EVENT ---------------- */
function openSidebar() { $('#sidebar')?.classList.add('open'); $('#sidebarBackdrop')?.classList.add('show'); }
function closeSidebar() { $('#sidebar')?.classList.remove('open'); $('#sidebarBackdrop')?.classList.remove('show'); }

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'nav': goTo(el.dataset.page); break;
    case 'close-modal': closeModal(); break;
    case 'add-perumahan': openPerumahanModal(null); break;
    case 'edit-perumahan': openPerumahanModal(el.dataset.id); break;
    case 'view-pemilik-perumahan': openPemilikPerumahanModal(el.dataset.id); break;
    case 'add-pemilik': openPemilikModal(null); break;
    case 'edit-pemilik': openPemilikModal(el.dataset.id); break;
    case 'view-documents': openDocModal(el.dataset.id); break;
    case 'open-detail': openDetail(el.dataset.id); break;
    case 'save-request': saveRequestChanges(el.dataset.id); break;
    
    case 'delete-perumahan':
      if (confirm("Hapus perumahan ini?")) {
        await deleteDoc(doc(db, "perumahan", el.dataset.id));
        renderPerumahan(); toast('Dihapus');
      }
      break;
    
    case 'delete-user':
      if (confirm("Hapus akses user ini? (Akun Auth harus dihapus manual dari Console)")) {
        await deleteDoc(doc(db, "users", el.dataset.id));
        toast('Akses dicabut');
      }
      break;

    case 'zoom-src': {
      $('#lightboxImg').src = el.dataset.src;
      $('#lightbox').classList.remove('hidden');
      break;
    }

    case 'open-notif':
      await updateDoc(doc(db, "notifications", el.dataset.id), { isRead: true });
      $('#notifDropdown').classList.add('hidden');
      break;
  }
});

function closeModal() { $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; }
$('#lightbox')?.addEventListener('click', () => $('#lightbox').classList.add('hidden'));

$('#menuToggle')?.addEventListener('click', openSidebar);
$('#sidebarBackdrop')?.addEventListener('click', closeSidebar);
