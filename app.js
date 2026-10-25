/* =========================================================
   Dreamland — Property Management CRM
   Frontend demo (vanilla JS + localStorage)
   ========================================================= */

/* ---------------- Status 7 tahap + ditolak ---------------- */
const STATUS = {
  diajukan:    { label: 'Diajukan',    short: 'Diajukan',    color: '#94a3b8', bg: '#f1f5f9' },
  verifikasi:  { label: 'Verifikasi',  short: 'Verifikasi',  color: '#f59e0b', bg: '#fef3c7' },
  survei:      { label: 'Survei',      short: 'Survei',      color: '#3b82f6', bg: '#dbeafe' },
  perencanaan: { label: 'Perencanaan', short: 'Perencanaan', color: '#8b5cf6', bg: '#ede9fe' },
  pengerjaan:  { label: 'Pengerjaan',  short: 'Pengerjaan',  color: '#6366f1', bg: '#e0e7ff' },
  pemeriksaan: { label: 'Pemeriksaan', short: 'Pemeriksaan', color: '#06b6d4', bg: '#cffafe' },
  selesai:     { label: 'Selesai',     short: 'Selesai',     color: '#10b981', bg: '#d1fae5' },
  ditolak:     { label: 'Ditolak',     short: 'Ditolak',     color: '#ef4444', bg: '#fee2e2' },
};
const STATUS_FLOW = ['diajukan', 'verifikasi', 'survei', 'perencanaan', 'pengerjaan', 'pemeriksaan', 'selesai'];
const STATUS_ALL  = [...STATUS_FLOW, 'ditolak'];

const CATEGORIES = [
  'Renovasi Ruangan', 'Perbaikan Atap', 'Perbaikan Plafon',
  'Plumbing / Air', 'Instalasi Listrik', 'Pengecatan',
  'Keramik / Lantai', 'Taman & Carport', 'Lainnya'
];
const PRIORITIES = ['Rendah', 'Sedang', 'Tinggi'];

const NAV = {
  admin: [
    { id: 'dashboard', label: 'Dashboard',        icon: '📊' },
    { id: 'perumahan', label: 'Perumahan',        icon: '🏘️' },
    { id: 'pemilik',   label: 'Pemilik Rumah',    icon: '👥' },
    { id: 'requests',  label: 'Pengajuan Renovasi', icon: '📋' },
    { id: 'help',      label: 'Panduan',          icon: '💡' },
  ],
  user: [
    { id: 'dashboard', label: 'Dashboard',         icon: '📊' },
    { id: 'program',   label: 'Program & Garansi', icon: '🎁' },
    { id: 'new',       label: 'Ajukan Renovasi',   icon: '➕' },
    { id: 'requests',  label: 'Pengajuan Saya',    icon: '📋' },
    { id: 'help',      label: 'Panduan',           icon: '💡' },
  ],
};

const PAGE_META = {
  dashboard: { title: 'Dashboard',         sub: 'Ringkasan sistem Dreamland' },
  perumahan: { title: 'Perumahan',         sub: 'Kelola data perumahan' },
  pemilik:   { title: 'Pemilik Rumah',     sub: 'Kelola akun pemilik rumah' },
  requests:  { title: 'Pengajuan Renovasi', sub: 'Pantau seluruh pengajuan' },
  new:       { title: 'Ajukan Renovasi',   sub: 'Lengkapi formulir pengajuan' },
  program:   { title: 'Program & Garansi', sub: 'Informasi renovasi garansi awal' },
  help:      { title: 'Panduan',           sub: 'Cara menggunakan Dreamland' },
};

/* ---------------- Helpers ---------------- */
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const uid = (p = 'REQ') => `${p}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const initials = (name) => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const statusBadge = (s) => `<span class="status ${s}">${STATUS[s]?.label || s}</span>`;

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return fmtDate(iso);
}

/* =========================================================
   IMPLEMENTASI ALGORITMA (UKK CLUSTER 1)
   ========================================================= */
/**
 * FUNGSI 1: BUBBLE SORT
 * Mengurutkan array objek berdasarkan ID secara Ascending (A-Z)
 */
function bubbleSortById(arr) {
  console.time('Waktu Bubble Sort'); // Profiling Program
  let len = arr.length;
  let tempArr = [...arr]; // Clone array agar state asli tidak rusak
  
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i - 1; j++) {
      if (tempArr[j].id > tempArr[j + 1].id) {
        let temp = tempArr[j];
        tempArr[j] = tempArr[j + 1];
        tempArr[j + 1] = temp;
      }
    }
  }
  console.timeEnd('Waktu Bubble Sort');
  return tempArr;
}

/**
 * FUNGSI 2: BINARY SEARCH
 * Mencari ID pengajuan di dalam array yang sudah di-sort
 */
function binarySearchById(arr, targetId) {
  console.time('Waktu Binary Search'); // Profiling Program
  let left = 0;
  let right = arr.length - 1;
  let result = null;

  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    
    if (arr[mid].id === targetId) {
      result = arr[mid];
      break;
    }
    if (arr[mid].id < targetId) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  console.timeEnd('Waktu Binary Search');
  return result;
}
/* ========================================================= */

/* ---------------- Storage ---------------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Penyimpanan penuh.', 'error'); return false; } },
  del(k)      { localStorage.removeItem(k); },
};

const K_USERS    = 'dl_users';
const K_PERUMAHAN= 'dl_perumahan';
const K_REQ      = 'dl_requests';
const K_SESSION  = 'dl_session';

/* ---------------- State ---------------- */
const state = {
  session: null,
  page: 'dashboard',
  users: [],
  perumahan: [],
  requests: [],
  draftPhotos: [],
};

/* ---------------- Seed ---------------- */
function seedPerumahan() {
  return [
    { id: 'P-01', nama: 'Dreamland Residence', lokasi: 'Bogor, Jawa Barat', totalUnit: 120,
      deskripsi: 'Perumahan modern dengan konsep hijau, 120 unit rumah tipe 45–70.' },
    { id: 'P-02', nama: 'Dreamland Garden', lokasi: 'Depok, Jawa Barat', totalUnit: 80,
      deskripsi: 'Cluster eksklusif dengan taman pusat, 80 unit rumah tipe 60–90.' },
    { id: 'P-03', nama: 'Dreamland Valley', lokasi: 'Sentul, Bogor', totalUnit: 150,
      deskripsi: 'Perumahan dengan pemandangan perbukitan, 150 unit rumah tipe 55–80.' },
  ];
}

function seedUsers() {
  const now = Date.now();
  return [
    { id: 'U-01', username: 'admin', password: 'admin123', role: 'admin',
      nama: 'Admin Dreamland', phone: '021-555-0123', email: 'admin@infodreamland.my.id',
      perumahanId: null, blok: null, createdAt: new Date(now - 60*86400000).toISOString() },
    { id: 'U-02', username: 'budi', password: '123456', role: 'user',
      nama: 'Budi Santoso', phone: '0812-3456-7890', email: 'budi@email.com',
      perumahanId: 'P-01', blok: 'A-12', createdAt: new Date(now - 40*86400000).toISOString() },
    { id: 'U-03', username: 'siti', password: '123456', role: 'user',
      nama: 'Siti Rahmawati', phone: '0813-9876-5432', email: 'siti@email.com',
      perumahanId: 'P-02', blok: 'B-07', createdAt: new Date(now - 35*86400000).toISOString() },
    { id: 'U-04', username: 'andi', password: '123456', role: 'user',
      nama: 'Andi Wijaya', phone: '0815-2233-4455', email: 'andi@email.com',
      perumahanId: 'P-03', blok: 'C-05', createdAt: new Date(now - 20*86400000).toISOString() },
  ];
}

function seedRequests() {
  const now = Date.now();
  const d = (days) => new Date(now - days * 86400000).toISOString();
  return [
    {
      id: 'REQ-A1B2', pemilikId: 'U-02', ownerName: 'Budi Santoso',
      perumahanId: 'P-01', perumahanNama: 'Dreamland Residence',
      blok: 'A-12', phone: '0812-3456-7890',
      title: 'Renovasi Dapur & Penggantian Kitchen Set',
      category: 'Renovasi Ruangan', priority: 'Tinggi',
      description: 'Dapur lama sudah tidak representatif. Ingin renovasi total dengan kitchen set baru, penambahan meja island, dan penggantian keramik lantai. Mohon survei dan estimasi biaya.',
      photos: [], status: 'pengerjaan', assignedTo: 'CV Karya Bangun', estimatedCost: 25000000,
      createdAt: d(14), updatedAt: d(2),
      timeline: [
        { status: 'diajukan',    note: 'Pengajuan renovasi dibuat oleh pemilik rumah.', by: 'Budi Santoso', role: 'user', at: d(14) },
        { status: 'verifikasi',  note: 'Kelengkapan pengajuan sudah sesuai. Lanjut ke tahap survei.', by: 'Admin Dreamland', role: 'admin', at: d(12) },
        { status: 'survei',      note: 'Survei lokasi selesai. Kondisi dapur sesuai deskripsi.', by: 'Admin Dreamland', role: 'admin', at: d(9) },
        { status: 'perencanaan', note: 'Rencana renovasi & RAB disusun. Estimasi biaya Rp 25.000.000.', by: 'Admin Dreamland', role: 'admin', at: d(6) },
        { status: 'pengerjaan',  note: 'Pekerjaan dimulai oleh CV Karya Bangun. Estimasi 3 minggu.', by: 'Admin Dreamland', role: 'admin', at: d(2) },
      ],
    },
    {
      id: 'REQ-D4E5', pemilikId: 'U-02', ownerName: 'Budi Santoso',
      perumahanId: 'P-01', perumahanNama: 'Dreamland Residence',
      blok: 'A-12', phone: '0812-3456-7890',
      title: 'Perbaikan Atap Bocor di Kamar Utama',
      category: 'Perbaikan Atap', priority: 'Tinggi',
      description: 'Atap bocor saat hujan deras, air menetes ke plafon kamar utama. Sudah ada bercak kuning di plafon. Mohon segera diperiksa karena khawatir merusak plafon gypsum.',
      photos: [], status: 'verifikasi', assignedTo: '', estimatedCost: 0,
      createdAt: d(2), updatedAt: d(1),
      timeline: [
        { status: 'diajukan',   note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Budi Santoso', role: 'user', at: d(2) },
        { status: 'verifikasi', note: 'Pengajuan diterima. Sedang diperiksa kelengkapannya.', by: 'Admin Dreamland', role: 'admin', at: d(1) },
      ],
    },
    {
      id: 'REQ-G7H8', pemilikId: 'U-03', ownerName: 'Siti Rahmawati',
      perumahanId: 'P-02', perumahanNama: 'Dreamland Garden',
      blok: 'B-07', phone: '0813-9876-5432',
      title: 'Pengecatan Ulang Fasad Rumah',
      category: 'Pengecatan', priority: 'Sedang',
      description: 'Cat fasad memudar dan mengelupas di beberapa titik. Ingin dicat ulang warna putih tulang. Luas fasad ±120 m².',
      photos: [], status: 'survei', assignedTo: 'Tukang Cat Mandiri', estimatedCost: 8000000,
      createdAt: d(6), updatedAt: d(2),
      timeline: [
        { status: 'diajukan',   note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Siti Rahmawati', role: 'user', at: d(6) },
        { status: 'verifikasi', note: 'Pengajuan disetujui. Lanjut ke survei lokasi.', by: 'Admin Dreamland', role: 'admin', at: d(4) },
        { status: 'survei',     note: 'Tim survei dijadwalkan minggu ini.', by: 'Admin Dreamland', role: 'admin', at: d(2) },
      ],
    },
    {
      id: 'REQ-J9K0', pemilikId: 'U-03', ownerName: 'Siti Rahmawati',
      perumahanId: 'P-02', perumahanNama: 'Dreamland Garden',
      blok: 'B-07', phone: '0813-9876-5432',
      title: 'Perbaikan Pipa Air Bocor Kamar Mandi',
      category: 'Plumbing / Air', priority: 'Sedang',
      description: 'Pipa air di kamar mandi bawah bocor, lantai selalu basah. Sudah diisolasi sendiri tapi belum berhasil.',
      photos: [], status: 'selesai', assignedTo: 'Jaya Plumbing', estimatedCost: 1500000,
      createdAt: d(30), updatedAt: d(18),
      timeline: [
        { status: 'diajukan',    note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Siti Rahmawati', role: 'user', at: d(30) },
        { status: 'verifikasi',  note: 'Pengajuan disetujui.', by: 'Admin Dreamland', role: 'admin', at: d(28) },
        { status: 'survei',      note: 'Survei lokasi selesai.', by: 'Admin Dreamland', role: 'admin', at: d(26) },
        { status: 'perencanaan', note: 'Rencana perbaikan disusun. Estimasi Rp 1.500.000.', by: 'Admin Dreamland', role: 'admin', at: d(24) },
        { status: 'pengerjaan',  note: 'Pengerjaan dimulai oleh Jaya Plumbing.', by: 'Admin Dreamland', role: 'admin', at: d(22) },
        { status: 'pemeriksaan', note: 'Pemeriksaan hasil pekerjaan selesai, tidak ada kebocoran.', by: 'Admin Dreamland', role: 'admin', at: d(19) },
        { status: 'selesai',     note: 'Pekerjaan dinyatakan selesai dan ditutup.', by: 'Admin Dreamland', role: 'admin', at: d(18) },
      ],
    },
    {
      id: 'REQ-M1N2', pemilikId: 'U-04', ownerName: 'Andi Wijaya',
      perumahanId: 'P-03', perumahanNama: 'Dreamland Valley',
      blok: 'C-05', phone: '0815-2233-4455',
      title: 'Instalasi Stop Kontak Tambahan Ruang Keluarga',
      category: 'Instalasi Listrik', priority: 'Rendah',
      description: 'Butuh 2 titik stop kontak tambahan di ruang keluarga untuk perangkat elektronik.',
      photos: [], status: 'ditolak', assignedTo: '', estimatedCost: 0,
      createdAt: d(10), updatedAt: d(8),
      timeline: [
        { status: 'diajukan',   note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Andi Wijaya', role: 'user', at: d(10) },
        { status: 'ditolak',    note: 'Di luar cakupan garansi renovasi awal. Silakan hubungi teknisi listrik pribadi.', by: 'Admin Dreamland', role: 'admin', at: d(8) },
      ],
    },
  ];
}

/* ---------------- Toast ---------------- */
function toast(msg, type = 'info') {
  const wrap = $('#toastWrap');
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

/* ---------------- Persist ---------------- */
function persistAll() {
  store.set(K_USERS, state.users);
  store.set(K_PERUMAHAN, state.perumahan);
  store.set(K_REQ, state.requests);
}

/* ---------------- Auth ---------------- */
function showLogin() { $('#loginScreen').classList.remove('hidden'); $('#app').classList.add('hidden'); }
function enterApp() {
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  state.page = 'dashboard';
  renderNav(); renderShellUser(); renderPage();
}

function renderShellUser() {
  const s = state.session;
  $('#userChip').innerHTML = `
    <div class="avatar">${esc(initials(s.nama))}</div>
    <div class="uc-text">
      <strong>${esc(s.nama)}</strong>
      <small>${s.role === 'admin' ? 'Admin / Pengelola' : (s.blok ? 'Blok ' + esc(s.blok) : 'Pemilik Rumah')}</small>
    </div>`;
  const badge = $('#roleBadge');
  badge.textContent = s.role === 'admin' ? 'Admin / Pengelola' : 'Pemilik Rumah';
  badge.className = 'role-badge' + (s.role === 'admin' ? ' admin' : '');
}

function logout() {
  store.del(K_SESSION);
  state.session = null;
  closeModal();
  showLogin();
  toast('Anda telah keluar', 'info');
}

/* ---------------- Navigation ---------------- */
function renderNav() {
  const items = NAV[state.session.role] || NAV.user;
  $('#navList').innerHTML = items.map(it => `
    <button class="nav-item ${it.id === state.page ? 'active' : ''}" data-action="nav" data-page="${it.id}">
      <span class="ico">${it.icon}</span><span>${it.label}</span>
    </button>`).join('');
}

function goTo(page) { state.page = page; renderNav(); renderPage(); }

function renderPage() {
  const meta = PAGE_META[state.page] || PAGE_META.dashboard;
  $('#pageTitle').textContent = meta.title;
  $('#pageSubtitle').textContent = meta.sub;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const role = state.session.role;
  switch (state.page) {
    case 'dashboard': return role === 'admin' ? renderAdminDashboard() : renderUserDashboard();
    case 'perumahan': return renderPerumahan();
    case 'pemilik':   return renderPemilik();
    case 'new':       return renderNewRequest();
    case 'requests':  return role === 'admin' ? renderAdminRequests() : renderUserRequests();
    case 'program':   return renderProgram();
    case 'help':      return renderHelp();
    default:          return role === 'admin' ? renderAdminDashboard() : renderUserDashboard();
  }
}

/* ---------------- Helpers ---------------- */
function countBy(list) {
  const c = {};
  STATUS_ALL.forEach(s => c[s] = 0);
  list.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
  return c;
}
const getMyRequests = () => state.requests
  .filter(r => r.pemilikId === state.session.id)
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const getAllRequests = () => [...state.requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const getPerumahanName = (id) => state.perumahan.find(p => p.id === id)?.nama || '—';

function statGrid(items) {
  return `<div class="stats">${items.map(i => `
    <div class="stat">
      <div class="icon ${i.cls}">${i.icon}</div>
      <div>
        <div class="val">${i.value}</div>
        <div class="lbl">${i.label}</div>
      </div>
    </div>`).join('')}</div>`;
}
function emptyState(icon, title, desc, btnLabel, btnPage) {
  return `<div class="empty">
    <div class="e-icon">${icon}</div>
    <h4>${esc(title)}</h4>
    <p>${esc(desc)}</p>
    ${btnLabel ? `<button class="btn btn-primary" data-action="nav" data-page="${btnPage}">${esc(btnLabel)}</button>` : ''}
  </div>`;
}

/* =========================================================
   ADMIN — DASHBOARD
   ========================================================= */
function renderAdminDashboard() {
  const all = getAllRequests();
  const c = countBy(all);
  const total = all.length || 1;
  const totalPemilik = state.users.filter(u => u.role === 'user').length;
  const activeCount = c.pengerjaan + c.pemeriksaan + c.survei + c.perencanaan;
  const pendingVerify = c.diajukan + c.verifikasi;

  const activeList = all.filter(r => ['survei','perencanaan','pengerjaan','pemeriksaan'].includes(r.status)).slice(0, 4);

  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Perumahan',   value: state.perumahan.length, icon: '🏘️', cls: 'icon-indigo' },
      { label: 'Total Pemilik',     value: totalPemilik,           icon: '👥', cls: 'icon-blue' },
      { label: 'Pengajuan Aktif',   value: activeCount,            icon: '🔧', cls: 'icon-purple' },
      { label: 'Perlu Verifikasi',  value: pendingVerify,          icon: '⏳', cls: 'icon-amber' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Pengajuan Menunggu Tindakan</h3>
          <button class="link" data-action="nav" data-page="requests">Lihat semua</button>
        </div>
        ${all.filter(r => ['diajukan','verifikasi','survei','perencanaan'].includes(r.status)).length
          ? `<div class="mini-list">${all.filter(r => ['diajukan','verifikasi','survei','perencanaan'].includes(r.status)).slice(0,5).map(miniRow).join('')}</div>`
          : emptyState('🎉', 'Semua sudah ditangani', 'Tidak ada pengajuan yang menunggu tindakan.', null, null)}
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

    <div class="card card-pad" style="margin-top:20px">
      <div class="card-head">
        <h3>Pekerjaan Berjalan</h3>
        <span class="muted" style="font-size:13px">${activeList.length} pengajuan aktif</span>
      </div>
      ${activeList.length
        ? `<div class="mini-list">${activeList.map(miniRow).join('')}</div>`
        : `<p class="muted" style="font-size:13.5px">Belum ada pekerjaan aktif saat ini.</p>`}
    </div>
  `;
}

/* =========================================================
   USER — DASHBOARD
   ========================================================= */
function renderUserDashboard() {
  const mine = getMyRequests();
  const c = countBy(mine);
  const firstName = state.session.nama.split(' ')[0];
  const perumahan = getPerumahanName(state.session.perumahanId);

  $('#pageSubtitle').textContent = `Halo ${firstName}, pantau pengajuan renovasi Anda di sini.`;

  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Pengajuan',  value: mine.length,          icon: '📋', cls: 'icon-indigo' },
      { label: 'Dalam Proses',     value: mine.filter(r => !['selesai','ditolak'].includes(r.status)).length, icon: '🔧', cls: 'icon-blue' },
      { label: 'Selesai',          value: c.selesai,            icon: '✅', cls: 'icon-green' },
      { label: 'Ditolak',          value: c.ditolak,            icon: '✕',  cls: 'icon-rose' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Pengajuan Terbaru</h3>
          ${mine.length ? `<button class="link" data-action="nav" data-page="requests">Lihat semua</button>` : ''}
        </div>
        ${mine.length
          ? `<div class="mini-list">${mine.slice(0, 5).map(miniRow).join('')}</div>`
          : emptyState('📭', 'Belum ada pengajuan', 'Mulai ajukan renovasi rumah Anda sekarang.', 'Ajukan Renovasi', 'new')}
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Butuh Renovasi?</h3>
        <p class="muted" style="font-size:13.5px;margin-bottom:18px;line-height:1.65">
          Ajukan permintaan renovasi rumah Anda. Lengkapi deskripsi dan foto agar admin dapat memproses lebih cepat.
        </p>
        <button class="btn btn-primary btn-block" data-action="nav" data-page="new" style="margin-bottom:10px">➕ Ajukan Renovasi</button>
        <button class="btn btn-ghost btn-block" data-action="nav" data-page="program">🎁 Info Program Garansi</button>

        <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:12px">Info Rumah</div>
          <div class="info-item" style="margin-bottom:9px">
            <div class="k">Perumahan</div><div class="v">${esc(perumahan)}</div>
          </div>
          <div class="info-item">
            <div class="k">Blok / No. Rumah</div><div class="v">${esc(state.session.blok || '—')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function miniRow(r) {
  return `
    <div class="mini-row" data-action="open-detail" data-id="${r.id}">
      <span class="mini-dot" style="background:${STATUS[r.status].color}"></span>
      <div class="mini-body">
        <strong>${esc(r.title)}</strong>
        <small>${esc(r.category)} · ${timeAgo(r.createdAt)}</small>
      </div>
      ${statusBadge(r.status)}
    </div>`;
}

/* =========================================================
   ADMIN — PERUMAHAN
   ========================================================= */
function renderPerumahan() {
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        <input class="input" id="searchPerumahan" placeholder="Cari nama atau lokasi perumahan...">
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="add-perumahan">➕ Tambah Perumahan</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Nama Perumahan</th><th>Lokasi</th>
              <th>Total Unit</th><th>Pemilik Terdaftar</th><th></th>
            </tr>
          </thead>
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
  const list = state.perumahan.filter(p =>
    !q || p.nama.toLowerCase().includes(q) || p.lokasi.toLowerCase().includes(q)
  );
  const tbody = $('#perumahanTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty" style="padding:44px 20px">
        <div class="e-icon">🏘️</div>
        <h4>Tidak ada perumahan</h4>
        <p>Tambahkan perumahan pertama Anda.</p>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => {
    const count = state.users.filter(u => u.role === 'user' && u.perumahanId === p.id).length;
    return `<tr>
      <td><span class="mono">${p.id}</span></td>
      <td><span class="td-title">${esc(p.nama)}</span></td>
      <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(p.lokasi)}</span></td>
      <td><strong>${p.totalUnit}</strong> unit</td>
      <td><strong>${count}</strong> orang</td>
      <td class="row-actions">
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
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-narrow">
        <div class="modal-head">
          <div><h3>${isEdit ? 'Ubah Perumahan' : 'Tambah Perumahan'}</h3></div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="perumahanForm">
            <div class="field">
              <label for="pNama">Nama Perumahan *</label>
              <input class="input" id="pNama" required value="${esc(p?.nama || '')}" placeholder="Contoh: Dreamland Residence">
            </div>
            <div class="field">
              <label for="pLokasi">Lokasi *</label>
              <input class="input" id="pLokasi" required value="${esc(p?.lokasi || '')}" placeholder="Contoh: Bogor, Jawa Barat">
            </div>
            <div class="field">
              <label for="pUnit">Total Unit *</label>
              <input class="input" type="number" min="1" id="pUnit" required value="${p?.totalUnit || ''}" placeholder="120">
            </div>
            <div class="field">
              <label for="pDesk">Deskripsi</label>
              <textarea class="input" id="pDesk" rows="3" placeholder="Deskripsi singkat perumahan...">${esc(p?.deskripsi || '')}</textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Perumahan'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';

  $('#perumahanForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = $('#pNama').value.trim();
    const lokasi = $('#pLokasi').value.trim();
    const totalUnit = Number($('#pUnit').value);
    const deskripsi = $('#pDesk').value.trim();
    if (!nama || !lokasi || !totalUnit) return toast('Lengkapi field wajib', 'error');

    if (isEdit) {
      p.nama = nama; p.lokasi = lokasi; p.totalUnit = totalUnit; p.deskripsi = deskripsi;
      toast('Perumahan diperbarui', 'success');
    } else {
      state.perumahan.push({ id: uid('P'), nama, lokasi, totalUnit, deskripsi });
      toast('Perumahan ditambahkan', 'success');
    }
    persistAll();
    closeModal();
    renderPerumahan();
  });
}

/* =========================================================
   ADMIN — PEMILIK RUMAH
   ========================================================= */
function renderPemilik() {
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        <input class="input" id="searchPemilik" placeholder="Cari nama, username, blok, atau perumahan...">
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="add-pemilik">➕ Tambah Pemilik</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th><th>Username</th><th>Perumahan</th>
              <th>Blok</th><th>Kontak</th><th>Pengajuan</th><th></th>
            </tr>
          </thead>
          <tbody id="pemilikTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  $('#searchPemilik').addEventListener('input', applyFilterPemilik);
  applyFilterPemilik();
}

function applyFilterPemilik() {
  const q = ($('#searchPemilik')?.value || '').toLowerCase().trim();
  let list = state.users.filter(u => u.role === 'user');
  if (q) {
    list = list.filter(u =>
      u.nama.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.blok || '').toLowerCase().includes(q) ||
      getPerumahanName(u.perumahanId).toLowerCase().includes(q)
    );
  }
  const tbody = $('#pemilikTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty" style="padding:44px 20px">
        <div class="e-icon">👥</div>
        <h4>Tidak ada pemilik rumah</h4>
        <p>Tambahkan akun pemilik rumah pertama.</p>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(u => {
    const reqCount = state.requests.filter(r => r.pemilikId === u.id).length;
    return `<tr>
      <td><span class="td-title">${esc(u.nama)}</span></td>
      <td><span class="mono">${esc(u.username)}</span></td>
      <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(getPerumahanName(u.perumahanId))}</span></td>
      <td><strong>${esc(u.blok || '—')}</strong></td>
      <td><span class="td-sub">${esc(u.phone || '—')}</span></td>
      <td><strong>${reqCount}</strong></td>
      <td class="row-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit-pemilik" data-id="${u.id}">Ubah</button>
        <button class="btn btn-danger btn-sm" data-action="delete-pemilik" data-id="${u.id}">Hapus</button>
      </td>
    </tr>`;
  }).join('');
}

function openPemilikModal(id) {
  const u = id ? state.users.find(x => x.id === id) : null;
  const isEdit = !!u;
  const perumahanOptions = state.perumahan.map(p =>
    `<option value="${p.id}" ${u?.perumahanId === p.id ? 'selected' : ''}>${esc(p.nama)}</option>`
  ).join('');

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-narrow">
        <div class="modal-head">
          <div><h3>${isEdit ? 'Ubah Data Pemilik' : 'Tambah Pemilik Rumah'}</h3>
            <div class="sub">Akun login akan dibuatkan otomatis</div>
          </div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="pemilikForm">
            <div class="form-grid">
              <div class="field full">
                <label for="uNama">Nama Lengkap *</label>
                <input class="input" id="uNama" required value="${esc(u?.nama || '')}" placeholder="Nama sesuai KTP">
              </div>
              <div class="field">
                <label for="uUsername">Username *</label>
                <input class="input" id="uUsername" required value="${esc(u?.username || '')}" placeholder="huruf kecil, tanpa spasi">
              </div>
              <div class="field">
                <label for="uPassword">Password *</label>
                <input class="input" id="uPassword" required value="${esc(u?.password || '')}" placeholder="min. 6 karakter">
              </div>
              <div class="field">
                <label for="uPerumahan">Perumahan *</label>
                <select class="input" id="uPerumahan" required>
                  <option value="">— Pilih perumahan —</option>
                  ${perumahanOptions}
                </select>
              </div>
              <div class="field">
                <label for="uBlok">Blok / No. Rumah *</label>
                <input class="input" id="uBlok" required value="${esc(u?.blok || '')}" placeholder="Contoh: A-12">
              </div>
              <div class="field">
                <label for="uPhone">No. WhatsApp *</label>
                <input class="input" id="uPhone" required value="${esc(u?.phone || '')}" placeholder="08xx-xxxx-xxxx">
              </div>
              <div class="field">
                <label for="uEmail">Email</label>
                <input class="input" type="email" id="uEmail" value="${esc(u?.email || '')}" placeholder="email@contoh.com">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Pemilik'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';

  $('#pemilikForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = $('#uNama').value.trim();
    const username = $('#uUsername').value.trim().toLowerCase();
    const password = $('#uPassword').value;
    const perumahanId = $('#uPerumahan').value;
    const blok = $('#uBlok').value.trim();
    const phone = $('#uPhone').value.trim();
    const email = $('#uEmail').value.trim();

    if (!nama || !username || !password || !perumahanId || !blok || !phone) {
      return toast('Lengkapi field wajib', 'error');
    }
    if (password.length < 6) return toast('Password minimal 6 karakter', 'error');
    if (!/^[a-z0-9_]+$/.test(username)) return toast('Username hanya huruf kecil, angka, dan underscore', 'error');

    const dup = state.users.find(x => x.username === username && x.id !== u?.id);
    if (dup) return toast('Username sudah digunakan', 'error');

    if (isEdit) {
      Object.assign(u, { nama, username, password, perumahanId, blok, phone, email });
      toast('Data pemilik diperbarui', 'success');
    } else {
      state.users.push({
        id: uid('U'), username, password, role: 'user',
        nama, perumahanId, blok, phone, email,
        createdAt: new Date().toISOString(),
      });
      toast('Pemilik rumah ditambahkan', 'success');
    }
    persistAll();
    closeModal();
    renderPemilik();
  });
}

/* =========================================================
   USER — FORM PENGAJUAN
   ========================================================= */
function renderNewRequest() {
  state.draftPhotos = [];
  const myPerumahan = getPerumahanName(state.session.perumahanId);

  $('#content').innerHTML = `
    <div style="max-width:860px">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Formulir Pengajuan Renovasi</h3>
          ${statusBadge('diajukan')}
        </div>

        <div class="info-item" style="margin-bottom:20px">
          <div class="k">Diajukan untuk rumah</div>
          <div class="v">${esc(myPerumahan)} — Blok ${esc(state.session.blok || '—')}</div>
        </div>

        <form id="requestForm">
          <div class="form-grid">
            <div class="field full">
              <label for="fTitle">Judul Pengajuan *</label>
              <input class="input" id="fTitle" required maxlength="90" placeholder="Contoh: Perbaikan atap bocor di kamar utama">
            </div>
            <div class="field">
              <label for="fCategory">Kategori Pekerjaan *</label>
              <select class="input" id="fCategory" required>
                <option value="">— Pilih kategori —</option>
                ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="fPriority">Tingkat Prioritas *</label>
              <select class="input" id="fPriority" required>
                ${PRIORITIES.map(p => `<option value="${p}" ${p === 'Sedang' ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="field full">
              <label for="fDesc">Deskripsi Kebutuhan *</label>
              <textarea class="input" id="fDesc" required rows="5"
                placeholder="Jelaskan kondisi kerusakan atau rencana renovasi secara detail..."></textarea>
              <div class="hint">Semakin detail deskripsi, semakin cepat proses verifikasi.</div>
            </div>
            <div class="field full">
              <label>Foto Kondisi Rumah</label>
              <div class="dropzone" id="dropzone">
                <div class="dz-icon">📷</div>
                <strong>Klik atau tarik foto ke sini</strong>
                <small>Format JPG/PNG · Maks. 5 foto · Otomatis dikompres</small>
              </div>
              <input type="file" id="photoInput" accept="image/*" multiple hidden>
              <div class="photo-grid" id="photoGrid"></div>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">
            <button type="submit" class="btn btn-primary">Kirim Pengajuan</button>
            <button type="button" class="btn btn-ghost" data-action="nav" data-page="dashboard">Batal</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const fileInput = $('#photoInput');
  const dz = $('#dropzone');
  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', e => { handleFiles(e.target.files); fileInput.value = ''; });
  $('#requestForm').addEventListener('submit', submitRequest);
}

async function handleFiles(files) {
  const list = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  const remaining = 5 - state.draftPhotos.length;
  if (remaining <= 0) return toast('Maksimal 5 foto per pengajuan', 'error');
  const toProcess = list.slice(0, remaining);
  if (list.length > remaining) toast(`Hanya ${remaining} foto ditambahkan (maks. 5)`, 'info');
  for (const file of toProcess) {
    try {
      const dataUrl = await compressImage(file);
      state.draftPhotos.push(dataUrl);
    } catch { toast('Gagal memproses gambar', 'error'); }
  }
  renderDraftPhotos();
}

function renderDraftPhotos() {
  const grid = $('#photoGrid');
  if (!grid) return;
  grid.innerHTML = state.draftPhotos.map((src, i) => `
    <div class="photo-item">
      <img src="${src}" alt="Foto ${i + 1}" data-action="zoom" data-src="${i}">
      <button type="button" class="photo-del" data-action="del-photo" data-index="${i}">✕</button>
    </div>`).join('');
}

function compressImage(file, maxSize = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        else if (height >= width && height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function submitRequest(e) {
  e.preventDefault();
  const title = $('#fTitle').value.trim();
  const category = $('#fCategory').value;
  const priority = $('#fPriority').value;
  const description = $('#fDesc').value.trim();
  if (!title || !category || !description) return toast('Mohon lengkapi semua field wajib', 'error');

  const now = new Date().toISOString();
  const req = {
    id: uid(),
    pemilikId: state.session.id,
    ownerName: state.session.nama,
    perumahanId: state.session.perumahanId,
    perumahanNama: getPerumahanName(state.session.perumahanId),
    blok: state.session.blok,
    phone: state.session.phone,
    title, category, priority, description,
    photos: [...state.draftPhotos],
    status: 'diajukan',
    assignedTo: '',
    estimatedCost: 0,
    createdAt: now,
    updatedAt: now,
    timeline: [
      { status: 'diajukan', note: 'Pengajuan renovasi dibuat oleh pemilik rumah.', by: state.session.nama, role: 'user', at: now },
    ],
  };
  state.requests.push(req);
  persistAll();
  state.draftPhotos = [];
  toast('Pengajuan berhasil dikirim!', 'success');
  goTo('requests');
  setTimeout(() => openDetail(req.id), 320);
}

/* =========================================================
   USER — DAFTAR PENGAJUAN
   ========================================================= */
function renderUserRequests() {
  const mine = getMyRequests();
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="chips" id="userChips">
        ${['all', ...STATUS_ALL].map(s => `
          <button class="chip ${s === 'all' ? 'active' : ''}" data-action="filter-user" data-status="${s}">
            ${s === 'all' ? 'Semua' : STATUS[s].short}
          </button>`).join('')}
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="nav" data-page="new">➕ Pengajuan Baru</button>
    </div>
    <div id="userList"></div>
  `;
  renderUserList(mine, 'all');
}

function renderUserList(list, filter) {
  const box = $('#userList');
  const filtered = filter === 'all' ? list : list.filter(r => r.status === filter);
  if (!filtered.length) {
    box.innerHTML = `<div class="card">${emptyState('🗂️', 'Tidak ada pengajuan',
      filter === 'all' ? 'Anda belum membuat pengajuan apapun.' : 'Tidak ada pengajuan dengan status ini.',
      filter === 'all' ? 'Ajukan Renovasi' : null, 'new')}</div>`;
    return;
  }
  box.innerHTML = `<div class="req-list">${filtered.map(reqCard).join('')}</div>`;
}

function reqCard(r) {
  const thumb = r.photos && r.photos.length
    ? `<img src="${r.photos[0]}" alt="">`
    : (r.category === 'Pengecatan' ? '🎨'
      : r.category === 'Perbaikan Atap' ? '🏠'
      : r.category === 'Plumbing / Air' ? '🚿'
      : r.category === 'Instalasi Listrik' ? '💡'
      : r.category === 'Renovasi Ruangan' ? '🔨' : '🛠️');
  return `
    <div class="req-card" data-action="open-detail" data-id="${r.id}">
      <div class="req-thumb">${thumb}</div>
      <div class="req-body">
        <div class="req-top">
          ${statusBadge(r.status)}
          <span class="mono">#${r.id}</span>
        </div>
        <h4>${esc(r.title)}</h4>
        <p class="req-desc">${esc(r.description)}</p>
        <div class="req-meta">
          <span>🏘️ ${esc(r.perumahanNama || '—')}</span>
          <span>🏷️ ${esc(r.category)}</span>
          <span>📅 ${fmtDate(r.createdAt)}</span>
          ${r.assignedTo ? `<span>🔧 ${esc(r.assignedTo)}</span>` : ''}
        </div>
      </div>
      <div class="req-arrow">›</div>
    </div>`;
}

/* =========================================================
   ADMIN — SEMUA PENGAJUAN
   ========================================================= */
function renderAdminRequests() {
  const all = getAllRequests();
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        <input class="input" id="searchReq" placeholder="Cari judul, nama, atau ID Exact (REQ-...)">
      </div>
      <select class="input" id="filterReqStatus" style="max-width:200px">
        <option value="all">Semua Status</option>
        ${STATUS_ALL.map(s => `<option value="${s}">${STATUS[s].label}</option>`).join('')}
      </select>
      <select class="input" id="filterReqPerumahan" style="max-width:220px">
        <option value="all">Semua Perumahan</option>
        ${state.perumahan.map(p => `<option value="${p.id}">${esc(p.nama)}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="muted" style="font-size:13px" id="resultCount">${all.length} pengajuan</span>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Pemilik / Perumahan</th><th>Pengajuan</th>
              <th>Kategori</th><th>Status</th><th>Pekerja</th><th>Tanggal</th><th></th>
            </tr>
          </thead>
          <tbody id="reqTableBody"></tbody>
        </table>
      </div>
    </div>
  `;
  $('#searchReq').addEventListener('input', applyAdminFilters);
  $('#filterReqStatus').addEventListener('change', applyAdminFilters);
  $('#filterReqPerumahan').addEventListener('change', applyAdminFilters);
  applyAdminFilters();
}

function applyAdminFilters() {
  const q = ($('#searchReq')?.value || '').toLowerCase().trim();
  const st = $('#filterReqStatus')?.value || 'all';
  const pm = $('#filterReqPerumahan')?.value || 'all';
  
  let list = getAllRequests();
  if (st !== 'all') list = list.filter(r => r.status === st);
  if (pm !== 'all') list = list.filter(r => r.perumahanId === pm);
  
  if (q) {
    // IMPLEMENTASI ALGORITMA: Jika query diawali 'req-', gunakan Binary Search
    if (q.startsWith('req-')) {
      const targetId = q.toUpperCase();
      const sortedList = bubbleSortById(list); // Sort dulu
      const searchResult = binarySearchById(sortedList, targetId); // Cari
      
      if (searchResult) {
        list = [searchResult]; // Tampilkan yang ketemu
      } else {
        list = []; // Kosongkan jika tidak ketemu
      }
    } else {
      // Filter biasa untuk partial match (judul, nama, dll)
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        (r.blok || '').toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
  }

  const body = $('#reqTableBody');
  if (!body) return;
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8">
      <div class="empty" style="padding:44px 20px">
        <div class="e-icon">🔍</div>
        <h4>Tidak ada hasil</h4>
        <p>Coba ubah kata kunci atau filter.</p>
      </div></td></tr>`;
  } else {
    body.innerHTML = list.map(r => `
      <tr>
        <td><span class="mono">#${r.id}</span></td>
        <td>
          <span class="td-title" style="max-width:160px">${esc(r.ownerName)}</span>
          <span class="td-sub">${esc(r.perumahanNama || '—')} · ${esc(r.blok || '')}</span>
        </td>
        <td>
          <span class="td-title">${esc(r.title)}</span>
          <span class="td-sub">Prioritas: ${esc(r.priority)}</span>
        </td>
        <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(r.category)}</span></td>
        <td>${statusBadge(r.status)}</td>
        <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(r.assignedTo || '—')}</span></td>
        <td><span class="td-sub">${fmtDate(r.createdAt)}</span></td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-action="open-detail" data-id="${r.id}">Kelola</button>
        </td>
      </tr>`).join('');
  }
  const counter = $('#resultCount');
  if (counter) counter.textContent = `${list.length} pengajuan`;
}

/* =========================================================
   DETAIL MODAL
   ========================================================= */
function openDetail(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  const isAdmin = state.session.role === 'admin';

  const photosHtml = (r.photos && r.photos.length)
    ? `<div class="photo-grid">${r.photos.map((p, i) => `
        <div class="photo-item">
          <img src="${p}" alt="Foto ${i + 1}" data-action="zoom" data-src="${i}" data-req="${r.id}">
        </div>`).join('')}</div>`
    : `<p class="muted" style="font-size:13px">Tidak ada foto.</p>`;

  const timelineHtml = r.timeline.map(t => `
    <div class="tl-item">
      <span class="tl-dot" style="border-color:${STATUS[t.status]?.color || '#6366f1'}"></span>
      <div class="tl-head">
        <strong>${esc(STATUS[t.status]?.label || t.status)}</strong>
        <span class="tl-time">${fmtDateTime(t.at)}</span>
      </div>
      <div class="tl-note">${esc(t.note)}</div>
      <div class="tl-by">oleh ${esc(t.by)} · ${t.role === 'admin' ? 'Admin' : 'Pemilik'}</div>
    </div>`).join('');

  const adminPanel = isAdmin ? `
    <div class="side-box" style="margin-bottom:16px">
      <h4>⚙️ Kelola Pengajuan</h4>
      <div class="field">
        <label for="mStatus">Tahapan Renovasi</label>
        <select class="input" id="mStatus">
          ${STATUS_ALL.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="mWorker">Pekerja / Developer</label>
        <input class="input" id="mWorker" value="${esc(r.assignedTo || '')}" placeholder="Nama pekerja atau vendor">
      </div>
      <div class="field">
        <label for="mCost">Estimasi Biaya (Rp)</label>
        <input class="input" type="number" id="mCost" min="0" step="100000" value="${r.estimatedCost || 0}">
      </div>
      <div class="field">
        <label for="mNote">Catatan Progres</label>
        <textarea class="input" id="mNote" rows="3" placeholder="Contoh: Survey selesai, lanjut perencanaan..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" data-action="save-request" data-id="${r.id}">Simpan Perubahan</button>
    </div>
  ` : `
    <div class="side-box" style="margin-bottom:16px">
      <h4>💬 Tambah Catatan</h4>
      <div class="field">
        <textarea class="input" id="userNote" rows="3" placeholder="Tulis pertanyaan atau info tambahan..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" data-action="add-note" data-id="${r.id}">Kirim Catatan</button>
    </div>
  `;

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h3>${esc(r.title)}</h3>
            <div class="sub">
              <span class="mono">#${r.id}</span>
              <span>${esc(r.ownerName)} · ${esc(r.perumahanNama || '')} · ${esc(r.blok || '')}</span>
              <span>Dibuat ${fmtDate(r.createdAt)}</span>
            </div>
          </div>
          <button class="modal-close" data-action="close-modal" aria-label="Tutup">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div>
              <div style="margin-bottom:18px">${statusBadge(r.status)}</div>
              <div class="info-grid">
                <div class="info-item"><div class="k">Kategori</div><div class="v">${esc(r.category)}</div></div>
                <div class="info-item"><div class="k">Prioritas</div><div class="v">${esc(r.priority)}</div></div>
                <div class="info-item"><div class="k">Perumahan</div><div class="v">${esc(r.perumahanNama || '—')}</div></div>
                <div class="info-item"><div class="k">Blok / Rumah</div><div class="v">${esc(r.blok || '—')}</div></div>
                <div class="info-item"><div class="k">Kontak</div><div class="v">${esc(r.phone || '—')}</div></div>
                <div class="info-item"><div class="k">Pekerja</div><div class="v">${esc(r.assignedTo || 'Belum ditugaskan')}</div></div>
                <div class="info-item"><div class="k">Estimasi Biaya</div><div class="v">${r.estimatedCost ? rupiah(r.estimatedCost) : '—'}</div></div>
                <div class="info-item"><div class="k">Terakhir Update</div><div class="v">${timeAgo(r.updatedAt)}</div></div>
              </div>
              <h4 style="margin:20px 0 10px">Deskripsi</h4>
              <div class="desc-box">${esc(r.description)}</div>
              <h4 style="margin:22px 0 12px">Foto Kondisi Rumah</h4>
              ${photosHtml}
              <h4 style="margin:24px 0 14px">Riwayat Proses</h4>
              <div class="timeline">${timelineHtml}</div>
            </div>
            <aside>
              ${adminPanel}
              <div class="side-box">
                <h4>📌 Ringkasan</h4>
                <div style="font-size:13px;display:flex;flex-direction:column;gap:10px">
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span class="muted">Total Progres</span><strong>${r.timeline.length} langkah</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span class="muted">Terakhir</span><strong>${timeAgo(r.updatedAt)}</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span class="muted">Lampiran foto</span><strong>${(r.photos || []).length} foto</strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });
}

function closeModal() { $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; }

function saveRequestChanges(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  const newStatus = $('#mStatus').value;
  const worker = $('#mWorker').value.trim();
  const cost = Number($('#mCost').value || 0);
  const note = $('#mNote').value.trim();
  const notes = [];
  let changed = false;

  if (newStatus !== r.status) {
    r.status = newStatus;
    notes.push(`Status diubah menjadi "${STATUS[newStatus].label}".`);
    changed = true;
  }
  if (worker !== (r.assignedTo || '')) {
    r.assignedTo = worker;
    notes.push(worker ? `Pekerja ditugaskan: ${worker}.` : 'Penugasan pekerja dikosongkan.');
    changed = true;
  }
  if (cost !== (r.estimatedCost || 0)) {
    r.estimatedCost = cost;
    notes.push(`Estimasi biaya diperbarui menjadi ${rupiah(cost)}.`);
    changed = true;
  }
  if (note) { notes.push(note); changed = true; }
  if (!changed) return toast('Tidak ada perubahan', 'error');

  r.updatedAt = new Date().toISOString();
  r.timeline.push({ status: r.status, note: notes.join(' '), by: state.session.nama, role: 'admin', at: r.updatedAt });
  persistAll();
  closeModal();
  renderPage();
  toast('Perubahan disimpan', 'success');
}

function addUserNote(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  const note = ($('#userNote')?.value || '').trim();
  if (!note) return toast('Tulis catatan dulu', 'error');
  r.updatedAt = new Date().toISOString();
  r.timeline.push({ status: r.status, note, by: state.session.nama, role: 'user', at: r.updatedAt });
  persistAll();
  openDetail(id);
  toast('Catatan terkirim', 'success');
}

/* =========================================================
   USER — PROGRAM & GARANSI
   ========================================================= */
function renderProgram() {
  $('#content').innerHTML = `
    <div class="program-hero">
      <h2>🎁 Program Renovasi Garansi Awal</h2>
      <p>Sebagai bentuk komitmen Dreamland terhadap kualitas hunian, setiap pemilik rumah berhak mengajukan renovasi gratis sebagai bagian dari garansi awal sesuai ketentuan yang berlaku.</p>
    </div>

    <div class="grid-2-even">
      <div class="card card-pad">
        <h3 style="margin-bottom:16px">Ketentuan Umum</h3>
        <div class="term-list" style="grid-template-columns:1fr">
          <div class="term-item">
            <h4>1. Cakupan Garansi</h4>
            <p>Renovasi mencakup perbaikan struktur ringan, atap, plafon, plumbing, dan instalasi listrik dasar yang mengalami kerusakan akibat cacat produksi.</p>
          </div>
          <div class="term-item">
            <h4>2. Masa Berlaku</h4>
            <p>Garansi renovasi awal berlaku sesuai ketentuan developer. Setelah masa berlaku habis, pengajuan tetap dapat diajukan sebagai permintaan perbaikan berbayar.</p>
          </div>
          <div class="term-item">
            <h4>3. Alur Pengajuan</h4>
            <p>Pemilik rumah mengajukan melalui menu "Ajukan Renovasi" di aplikasi ini. Admin akan memverifikasi dan memproses sesuai tahapan.</p>
          </div>
          <div class="term-item">
            <h4>4. Hal yang Tidak Ditanggung</h4>
            <p>Kerusakan akibat kelalaian pemilik, force majeure, atau perubahan yang tidak disetujui tidak termasuk dalam cakupan garansi.</p>
          </div>
        </div>
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:16px">Alur Proses Renovasi</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${STATUS_FLOW.map((s, i) => `
            <div style="display:flex;gap:14px;align-items:center;padding:12px 0;${i < STATUS_FLOW.length - 1 ? 'border-bottom:1px solid #f1f5f9' : ''}">
              <div style="width:32px;height:32px;border-radius:10px;background:${STATUS[s].bg};color:${STATUS[s].color};display:grid;place-items:center;font-weight:800;font-size:13px;flex-shrink:0">${i + 1}</div>
              <div style="flex:1">
                <div style="font-size:13.5px;font-weight:700">${STATUS[s].label}</div>
                <div class="muted" style="font-size:12.5px">${
                  s === 'diajukan' ? 'Pemilik rumah mengirim formulir pengajuan' :
                  s === 'verifikasi' ? 'Admin memeriksa kelengkapan & kelayakan' :
                  s === 'survei' ? 'Tim melakukan survei lokasi' :
                  s === 'perencanaan' ? 'Rencana kerja & estimasi biaya disusun' :
                  s === 'pengerjaan' ? 'Pekerja mulai melaksanakan renovasi' :
                  s === 'pemeriksaan' ? 'Pemeriksaan hasil oleh admin & pemilik' :
                  'Pekerjaan selesai, garansi ditutup'
                }</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="card card-pad" style="margin-top:20px;text-align:center">
      <h3 style="margin-bottom:8px">Siap mengajukan renovasi?</h3>
      <p class="muted" style="font-size:13.5px;margin-bottom:16px">Klik tombol di bawah untuk membuat pengajuan baru.</p>
      <button class="btn btn-primary" data-action="nav" data-page="new">➕ Ajukan Renovasi Sekarang</button>
    </div>
  `;
}

/* =========================================================
   PANDUAN
   ========================================================= */
function renderHelp() {
  const isAdmin = state.session.role === 'admin';

  const adminSteps = [
    ['Kelola Perumahan', 'Tambahkan setiap perumahan yang Anda kelola beserta lokasi dan total unit.'],
    ['Kelola Pemilik Rumah', 'Buatkan akun login untuk pemilik rumah. Berikan username & password kepada mereka.'],
    ['Verifikasi Pengajuan', 'Buka menu <b>Pengajuan Renovasi</b>, tinjau detail & foto, lalu ubah status menjadi <b>Verifikasi</b>.'],
    ['Update Tahapan', 'Perbarui status progresif: Survei → Perencanaan → Pengerjaan → Pemeriksaan → Selesai.'],
    ['Catat Progres', 'Setiap update, tulis catatan agar pemilik rumah melihat perkembangan terkini.'],
  ];

  const userSteps = [
    ['Login', 'Masuk dengan username dan password yang diberikan oleh admin/pengelola.'],
    ['Baca Program Garansi', 'Pelajari ketentuan program renovasi garansi awal di menu Program & Garansi.'],
    ['Ajukan Renovasi', 'Isi formulir lengkap dengan judul, kategori, prioritas, deskripsi, dan foto kondisi rumah.'],
    ['Pantau Progres', 'Buka menu Pengajuan Saya untuk melihat tahapan terkini secara real-time.'],
    ['Tambah Catatan', 'Anda dapat menambahkan pertanyaan atau info tambahan pada halaman detail pengajuan.'],
  ];

  const steps = isAdmin ? adminSteps : userSteps;

  $('#content').innerHTML = `
    <div class="grid-2">
      <div class="card card-pad">
        <h3 style="margin-bottom:6px">Alur Penggunaan</h3>
        <p class="muted" style="font-size:13.5px;margin-bottom:18px">
          ${isAdmin ? 'Panduan untuk Admin / Pengelola Dreamland.' : 'Panduan untuk pemilik rumah.'}
        </p>
        ${steps.map((s, i) => `
          <div class="step">
            <div class="step-num">${i + 1}</div>
            <div><h4>${s[0]}</h4><p>${s[1]}</p></div>
          </div>`).join('')}
      </div>

      <div>
        <div class="card card-pad" style="margin-bottom:20px">
          <h3 style="margin-bottom:14px">Arti Tahapan</h3>
          <div style="display:flex;flex-direction:column;gap:11px">
            ${STATUS_ALL.map(s => `
              <div style="display:flex;gap:12px;align-items:flex-start">
                <span class="mini-dot" style="background:${STATUS[s].color};margin-top:7px"></span>
                <div>
                  <div style="font-size:13.5px;font-weight:600">${STATUS[s].label}</div>
                  <div class="muted" style="font-size:12.5px">${
                    s === 'diajukan' ? 'Pengajuan baru, menunggu diperiksa admin.' :
                    s === 'verifikasi' ? 'Admin memeriksa kelengkapan pengajuan.' :
                    s === 'survei' ? 'Tim sedang atau akan melakukan survei lokasi.' :
                    s === 'perencanaan' ? 'Rencana kerja & RAB disusun.' :
                    s === 'pengerjaan' ? 'Pekerja sedang melaksanakan renovasi.' :
                    s === 'pemeriksaan' ? 'Pemeriksaan hasil pekerjaan.' :
                    s === 'selesai' ? 'Pekerjaan dinyatakan selesai.' :
                    'Pengajuan tidak dapat diproses.'
                  }</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card card-pad">
          <h3 style="margin-bottom:12px">Kontak Pengelola</h3>
          <p class="muted" style="font-size:13.5px;line-height:1.65;margin-bottom:14px">
            Butuh bantuan? Hubungi kantor pengelola Dreamland.
          </p>
          <div class="info-item" style="margin-bottom:10px"><div class="k">Telepon</div><div class="v">021-555-0123</div></div>
          <div class="info-item" style="margin-bottom:10px"><div class="k">Email</div><div class="v">admin@infodreamland.my.id</div></div>
          <div class="info-item"><div class="k">Website</div><div class="v">infodreamland.my.id</div></div>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   SIDEBAR (mobile)
   ========================================================= */
function openSidebar() { $('#sidebar').classList.add('open'); $('#sidebarBackdrop').classList.add('show'); }
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); }

/* =========================================================
   LIGHTBOX
   ========================================================= */
function openLightbox(src) { $('#lightboxImg').src = src; $('#lightbox').classList.remove('hidden'); }
function closeLightbox() { $('#lightbox').classList.add('hidden'); $('#lightboxImg').src = ''; }

/* =========================================================
   EVENT DELEGATION
   ========================================================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'nav': goTo(el.dataset.page); break;
    case 'logout': logout(); break;
    case 'open-detail': openDetail(el.dataset.id); break;
    case 'close-modal': closeModal(); break;
    case 'save-request': saveRequestChanges(el.dataset.id); break;
    case 'add-note': addUserNote(el.dataset.id); break;

    case 'add-perumahan': openPerumahanModal(null); break;
    case 'edit-perumahan': openPerumahanModal(el.dataset.id); break;
    case 'delete-perumahan': {
      const id = el.dataset.id;
      const p = state.perumahan.find(x => x.id === id);
      if (!p) return;
      const used = state.users.some(u => u.perumahanId === id) || state.requests.some(r => r.perumahanId === id);
      if (used) return toast('Tidak bisa dihapus: masih ada pemilik/pengajuan terkait', 'error');
      if (!confirm(`Hapus perumahan "${p.nama}"?`)) return;
      state.perumahan = state.perumahan.filter(x => x.id !== id);
      persistAll();
      renderPerumahan();
      toast('Perumahan dihapus', 'success');
      break;
    }

    case 'add-pemilik': openPemilikModal(null); break;
    case 'edit-pemilik': openPemilikModal(el.dataset.id); break;
    case 'delete-pemilik': {
      const id = el.dataset.id;
      const u = state.users.find(x => x.id === id);
      if (!u) return;
      const hasReq = state.requests.some(r => r.pemilikId === id);
      if (hasReq) return toast('Tidak bisa dihapus: pemilik masih punya pengajuan', 'error');
      if (!confirm(`Hapus akun "${u.nama}"?`)) return;
      state.users = state.users.filter(x => x.id !== id);
      persistAll();
      renderPemilik();
      toast('Pemilik dihapus', 'success');
      break;
    }

    case 'del-photo': {
      state.draftPhotos.splice(Number(el.dataset.index), 1);
      renderDraftPhotos();
      break;
    }

    case 'zoom': {
      const src = el.dataset.src;
      const reqId = el.dataset.req;
      if (reqId) {
        const r = state.requests.find(x => x.id === reqId);
        if (r && r.photos[src]) openLightbox(r.photos[src]);
      } else {
        openLightbox(state.draftPhotos[src]);
      }
      break;
    }

    case 'filter-user': {
      const s = el.dataset.status;
      $$('#userChips .chip').forEach(c => c.classList.toggle('active', c.dataset.status === s));
      renderUserList(getMyRequests(), s);
      break;
    }
  }
});

$('#lightbox').addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#lightbox').classList.contains('hidden')) closeLightbox();
    else if ($('#modalRoot').innerHTML) closeModal();
    else closeSidebar();
  }
});

$('#menuToggle').addEventListener('click', openSidebar);
$('#sidebarBackdrop').addEventListener('click', closeSidebar);

/* ---------------- Login ---------------- */
$('#fillDemo').addEventListener('click', () => {
  $('#loginUsername').value = 'admin';
  $('#loginPassword').value = 'admin123';
  toast('Akun admin terisi otomatis', 'info');
});

$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = $('#loginUsername').value.trim().toLowerCase();
  const password = $('#loginPassword').value;

  if (!username || !password) return toast('Username dan password wajib diisi.', 'error');

  const user = state.users.find(u => u.username === username && u.password === password);
  if (!user) return toast('Username atau password salah.', 'error');

  state.session = {
    id: user.id, role: user.role, nama: user.nama, username: user.username,
    perumahanId: user.perumahanId, blok: user.blok,
    phone: user.phone, email: user.email,
  };
  store.set(K_SESSION, state.session);
  $('#loginPassword').value = '';
  toast(`Selamat datang, ${user.nama.split(' ')[0]}!`, 'success');
  enterApp();
});

/* =========================================================
   INIT
   ========================================================= */
function init() {
  // Perumahan
  let perumahan = store.get(K_PERUMAHAN, null);
  if (!Array.isArray(perumahan) || !perumahan.length) {
    perumahan = seedPerumahan();
    store.set(K_PERUMAHAN, perumahan);
  }
  state.perumahan = perumahan;

  // Users
  let users = store.get(K_USERS, null);
  if (!Array.isArray(users) || !users.length) {
    users = seedUsers();
    store.set(K_USERS, users);
  }
  state.users = users;

  // Requests
  let reqs = store.get(K_REQ, null);
  if (!Array.isArray(reqs) || !reqs.length) {
    reqs = seedRequests();
    store.set(K_REQ, reqs);
  }
  state.requests = reqs;

  // Session
  const session = store.get(K_SESSION, null);
  if (session && session.role) {
    state.session = session;
    enterApp();
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', init);