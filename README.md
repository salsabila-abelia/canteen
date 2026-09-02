# E-Kantin Backend

Backend system for E-Kantin, a pre-order and time-slot pickup system designed for schools (SMK Telkom). 
Built with **NestJS**, **Prisma ORM**, **MariaDB**, dan **Socket.IO**.

## Fitur Utama
1. **Role-Based Access Control (RBAC)**: Autentikasi dengan JWT untuk membedakan hak akses `ADMIN`, `TENANT` (Penjual), dan `BUYER` (Siswa/Guru).
2. **Manajemen Produk & QRIS**: Penjual dapat mengunggah menu makanan dan gambar QRIS toko menggunakan Multer. Folder `/uploads` diekspos melalui `ServeStaticModule`.
3. **Pessimistic Locking**: Transaksi yang aman untuk mencegah bentrokan stok (*oversell*) saat banyak siswa memesan menu yang sama secara bersamaan.
4. **Pembayaran Manual**: Siswa mengunggah bukti transfer yang akan mengubah status ke `VERIFYING` untuk diverifikasi manual oleh penjual.
5. **Real-Time Notification**: Gateway WebSocket (Socket.IO) memancarkan sinyal `payment.uploaded` (ke penjual) dan `order.updated` (ke pembeli).
6. **Cron Job Expiry System**: Tugas periodik berjalan setiap menit untuk mencari pesanan `PENDING` yang usianya lebih dari 15 menit, membatalkannya, dan mengembalikan stok menu.

## Persyaratan Sistem
- Node.js (v18+)
- MariaDB / MySQL Database

## Cara Menjalankan
1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Database (Prisma)**:
   Buka file `.env` dan ubah nilai `DATABASE_URL` dengan URL database MariaDB asli Anda. Kemudian jalankan:
   ```bash
   # Melakukan sinkronisasi skema ke database (jika DB masih kosong)
   npx prisma db push
   
   # ATAU hanya menghasilkan client (jika DB sudah dibuat via alat lain)
   npx prisma generate
   ```

3. **Mulai Server (Development)**:
   ```bash
   npm run start:dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

## Testing
Jalankan perintah berikut untuk menguji *build* dan modul yang tersisa:
```bash
npm run test
```
