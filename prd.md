**Product Requirements Document (PRD) - Backend Perspective**

**Nama Proyek:** E-Kantin (Sistem Pre-Order & Time-Slot Pickup)
**Role:** Backend Developer
**Tech Stack Utama:** NestJS, TypeScript, MySQL, Prisma/TypeORM, Socket.IO.

---

**1. Arsitektur & Kebutuhan Sistem**

* **RESTful API:** Melayani aplikasi web (frontend).
* **Role-Based Access Control (RBAC):** Memisahkan otorisasi untuk `STUDENT`/`TEACHER` (Pembeli), `TENANT` (Penjual), dan `ADMIN` (Pengelola).
* **Real-time Event:** Menggunakan Socket.IO untuk update status pesanan dan notifikasi bukti bayar.
* **Sistem Pembayaran Manual (Proof of Payment):** Menggantikan payment gateway pihak ketiga. Penjual mengunggah gambar QRIS statis mereka, pembeli melakukan transfer secara mandiri, lalu mengunggah *screenshot* bukti transfer untuk diverifikasi secara manual oleh penjual.
* **File Handling:** Membutuhkan penanganan `multipart/form-data` (misal: menggunakan Multer di Node.js) untuk menyimpan gambar QRIS dan bukti pembayaran.
* **Concurrency Control:** Mencegah *oversell* stok saat pemesanan bersamaan.

---

**2. Skema Database (Entity Relationship)**

| Tabel | Kolom Utama | Deskripsi & Relasi |
| --- | --- | --- |
| **Users** | `id`, `email`, `password_hash`, `name`, `role`, `created_at` | Data otentikasi. `role`: ADMIN, TENANT, BUYER. (Kolom *balance* dihapus karena tidak menggunakan e-wallet internal). |
| **Tenants** | `id`, `user_id`, `name`, `is_open`, **`qris_image_url`** | Profil stan. Relasi 1:1 dengan Users. Tambahan `qris_image_url` untuk menyimpan QRIS penjual. |
| **Products** | `id`, `tenant_id`, `name`, `price`, `stock`, `image_url`, `is_available` | Menu makanan. Relasi M:1 ke Tenants. |
| **Orders** | `id`, `user_id`, `tenant_id`, `status`, `total_amount`, `pickup_time` | Transaksi utama. `status`: PENDING, **VERIFYING**, PROCESSING, READY, COMPLETED, CANCELED. |
| **OrderItems** | `id`, `order_id`, `product_id`, `quantity`, `subtotal` | Detail item dalam satu order. |
| **Payments** | `id`, `order_id`, `amount`, **`proof_image_url`**, `status` | Log pembayaran manual. `status`: PENDING, SUCCESS, REJECTED. |

---

**3. Spesifikasi API Endpoint**

**A. Authentication, User, & Tenant Management**

| Method | Endpoint | Role | Payload (Body/Form) | Deskripsi |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | `email`, `password`, `name`, `role` | Mendaftarkan user baru. |
| POST | `/api/auth/login` | Public | `email`, `password` | Mengembalikan JWT Token. |
| GET | `/api/tenants` | All | Query: `is_open` | Menampilkan stan aktif beserta `qris_image_url` masing-masing. |
| PATCH | `/api/tenant/qris` | TENANT | `file` (image) | Mengunggah/memperbarui gambar QRIS milik stan. |

**B. Product Management**

| Method | Endpoint | Role | Payload | Deskripsi |
| --- | --- | --- | --- | --- |
| POST | `/api/products` | TENANT | `name`, `price`, `stock`, `file` (image) | Menambah menu baru. |
| PATCH | `/api/products/:id` | TENANT | `stock`, `is_available` | Update stok makanan. |

**C. Order & Manual Payment Flow**

| Method | Endpoint | Role | Payload (Body/Form) | Deskripsi |
| --- | --- | --- | --- | --- |
| POST | `/api/orders` | BUYER | `tenant_id`, `items[]`, `pickup_time` | Membuat pesanan (status: `PENDING`). Mengurangi stok sementara. |
| POST | `/api/orders/:id/payment-proof` | BUYER | `file` (image) | Mengunggah bukti transfer. Mengubah status order jadi `VERIFYING`. |
| PATCH | `/api/orders/:id/verify-payment` | TENANT | `is_valid` (boolean) | Penjual memvalidasi bukti. Jika `true` $\rightarrow$ `PROCESSING`. Jika `false` $\rightarrow$ `CANCELED`. |
| PATCH | `/api/orders/:id/status` | TENANT | `status` (READY, COMPLETED) | Update progres pesanan. |

---

**4. Kebutuhan Real-time (WebSocket / Socket.IO)**

* **Rooms:**
* `room:tenant_{tenant_id}`
* `room:user_{user_id}`


* **Events:**
* `payment.uploaded`: Memancarkan notifikasi ke `tenant_{tenant_id}` saat pembeli selesai mengunggah bukti bayar agar penjual segera mengecek.
* `order.updated`: Memancarkan notifikasi ke `user_{user_id}` saat penjual memvalidasi pembayaran (Sukses/Ditolak) atau mengubah status makanan (Siap Diambil).



---

**5. Business Rules & Edge Cases (Backend Logic)**

* **Payment & Upload Expiration:** Sistem Cron Job (via `@nestjs/schedule`) mengecek transaksi berstatus `PENDING`. Jika pembeli tidak mengunggah bukti bayar (`proof_image_url` kosong) dalam waktu 15 menit, pesanan otomatis menjadi `CANCELED` dan stok MySQL dikembalikan.
* **Manual Verification Bottleneck:** Karena verifikasi dilakukan manual oleh penjual saat jam sibuk, status `VERIFYING` akan menahan stok. Jika penjual menolak (`is_valid: false`), sistem otomatis mengembalikan stok agar bisa dibeli siswa lain.
* **Stock Concurrency:** Saat `POST /api/orders`, tetap gunakan *Pessimistic Locking* pada row database MySQL untuk mencegah dua siswa memperebutkan stok terakhir secara bersamaan.
* **File Storage:** Gambar QRIS dan bukti transfer disimpan di dalam direktori publik server lokal atau menggunakan *cloud storage* (seperti AWS S3 atau Supabase Storage) untuk menghindari beban kapasitas server.