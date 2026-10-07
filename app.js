/* =========================================================
   MyHome — Property Maintenance CRM
   Frontend demo (vanilla JS + localStorage)
   ========================================================= */

/* ---------------- Konstanta ---------------- */
const STATUS = {
  menunggu:     { label: 'Menunggu Verifikasi', short: 'Menunggu',   color: '#f59e0b' },
  diverifikasi: { label: 'Terverifikasi',       short: 'Diverifikasi', color: '#3b82f6' },
  dikerjakan:   { label: 'Sedang Dikerjakan',   short: 'Dikerjakan', color: '#6366f1' },
  selesai:      { label: 'Selesai',             short: 'Selesai',    color: '#10b981' },
  ditolak:      { label: 'Ditolak',             short: 'Ditolak',    color: '#ef4444' },
};
const STATUS_ORDER = ['menunggu', 'diverifikasi', 'dikerjakan', 'selesai', 'ditolak'];

const CATEGORIES = [
  'Renovasi', 'Perbaikan Atap', 'Plumbing / Air', 'Instalasi Listrik',
  'Pengecatan', 'Keramik / Lantai', 'Taman & Carport', 'Lainnya'
];
const PRIORITIES = ['Rendah', 'Sedang', 'Tinggi'];

const NAV = {
  user: [
    { id: 'dashboard', label: 'Dashboard',        icon: '📊' },
    { id: 'new',       label: 'Ajukan Perbaikan', icon: '➕' },
    { id: 'requests',  label: 'Pengajuan Saya',   icon: '📋' },
    { id: 'help',      label: 'Panduan',          icon: '💡' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard',           icon: '📊' },
    { id: 'requests',  label: 'Semua Pengajuan',     icon: '📋' },
    { id: 'workers',   label: 'Pekerja / Developer', icon: '👷' },
    { id: 'help',      label: 'Panduan',             icon: '💡' },
  ],
};

const PAGE_META = {
  dashboard: { title: 'Dashboard',          sub: 'Ringkasan aktivitas maintenance' },
  new:       { title: 'Ajukan Perbaikan',   sub: 'Lengkapi data dan foto rumah Anda' },
  requests:  { title: 'Pengajuan',          sub: 'Pantau status setiap pengajuan' },
  workers:   { title: 'Pekerja / Developer', sub: 'Kelola mitra pelaksana perbaikan' },
  help:      { title: 'Panduan',            sub: 'Cara menggunakan MyHome' },
};

const DEMO_USERS = [
  { email: 'budi@myhome.id',  password: '123456', role: 'user',  name: 'Budi Santoso',   blok: 'A-12', phone: '0812-3456-7890' },
  { email: 'siti@myhome.id',  password: '123456', role: 'user',  name: 'Siti Rahmawati', blok: 'B-07', phone: '0813-9876-5432' },
  { email: 'admin@myhome.id', password: '123456', role: 'admin', name: 'Admin Property', blok: 'Kantor Pengelola', phone: '021-555-0123' },
];

/* ---------------- Helpers ---------------- */
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const uid = () => 'REQ-' + Math.random().toString(36).slice(2, 7).toUpperCase();

const fmtDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const initials = (name) => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

const statusBadge = (s) => `<span class="status ${s}">${STATUS[s]?.label || s}</span>`;

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return fmtDate(iso);
}

/* ---------------- Storage ---------------- */
const store = {
  get(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { toast('Penyimpanan browser penuh. Hapus beberapa pengajuan lama.', 'error'); return false; }
  },
  del(key) { localStorage.removeItem(key); }
};

const K_REQ     = 'myhome_requests';
const K_WORKERS = 'myhome_workers';
const K_SESSION = 'myhome_session';

/* ---------------- State ---------------- */
const state = {
  session: null,
  page: 'dashboard',
  requests: [],
  workers: [],
  draftPhotos: [],
  loginRole: 'user',
};

/* ---------------- Seed data ---------------- */
function seedRequests() {
  const now = Date.now();
  const d = (days) => new Date(now - days * 86400000).toISOString();

  return [
    {
      id: 'REQ-A1B2C',
      ownerName: 'Budi Santoso', ownerEmail: 'budi@myhome.id', blok: 'A-12', phone: '0812-3456-7890',
      title: 'Renovasi Dapur & Penggantian Kitchen Set',
      category: 'Renovasi',
      description: 'Ingin merenovasi dapur dengan mengganti kitchen set lama yang sudah rusak. Rencana juga menambah meja island kecil dan mengganti keramik lantai dapur. Mohon dibantu estimasi biaya dan waktu pengerjaan.',
      priority: 'Tinggi',
      photos: [],
      status: 'dikerjakan',
      assignedTo: 'CV Karya Bangun',
      estimatedCost: 25000000,
      createdAt: d(12), updatedAt: d(4),
      timeline: [
        { status: 'menunggu',     note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Budi Santoso', role: 'user',  at: d(12) },
        { status: 'diverifikasi', note: 'Dokumen dan foto sudah lengkap. Pengajuan disetujui untuk diproses.', by: 'Admin Property', role: 'admin', at: d(10) },
        { status: 'dikerjakan',   note: 'Pekerjaan dimulai oleh CV Karya Bangun. Estimasi selesai 3 minggu.', by: 'Admin Property', role: 'admin', at: d(4) },
      ],
    },
    {
      id: 'REQ-D4E5F',
      ownerName: 'Budi Santoso', ownerEmail: 'budi@myhome.id', blok: 'A-12', phone: '0812-3456-7890',
      title: 'Perbaikan Atap Bocor di Kamar Utama',
      category: 'Perbaikan Atap',
      description: 'Atap bocor saat hujan deras, air menetes ke plafon kamar utama. Sudah terlihat ada bercak kuning di plafon. Mohon segera diperiksa karena khawatir merusak plafon gypsum.',
      priority: 'Tinggi',
      photos: [],
      status: 'menunggu',
      assignedTo: '',
      estimatedCost: 0,
      createdAt: d(1), updatedAt: d(1),
      timeline: [
        { status: 'menunggu', note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Budi Santoso', role: 'user', at: d(1) },
      ],
    },
    {
      id: 'REQ-G7H8I',
      ownerName: 'Siti Rahmawati', ownerEmail: 'siti@myhome.id', blok: 'B-07', phone: '0813-9876-5432',
      title: 'Pengecatan Ulang Fasad Rumah',
      category: 'Pengecatan',
      description: 'Cat fasad rumah sudah memudar dan ada beberapa bagian yang mengelupas. Ingin dicat ulang dengan warna yang sama (putih tulang). Luas fasad sekitar 120 m².',
      priority: 'Sedang',
      photos: [],
      status: 'diverifikasi',
      assignedTo: 'Tukang Cat Mandiri',
      estimatedCost: 8000000,
      createdAt: d(6), updatedAt: d(3),
      timeline: [
        { status: 'menunggu',     note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Siti Rahmawati', role: 'user', at: d(6) },
        { status: 'diverifikasi', note: 'Pengajuan disetujui. Menunggu penjadwalan tim pengecatan.', by: 'Admin Property', role: 'admin', at: d(3) },
      ],
    },
    {
      id: 'REQ-J9K0L',
      ownerName: 'Siti Rahmawati', ownerEmail: 'siti@myhome.id', blok: 'B-07', phone: '0813-9876-5432',
      title: 'Perbaikan Pipa Air Bocor di Kamar Mandi',
      category: 'Plumbing / Air',
      description: 'Pipa air di kamar mandi bawah bocor dan membuat lantai selalu basah. Sudah dicoba diisolasi sendiri tapi belum berhasil.',
      priority: 'Sedang',
      photos: [],
      status: 'selesai',
      assignedTo: 'CV Karya Bangun',
      estimatedCost: 1500000,
      createdAt: d(22), updatedAt: d(15),
      timeline: [
        { status: 'menunggu',     note: 'Pengajuan dibuat oleh pemilik rumah.', by: 'Siti Rahmawati', role: 'user', at: d(22) },
        { status: 'diverifikasi', note: 'Pengajuan disetujui.', by: 'Admin Property', role: 'admin', at: d(20) },
        { status: 'dikerjakan',   note: 'Tim plumbing mulai bekerja.', by: 'Admin Property', role: 'admin', at: d(18) },
        { status: 'selesai',      note: 'Pipa sudah diganti dan tidak ada kebocoran. Pekerjaan selesai.', by: 'Admin Property', role: 'admin', at: d(15) },
      ],
    },
  ];
}

function seedWorkers() {
  return [
    { id: 'W-01', name: 'CV Karya Bangun',     specialty: 'Renovasi & Struktur', phone: '0811-2233-4455' },
    { id: 'W-02', name: 'Tukang Cat Mandiri',  specialty: 'Pengecatan & Finishing', phone: '0812-7788-9900' },
    { id: 'W-03', name: 'Jaya Plumbing',       specialty: 'Plumbing & Sanitasi', phone: '0813-4455-6677' },
    { id: 'W-04', name: 'Terang Elektrikal',   specialty: 'Instalasi Listrik', phone: '0815-1122-3344' },
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
function persist() {
  store.set(K_REQ, state.requests);
}

/* ---------------- Auth ---------------- */
function showLogin() {
  $('#loginScreen').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function enterApp() {
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  state.page = 'dashboard';
  renderNav();
  renderShellUser();
  renderPage();
}

function renderShellUser() {
  const s = state.session;
  $('#userChip').innerHTML = `
    <div class="avatar">${esc(initials(s.name))}</div>
    <div class="uc-text">
      <strong>${esc(s.name)}</strong>
      <small>${esc(s.blok)}</small>
    </div>`;
  const badge = $('#roleBadge');
  badge.textContent = s.role === 'admin' ? 'Admin Property' : 'Pemilik Rumah';
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

function goTo(page) {
  state.page = page;
  renderNav();
  renderPage();
}

function renderPage() {
  const meta = PAGE_META[state.page] || PAGE_META.dashboard;
  $('#pageTitle').textContent = meta.title;
  $('#pageSubtitle').textContent = meta.sub;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const role = state.session.role;
  if (state.page === 'dashboard') return role === 'admin' ? renderAdminDashboard() : renderUserDashboard();
  if (state.page === 'new')       return renderNewRequest();
  if (state.page === 'requests')  return role === 'admin' ? renderAdminRequests() : renderUserRequests();
  if (state.page === 'workers')   return renderWorkers();
  if (state.page === 'help')      return renderHelp();
  return renderUserDashboard();
}

/* ---------------- Data helpers ---------------- */
function countBy(list) {
  const c = { menunggu: 0, diverifikasi: 0, dikerjakan: 0, selesai: 0, ditolak: 0 };
  list.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
  return c;
}
const getMyRequests = () => state.requests
  .filter(r => r.ownerEmail === state.session.email)
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const getAllRequests = () => [...state.requests]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const findWorkerName = (id) => (state.workers.find(w => w.name === id)?.name) || id || '';

/* ---------------- Stat grid ---------------- */
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
   USER — DASHBOARD
   ========================================================= */
function renderUserDashboard() {
  const mine = getMyRequests();
  const c = countBy(mine);
  const firstName = state.session.name.split(' ')[0];

  $('#pageSubtitle').textContent = `Halo ${firstName}, pantau perbaikan rumah Anda di sini.`;

  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Pengajuan', value: mine.length,           icon: '📋', cls: 'icon-indigo' },
      { label: 'Menunggu',        value: c.menunggu,            icon: '⏳', cls: 'icon-amber' },
      { label: 'Dalam Proses',    value: c.dikerjakan + c.diverifikasi, icon: '🔧', cls: 'icon-blue' },
      { label: 'Selesai',         value: c.selesai,             icon: '✅', cls: 'icon-green' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Pengajuan Terbaru</h3>
          ${mine.length ? `<button class="link" data-action="nav" data-page="requests">Lihat semua</button>` : ''}
        </div>
        ${mine.length
          ? `<div class="mini-list">${mine.slice(0, 5).map(miniRow).join('')}</div>`
          : emptyState('📭', 'Belum ada pengajuan', 'Mulai ajukan perbaikan rumah Anda sekarang.', 'Ajukan Sekarang', 'new')}
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Butuh Perbaikan?</h3>
        <p class="muted" style="font-size:13.5px;margin-bottom:18px;line-height:1.65">
          Ajukan permintaan perbaikan atau renovasi rumah Anda. Sertakan foto dan deskripsi
          yang jelas agar admin property dapat memproses lebih cepat.
        </p>
        <button class="btn btn-primary btn-block" data-action="nav" data-page="new" style="margin-bottom:10px">➕ Buat Pengajuan Baru</button>
        <button class="btn btn-ghost btn-block" data-action="nav" data-page="requests">📋 Lihat Riwayat</button>

        <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:12px">Info Rumah</div>
          <div class="info-item" style="margin-bottom:9px">
            <div class="k">Nama Pemilik</div><div class="v">${esc(state.session.name)}</div>
          </div>
          <div class="info-item">
            <div class="k">Blok / No. Rumah</div><div class="v">${esc(state.session.blok)}</div>
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
   USER — FORM PENGAJUAN BARU
   ========================================================= */
function renderNewRequest() {
  state.draftPhotos = [];

  $('#content').innerHTML = `
    <div style="max-width:860px">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Formulir Pengajuan Perbaikan</h3>
          <span class="status diverifikasi">Langkah 1 dari 1</span>
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

            <div class="field">
              <label for="fBlok">Blok / No. Rumah *</label>
              <input class="input" id="fBlok" required value="${esc(state.session.blok)}">
            </div>

            <div class="field">
              <label for="fPhone">No. WhatsApp *</label>
              <input class="input" id="fPhone" required value="${esc(state.session.phone || '')}" placeholder="08xx-xxxx-xxxx">
            </div>

            <div class="field full">
              <label for="fDesc">Deskripsi Kerusakan / Rencana *</label>
              <textarea class="input" id="fDesc" required rows="5"
                placeholder="Jelaskan kondisi kerusakan, bagian rumah yang diperbaiki, serta harapan Anda..."></textarea>
              <div class="hint">Semakin detail deskripsi Anda, semakin cepat proses verifikasi.</div>
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
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });

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
    } catch (e) {
      toast('Gagal memproses gambar', 'error');
    }
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
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
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
  const blok = $('#fBlok').value.trim();
  const phone = $('#fPhone').value.trim();
  const description = $('#fDesc').value.trim();

  if (!title || !category || !blok || !phone || !description) {
    return toast('Mohon lengkapi semua field wajib', 'error');
  }

  const now = new Date().toISOString();
  const req = {
    id: uid(),
    ownerName: state.session.name,
    ownerEmail: state.session.email,
    blok, phone,
    title, category, priority, description,
    photos: [...state.draftPhotos],
    status: 'menunggu',
    assignedTo: '',
    estimatedCost: 0,
    createdAt: now,
    updatedAt: now,
    timeline: [
      { status: 'menunggu', note: 'Pengajuan dibuat oleh pemilik rumah.', by: state.session.name, role: 'user', at: now },
    ],
  };

  state.requests.push(req);
  persist();
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
        ${['all', ...STATUS_ORDER].map(s => `
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
    box.innerHTML = `<div class="card">${emptyState(
      '🗂️', 'Tidak ada pengajuan',
      filter === 'all' ? 'Anda belum membuat pengajuan apapun.' : 'Tidak ada pengajuan dengan status ini.',
      filter === 'all' ? 'Ajukan Sekarang' : null, 'new'
    )}</div>`;
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
      : r.category === 'Renovasi' ? '🔨' : '🛠️');

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
          <span>🏷️ ${esc(r.category)}</span>
          <span>📅 ${fmtDate(r.createdAt)}</span>
          ${r.assignedTo ? `<span>🔧 ${esc(r.assignedTo)}</span>` : ''}
          ${r.estimatedCost ? `<span>💰 ${rupiah(r.estimatedCost)}</span>` : ''}
        </div>
      </div>
      <div class="req-arrow">›</div>
    </div>`;
}

/* =========================================================
   ADMIN — DASHBOARD
   ========================================================= */
function renderAdminDashboard() {
  const all = getAllRequests();
  const c = countBy(all);
  const total = all.length || 1;

  $('#pageSubtitle').textContent = 'Pantau seluruh pengajuan maintenance perumahan.';

  const pending = all.filter(r => r.status === 'menunggu');
  const active = all.filter(r => r.status === 'dikerjakan' || r.status === 'diverifikasi');

  $('#content').innerHTML = `
    ${statGrid([
      { label: 'Total Pengajuan', value: all.length,  icon: '📋', cls: 'icon-indigo' },
      { label: 'Perlu Verifikasi', value: c.menunggu, icon: '⏳', cls: 'icon-amber' },
      { label: 'Sedang Dikerjakan', value: c.dikerjakan, icon: '🔧', cls: 'icon-blue' },
      { label: 'Selesai',          value: c.selesai,  icon: '✅', cls: 'icon-green' },
    ])}

    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Perlu Tindakan</h3>
          <button class="link" data-action="nav" data-page="requests">Lihat semua</button>
        </div>
        ${pending.length
          ? `<div class="mini-list">${pending.slice(0, 5).map(miniRow).join('')}</div>`
          : emptyState('🎉', 'Semua sudah ditangani', 'Tidak ada pengajuan yang menunggu verifikasi.', null, null)}
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:18px">Distribusi Status</h3>
        <div class="bars">
          ${STATUS_ORDER.map(s => {
            const v = c[s];
            const pct = Math.round((v / total) * 100);
            return `<div class="bar-row">
              <span class="bar-label">${STATUS[s].short}</span>
              <div class="bar-track"><div class="bar-fill ${s}" style="width:${pct}%"></div></div>
              <span class="bar-val">${v}</span>
            </div>`;
          }).join('')}
        </div>

        <div style="margin-top:24px;padding-top:18px;border-top:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:12px">Pekerjaan Aktif</div>
          ${active.length
            ? `<div class="mini-list">${active.slice(0, 3).map(miniRow).join('')}</div>`
            : `<p class="muted" style="font-size:13px">Belum ada pekerjaan aktif saat ini.</p>`}
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   ADMIN — SEMUA PENGAJUAN
   ========================================================= */
function renderAdminRequests() {
  const all = getAllRequests();

  $('#content').innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        <input class="input" id="searchInput" placeholder="Cari judul, ID, atau nama pemilik...">
      </div>
      <select class="input" id="statusFilter" style="max-width:200px">
        <option value="all">Semua Status</option>
        ${STATUS_ORDER.map(s => `<option value="${s}">${STATUS[s].label}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="muted" style="font-size:13px" id="resultCount">${all.length} pengajuan</span>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Pemilik / Blok</th>
              <th>Pengajuan</th>
              <th>Kategori</th>
              <th>Status</th>
              <th>Pekerja</th>
              <th>Tanggal</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="reqTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  $('#searchInput').addEventListener('input', applyAdminFilters);
  $('#statusFilter').addEventListener('change', applyAdminFilters);

  applyAdminFilters();
}

function applyAdminFilters() {
  const q = ($('#searchInput')?.value || '').toLowerCase().trim();
  const st = $('#statusFilter')?.value || 'all';

  let list = getAllRequests();
  if (st !== 'all') list = list.filter(r => r.status === st);
  if (q) {
    list = list.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.ownerName.toLowerCase().includes(q) ||
      r.blok.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }

  const body = $('#reqTableBody');
  if (!body) return;

  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8">
      <div class="empty" style="padding:44px 20px">
        <div class="e-icon">🔍</div>
        <h4>Tidak ada hasil</h4>
        <p>Coba ubah kata kunci atau filter status.</p>
      </div></td></tr>`;
  } else {
    body.innerHTML = list.map(r => `
      <tr>
        <td><span class="mono">#${r.id}</span></td>
        <td>
          <span class="td-title" style="max-width:160px">${esc(r.ownerName)}</span>
          <span class="td-sub">${esc(r.blok)}</span>
        </td>
        <td>
          <span class="td-title">${esc(r.title)}</span>
          <span class="td-sub">Prioritas: ${esc(r.priority)}</span>
        </td>
        <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(r.category)}</span></td>
        <td>${statusBadge(r.status)}</td>
        <td><span class="td-sub" style="font-size:13px;color:#475569">${esc(r.assignedTo || '—')}</span></td>
        <td><span class="td-sub">${fmtDate(r.createdAt)}</span></td>
        <td style="text-align:right">
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
    : `<p class="muted" style="font-size:13px">Tidak ada foto yang dilampirkan.</p>`;

  const timelineHtml = r.timeline.map(t => `
    <div class="tl-item">
      <span class="tl-dot ${t.status}"></span>
      <div class="tl-head">
        <strong>${esc(STATUS[t.status]?.label || t.status)}</strong>
        <span class="tl-time">${fmtDateTime(t.at)}</span>
      </div>
      <div class="tl-note">${esc(t.note)}</div>
      <div class="tl-by">oleh ${esc(t.by)} · ${t.role === 'admin' ? 'Admin Property' : 'Pemilik Rumah'}</div>
    </div>`).join('');

  const adminPanel = isAdmin ? `
    <div class="side-box" style="margin-bottom:16px">
      <h4>⚙️ Kelola Pengajuan</h4>

      <div class="field">
        <label for="mStatus">Status Pengajuan</label>
        <select class="input" id="mStatus">
          ${STATUS_ORDER.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="mWorker">Pekerja / Developer</label>
        <select class="input" id="mWorker">
          <option value="">— Belum ditugaskan —</option>
          ${state.workers.map(w => `<option value="${esc(w.name)}" ${w.name === r.assignedTo ? 'selected' : ''}>${esc(w.name)} — ${esc(w.specialty)}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="mCost">Estimasi Biaya (Rp)</label>
        <input class="input" type="number" id="mCost" min="0" step="100000" value="${r.estimatedCost || 0}">
      </div>

      <div class="field">
        <label for="mNote">Catatan Progres</label>
        <textarea class="input" id="mNote" rows="3" placeholder="Contoh: Material sudah dikirim ke lokasi..."></textarea>
      </div>

      <button class="btn btn-primary btn-block" data-action="save-request" data-id="${r.id}">Simpan Perubahan</button>
    </div>
  ` : `
    <div class="side-box" style="margin-bottom:16px">
      <h4>💬 Tambah Catatan</h4>
      <div class="field">
        <textarea class="input" id="userNote" rows="3" placeholder="Tulis pertanyaan atau informasi tambahan..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" data-action="add-note" data-id="${r.id}">Kirim Catatan</button>
    </div>
  `;

  const modalRoot = $('#modalRoot');
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h3>${esc(r.title)}</h3>
            <div class="sub">
              <span class="mono">#${r.id}</span>
              <span>${esc(r.ownerName)} · ${esc(r.blok)}</span>
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
                <div class="info-item"><div class="k">Blok / Rumah</div><div class="v">${esc(r.blok)}</div></div>
                <div class="info-item"><div class="k">Kontak</div><div class="v">${esc(r.phone)}</div></div>
                <div class="info-item"><div class="k">Pekerja</div><div class="v">${esc(r.assignedTo || 'Belum ditugaskan')}</div></div>
                <div class="info-item"><div class="k">Estimasi Biaya</div><div class="v">${r.estimatedCost ? rupiah(r.estimatedCost) : '—'}</div></div>
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
                    <span class="muted">Terakhir diperbarui</span><strong>${timeAgo(r.updatedAt)}</strong>
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
    </div>
  `;

  document.body.style.overflow = 'hidden';

  const backdrop = $('#modalBackdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.body.style.overflow = '';
}

function saveRequestChanges(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;

  const newStatus = $('#mStatus').value;
  const worker = $('#mWorker').value;
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

  if (!changed) return toast('Tidak ada perubahan untuk disimpan', 'error');

  r.updatedAt = new Date().toISOString();
  r.timeline.push({
    status: r.status,
    note: notes.join(' '),
    by: state.session.name,
    role: 'admin',
    at: r.updatedAt,
  });

  persist();
  closeModal();
  renderPage();
  toast('Perubahan berhasil disimpan', 'success');
}

function addUserNote(id) {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;

  const note = ($('#userNote')?.value || '').trim();
  if (!note) return toast('Tulis catatan terlebih dahulu', 'error');

  r.updatedAt = new Date().toISOString();
  r.timeline.push({
    status: r.status,
    note,
    by: state.session.name,
    role: 'user',
    at: r.updatedAt,
  });

  persist();
  openDetail(id);
  toast('Catatan berhasil dikirim', 'success');
}

/* =========================================================
   ADMIN — PEKERJA / DEVELOPER
   ========================================================= */
function renderWorkers() {
  $('#content').innerHTML = `
    <div class="grid-2">
      <div class="card card-pad">
        <div class="card-head">
          <h3>Daftar Mitra Pelaksana</h3>
          <span class="muted" style="font-size:13px">${state.workers.length} pekerja</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:11px" id="workerList">
          ${state.workers.length ? state.workers.map(w => `
            <div class="worker-card">
              <div class="worker-av">${esc(initials(w.name))}</div>
              <div class="worker-body">
                <strong>${esc(w.name)}</strong>
                <small>${esc(w.specialty)} · ${esc(w.phone)}</small>
              </div>
              <button class="btn btn-danger btn-sm" data-action="delete-worker" data-id="${w.id}">Hapus</button>
            </div>`).join('')
            : `<p class="muted" style="font-size:13.5px">Belum ada pekerja terdaftar.</p>`}
        </div>
      </div>

      <div class="card card-pad">
        <h3 style="margin-bottom:16px">Tambah Pekerja Baru</h3>
        <form id="workerForm">
          <div class="field">
            <label for="wName">Nama Pekerja / Perusahaan *</label>
            <input class="input" id="wName" required placeholder="Contoh: CV Karya Bangun">
          </div>
          <div class="field">
            <label for="wSpec">Spesialisasi *</label>
            <input class="input" id="wSpec" required placeholder="Contoh: Renovasi & Struktur">
          </div>
          <div class="field">
            <label for="wPhone">No. Telepon *</label>
            <input class="input" id="wPhone" required placeholder="0811-2233-4455">
          </div>
          <button class="btn btn-primary btn-block" type="submit">Tambah Pekerja</button>
        </form>
      </div>
    </div>
  `;

  $('#workerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#wName').value.trim();
    const specialty = $('#wSpec').value.trim();
    const phone = $('#wPhone').value.trim();
    if (!name || !specialty || !phone) return toast('Lengkapi semua data pekerja', 'error');

    state.workers.push({ id: 'W-' + Date.now().toString(36).slice(-4).toUpperCase(), name, specialty, phone });
    store.set(K_WORKERS, state.workers);
    renderWorkers();
    toast('Pekerja berhasil ditambahkan', 'success');
  });
}

/* =========================================================
   PANDUAN
   ========================================================= */
function renderHelp() {
  const isAdmin = state.session.role === 'admin';

  const userSteps = [
    ['Buat Pengajuan', 'Masuk ke menu <b>Ajukan Perbaikan</b>, isi judul, kategori, prioritas, deskripsi kerusakan, dan unggah foto kondisi rumah (maks. 5 foto).'],
    ['Tunggu Verifikasi', 'Admin property akan memeriksa pengajuan Anda. Status akan berubah menjadi <b>Terverifikasi</b> jika disetujui.'],
    ['Pantau Progres', 'Buka menu <b>Pengajuan Saya</b> lalu klik salah satu kartu untuk melihat riwayat proses secara lengkap.'],
    ['Tambah Catatan', 'Anda dapat menambahkan catatan atau pertanyaan pada halaman detail pengajuan kapan saja.'],
  ];

  const adminSteps = [
    ['Verifikasi Pengajuan', 'Buka <b>Semua Pengajuan</b>, tinjau detail dan foto, lalu ubah status menjadi <b>Terverifikasi</b> atau <b>Ditolak</b>.'],
    ['Tugaskan Pekerja', 'Pada panel kelola, pilih pekerja/developer yang sesuai dari daftar mitra pelaksana.'],
    ['Perbarui Progres', 'Ubah status menjadi <b>Sedang Dikerjakan</b> dan tulis catatan progres setiap ada perkembangan.'],
    ['Selesaikan Pekerjaan', 'Setelah pekerjaan rampung, ubah status menjadi <b>Selesai</b> dan isi estimasi biaya akhir.'],
  ];

  const steps = isAdmin ? adminSteps : userSteps;

  $('#content').innerHTML = `
    <div class="grid-2">
      <div class="card card-pad">
        <h3 style="margin-bottom:6px">Alur Penggunaan</h3>
        <p class="muted" style="font-size:13.5px;margin-bottom:18px">
          ${isAdmin ? 'Panduan untuk Admin Property dalam mengelola pengajuan maintenance.' : 'Panduan untuk pemilik rumah dalam mengajukan perbaikan.'}
        </p>
        ${steps.map((s, i) => `
          <div class="step">
            <div class="step-num">${i + 1}</div>
            <div><h4>${s[0]}</h4><p>${s[1]}</p></div>
          </div>`).join('')}
      </div>

      <div>
        <div class="card card-pad" style="margin-bottom:20px">
          <h3 style="margin-bottom:14px">Arti Status</h3>
          <div style="display:flex;flex-direction:column;gap:13px">
            ${STATUS_ORDER.map(s => `
              <div style="display:flex;gap:12px;align-items:flex-start">
                <span class="mini-dot" style="background:${STATUS[s].color};margin-top:7px"></span>
                <div>
                  <div style="font-size:13.5px;font-weight:600">${STATUS[s].label}</div>
                  <div class="muted" style="font-size:12.5px">${
                    s === 'menunggu' ? 'Pengajuan baru, menunggu pemeriksaan admin.' :
                    s === 'diverifikasi' ? 'Pengajuan disetujui, menunggu penjadwalan pekerja.' :
                    s === 'dikerjakan' ? 'Pekerja sedang melaksanakan perbaikan.' :
                    s === 'selesai' ? 'Pekerjaan telah rampung dan ditutup.' :
                    'Pengajuan tidak dapat diproses.'
                  }</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card card-pad">
          <h3 style="margin-bottom:12px">Kontak Pengelola</h3>
          <p class="muted" style="font-size:13.5px;line-height:1.65;margin-bottom:14px">
            Butuh bantuan darurat? Hubungi kantor pengelola perumahan.
          </p>
          <div class="info-item" style="margin-bottom:10px"><div class="k">Telepon</div><div class="v">021-555-0123</div></div>
          <div class="info-item" style="margin-bottom:10px"><div class="k">Email</div><div class="v">admin@myhome.id</div></div>
          <div class="info-item"><div class="k">Jam Layanan</div><div class="v">Senin – Sabtu, 08.00 – 17.00 WIB</div></div>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   SIDEBAR (mobile)
   ========================================================= */
function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebarBackdrop').classList.add('show');
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('show');
}

/* =========================================================
   LIGHTBOX
   ========================================================= */
function openLightbox(src) {
  $('#lightboxImg').src = src;
  $('#lightbox').classList.remove('hidden');
}
function closeLightbox() {
  $('#lightbox').classList.add('hidden');
  $('#lightboxImg').src = '';
}

/* =========================================================
   EVENT DELEGATION
   ========================================================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'nav':
      goTo(el.dataset.page);
      break;

    case 'logout':
      logout();
      break;

    case 'open-detail':
      openDetail(el.dataset.id);
      break;

    case 'close-modal':
      closeModal();
      break;

    case 'save-request':
      saveRequestChanges(el.dataset.id);
      break;

    case 'add-note':
      addUserNote(el.dataset.id);
      break;

    case 'del-photo': {
      const idx = Number(el.dataset.index);
      state.draftPhotos.splice(idx, 1);
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

    case 'delete-worker': {
      const id = el.dataset.id;
      const w = state.workers.find(x => x.id === id);
      if (!w) return;
      if (!confirm(`Hapus pekerja "${w.name}"?`)) return;
      state.workers = state.workers.filter(x => x.id !== id);
      store.set(K_WORKERS, state.workers);
      renderWorkers();
      toast('Pekerja dihapus', 'success');
      break;
    }
  }
});

/* Lightbox close */
$('#lightbox').addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#lightbox').classList.contains('hidden')) closeLightbox();
    else if ($('#modalRoot').innerHTML) closeModal();
    else closeSidebar();
  }
});

/* Sidebar mobile */
$('#menuToggle').addEventListener('click', openSidebar);
$('#sidebarBackdrop').addEventListener('click', closeSidebar);

/* Login: role switch */
$('#roleSwitch').addEventListener('click', (e) => {
  const btn = e.target.closest('.role-btn');
  if (!btn) return;
  state.loginRole = btn.dataset.role;
  $$('.role-btn').forEach(b => b.classList.toggle('active', b === btn));
});

/* Login: fill demo */
$('#fillDemo').addEventListener('click', () => {
  const isAdmin = state.loginRole === 'admin';
  $('#loginEmail').value = isAdmin ? 'admin@myhome.id' : 'budi@myhome.id';
  $('#loginPassword').value = '123456';
  toast('Akun demo terisi otomatis', 'info');
});

/* Login submit */
$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#loginEmail').value.trim().toLowerCase();
  const pass = $('#loginPassword').value;

  const user = DEMO_USERS.find(u => u.email === email && u.password === pass);
  if (!user) {
    return toast('Email atau password salah. Gunakan akun demo di bawah.', 'error');
  }
  if (user.role !== state.loginRole) {
    return toast(`Akun ini terdaftar sebagai ${user.role === 'admin' ? 'Admin Property' : 'Pemilik Rumah'}. Ganti tab peran terlebih dahulu.`, 'error');
  }

  state.session = { role: user.role, name: user.name, email: user.email, blok: user.blok, phone: user.phone };
  store.set(K_SESSION, state.session);
  $('#loginPassword').value = '';
  toast(`Selamat datang, ${user.name.split(' ')[0]}!`, 'success');
  enterApp();
});

/* =========================================================
   INIT
   ========================================================= */
function init() {
  // Requests
  let reqs = store.get(K_REQ, null);
  if (!Array.isArray(reqs) || !reqs.length) {
    reqs = seedRequests();
    store.set(K_REQ, reqs);
  }
  state.requests = reqs;

  // Workers
  let workers = store.get(K_WORKERS, null);
  if (!Array.isArray(workers) || !workers.length) {
    workers = seedWorkers();
    store.set(K_WORKERS, workers);
  }
  state.workers = workers;

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
