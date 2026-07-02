# 🏢 Hitech Worker System

Sistem manajemen karyawan internal untuk Hitech. Dibangun dengan **Next.js 16**, **shadcn/ui**, **Prisma**, dan **PostgreSQL**.

## ✨ Fitur

### 👤 Manajemen Karyawan (Admin)
- CRUD data karyawan (Tambah/Edit/Nonaktifkan)
- Filter & cari karyawan
- Toggle status aktif/nonaktif (soft delete)
- Auto-create saldo cuti & medical saat user baru dibuat

### ⏰ Lembur (Overtime)
- Input lembur per hari (weekday/weekend)
- Kalkulasi otomatis berdasarkan rumus perusahaan
- Periode grouping Kamis–Rabu
- Tandai status "Sudah Cair"
- Filter bulan & tahun
- Grafik tren pendapatan & durasi
- Export data per periode

### 📅 Cuti (Leave)
- Pengajuan cuti dengan Calendar mode="multiple" (pilih banyak tanggal)
- Jenis cuti configurable (potong kuota / bebas kuota)
- Jatah cuti otomatis terpotong cuti bersama dari Master Hari Libur
- Dialog detail cuti bersama
- Progress bar dinamis (hijau/amber/merah)

### 🏥 Medical Checkup & Rawat Inap
- Plafon otomatis berdasarkan gaji × multiplier status pernikahan/anak
- Klaim medical dengan form input tanggal, nominal, deskripsi
- Edit & hapus klaim dengan konfirmasi AlertDialog
- Dynamic color coding pada progress bar (Emerald < 70% / Amber 70-89% / Red ≥ 90%)

### 📊 Dashboard
- **Admin**: Stat card color-coded (Total Karyawan, Tetap, Admin, Non-Aktif) + Saldo Saya
- **User**: Sisa Cuti, Saldo Medical, Saldo Rawat Inap, Estimasi Lembur
- Kalender Kerja full-width (Google Calendar style) dengan event blocks
- Data realtime dari API tunggal (`/api/dashboard`)

### ⚙️ Pengaturan (Admin)
- Pengaturan umum (nama site, uang makan, kuota cuti)
- Formula lembur (editable rate per tier)
- Formula plafon MC & RI (editable multiplier)
- Master Hari Libur (Libur Nasional / Cuti Bersama)
- Master Jenis Cuti (nama + potong kuota)
- Reset Data Karyawan (danger zone)

### 🔐 Autentikasi
- NextAuth.js v5 (Auth.js) dengan JWT session
- Role-based access (Admin / User)
- Middleware guard untuk semua route

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| Icons | @tabler/icons-react |
| Database | PostgreSQL |
| ORM | Prisma 6.19 |
| Auth | NextAuth.js v5 (Auth.js) |
| Charts | Recharts |
| Process Manager | PM2 |

---

## 🚀 Instalasi

### Prerequisites
- Node.js 20+
- PostgreSQL
- PM2 (production)

### Setup

```bash
# Clone repo
git clone https://github.com/dickyprase/internal-hitech-worker.git
cd internal-hitech-worker

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan database credentials

# Push schema ke database
npx prisma db push

# Seed data awal
npx prisma db seed

# Jalankan development
npm run dev
```

### Production

```bash
# Build
npm run build

# Jalankan dengan PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── admin/              # Admin endpoints (users, reset-data)
│   │   ├── dashboard/          # Dashboard aggregated data
│   │   ├── leave/              # Cuti endpoints
│   │   ├── medical/            # Medical & RI endpoints
│   │   ├── overtime/           # Lembur endpoints
│   │   └── settings/           # Settings, holidays, leave-types
│   └── dashboard/
│       ├── admin/users/        # Manajemen Karyawan
│       ├── cuti/               # Halaman Cuti
│       ├── lembur/             # Halaman Lembur
│       ├── medical/            # Halaman Medical
│       ├── profil/             # Halaman Profil
│       ├── rawat-inap/         # Halaman Rawat Inap
│       └── settings/           # Halaman Pengaturan
├── components/
│   ├── shared/                 # Reusable components
│   │   ├── calendar-widget.tsx # Kalender Kerja
│   │   ├── stat-card.tsx       # Stat card dengan progress
│   │   └── ...
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── format.ts               # formatRupiah, formatDate
│   ├── overtime-calculator.ts  # Rumus lembur
│   └── period.ts               # Kamis-Rabu period utility
└── prisma/
    ├── schema.prisma           # Database schema
    └── seed.ts                 # Seed data
```

---

## 🔑 Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@hitech.com | admin123 |
| User | user@hitech.com | user123 |

---

## 📐 Business Rules

### Lembur
- Upah/Jam = Gaji ÷ 173
- Weekday: rate 1.5× – 8.5× (per tier durasi)
- Jumat: istirahat 11:45–13:00, label geser +15 menit
- Weekend: Upah/Jam × 2 × Jam Fisik + Uang Makan
- Periode: Kamis – Rabu

### Cuti
- Jatah = Default Quota − Total Cuti Bersama tahun ini
- Jenis cuti configurable (potong kuota / bebas)

### Medical
- MC: gaji × multiplier (1× – 1.5× berdasarkan status)
- RI: gaji × multiplier (4× – 8× berdasarkan status)

---

## 📄 License

Private — Internal use only.
