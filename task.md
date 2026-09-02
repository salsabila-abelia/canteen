# To-Do List Backend E-Kantin

- [x] **Fase 1: Setup & Konfigurasi Awal**
  - [x] Inisialisasi proyek NestJS.
  - [x] Setup Prisma ORM dengan target MariaDB (dummy DB URL).
  - [x] Generate Prisma Client (skema: Users, Tenants, Products, Orders, OrderItems, Payments).

- [x] **Fase 2: Autentikasi & Otorisasi**
  - [x] Setup dependensi autentikasi (Passport, JWT, Bcrypt).
  - [x] Implementasi RBAC (Role Guard).
  - [x] Buat modul Auth (Register & Login).
  - [x] Update logika Register: Otomatis buat data profil Tenant jika role = TENANT.

- [x] **Fase 3: Modul Manajemen Tenant & Produk**
  - [x] Setup ServeStaticModule untuk mengekspos folder gambar ke URL publik.
  - [x] Konfigurasi Multer untuk upload gambar lokal (QRIS & Produk).
  - [x] Endpoint Tenant (List aktif & update/upload QRIS).
  - [x] Endpoint Product (Tambah menu baru dan upload foto).
  - [x] Endpoint Product (Update stok dan ketersediaan menu).

- [x] **Fase 4: Alur Transaksi & Pembayaran Manual**
  - [x] Endpoint membuat Order (dengan Pessimistic Locking untuk stok).
  - [x] Endpoint upload bukti pembayaran (mengubah status ke `VERIFYING`).
  - [x] Endpoint verifikasi pembayaran oleh penjual (Terima/Tolak & penyesuaian stok).
  - [x] Endpoint update status Order (`READY`, `COMPLETED`).

- [x] **Fase 5: Real-time Notification**
  - [x] Setup WebSocket (Socket.IO) Gateway (`@nestjs/platform-socket.io`).
  - [x] Konfigurasi logika _Rooms_ untuk User & Tenant.
  - [x] Trigger (Emit) event Socket saat upload bukti bayar dan update status pesanan.

- [x] **Fase 6: Cron Job & Expiry System**
  - [x] Setup Task Scheduling bawaan NestJS (`@nestjs/schedule`).
  - [x] Implementasi *Cron Job* pembatalan pesanan berstatus `PENDING` > 15 menit dan logik pengembalian stok.
