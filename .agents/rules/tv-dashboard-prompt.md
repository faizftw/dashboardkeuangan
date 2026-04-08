# Prompt: TV Dashboard Slideshow (`/tv`)

## Fitur Baru: TV Dashboard Slideshow (`/tv`)

Saya ingin menambahkan halaman baru di proyek Next.js 14 (App Router) yang sudah ada. Halaman ini dirancang khusus untuk ditampilkan di layar TV/monitor besar secara fullscreen, tanpa navbar/sidebar, dengan tampilan yang berganti otomatis seperti slideshow.

---

## Route & File yang Perlu Dibuat

Buat route baru: `app/tv/page.tsx`

Tidak memerlukan autentikasi (akses publik atau bisa diakses langsung via URL).

Nonaktifkan layout utama (sidebar/navbar) untuk route ini dengan membuat `app/tv/layout.tsx` yang hanya merender `{children}` tanpa wrapper apapun.

---

## Arsitektur Halaman

Halaman ini adalah **Client Component** (`'use client'`) karena memerlukan state untuk auto-slide dan timer countdown. Data di-fetch via Server Action atau API route yang sudah ada di Phase 1. Gunakan `useEffect` + `setInterval` untuk auto-rotate slide.

---

## Slide yang Harus Dibuat (3 Slide)

### Slide 1 — Ringkasan Total (Agregat Semua Program)

Query Supabase:

- Ambil semua program aktif dari tabel `programs` untuk periode aktif (`periods` where `is_active = true`)
- Join dengan `daily_input` untuk mendapatkan total pencapaian bulan ini (SUM `achievement_rp` dan SUM `achievement_user`)
- Hitung total `monthly_target_rp` dan `monthly_target_user` dari semua program

Tampilkan:

- Header: nama bulan + tahun periode aktif (contoh: "APRIL 2026") + jam digital real-time (update tiap detik)
- **4 KPI Card besar** dalam grid 2x2:
  - Total Target Bulan (Rp) — format Rupiah (Rp X.XXX.XXX)
  - Total Pencapaian (Rp) — format Rupiah
  - Total Target User — format angka
  - Total Pencapaian User — format angka
- **Progress bar besar** untuk % pencapaian Rp keseluruhan + label % di tengah bar
- **Progress bar besar** untuk % pencapaian User keseluruhan
- Breakdown status program: berapa program ✅ TERCAPAI / ⚠ MENUJU TARGET / ❌ PERLU PERHATIAN (berdasarkan % capaian bulanan Rp)
- Status warna menggunakan logika:
  - ≥ 100% → hijau (`TERCAPAI`)
  - 50–99% → kuning (`MENUJU TARGET`)
  - < 50% → merah (`PERLU PERHATIAN`)

---

### Slide 2 — Performa Per Program

Query Supabase: sama seperti Slide 1, tapi tampilkan data per-program individual.

Tampilkan dalam bentuk **tabel/card grid** (sesuaikan berdasarkan jumlah program — saat ini 8 program):

- Nama program (bisa disingkat jika terlalu panjang, max 2 baris)
- Nama PIC
- Pencapaian Rp vs Target Bulanan Rp + % + progress bar horizontal
- Pencapaian User vs Target Bulanan User + % + progress bar horizontal
- Badge status berwarna (TERCAPAI / MENUJU TARGET / PERLU PERHATIAN)

Layout: gunakan CSS Grid 2 kolom (4 program per baris × 2 kolom = 8 program muat dalam 1 layar). Jika program > 8, tambahkan scroll atau sub-slide otomatis.

---

### Slide 3 — Performa Per PIC

Query Supabase: group by `pic_name` dari tabel `programs`, aggregate pencapaian dan target dari `daily_input`.

PIC yang ada saat ini: RHJ (2 program), ANDIS (1), PROF (1), ANGGAR (2), EKO (1) — total 5 PIC unik.

Tampilkan untuk setiap PIC:

- Nama PIC (besar, jelas)
- Jumlah program yang dikelola
- Total pencapaian Rp vs total target Rp yang menjadi tanggung jawabnya + %
- Total pencapaian User vs total target User + %
- Progress bar kombinasi
- Badge status keseluruhan PIC berdasarkan rata-rata % pencapaian Rp

Layout: Card per PIC, disusun dalam grid (max 3 kolom).

---

## Mekanisme Slideshow

```typescript
const SLIDE_DURATION = 15000; // 15 detik per slide (bisa dikonfigurasi)
const TOTAL_SLIDES = 3;
```

- Auto-rotate setiap 15 detik menggunakan `setInterval`
- Tampilkan **progress bar tipis di bagian bawah layar** yang mengisi dari kiri ke kanan selama 15 detik, lalu reset ke slide berikutnya
- Tampilkan **indikator slide** (dot/bullet) di pojok kanan bawah: `● ○ ○` / `○ ● ○` / `○ ○ ●`
- Transisi antar slide: fade in/out dengan Tailwind CSS (`transition-opacity duration-700`)
- Data di-refresh dari Supabase setiap 60 detik (`refetch interval`) tanpa mengganggu animasi slide

---

## Desain & Styling

- Background: **gelap** (`bg-gray-950` atau `bg-slate-900`) — cocok untuk TV
- Font: besar dan terbaca dari jarak jauh. Gunakan skala font yang lebih besar dari halaman biasa:
  - KPI value: `text-5xl` atau `text-6xl font-bold`
  - Label: `text-xl`
  - Nama program: `text-2xl`
- Warna status konsisten:
  - Hijau: `text-emerald-400` / `bg-emerald-500`
  - Kuning: `text-yellow-400` / `bg-yellow-500`
  - Merah: `text-red-400` / `bg-red-500`
- Progress bar: gunakan komponen `Progress` dari shadcn/ui atau buat custom dengan `div` + `width` dinamis
- Semua card: `bg-gray-800 rounded-2xl p-6 border border-gray-700`
- **Tidak ada tombol, form, atau elemen interaktif** — murni display only
- Gunakan `h-screen w-screen overflow-hidden` pada root element
- Semua teks dalam **Bahasa Indonesia**

---

## Data Fetching

Buat Server Action baru di `app/tv/actions.ts`:

```typescript
// Fungsi yang dibutuhkan:
getTVDashboardData(): Promise<TVDashboardData>

// Return type:
interface TVDashboardData {
  activePeriod: { month: number; year: number }
  aggregate: {
    totalTargetRp: number
    totalAchievementRp: number
    totalTargetUser: number
    totalAchievementUser: number
    percentageRp: number
    percentageUser: number
    tercapai: number     // jumlah program
    menujuTarget: number
    perluPerhatian: number
  }
  programs: ProgramPerformance[]
  pics: PICPerformance[]
}
```

Semua query via **server-side Supabase client** (bukan client-side). Gunakan pola yang sama dengan pages Phase 1 yang sudah ada.

---

## Format Angka

Gunakan helper function untuk format Rupiah yang konsisten dengan Phase 1:

```typescript
const formatRp = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
```

---

## Hal-hal yang Perlu Diperhatikan

1. **Jangan ubah** file/komponen Phase 1 yang sudah ada — ini penambahan murni
2. Gunakan **TypeScript strict** untuk semua type baru
3. Tidak perlu RLS untuk TV page jika akses publik; jika butuh auth, gunakan Supabase anon key saja
4. Pastikan halaman ini **tidak crash jika data kosong** — tampilkan skeleton/empty state yang elegan
5. Test responsivitas untuk resolusi TV umum: 1920×1080 dan 3840×2160 (4K)
6. Tambahkan route `/tv` ke dokumentasi README jika ada

---

## Deliverable yang Diharapkan

| File                                   | Keterangan                               |
| -------------------------------------- | ---------------------------------------- |
| `app/tv/layout.tsx`                    | Layout kosong tanpa sidebar              |
| `app/tv/page.tsx`                      | Main TV dashboard Client Component       |
| `app/tv/actions.ts`                    | Server Actions untuk data fetching       |
| `app/tv/components/Slide1Total.tsx`    | Komponen slide 1 — agregat               |
| `app/tv/components/Slide2Programs.tsx` | Komponen slide 2 — per program           |
| `app/tv/components/Slide3PICs.tsx`     | Komponen slide 3 — per PIC               |
| `app/tv/components/SlideProgress.tsx`  | Progress bar + dot indicator bawah layar |

Jelaskan setiap file sebelum menulis kode-nya.

---

## Catatan Penyesuaian

Sesuaikan hal berikut sebelum memberikan prompt ini ke agent:

- **Durasi slide**: saat ini 15 detik, ubah `SLIDE_DURATION` sesuai kebutuhan
- **Akses halaman**: tentukan apakah `/tv` perlu login atau bebas akses
- **Nama tabel Supabase**: prompt ini mengasumsikan nama tabel `programs`, `periods`, dan `daily_input` — sesuaikan dengan skema yang sudah dibuat di Phase 1
