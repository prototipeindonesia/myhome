/* =========================================================
   Dreamland — Property Management CRM (Retensi Edition)
   Final Version - Anti Blank Screen & Robust Data
   ========================================================= */

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

const NAV = {
  admin: [
    { id: 'dashboard', label: 'Dashboard',        icon: '📊' },
    { id: 'perumahan', label: 'Perumahan',        icon: '🏘️' },
    { id: 'pemilik',   label: 'Data Pembeli',     icon: '👥' },
    { id: 'requests',  label: 'Pengajuan Retensi', icon: '📋' },
    { id: 'help',      label: 'Panduan',          icon: '💡' },
  ],
  user: [
    { id: 'dashboard', label: 'Dashboard',         icon: '📊' },
    { id: 'program',   label: 'Program Retensi',   icon: '🎁' },
    { id: 'new',       label: 'Ajukan Retensi',    icon: '➕' },
    { id: 'requests',  label: 'Pengajuan Saya',    icon: '📋' },
    { id: 'help',      label: 'Panduan',           icon: '💡' },
  ],
};

const PAGE_META = {
  dashboard: { title: 'Dashboard',         sub: 'Ringkasan sistem Dreamland' },
  perumahan: { title: 'Perumahan',         sub: 'Kelola data perumahan' },
  pemilik:   { title: 'Data Pembeli',      sub: 'Kelola data pembeli & dokumen retensi' },
  requests:  { title: 'Pengajuan Retensi', sub: 'Pantau seluruh pengajuan retensi' },
  new:       { title: 'Ajukan Retensi',    sub: 'Lengkapi formulir pengajuan' },
  program:   { title: 'Program Retensi',   sub: 'Informasi garansi retensi 100 hari' },
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
  if(!iso) return '-';
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

function getWarrantyStatus(tglSerahTerima) {
  if (!tglSerahTerima) return { daysLeft: 0, expired: true, text: 'Tanggal serah terima belum diatur' };
  const handover = new Date(tglSerahTerima).getTime();
  const now = new Date().getTime();
  const limit = handover + (100 * 24 * 60 * 60 * 1000);
  const diff = limit - now;
  
  if (diff <= 0) {
    return { daysLeft: 0, expired: true, text: 'Masa retensi telah habis (Dikenakan biaya tambahan)' };
  }
  const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return { daysLeft, expired: false, text: `Sisa masa retensi: ${daysLeft} hari lagi` };
}

/* ---------------- Storage & State (Versi v3 - Bersih) ---------------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Penyimpanan penuh.', 'error'); return false; } },
  del(k)      { localStorage.removeItem(k); },
};

// Gunakan v3 untuk memastikan data lama tereset
const K_USERS    = 'dl_users_v3';
const K_PERUMAHAN= 'dl_perumahan_v3';
const K_REQ      = 'dl_requests_v3';
const K_SESSION  = 'dl_session_v3';

const state = {
  session: null,
  page: 'dashboard',
  users: [],
  perumahan: [],
  requests: [],
  draftPhotos: [],
};

/* ---------------- Seed Data ---------------- */
function seedPerumahan() {
  return [
    { id: 'P-01', nama: 'Dreamland Residence', lokasi: 'Bogor, Jawa Barat', totalUnit: 120, deskripsi: 'Perumahan modern konsep hijau.' },
    { id: 'P-02', nama: 'Dreamland Garden', lokasi: 'Depok, Jawa Barat', totalUnit: 80, deskripsi: 'Cluster eksklusif dengan taman pusat.' },
  ];
}

function seedUsers() {
  const now = Date.now();
  return [
    { id: 'U-01', username: 'admin', password: 'admin123', role: 'admin',
      nama: 'Admin Dreamland', phone: '021-555-0123', email: 'admin@infodreamland.my.id',
      perumahanId: null, blok: null, createdAt: new Date(now - 60*86400000).toISOString(), tanggalSerahTerima: null, dokumen: {} },
    { id: 'U-02', username: 'budi', password: '123456', role: 'user',
      nama: 'Budi Santoso', phone: '0812-3456-7890', email: 'budi@email.com',
      perumahanId: 'P-01', blok: 'A-12', createdAt: new Date(now - 40*86400000).toISOString(), 
      tanggalSerahTerima: new Date(now - 30*86400000).toISOString(),
      dokumen: { 
        ktp: 'https://placehold.co/400x250?text=KTP+Budi', 
        npwp: 'https://placehold.co/400x250?text=NPWP+Budi', 
        bukuNikah: 'https://placehold.co/400x250?text=Buku+Nikah', 
        shm: 'https://placehold.co/400x250?text=SHM', 
        pbb: 'https://placehold.co/400x250?text=PBB' 
      } 
    },
    { id: 'U-03', username: 'siti', password: '123456', role: 'user',
      nama: 'Siti Rahmawati', phone: '0813-9876-5432', email: 'siti@email.com',
      perumahanId: 'P-02', blok: 'B-07', createdAt: new Date(now - 150*86400000).toISOString(), 
      tanggalSerahTerima: new Date(now - 120*86400000).toISOString(),
      dokumen: { 
        ktp: 'https://placehold.co/400x250?text=KTP+Siti', 
        npwp: 'https://placehold.co/400x250?text=NPWP+Siti', 
        bukuNikah: 'https://placehold.co/400x250?text=Buku+Nikah', 
        shm: 'https://placehold.co/400x250?text=SHM', 
        pbb: 'https://placehold.co/400x250?text=PBB' 
      } 
    },
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
      title: 'Retensi Dapur & Penggantian Kitchen Set',
      category: 'Retensi Struktur', priority: 'Tinggi',
      description: 'Dapur lama sudah tidak representatif. Ingin retensi total dengan kitchen set baru.',
      photos: [], status: 'pengerjaan', assignedTo: 'CV Karya Bangun', estimatedCost: 0,
      createdAt: d(14), updatedAt: d(2),
      timeline: [
        { status: 'diajukan',    note: 'Pengajuan retensi dibuat.', by: 'Budi Santoso', role: 'user', at: d(14), photos: [] },
        { status: 'verifikasi',  note: 'Kelengkapan sesuai. Pemilik setuju dilanjutkan.', by: 'Budi Santoso', role: 'user', at: d(12), photos: [] },
        { status: 'survei',      note: 'Survei lokasi selesai.', by: 'Admin Dreamland', role: 'admin', at: d(9), photos: ['https://placehold.co/400x300?text=Foto+Survei'] },
        { status: 'pengerjaan',  note: 'Pekerjaan dimulai oleh CV Karya Bangun.', by: 'Admin Dreamland', role: 'admin', at: d(2), photos: [] },
      ],
    },
    {
      id: 'REQ-D4E5', pemilikId: 'U-03', ownerName: 'Siti Rahmawati',
      perumahanId: 'P-02', perumahanNama: 'Dreamland Garden',
      blok: 'B-07', phone: '0813-9876-5432',
      title: 'Retensi Atap Bocor',
      category: 'Retensi Atap', priority: 'Tinggi',
      description: 'Atap bocor saat hujan deras. Mohon diperiksa.',
      photos: [], status: 'verifikasi', assignedTo: '', estimatedCost: 1500000,
      createdAt: d(5), updatedAt: d(1),
      timeline: [
        { status: 'diajukan',   note: 'Pengajuan dibuat.', by: 'Siti Rahmawati', role: 'user', at: d(5), photos: [] },
        { status: 'verifikasi', note: 'Masa garansi habis. Dikenakan biaya Rp 1.500.000. Menunggu persetujuan pemilik.', by: 'Admin Dreamland', role: 'admin', at: d(1), photos: [] },
      ],
    },
  ];
}

/* ---------------- Toast & Persistence ---------------- */
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

function persistAll() {
  store.set(K_USERS, state.users);
  store.set(K_PERUMAHAN, state.perumahan);
  store.set(K_REQ, state.requests);
}

/* ---------------- Auth & Navigation ---------------- */
function showLogin() { 
  const l = $('#loginScreen'); if(l) l.classList.remove('hidden'); 
  const a = $('#app'); if(a) a.classList.add('hidden'); 
}

function enterApp() {
  const l = $('#loginScreen'); if(l) l.classList.add('hidden');
  const a = $('#app'); if(a) a.classList.remove('hidden');
  state.page = 'dashboard';
  renderNav(); renderShellUser(); renderPage();
}

function renderShellUser() {
  const s = state.session;
  if(!s) return;
  const chip = $('#userChip');
  if(chip) chip.innerHTML = `
    <div class="avatar">${esc(initials(s.nama))}</div>
    <div class="uc-text">
      <strong>${esc(s.nama)}</strong>
      <small>${s.role === 'admin' ? 'Admin / Pengelola' : (s.blok ? 'Blok ' + esc(s.blok) : 'Pemilik Rumah')}</small>
    </div>`;
  const badge = $('#roleBadge');
  if(badge) {
    badge.textContent = s.role === 'admin' ? 'Admin / Pengelola' : 'Pemilik Rumah';
    badge.className = 'role-badge' + (s.role === 'admin' ? ' admin' : '');
  }
}

function logout() {
  store.del(K_SESSION);
  state.session = null;
  closeModal();
  showLogin();
  toast('Anda telah keluar', 'info');
}

function renderNav() {
  if(!state.session) return;
  const items = NAV[state.session.role] || NAV.user;
  const navList = $('#navList');
  if(navList) navList.innerHTML = items.map(it => `
    <button class="nav-item ${it.id === state.page ? 'active' : ''}" data-action="nav" data-page="${it.id}">
      <span class="ico">${it.icon}</span><span>${it.label}</span>
    </button>`).join('');
}

function goTo(page) { state.page = page; renderNav(); renderPage(); }

function renderPage() {
  const meta = PAGE_META[state.page] || PAGE_META.dashboard;
  const pt = $('#pageTitle'); if(pt) pt.textContent = meta.title;
  const ps = $('#pageSubtitle'); if(ps) ps.textContent = meta.sub;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if(!state.session) return;
  const role = state.session.role;
  
  try {
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
  } catch (error) {
    console.error("Render Error:", error);
    const content = $('#content');
    if(content) content.innerHTML = `<div class="card card-pad"><div class="empty"><h4>Terjadi Kesalahan Sistem</h4><p>${error.message}</p></div></div>`;
  }
}

/* ---------------- Common Helpers ---------------- */
function countBy(list) {
  const c = {};
  STATUS_ALL.forEach(s => c[s] = 0);
  list.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
  return c;
}
const getMyRequests = () => (state.requests || []).filter(r => r.pemilikId === state.session.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const getAllRequests = () => [...(state.requests || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const getPerumahanName = (id) => (state.perumahan || []).find(p => p.id === id)?.nama || '—';

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
   DASHBOARD
   ========================================================= */
function renderAdminDashboard() {
  const all = getAllRequests();
  const c = countBy(all);
  const total = all.length || 1;
  const totalPemilik = (state.users || []).filter(u => u.role === 'user').length;
  
  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Perumahan',   value: (state.perumahan || []).length, icon: '🏘️', cls: 'icon-indigo' },
      { label: 'Total Pembeli',     value: totalPemilik,           icon: '👥', cls: 'icon-blue' },
      { label: 'Pengajuan Aktif',   value: c.pengerjaan + c.pemeriksaan + c.survei, icon: '🔧', cls: 'icon-purple' },
      { label: 'Perlu Verifikasi',  value: c.diajukan + c.verifikasi, icon: '⏳', cls: 'icon-amber' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Pengajuan Menunggu Tindakan</h3>
          <button class="link" data-action="nav" data-page="requests">Lihat semua</button>
        </div>
        ${all.filter(r => ['diajukan','verifikasi','survei'].includes(r.status)).length
          ? `<div class="mini-list">${all.filter(r => ['diajukan','verifikasi','survei'].includes(r.status)).slice(0,5).map(miniRow).join('')}</div>`
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
  `;
}

function renderUserDashboard() {
  const mine = getMyRequests();
  const firstName = state.session.nama.split(' ')[0];
  const warranty = getWarrantyStatus(state.session.tanggalSerahTerima);

  $('#pageSubtitle').textContent = `Halo ${firstName}, pantau pengajuan retensi Anda di sini.`;

  $('#content').innerHTML = `
    <div class="countdown-widget ${warranty.expired ? 'expired' : ''}">
      <div>
        <h4>Status Garansi Retensi (100 Hari)</h4>
        <div class="cd-days">${warranty.expired ? 'Kedaluwarsa' : warranty.daysLeft + ' Hari'}</div>
        <div class="cd-desc">${warranty.text}</div>
        <div class="cd-desc" style="font-size:11px;margin-top:8px;opacity:0.7">Tgl Serah Terima: ${state.session.tanggalSerahTerima ? fmtDate(state.session.tanggalSerahTerima) : '-'}</div>
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
        <div class="card-head">
          <h3>Pengajuan Terbaru</h3>
          ${mine.length ? `<button class="link" data-action="nav" data-page="requests">Lihat semua</button>` : ''}
        </div>
        ${mine.length
          ? `<div class="mini-list">${mine.slice(0, 5).map(miniRow).join('')}</div>`
          : emptyState('📭', 'Belum ada pengajuan', 'Ajukan retensi rumah Anda sekarang.', 'Ajukan Retensi', 'new')}
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Butuh Retensi?</h3>
        <p class="muted" style="font-size:13.5px;margin-bottom:18px;line-height:1.65">
          Ajukan permintaan retensi rumah Anda. Pastikan masa garansi 100 hari belum habis agar tidak dikenakan biaya tambahan.
        </p>
        <button class="btn btn-primary btn-block" data-action="nav" data-page="new" style="margin-bottom:10px">➕ Ajukan Retensi</button>
        <button class="btn btn-ghost btn-block" data-action="nav" data-page="program">🎁 Info Program Retensi</button>
      </div>
    </div>
  `;
}

function miniRow(r) {
  return `
    <div class="mini-row" data-action="open-detail" data-id="${r.id}">
      <span class="mini-dot" style="background:${STATUS[r.status]?.color || '#ccc'}"></span>
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
              <th>Total Unit</th><th>Pemilik Terdaftar</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody id="perumahanTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  const searchEl = $('#searchPerumahan');
  if (searchEl) searchEl.addEventListener('input', applyFilterPerumahan);
  applyFilterPerumahan();
}

function applyFilterPerumahan() {
  try {
    const q = ($('#searchPerumahan')?.value || '').toLowerCase().trim();
    const list = (state.perumahan || []).filter(p => !q || String(p.nama || '').toLowerCase().includes(q) || String(p.lokasi || '').toLowerCase().includes(q));
    const tbody = $('#perumahanTbody');
    if (!tbody) return;
    
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty" style="padding:44px 20px"><div class="e-icon">🏘️</div><h4>Tidak ada perumahan</h4><p>Silakan tambah perumahan baru.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(p => {
      const count = (state.users || []).filter(u => u.role === 'user' && u.perumahanId === p.id).length;
      return `<tr>
        <td><span class="mono">${p.id}</span></td>
        <td><span class="td-title">${esc(p.nama)}</span></td>
        <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(p.lokasi)}</span></td>
        <td><strong>${p.totalUnit || 0}</strong> unit</td>
        <td><strong>${count}</strong> orang</td>
        <td class="row-actions">
          <button class="btn btn-primary btn-sm" data-action="view-pemilik-perumahan" data-id="${p.id}">Cek Pemilik</button>
          <button class="btn btn-ghost btn-sm" data-action="edit-perumahan" data-id="${p.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-action="delete-perumahan" data-id="${p.id}">Hapus</button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error("Error render perumahan:", err);
    const tbody = $('#perumahanTbody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Terjadi kesalahan sistem: ${err.message}</div></td></tr>`;
  }
}

function openPerumahanModal(id) {
  const p = id ? state.perumahan.find(x => x.id === id) : null;
  const isEdit = !!p;
  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-narrow">
        <div class="modal-head"><div><h3>${isEdit ? 'Ubah Perumahan' : 'Tambah Perumahan'}</h3></div><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body">
          <form id="perumahanForm">
            <div class="field"><label>Nama Perumahan *</label><input class="input" id="pNama" required value="${esc(p?.nama || '')}"></div>
            <div class="field"><label>Lokasi *</label><input class="input" id="pLokasi" required value="${esc(p?.lokasi || '')}"></div>
            <div class="field"><label>Total Unit *</label><input class="input" type="number" min="1" id="pUnit" required value="${p?.totalUnit || ''}"></div>
            <div class="field"><label>Deskripsi</label><textarea class="input" id="pDesk" rows="3">${esc(p?.deskripsi || '')}</textarea></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>
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
    if (isEdit) { Object.assign(p, { nama, lokasi, totalUnit, deskripsi }); toast('Diperbarui', 'success'); }
    else { state.perumahan.push({ id: uid('P'), nama, lokasi, totalUnit, deskripsi }); toast('Ditambahkan', 'success'); }
    persistAll(); closeModal(); renderPerumahan();
  });
}

function openPemilikPerumahanModal(perumahanId) {
  const p = state.perumahan.find(x => x.id === perumahanId);
  if(!p) return;
  const users = state.users.filter(u => u.role === 'user' && u.perumahanId === perumahanId);
  
  const listHtml = users.length ? users.map(u => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">
      <div>
        <strong style="display:block;font-size:14px;">${esc(u.nama)}</strong>
        <span class="muted" style="font-size:12px;">Blok ${esc(u.blok)} · ${esc(u.phone)}</span>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="view-documents" data-id="${u.id}">Lihat Dokumen</button>
    </div>
  `).join('') : '<p class="muted">Belum ada pemilik terdaftar di perumahan ini.</p>';

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-narrow">
        <div class="modal-head">
          <div><h3>Daftar Pemilik: ${esc(p.nama)}</h3></div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
          ${listHtml}
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });
}

/* =========================================================
   ADMIN — DATA PEMBELI & DOKUMEN
   ========================================================= */
const DOC_LABELS = {
  ktp: 'KTP & NPWP Suami Istri *', bukuNikah: 'Buku Nikah *', skKerja: 'SK Kerja',
  slipGaji: 'Slip Gaji 3 Bulan', rekKoran: 'Rek Koran 3 Bulan', kk: 'Kartu Keluarga',
  shm: 'SHM *', imb: 'IMB', pbb: 'PBB *', fotoRumah: 'Foto Rumah'
};
const DOC_KEYS = Object.keys(DOC_LABELS);
const REQUIRED_DOCS = ['ktp', 'bukuNikah', 'shm', 'pbb'];

function renderPemilik() {
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input class="input" id="searchPemilik" placeholder="Cari nama, username, blok..."></div>
      <div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="add-pemilik">➕ Tambah Pembeli</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nama</th><th>Username</th><th>Perumahan</th><th>Blok</th><th>Masa Retensi</th><th>Aksi</th></tr>
          </thead>
          <tbody id="pemilikTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  const searchEl = $('#searchPemilik');
  if (searchEl) searchEl.addEventListener('input', applyFilterPemilik);
  applyFilterPemilik();
}

function applyFilterPemilik() {
  try {
    const q = ($('#searchPemilik')?.value || '').toLowerCase().trim();
    let list = (state.users || []).filter(u => u.role === 'user');
    if (q) list = list.filter(u => String(u.nama || '').toLowerCase().includes(q) || String(u.username || '').toLowerCase().includes(q) || String(u.blok || '').toLowerCase().includes(q));
    
    const tbody = $('#pemilikTbody');
    if (!tbody) return;
    
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty" style="padding:44px 20px"><div class="e-icon">👥</div><h4>Tidak ada data pembeli</h4></div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const warranty = getWarrantyStatus(u.tanggalSerahTerima);
      return `<tr>
        <td><span class="td-title">${esc(u.nama)}</span></td>
        <td><span class="mono">${esc(u.username)}</span></td>
        <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(getPerumahanName(u.perumahanId))}</span></td>
        <td><strong>${esc(u.blok || '—')}</strong></td>
        <td>${warranty.expired ? '<span class="status ditolak">Habis</span>' : `<span class="status selesai">${warranty.daysLeft} Hari</span>`}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-action="view-documents" data-id="${u.id}">Lihat Dokumen</button>
          <button class="btn btn-ghost btn-sm" data-action="edit-pemilik" data-id="${u.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-action="delete-pemilik" data-id="${u.id}">Hapus</button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error("Error render pemilik:", err);
    const tbody = $('#pemilikTbody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Terjadi kesalahan sistem: ${err.message}</div></td></tr>`;
  }
}

function openPemilikModal(id) {
  const u = id ? state.users.find(x => x.id === id) : null;
  const isEdit = !!u;
  
  const docFields = DOC_KEYS.map(k => {
    const isRequired = REQUIRED_DOCS.includes(k);
    const val = u?.dokumen?.[k] || '';
    return `
      <div class="field" style="margin-bottom:10px; grid-column: span 1;">
        <label>${DOC_LABELS[k]} ${isRequired ? '<span style="color:red">*</span>' : ''}</label>
        <input class="input" type="file" id="doc_${k}" accept="image/*" ${isRequired && !isEdit ? 'required' : ''} style="padding:8px">
        ${val ? `<small style="color:green">✓ File tersimpan</small>` : ''}
      </div>
    `;
  }).join('');

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-lg">
        <div class="modal-head">
          <div><h3>${isEdit ? 'Ubah Data Pembeli' : 'Tambah Pembeli'}</h3><div class="sub">Kelola akun dan dokumen persyaratan retensi</div></div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="pemilikForm">
            <h4 style="margin-bottom:12px;color:var(--primary)">Data Diri</h4>
            <div class="form-grid">
              <div class="field"><label>Nama Lengkap *</label><input class="input" id="uNama" required value="${esc(u?.nama || '')}"></div>
              <div class="field"><label>Username *</label><input class="input" id="uUsername" required value="${esc(u?.username || '')}"></div>
              <div class="field"><label>Password *</label><input class="input" id="uPassword" required value="${esc(u?.password || '')}"></div>
              <div class="field"><label>No. WhatsApp *</label><input class="input" id="uPhone" required value="${esc(u?.phone || '')}"></div>
              <div class="field"><label>Perumahan *</label>
                <select class="input" id="uPerumahan" required>
                  <option value="">— Pilih —</option>
                  ${(state.perumahan || []).map(p => `<option value="${p.id}" ${u?.perumahanId === p.id ? 'selected' : ''}>${esc(p.nama)}</option>`).join('')}
                </select>
              </div>
              <div class="field"><label>Blok / No. Rumah *</label><input class="input" id="uBlok" required value="${esc(u?.blok || '')}"></div>
              <div class="field full"><label>Tanggal Serah Terima * (Untuk hitung 100 hari retensi)</label><input class="input" type="date" id="uTglSerah" required value="${u?.tanggalSerahTerima ? u.tanggalSerahTerima.split('T')[0] : ''}"></div>
            </div>

            <h4 style="margin:24px 0 12px;color:var(--primary)">Dokumen Persyaratan (Wajib & Opsional)</h4>
            <div class="form-grid">
              ${docFields}
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Batal</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Pembeli'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';

  $('#pemilikForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = $('#uNama').value.trim();
    const username = $('#uUsername').value.trim().toLowerCase();
    const password = $('#uPassword').value;
    const phone = $('#uPhone').value.trim();
    const perumahanId = $('#uPerumahan').value;
    const blok = $('#uBlok').value.trim();
    const tglSerah = $('#uTglSerah').value;

    if (!nama || !username || !password || !phone || !perumahanId || !blok || !tglSerah) return toast('Lengkapi field wajib', 'error');
    if ((state.users || []).some(x => x.username === username && x.id !== u?.id)) return toast('Username sudah dipakai', 'error');

    const dokumenBaru = {};
    for (const k of DOC_KEYS) {
      const fileInput = $(`#doc_${k}`);
      if (fileInput.files.length > 0) {
        dokumenBaru[k] = await compressImage(fileInput.files[0]);
      } else if (u?.dokumen?.[k]) {
        dokumenBaru[k] = u.dokumen[k];
      }
    }

    if (!isEdit) {
      for (const reqKey of REQUIRED_DOCS) {
        if (!dokumenBaru[reqKey]) return toast(`Dokumen ${DOC_LABELS[reqKey]} wajib diunggah!`, 'error');
      }
    }

    const data = {
      nama, username, password, phone, perumahanId, blok,
      tanggalSerahTerima: new Date(tglSerah).toISOString(),
      dokumen: dokumenBaru
    };

    if (isEdit) {
      Object.assign(u, data);
      toast('Data pembeli diperbarui', 'success');
    } else {
      state.users.push({ id: uid('U'), role: 'user', createdAt: new Date().toISOString(), ...data });
      toast('Pembeli ditambahkan', 'success');
    }
    persistAll(); closeModal(); renderPemilik();
  });
}

function openDocModal(userId) {
  const u = state.users.find(x => x.id === userId);
  if (!u) return;

  const docsHtml = DOC_KEYS.map(k => {
    const isReq = REQUIRED_DOCS.includes(k);
    const src = u.dokumen?.[k];
    return `
      <div class="doc-card">
        <div class="doc-name">${DOC_LABELS[k].replace(' *', '')}</div>
        ${src 
          ? `<img src="${src}" data-action="zoom-src" data-src="${src}" alt="${k}">` 
          : `<div class="empty-doc">Belum diunggah</div>`}
        <div class="doc-status">${src ? '✅ Tersedia' : (isReq ? '❌ Wajib' : '⚪ Opsional')}</div>
      </div>
    `;
  }).join('');

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-lg">
        <div class="modal-head">
          <div>
            <h3>Dokumen: ${esc(u.nama)}</h3>
            <div class="sub">${esc(getPerumahanName(u.perumahanId))} · Blok ${esc(u.blok)} · Tgl Serah Terima: ${fmtDate(u.tanggalSerahTerima)}</div>
          </div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="doc-grid">${docsHtml}</div>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });
}

/* =========================================================
   USER — FORM PENGAJUAN RETENSI
   ========================================================= */
function renderNewRequest() {
  state.draftPhotos = [];
  const myPerumahan = getPerumahanName(state.session.perumahanId);
  const warranty = getWarrantyStatus(state.session.tanggalSerahTerima);

  $('#content').innerHTML = `
    <div style="max-width:860px">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Formulir Pengajuan Retensi</h3>
          ${warranty.expired ? '<span class="status ditolak">Masa Garansi Habis</span>' : '<span class="status selesai">Dalam Masa Garansi</span>'}
        </div>
        
        ${warranty.expired ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:16px;border-radius:10px;margin-bottom:20px;font-size:13.5px;">
            <strong>Perhatian:</strong> Masa garansi retensi 100 hari Anda telah berakhir. Pengajuan ini akan dikenakan biaya tambahan yang akan diverifikasi oleh Admin.
          </div>
        ` : ''}

        <div class="info-item" style="margin-bottom:20px">
          <div class="k">Diajukan untuk rumah</div>
          <div class="v">${esc(myPerumahan)} — Blok ${esc(state.session.blok || '—')}</div>
        </div>

        <form id="requestForm">
          <div class="form-grid">
            <div class="field full">
              <label for="fTitle">Judul Pengajuan *</label>
              <input class="input" id="fTitle" required maxlength="90" placeholder="Contoh: Retensi atap bocor di kamar utama">
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
              <textarea class="input" id="fDesc" required rows="5" placeholder="Jelaskan kondisi kerusakan atau rencana retensi..."></textarea>
            </div>
            <div class="field full">
              <label>Foto Kondisi Rumah (Awal)</label>
              <div class="dropzone" id="dropzone">
                <div class="dz-icon">📷</div><strong>Klik atau tarik foto ke sini</strong><small>Maks. 5 foto</small>
              </div>
              <input type="file" id="photoInput" accept="image/*" multiple hidden>
              <div class="photo-grid" id="photoGrid"></div>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:24px;">
            <button type="submit" class="btn btn-primary">Kirim Pengajuan</button>
            <button type="button" class="btn btn-ghost" data-action="nav" data-page="dashboard">Batal</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const fileInput = $('#photoInput'), dz = $('#dropzone');
  if(dz) {
    dz.addEventListener('click', () => fileInput.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', e => { handleFiles(e.target.files); fileInput.value = ''; });
  }
  const form = $('#requestForm');
  if(form) form.addEventListener('submit', submitRequest);
}

async function handleFiles(files) {
  const list = Array.from(files).filter(f => f.type.startsWith('image/'));
  const remaining = 5 - state.draftPhotos.length;
  if (remaining <= 0) return toast('Maksimal 5 foto', 'error');
  for (const file of list.slice(0, remaining)) {
    state.draftPhotos.push(await compressImage(file));
  }
  renderDraftPhotos();
}

function renderDraftPhotos() {
  const grid = $('#photoGrid');
  if (!grid) return;
  grid.innerHTML = state.draftPhotos.map((src, i) => `
    <div class="photo-item">
      <img src="${src}" data-action="zoom-src" data-src="${src}">
      <button type="button" class="photo-del" data-action="del-photo" data-index="${i}">✕</button>
    </div>`).join('');
}

function compressImage(file, maxSize = 1000, quality = 0.7) {
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
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

function submitRequest(e) {
  e.preventDefault();
  const title = $('#fTitle').value.trim();
  const category = $('#fCategory').value;
  const priority = $('#fPriority').value;
  const description = $('#fDesc').value.trim();
  if (!title || !category || !description) return toast('Lengkapi field wajib', 'error');

  const now = new Date().toISOString();
  const req = {
    id: uid(), pemilikId: state.session.id, ownerName: state.session.nama,
    perumahanId: state.session.perumahanId, perumahanNama: getPerumahanName(state.session.perumahanId),
    blok: state.session.blok, phone: state.session.phone,
    title, category, priority, description,
    photos: [...state.draftPhotos], status: 'diajukan', assignedTo: '', estimatedCost: 0,
    createdAt: now, updatedAt: now,
    timeline: [{ status: 'diajukan', note: 'Pengajuan retensi dibuat.', by: state.session.nama, role: 'user', at: now, photos: [] }],
  };
  state.requests.push(req); persistAll(); state.draftPhotos = [];
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
  if(!box) return;
  const filtered = filter === 'all' ? list : list.filter(r => r.status === filter);
  if (!filtered.length) {
    box.innerHTML = `<div class="card">${emptyState('🗂️', 'Tidak ada pengajuan', 'Belum ada data.', 'Ajukan Retensi', 'new')}</div>`;
    return;
  }
  box.innerHTML = `<div class="req-list">${filtered.map(reqCard).join('')}</div>`;
}

function reqCard(r) {
  const thumb = r.photos && r.photos.length ? `<img src="${r.photos[0]}">` : '🛠️';
  return `
    <div class="req-card" data-action="open-detail" data-id="${r.id}">
      <div class="req-thumb">${thumb}</div>
      <div class="req-body">
        <div class="req-top">${statusBadge(r.status)}<span class="mono">#${r.id}</span></div>
        <h4>${esc(r.title)}</h4>
        <p class="req-desc">${esc(r.description)}</p>
        <div class="req-meta">
          <span>🏘️ ${esc(r.perumahanNama)}</span>
          <span>📅 ${fmtDate(r.createdAt)}</span>
        </div>
      </div>
      <div class="req-arrow">›</div>
    </div>`;
}

/* =========================================================
   ADMIN — SEMUA PENGAJUAN
   ========================================================= */
function renderAdminRequests() {
  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input class="input" id="searchReq" placeholder="Cari judul, ID, nama..."></div>
      <select class="input" id="filterReqStatus" style="max-width:200px">
        <option value="all">Semua Status</option>
        ${STATUS_ALL.map(s => `<option value="${s}">${STATUS[s].label}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="muted" style="font-size:13px" id="resultCount"></span>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Pemilik</th><th>Pengajuan</th><th>Status</th><th>Pekerja</th><th>Biaya</th><th>Aksi</th></tr></thead>
          <tbody id="reqTableBody"></tbody>
        </table>
      </div>
    </div>
  `;
  const searchEl = $('#searchReq');
  const filterEl = $('#filterReqStatus');
  if (searchEl) searchEl.addEventListener('input', applyAdminFilters);
  if (filterEl) filterEl.addEventListener('change', applyAdminFilters);
  applyAdminFilters();
}

function applyAdminFilters() {
  try {
    const q = ($('#searchReq')?.value || '').toLowerCase().trim();
    const st = $('#filterReqStatus')?.value || 'all';
    let list = getAllRequests();
    if (st !== 'all') list = list.filter(r => r.status === st);
    if (q) list = list.filter(r => String(r.title||'').toLowerCase().includes(q) || String(r.id||'').toLowerCase().includes(q) || String(r.ownerName||'').toLowerCase().includes(q));
    
    const body = $('#reqTableBody');
    if (!body) return;
    
    body.innerHTML = list.length ? list.map(r => `
      <tr>
        <td><span class="mono">#${r.id}</span></td>
        <td><span class="td-title" style="max-width:140px">${esc(r.ownerName)}</span><span class="td-sub">${esc(r.perumahanNama)}</span></td>
        <td><span class="td-title">${esc(r.title)}</span></td>
        <td>${statusBadge(r.status)}</td>
        <td><span class="td-sub">${esc(r.assignedTo || '—')}</span></td>
        <td><span class="td-sub">${r.estimatedCost ? rupiah(r.estimatedCost) : '—'}</span></td>
        <td class="row-actions"><button class="btn btn-ghost btn-sm" data-action="open-detail" data-id="${r.id}">Kelola</button></td>
      </tr>`).join('') : `<tr><td colspan="7"><div class="empty">Tidak ada data.</div></td></tr>`;
    
    if ($('#resultCount')) $('#resultCount').textContent = `${list.length} pengajuan`;
  } catch (err) {
    console.error("Error render requests:", err);
    const body = $('#reqTableBody');
    if(body) body.innerHTML = `<tr><td colspan="7"><div class="empty">Error: ${err.message}</div></td></tr>`;
  }
}

/* =========================================================
   DETAIL MODAL
   ========================================================= */
function openDetail(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  const isAdmin = state.session.role === 'admin';
  const pemilikData = state.users.find(u => u.id === r.pemilikId);
  const warranty = getWarrantyStatus(pemilikData?.tanggalSerahTerima);

  const timelineHtml = (r.timeline || []).map(t => `
    <div class="tl-item">
      <span class="tl-dot" style="border-color:${STATUS[t.status]?.color || '#6366f1'}"></span>
      <div class="tl-head"><strong>${esc(STATUS[t.status]?.label || t.status)}</strong><span class="tl-time">${fmtDateTime(t.at)}</span></div>
      <div class="tl-note">${esc(t.note)}</div>
      <div class="tl-by">oleh ${esc(t.by)} · ${t.role === 'admin' ? 'Admin' : 'Pemilik'}</div>
      ${t.photos && t.photos.length ? `<div class="tl-photos">${t.photos.map(p => `<img src="${p}" data-action="zoom-src" data-src="${p}">`).join('')}</div>` : ''}
    </div>`).join('');

  const adminPanel = isAdmin ? `
    <div class="side-box" style="margin-bottom:16px">
      <h4>⚙️ Kelola Pengajuan</h4>
      <div class="field">
        <label for="mStatus">Tahapan Retensi</label>
        <select class="input" id="mStatus">
          ${STATUS_ALL.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="mWorker">Pekerja / Developer</label>
        <input class="input" id="mWorker" value="${esc(r.assignedTo || '')}" placeholder="Nama vendor">
      </div>
      <div class="field">
        <label for="mCost">Biaya Tambahan (Rp)</label>
        <input class="input" type="number" id="mCost" min="0" value="${r.estimatedCost || 0}">
        <div class="hint">Isi 0 jika masih dalam masa garansi 100 hari.</div>
      </div>
      <div class="field">
        <label for="mNote">Catatan Progres *</label>
        <textarea class="input" id="mNote" rows="2" placeholder="Update terkini..."></textarea>
      </div>
      <div class="field">
        <label for="mPhoto">Foto Dokumentasi Progres (Opsional)</label>
        <input class="input" type="file" id="mPhoto" accept="image/*" style="padding:8px">
      </div>
      <button class="btn btn-primary btn-block" data-action="save-request" data-id="${r.id}">Simpan Perubahan</button>
    </div>
  ` : `
    <div class="side-box" style="margin-bottom:16px">
      <h4>💬 Tambah Catatan</h4>
      <div class="field"><textarea class="input" id="userNote" rows="3" placeholder="Tulis pertanyaan..."></textarea></div>
      <button class="btn btn-primary btn-block" data-action="add-note" data-id="${r.id}">Kirim Catatan</button>
    </div>
  `;

  const userVerifyPanel = (!isAdmin && r.status === 'verifikasi') ? `
    <div class="side-box" style="margin-bottom:16px; border:2px solid var(--warning); background:#fffbeb;">
      <h4>⚠️ Persetujuan Retensi</h4>
      <p style="font-size:13px; margin-bottom:12px; line-height:1.6;">
        ${warranty.expired 
          ? `Masa garansi 100 hari telah habis. Pengerjaan ini akan dikenakan biaya tambahan sebesar <strong>${rupiah(r.estimatedCost)}</strong>. Apakah Anda setuju untuk melanjutkan?`
          : `Masa garansi masih aktif. Apakah Anda setuju untuk melanjutkan proses retensi ini?`}
      </p>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-success btn-block" data-action="user-verify" data-id="${r.id}" data-val="ya">Ya, Setuju</button>
        <button class="btn btn-danger btn-block" data-action="user-verify" data-id="${r.id}" data-val="tidak">Tidak</button>
      </div>
    </div>
  ` : '';

  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal modal-lg">
        <div class="modal-head">
          <div>
            <h3>${esc(r.title)}</h3>
            <div class="sub">
              <span class="mono">#${r.id}</span>
              <span>${esc(r.ownerName)} · ${esc(r.perumahanNama)} · ${esc(r.blok)}</span>
            </div>
          </div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div>
              <div style="margin-bottom:18px; display:flex; gap:10px; align-items:center;">
                ${statusBadge(r.status)}
                ${warranty.expired ? '<span class="status ditolak">Masa Garansi Habis</span>' : `<span class="status selesai">Sisa ${warranty.daysLeft} Hari</span>`}
              </div>
              
              <div class="info-grid">
                <div class="info-item"><div class="k">Kategori</div><div class="v">${esc(r.category)}</div></div>
                <div class="info-item"><div class="k">Prioritas</div><div class="v">${esc(r.priority)}</div></div>
                <div class="info-item"><div class="k">Pekerja</div><div class="v">${esc(r.assignedTo || '—')}</div></div>
                <div class="info-item"><div class="k">Biaya Tambahan</div><div class="v">${r.estimatedCost ? rupiah(r.estimatedCost) : 'Gratis (Garansi)'}</div></div>
              </div>
              
              <h4 style="margin:20px 0 10px">Deskripsi</h4>
              <div class="desc-box">${esc(r.description)}</div>
              
              <h4 style="margin:24px 0 14px">Riwayat Progres</h4>
              <div class="timeline">${timelineHtml}</div>
            </div>
            
            <aside>
              ${userVerifyPanel}
              ${adminPanel}
            </aside>
          </div>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });
}

function closeModal() { 
  const root = $('#modalRoot'); if(root) root.innerHTML = ''; 
  document.body.style.overflow = ''; 
}

async function saveRequestChanges(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  
  const newStatus = $('#mStatus').value;
  const worker = $('#mWorker').value.trim();
  const cost = Number($('#mCost').value || 0);
  const note = $('#mNote').value.trim();
  const photoInput = $('#mPhoto');
  
  if (!note) return toast('Catatan progres wajib diisi', 'error');

  let newPhoto = null;
  if (photoInput && photoInput.files.length > 0) {
    newPhoto = await compressImage(photoInput.files[0]);
  }

  const notes = [];
  let changed = false;

  if (newStatus !== r.status) {
    r.status = newStatus;
    notes.push(`Status diubah ke "${STATUS[newStatus].label}".`);
    changed = true;
  }
  if (worker !== (r.assignedTo || '')) {
    r.assignedTo = worker;
    notes.push(worker ? `Pekerja: ${worker}.` : 'Pekerja dikosongkan.');
    changed = true;
  }
  if (cost !== (r.estimatedCost || 0)) {
    r.estimatedCost = cost;
    notes.push(`Biaya diperbarui: ${rupiah(cost)}.`);
    changed = true;
  }
  if (note) { notes.push(note); changed = true; }

  if (!changed) return toast('Tidak ada perubahan', 'error');

  r.updatedAt = new Date().toISOString();
  r.timeline.push({ 
    status: r.status, 
    note: notes.join(' '), 
    by: state.session.nama, 
    role: 'admin', 
    at: r.updatedAt,
    photos: newPhoto ? [newPhoto] : [] 
  });
  
  persistAll();
  closeModal();
  renderPage();
  toast('Perubahan disimpan', 'success');
}

function userVerifyRequest(id, val) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  const now = new Date().toISOString();
  
  if (val === 'ya') {
    r.status = 'survei';
    r.timeline.push({ status: 'survei', note: 'Pemilik menyetujui kelanjutan retensi.', by: state.session.nama, role: 'user', at: now, photos: [] });
    toast('Persetujuan diterima. Lanjut ke survei.', 'success');
  } else {
    r.status = 'ditolak';
    r.timeline.push({ status: 'ditolak', note: 'Pemilik menolak retensi (tidak setuju dengan ketentuan/biaya).', by: state.session.nama, role: 'user', at: now, photos: [] });
    toast('Pengajuan dibatalkan.', 'info');
  }
  r.updatedAt = now;
  persistAll();
  closeModal();
  renderPage();
}

function addUserNote(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  const note = ($('#userNote')?.value || '').trim();
  if (!note) return toast('Tulis catatan dulu', 'error');
  r.updatedAt = new Date().toISOString();
  r.timeline.push({ status: r.status, note, by: state.session.nama, role: 'user', at: r.updatedAt, photos: [] });
  persistAll();
  openDetail(id);
  toast('Catatan terkirim', 'success');
}

/* =========================================================
   USER — PROGRAM RETENSI & PANDUAN
   ========================================================= */
function renderProgram() {
  $('#content').innerHTML = `
    <div class="program-hero">
      <h2>🛡️ Program Garansi Retensi 100 Hari</h2>
      <p>Setiap pembelian rumah di Dreamland mendapatkan layanan retensi (perbaikan garansi) gratis selama 100 hari sejak tanggal serah terima kunci.</p>
    </div>

    <div class="grid-2-even">
      <div class="card card-pad">
        <h3 style="margin-bottom:16px">Ketentuan Retensi</h3>
        <div class="term-list" style="grid-template-columns:1fr">
          <div class="term-item">
            <h4>1. Masa Berlaku (100 Hari)</h4>
            <p>Dihitung otomatis sejak <strong>Tanggal Serah Terima</strong>. Anda dapat melihat hitung mundur (countdown) sisa waktu di halaman Dashboard.</p>
          </div>
          <div class="term-item">
            <h4>2. Bebas Biaya (Gratis)</h4>
            <p>Selama masa 100 hari aktif, perbaikan atas kerusakan yang disebabkan cacat produksi sepenuhnya gratis.</p>
          </div>
          <div class="term-item">
            <h4>3. Lewat Masa Berlaku</h4>
            <p>Jika pengajuan dilakukan setelah 100 hari, pengajuan tetap dilayani namun akan <strong>dikenakan biaya tambahan</strong> sesuai kerusakan. Admin akan menginformasikan estimasi biaya sebelum pengerjaan.</p>
          </div>
          <div class="term-item">
            <h4>4. Persetujuan Pemilik</h4>
            <p>Jika masa garansi habis dan dikenakan biaya, pemilik rumah memiliki hak untuk menyetujui (Ya) atau membatalkan (Tidak) pengajuan.</p>
          </div>
        </div>
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:16px">Tahapan Proses</h3>
        ${STATUS_FLOW.map((s, i) => `
          <div style="display:flex;gap:14px;align-items:center;padding:12px 0;${i < STATUS_FLOW.length - 1 ? 'border-bottom:1px solid #f1f5f9' : ''}">
            <div style="width:32px;height:32px;border-radius:10px;background:${STATUS[s].bg};color:${STATUS[s].color};display:grid;place-items:center;font-weight:800;font-size:13px;flex-shrink:0">${i + 1}</div>
            <div style="flex:1">
              <div style="font-size:13.5px;font-weight:700">${STATUS[s].label}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card card-pad" style="margin-top:20px;text-align:center">
      <h3 style="margin-bottom:8px">Siap mengajukan retensi?</h3>
      <button class="btn btn-primary" data-action="nav" data-page="new">➕ Ajukan Retensi Sekarang</button>
    </div>
  `;
}

function renderHelp() {
  const isAdmin = state.session.role === 'admin';
  const steps = isAdmin ? [
    ['Kelola Perumahan', 'Tambahkan perumahan yang dikelola.'],
    ['Input Data Pembeli', 'Masukkan data diri, tanggal serah terima, dan unggah dokumen wajib.'],
    ['Verifikasi & Cek Biaya', 'Cek masa 100 hari. Jika habis, isi biaya tambahan.'],
    ['Update Progres', 'Perbarui status, unggah foto dokumentasi pengerjaan.'],
  ] : [
    ['Cek Masa Garansi', 'Lihat widget countdown di Dashboard Anda.'],
    ['Ajukan Retensi', 'Isi form jika ada kerusakan.'],
    ['Persetujuan', 'Jika masa garansi habis dan ada biaya, klik "Ya" atau "Tidak" pada detail pengajuan.'],
    ['Pantau Progres', 'Lihat update dan foto dokumentasi dari admin.'],
  ];

  $('#content').innerHTML = `
    <div class="grid-2">
      <div class="card card-pad">
        <h3 style="margin-bottom:6px">Alur Penggunaan</h3>
        ${steps.map((s, i) => `
          <div class="step">
            <div class="step-num">${i + 1}</div>
            <div><h4>${s[0]}</h4><p>${s[1]}</p></div>
          </div>`).join('')}
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Arti Tahapan</h3>
        ${STATUS_ALL.map(s => `
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">
            <span class="mini-dot" style="background:${STATUS[s].color};margin-top:7px"></span>
            <div>
              <div style="font-size:13.5px;font-weight:600">${STATUS[s].label}</div>
              <div class="muted" style="font-size:12.5px">${
                s === 'diajukan' ? 'Pengajuan baru dikirim.' :
                s === 'verifikasi' ? 'Admin memeriksa kelayakan & biaya.' :
                s === 'survei' ? 'Pengecekan lokasi fisik.' :
                s === 'pengerjaan' ? 'Perbaikan sedang dilakukan.' :
                s === 'pemeriksaan' ? 'Pengecekan akhir.' :
                s === 'selesai' ? 'Selesai.' : 'Ditolak/dibatalkan.'
              }</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

/* =========================================================
   EVENT DELEGATION & UTILS
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
    case 'user-verify': userVerifyRequest(el.dataset.id, el.dataset.val); break;

    case 'add-perumahan': openPerumahanModal(null); break;
    case 'edit-perumahan': openPerumahanModal(el.dataset.id); break;
    case 'delete-perumahan': {
      const p = state.perumahan.find(x => x.id === el.dataset.id);
      if (state.users.some(u => u.perumahanId === el.dataset.id) || state.requests.some(r => r.perumahanId === el.dataset.id)) return toast('Masih ada data terkait', 'error');
      if (!confirm(`Hapus perumahan "${p.nama}"?`)) return;
      state.perumahan = state.perumahan.filter(x => x.id !== el.dataset.id);
      persistAll(); renderPerumahan(); toast('Dihapus', 'success'); break;
    }
    case 'view-pemilik-perumahan': openPemilikPerumahanModal(el.dataset.id); break;

    case 'add-pemilik': openPemilikModal(null); break;
    case 'edit-pemilik': openPemilikModal(el.dataset.id); break;
    case 'view-documents': openDocModal(el.dataset.id); break;
    case 'delete-pemilik': {
      if (state.requests.some(r => r.pemilikId === el.dataset.id)) return toast('Pemilik punya riwayat pengajuan', 'error');
      if (!confirm('Hapus akun ini?')) return;
      state.users = state.users.filter(x => x.id !== el.dataset.id);
      persistAll(); renderPemilik(); toast('Dihapus', 'success'); break;
    }

    case 'del-photo': state.draftPhotos.splice(Number(el.dataset.index), 1); renderDraftPhotos(); break;
    case 'filter-user': {
      $$('#userChips .chip').forEach(c => c.classList.toggle('active', c.dataset.status === el.dataset.status));
      renderUserList(getMyRequests(), el.dataset.status); break;
    }
    
    case 'zoom-src': {
      const lbImg = $('#lightboxImg');
      const lb = $('#lightbox');
      if(lbImg && lb) {
        lbImg.src = el.dataset.src;
        lb.classList.remove('hidden');
      }
      break;
    }
  }
});

function closeLightbox() { 
  const lb = $('#lightbox'); if(lb) lb.classList.add('hidden'); 
  const img = $('#lightboxImg'); if(img) img.src = ''; 
}
$('#lightbox')?.addEventListener('click', closeLightbox);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#lightbox')?.classList.contains('hidden')) closeLightbox();
    else if ($('#modalRoot')?.innerHTML) closeModal();
    else closeSidebar();
  }
});

$('#menuToggle')?.addEventListener('click', () => { $('#sidebar')?.classList.add('open'); $('#sidebarBackdrop')?.classList.add('show'); });
$('#sidebarBackdrop')?.addEventListener('click', () => { $('#sidebar')?.classList.remove('open'); $('#sidebarBackdrop')?.classList.remove('show'); });

function closeSidebar() { 
  $('#sidebar')?.classList.remove('open'); 
  $('#sidebarBackdrop')?.classList.remove('show'); 
}

/* ---------------- Login & Init ---------------- */
$('#fillDemo')?.addEventListener('click', () => {
  $('#loginUsername').value = 'admin';
  $('#loginPassword').value = 'admin123';
  toast('Akun admin terisi', 'info');
});

$('#loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = $('#loginUsername').value.trim().toLowerCase();
  const password = $('#loginPassword').value;
  const user = (state.users || []).find(u => u.username === username && u.password === password);
  if (!user) return toast('Username atau password salah.', 'error');

  state.session = { ...user };
  store.set(K_SESSION, state.session);
  $('#loginPassword').value = '';
  toast(`Selamat datang, ${user.nama.split(' ')[0]}!`, 'success');
  enterApp();
});

function init() {
  // Paksa reset jika ada data yang korup dari versi sebelumnya
  let perumahan = store.get(K_PERUMAHAN, null);
  if (!Array.isArray(perumahan) || perumahan.length === 0) { 
    perumahan = seedPerumahan(); 
    store.set(K_PERUMAHAN, perumahan); 
  }
  state.perumahan = perumahan;

  let users = store.get(K_USERS, null);
  if (!Array.isArray(users) || users.length === 0) { 
    users = seedUsers(); 
    store.set(K_USERS, users); 
  }
  state.users = users;

  let reqs = store.get(K_REQ, null);
  if (!Array.isArray(reqs) || reqs.length === 0) { 
    reqs = seedRequests(); 
    store.set(K_REQ, reqs); 
  }
  state.requests = reqs;

  const session = store.get(K_SESSION, null);
  if (session && session.role) {
    state.session = session;
    enterApp();
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', init);