import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('E-Kantin API')
    .setDescription(
      `## Dokumentasi API E-Kantin

Sistem pre-order & pickup berbasis slot waktu untuk kantin sekolah/kampus.

### Role Akses
| Role | Deskripsi |
|------|-----------|
| \`ADMIN\` | Super Admin – mengelola user, kantin, dan promo |
| \`TENANT\` | Admin Kantin – mengelola menu, order, dan pendapatan |
| \`BUYER\` | Siswa/Guru – memesan, membayar, dan mereview |

### Cara Autentikasi
1. Login via \`POST /api/auth/login\`
2. Salin \`access_token\` dari response
3. Klik tombol **Authorize** (🔓) di atas dan paste token

### Alur Pemesanan
\`\`\`
Login → Tambah ke Keranjang → Checkout (createOrder) → Upload Bukti Bayar (QRIS)
→ Kantin Verifikasi → Kantin Proses → READY → Scan QR Pickup → COMPLETED
\`\`\`

### Status Pesanan
| Status | Keterangan |
|--------|-----------|
| \`PENDING\` | Menunggu pembayaran (QRIS) |
| \`VERIFYING\` | Bukti bayar diunggah, menunggu konfirmasi kantin |
| \`PROCESSING\` | Sedang diproses kantin |
| \`READY\` | Siap diambil, QR Code tersedia |
| \`COMPLETED\` | Selesai, makanan sudah diambil |
| \`CANCELED\` | Dibatalkan (hanya saat PENDING/VERIFYING) |
| \`EXPIRED\` | Hangus – tidak diambil hingga kantin tutup |`,
    )
    .setVersion('1.0')
    .addTag('Auth', 'Login & Register akun (hanya Admin yang bisa register)')
    .addTag('Tenants', 'Data kantin, QRIS, peringatan, dan pendapatan')
    .addTag('Products', 'Menu produk kantin (CRUD oleh Tenant)')
    .addTag('Cart', 'Keranjang belanja Buyer')
    .addTag('Orders', 'Pemesanan, pembayaran, dan pickup')
    .addTag('Promo', 'Kode diskon (CRUD oleh Admin)')
    .addTag('Review', 'Rating & ulasan pesanan')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan JWT access_token dari response login',
      },
      'access-token',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
