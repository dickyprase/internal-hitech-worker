# 📄 API Documentation — Hitech Worker System

Base URL: `https://hitech.zorroserver.net`

Semua endpoint (kecuali `/api/auth/*`) memerlukan session cookie. Gunakan `POST /api/auth/signin` untuk login.

---

## Daftar Isi

- [Auth](#auth)
- [Dashboard](#dashboard)
- [User & Profile](#user--profile)
- [Settings](#settings)
- [Overtime / Lembur](#overtime--lembur)
- [Leave / Cuti](#leave--cuti)
- [Medical & Rawat Inap](#medical--rawat-inap)
- [Admin](#admin)

---

## Auth

### POST `/api/auth/signin`

Login dan buat session.

**Request Body:**
```json
{
  "email": "admin@hitech.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Administrator",
    "email": "admin@hitech.com",
    "role": "admin"
  }
}
```

### POST `/api/auth/signout`

Hapus session. Redirect ke `/login`.

### GET `/api/auth/session`

Ambil data session aktif.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Administrator",
    "email": "admin@hitech.com",
    "role": "admin"
  },
  "expires": "2026-07-30T..."
}
```

---

## Dashboard

### GET `/api/dashboard`

Ambil semua data dashboard dalam satu request. Menghitung plafon MC/RI dari gaji × multiplier.

**Response (200):**
```json
{
  "data": {
    "user": {
      "gajiPokok": 5000000,
      "statusPernikahan": "single",
      "jumlahAnak": 0,
      "role": "user"
    },
    "leave": {
      "totalQuota": 11,
      "used": 1,
      "remaining": 10,
      "cutiBersamaCut": 1
    },
    "mc": {
      "plafon": 5000000,
      "used": 500000,
      "remaining": 4500000
    },
    "ri": {
      "plafon": 20000000,
      "used": 0,
      "remaining": 20000000
    },
    "overtime": {
      "totalAmount": 875000,
      "totalDays": 2
    }
  }
}
```

**Multiplier Logic:**

| Status | MC Multiplier | RI Multiplier |
|---|---|---|
| Single | 1× | 4× |
| Menikah, 0 anak | 1.2× | 6× |
| Menikah, 1 anak | 1.3× | 8× |
| Menikah, 2 anak | 1.4× | 8× |
| Menikah, 3+ anak | 1.5× | 8× |

---

## User & Profile

### GET `/api/user/me`

Ambil data user yang sedang login.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@hitech.com",
    "role": "user",
    "nik": "HT-001",
    "statusKaryawan": "tetap",
    "statusPernikahan": "single",
    "jumlahAnak": 0,
    "gajiPokok": 5000000,
    "isActive": true,
    "createdAt": "2026-01-01T..."
  }
}
```

### PUT `/api/user/profile`

Update profil user.

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "statusKaryawan": "tetap",
  "statusPernikahan": "married",
  "jumlahAnak": 1,
  "gajiPokok": 6000000
}
```

**Response (200):**
```json
{
  "data": { "message": "Profil berhasil diperbarui" }
}
```

### PUT `/api/user/password`

Ganti password.

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**Response (200):**
```json
{
  "data": { "message": "Password berhasil diubah" }
}
```

### GET `/api/user/list` *(Admin)*

List semua user.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@hitech.com",
      "role": "user",
      "nik": "HT-001",
      "statusKaryawan": "tetap",
      "isActive": true,
      "createdAt": "2026-01-01T..."
    }
  ]
}
```

---

## Settings

### GET `/api/settings/global`

Ambil semua pengaturan global.

**Response (200):**
```json
{
  "data": [
    { "id": 1, "key": "site_name", "value": "Hitech Worker System", "description": "Nama Website" },
    { "id": 2, "key": "uang_makan", "value": "30000", "description": "Uang Makan per Hari (Rp)" },
    { "id": 3, "key": "leave_default_quota", "value": "12", "description": "Jatah Cuti Tahunan Default" }
  ]
}
```

### PUT `/api/settings/global` *(Admin)*

Update pengaturan global.

**Request Body:**
```json
{
  "updates": [
    { "key": "uang_makan", "value": "35000" },
    { "key": "leave_default_quota", "value": "14" }
  ]
}
```

### GET `/api/settings/overtime-rules`

Ambil semua aturan lembur.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "label": "s/d 18:00",
      "labelFriday": "s/d 18:15",
      "durationHours": 1,
      "rate": 1.5,
      "sortOrder": 1,
      "isActive": true
    }
  ]
}
```

### PUT `/api/settings/overtime-rules/:id` *(Admin)*

Update rate/is_active satu aturan lembur.

**Request Body:**
```json
{
  "rate": 2.0,
  "isActive": true
}
```

### GET `/api/settings/plafon-rules`

Ambil semua aturan plafon MC/RI.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "type": "mc",
      "label": "Lajang",
      "statusPernikahan": "single",
      "jumlahAnakMin": 0,
      "jumlahAnakMax": null,
      "multiplier": 1.0,
      "isActive": true
    }
  ]
}
```

### PUT `/api/settings/plafon-rules/:id` *(Admin)*

Update multiplier/is_active satu aturan plafon.

**Request Body:**
```json
{
  "multiplier": 1.5,
  "isActive": true
}
```

### GET `/api/settings/holidays`

Ambil daftar hari libur berdasarkan tahun.

**Query Params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `year` | number | tahun sekarang | Tahun filter |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-08-17T00:00:00.000Z",
      "name": "Hari Kemerdekaan",
      "type": "national",
      "year": 2026,
      "deletedAt": null
    }
  ]
}
```

### POST `/api/settings/holidays` *(Admin)*

Tambah hari libur baru.

**Request Body:**
```json
{
  "date": "2026-08-17",
  "name": "Hari Kemerdekaan RI",
  "type": "national"
}
```

**Tipe:** `national` (Libur Nasional) atau `cuti_bersama` (Cuti Bersama)

**Response (201):**
```json
{
  "data": {
    "id": 5,
    "date": "2026-08-17T...",
    "name": "Hari Kemerdekaan RI",
    "type": "national",
    "year": 2026
  }
}
```

### DELETE `/api/settings/holidays?id=X` *(Admin)*

Soft delete hari libur.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `id` | number | ID hari libur |

### GET `/api/settings/leave-types`

Ambil daftar jenis cuti.

**Response (200):**
```json
{
  "data": [
    { "id": 1, "name": "Cuti Tahunan", "deductQuota": true, "isActive": true },
    { "id": 2, "name": "Cuti Nikah", "deductQuota": false, "isActive": true },
    { "id": 3, "name": "Cuti Hamil/Melahirkan", "deductQuota": false, "isActive": true }
  ]
}
```

### POST `/api/settings/leave-types` *(Admin)*

Tambah jenis cuti baru.

**Request Body:**
```json
{
  "name": "Cuti Nikah",
  "deductQuota": false
}
```

### PUT `/api/settings/leave-types` *(Admin)*

Update jenis cuti.

**Request Body:**
```json
{
  "id": 1,
  "name": "Cuti Tahunan",
  "deductQuota": true,
  "isActive": true
}
```

---

## Overtime / Lembur

### GET `/api/overtime/records`

Ambil data lembur, grouped by periode (Kamis–Rabu).

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `month` | number | Bulan (1-12) |
| `year` | number | Tahun |

**Response (200):**
```json
{
  "data": [
    {
      "periodStart": "2026-07-02",
      "periodEnd": "2026-07-08",
      "status": "belum",
      "totalAmount": 875000,
      "totalRounded": 875000,
      "dayCount": 2,
      "records": [
        {
          "id": "uuid",
          "date": "2026-07-02T...",
          "dayType": "weekday",
          "durationHours": 2,
          "rateSnapshot": 3.5,
          "dailyAmount": 203000,
          "roundedAmount": 203000
        }
      ]
    }
  ]
}
```

### POST `/api/overtime/records`

Simpan data lembur baru.

**Request Body:**
```json
{
  "date": "2026-07-02",
  "optionId": 3,
  "isHoliday": false,
  "weekendStartTime": "",
  "weekendEndTime": "",
  "gajiPokok": 5000000,
  "uangMakan": 30000
}
```

**Response (201):**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-07-02T...",
      "dailyAmount": 203000,
      "roundedAmount": 203000
    }
  ]
}
```

### PUT `/api/overtime/status`

Update status pencairan lembur.

**Request Body:**
```json
{
  "periodStart": "2026-07-02",
  "periodEnd": "2026-07-08",
  "status": "cair"
}
```

**Status:** `belum` atau `cair`

**Response (200):**
```json
{
  "data": {
    "message": "Status berhasil diubah menjadi \"cair\"",
    "updated": 2
  }
}
```

### GET `/api/overtime/summary`

Ringkasan lembur bulan berjalan.

**Response (200):**
```json
{
  "data": {
    "totalAmount": 875000,
    "totalDays": 2,
    "month": 7,
    "year": 2026
  }
}
```

### DELETE `/api/overtime/records/:id`

Soft delete satu record lembur.

---

## Leave / Cuti

### GET `/api/leave/balance`

Ambil saldo cuti user (termasuk cuti bersama).

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "totalQuota": 12,
    "cutiBersamaCut": 1,
    "used": 1,
    "remaining": 10,
    "realQuota": 11,
    "totalCutiBersama": 1,
    "expiresAt": "2027-06-30T...",
    "cutiBersamaList": [
      { "id": 1, "date": "2026-07-02", "name": "Cuti Bersama Idul Fitri" }
    ]
  }
}
```

**Rumus:** `remaining = totalQuota - cutiBersamaCut - used`

### GET `/api/leave/transactions`

Ambil riwayat transaksi cuti.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `month` | number | Bulan filter |
| `year` | number | Tahun filter |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-07-15T...",
      "type": "debit",
      "amount": 2,
      "description": "Cuti Tahunan",
      "leaveType": { "id": 1, "name": "Cuti Tahunan", "deductQuota": true },
      "refHoliday": null
    }
  ]
}
```

### POST `/api/leave/transactions`

Ajukan cuti baru (bisa multi-tanggal).

**Request Body:**
```json
{
  "dates": ["2026-07-15", "2026-07-16", "2026-07-17"],
  "leaveTypeId": 1,
  "description": "Cuti keluar kota"
}
```

**Response (201):**
```json
{
  "data": {
    "message": "3 hari cuti berhasil diajukan",
    "transactions": [...]
  }
}
```

**Validasi:** Jika `leaveType.deductQuota === true`, jumlah hari tidak boleh melebihi `remaining`.

### DELETE `/api/leave/transactions?id=X`

Soft delete transaksi cuti (hanya tipe `debit`). Saldo dikembalikan otomatis.

### GET `/api/leave/holidays`

Ambil daftar hari libur (dari tabel internal).

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `year` | number | Tahun filter |

### POST `/api/leave/holidays` *(Admin)*

Tambah hari libur. Jika tipe `cuti_bersama`, trigger potong saldo semua user aktif.

### DELETE `/api/leave/holidays?id=X` *(Admin)*

Soft delete hari libur.

---

## Medical & Rawat Inap

### GET `/api/medical/balance?type=mc|ri`

Ambil saldo medical/rawat inap user.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `type` | string | `mc` (Medical Checkup) atau `ri` (Rawat Inap) |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "type": "mc",
    "plafonAmount": 6500000,
    "used": 500000,
    "remaining": 6000000
  }
}
```

### GET `/api/medical/transactions?type=mc|ri`

Ambil riwayat klaim medical/rawat inap.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `type` | string | `mc` atau `ri` |
| `month` | number | Bulan filter |
| `year` | number | Tahun filter |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-07-10T...",
      "type": "debit",
      "amount": 500000,
      "description": "Periksa gigi",
      "notes": null
    }
  ]
}
```

### POST `/api/medical/transactions`

Ajukan klaim medical/rawat inap.

**Request Body:**
```json
{
  "type": "mc",
  "date": "2026-07-10",
  "amount": 500000,
  "description": "Periksa gigi di klinik ABC"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "date": "2026-07-10T...",
    "amount": 500000,
    "description": "Periksa gigi di klinik ABC"
  }
}
```

### PUT `/api/medical/transactions`

Edit klaim medical. Hitung diff amount dan update saldo.

**Request Body:**
```json
{
  "id": "uuid",
  "date": "2026-07-10",
  "amount": 600000,
  "description": "Periksa gigi (updated)"
}
```

### DELETE `/api/medical/transactions?id=X`

Soft delete klaim. Saldo dikembalikan otomatis.

---

## Admin

### GET `/api/admin/users`

List semua karyawan (termasuk non-aktif).

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@hitech.com",
      "role": "user",
      "nik": "HT-001",
      "statusKaryawan": "tetap",
      "statusPernikahan": "single",
      "jumlahAnak": 0,
      "gajiPokok": 5000000,
      "isActive": true,
      "createdAt": "2026-01-01T..."
    }
  ]
}
```

### POST `/api/admin/users`

Tambah karyawan baru. Auto-create leave balance + medical balance.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@hitech.com",
  "password": "password123",
  "role": "user",
  "statusKaryawan": "tetap",
  "statusPernikahan": "single",
  "jumlahAnak": 0,
  "gajiPokok": 5000000
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@hitech.com",
    "role": "user"
  }
}
```

### PUT `/api/admin/users`

Edit karyawan / toggle status aktif.

**Request Body (Edit):**
```json
{
  "id": "uuid",
  "name": "Jane Doe Updated",
  "gajiPokok": 6000000
}
```

**Request Body (Toggle):**
```json
{
  "id": "uuid",
  "isActive": false
}
```

### DELETE `/api/admin/users?id=X`

Nonaktifkan karyawan (soft delete — `isActive: false`). Data lembur/cuti/medical tetap tersimpan.

### POST `/api/admin/reset-data`

Reset data karyawan (danger zone).

**Request Body:**
```json
{
  "targetUser": "uuid_atau_all",
  "dataToReset": ["lembur", "cuti", "medical", "rawat-inap"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Data berhasil di-reset untuk 2 karyawan",
  "results": {
    "lembur": 5,
    "cuti": 3,
    "medical": 1,
    "rawat-inap": 0
  }
}
```

---

## External API

### GET `/api/holidays`

Proxy ke API libur nasional eksternal (api-harilibur.vercel.app). Cache 24 jam.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `year` | number | Tahun |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1166,
      "date": "2026-01-01",
      "name": "New Year's Day",
      "type": "national",
      "isHoliday": true,
      "isJointHoliday": false,
      "dayOfWeek": "Kamis"
    }
  ]
}
```

---

## Error Response Format

Semua error mengikuti format:

```json
{
  "error": "Pesan error",
  "details": {}  // opsional, untuk validasi Zod
}
```

| HTTP Code | Meaning |
|---|---|
| 400 | Bad Request — validasi gagal |
| 401 | Unauthorized — tidak ada session |
| 404 | Not Found — data tidak ditemukan |
| 409 | Conflict — duplikat data |
| 500 | Internal Server Error |

---

## Business Rules Reference

### Lembur
- Upah/Jam = Gaji Pokok ÷ 173
- Weekday: `(upah_per_jam × rate) + uang_makan`
- Weekend: `(upah_per_jam × 2 × jam_fisik) + uang_makan`
- Periode: Kamis – Rabu
- Pembulatan: roundToNearest(1000)

### Cuti
- Jatah Real = Default Quota − Total Cuti Bersama
- Jenis cuti configurable: potong kuota / bebas kuota
- Expire: 30 Juni tahun berikutnya

### Medical Checkup
- Plafon = Gaji × Multiplier (1× – 1.5×)
- Reset: 1 Januari

### Rawat Inap
- Plafon = Gaji × Multiplier (4× – 8×)
- Reset: 1 Januari

---

*Last updated: July 2026*
