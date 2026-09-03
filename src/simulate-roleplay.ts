/* eslint-disable */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OrdersService } from './orders/orders.service';
import { PrismaService } from './prisma/prisma.service';
import { Role, OrderStatus, PaymentMethod, PromoType } from '@prisma/client';

async function bootstrap() {
  console.log('🚀 Memulai Simulasi Roleplay E-Kantin...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const ordersService = app.get(OrdersService);

  // --- Reset Database ---
  console.log('\n[SETUP] Membersihkan data lama...');
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.tenantWarning.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  // --- Setup Data Awal ---
  console.log('[SETUP] Membuat data User (Siswa A, Siswa B, Admin, Kantin)...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password_hash: '123',
      name: 'Super Admin',
      role: Role.ADMIN,
    },
  });
  const buyerA = await prisma.user.create({
    data: {
      email: 'siswa_a@test.com',
      password_hash: '123',
      name: 'Siswa A',
      role: Role.BUYER,
    },
  });
  const buyerB = await prisma.user.create({
    data: {
      email: 'siswa_b@test.com',
      password_hash: '123',
      name: 'Siswa B',
      role: Role.BUYER,
    },
  });

  const tenantUser = await prisma.user.create({
    data: {
      email: 'kantin_a@test.com',
      password_hash: '123',
      name: 'Kantin A User',
      role: Role.TENANT,
    },
  });
  const tenant = await prisma.tenant.create({
    data: { user_id: tenantUser.id, name: 'Kantin Bu As', is_open: true },
  });

  const fakeTenantUser = await prisma.user.create({
    data: {
      email: 'kantin_palsu@test.com',
      password_hash: '123',
      name: 'Kantin Palsu User',
      role: Role.TENANT,
    },
  });
  const fakeTenant = await prisma.tenant.create({
    data: { user_id: fakeTenantUser.id, name: 'Kantin Palsu', is_open: true },
  });

  let product: any = await prisma.product.create({
    data: {
      tenant_id: tenant.id,
      name: 'Ayam Geprek',
      price: 15000,
      stock: 10,
    },
  });
  console.log(
    `[SETUP] Berhasil membuat produk: ${product.name}, Stok: ${product.stock}`,
  );

  // --- Babak 1: Normal Order & Pembatalan (Stock Integrity) ---
  console.log('\n--- BABAK 1: Normal Order & Cancel ---');
  const order1: any = await ordersService.createOrder(
    buyerA.id,
    tenant.id,
    [{ productId: product.id, quantity: 2 }],
    new Date().toISOString(),
    'Jangan pedas',
    PaymentMethod.QRIS,
  );
  console.log(
    `[Babak 1] Siswa A memesan 2 Ayam Geprek (Order ID: ${order1.id}, Status: ${order1.status}).`,
  );
  product = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(
    `[Babak 1] Stok saat ini: ${product.stock} (Ekspektasi: 8) - ${product.stock === 8 ? '✅ PASS' : '❌ FAIL'}`,
  );

  console.log(`[Babak 1] Siswa A membatalkan pesanan...`);
  await ordersService.cancelOrder(buyerA.id, order1.id);
  product = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(
    `[Babak 1] Stok saat ini: ${product.stock} (Ekspektasi: 10) - ${product.stock === 10 ? '✅ PASS' : '❌ FAIL'}`,
  );

  // --- Babak 2: Keterlambatan Pembatalan (State Constraint) ---
  console.log('\n--- BABAK 2: Keterlambatan Pembatalan ---');
  const order2: any = await ordersService.createOrder(
    buyerA.id,
    tenant.id,
    [{ productId: product.id, quantity: 1 }],
    new Date().toISOString(),
    '',
    PaymentMethod.QRIS,
  );
  console.log(
    `[Babak 2] Siswa A pesan lagi (Order ID: ${order2.id}). Kantin memproses pesanan...`,
  );
  await ordersService.updateOrderStatus(
    tenantUser.id,
    order2.id,
    OrderStatus.PROCESSING,
  );

  try {
    console.log(
      `[Babak 2] Siswa A mencoba membatalkan pesanan yang sedang diproses...`,
    );
    await ordersService.cancelOrder(buyerA.id, order2.id);
    console.log(
      '[Babak 2] ❌ FAIL: Pesanan berhasil dibatalkan, seharusnya GAGAL!',
    );
  } catch (error: any) {
    console.log(
      `[Babak 2] ✅ PASS: Sistem menolak dengan error -> "${error.message}"`,
    );
  }

  // Selesaikan order2 agar stok berkurang (sisa 9)
  await ordersService.updateOrderStatus(
    tenantUser.id,
    order2.id,
    OrderStatus.COMPLETED,
  );
  product = await prisma.product.findUnique({ where: { id: product.id } });

  // --- Babak 3: Eksploitasi Harga Negatif (Promo Abuse) ---
  console.log('\n--- BABAK 3: Promo Abuse (Harga Negatif) ---');
  const promoGila = await prisma.promo.create({
    data: {
      code: 'GILA',
      type: PromoType.FIXED,
      value: 50000,
      valid_until: new Date(Date.now() + 86400000),
    },
  });
  console.log(
    `[Babak 3] Super Admin membuat promo diskon Rp 50.000. Harga ayam geprek: Rp 15.000.`,
  );
  let order3: any = await ordersService.createOrder(
    buyerB.id,
    tenant.id,
    [{ productId: product.id, quantity: 1 }],
    new Date().toISOString(),
    '',
    PaymentMethod.CASH,
    promoGila.id,
  );
  console.log(
    `[Babak 3] Siswa B menggunakan promo. Total bayar: Rp ${order3.total_amount}.`,
  );
  console.log(
    `[Babak 3] Ekspektasi Total: Rp 0 -> ${Number(order3.total_amount) === 0 ? '✅ PASS' : '❌ FAIL'}`,
  );

  // --- Babak 4: Race Condition (Pessimistic Locking) ---
  // Reset stok ke 10 untuk keadilan
  console.log('\n--- BABAK 4: Race Condition (Stok Rebutan) ---');
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: 10 },
  });
  product = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`[Babak 4] Stok Ayam Geprek di-reset menjadi: ${product.stock}.`);
  console.log(
    `[Babak 4] Siswa A memesan 8 porsi, Siswa B memesan 5 porsi PADA WAKTU BERSAMAAN.`,
  );

  const orderPromiseA = ordersService.createOrder(
    buyerA.id,
    tenant.id,
    [{ productId: product.id, quantity: 8 }],
    new Date().toISOString(),
    '',
    PaymentMethod.CASH,
  );
  const orderPromiseB = ordersService.createOrder(
    buyerB.id,
    tenant.id,
    [{ productId: product.id, quantity: 5 }],
    new Date().toISOString(),
    '',
    PaymentMethod.CASH,
  );

  let successCount = 0;
  let failCount = 0;

  await Promise.allSettled([orderPromiseA, orderPromiseB]).then((results) => {
    results.forEach((res, i) => {
      const siswa = i === 0 ? 'Siswa A (8 porsi)' : 'Siswa B (5 porsi)';
      if (res.status === 'fulfilled') {
        console.log(`[Babak 4] Transaksi ${siswa} BERHASIL.`);
        successCount++;
      } else {
        console.log(
          `[Babak 4] Transaksi ${siswa} GAGAL: ${res.reason.message}`,
        );
        failCount++;
      }
    });
  });

  product = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`[Babak 4] Sisa stok saat ini: ${product.stock}`);
  console.log(
    `[Babak 4] Ekspektasi: Salah satu berhasil (success=1, fail=1) -> ${successCount === 1 && failCount === 1 ? '✅ PASS' : '❌ FAIL'}`,
  );

  // --- Babak 5: Pencurian Pesanan (Unauthorized Pickup Scan) ---
  console.log('\n--- BABAK 5: Pencurian Pesanan (Scan QR Code) ---');
  // Order 3 (milik Siswa B, pesan di Kantin Bu As)
  // Kita jadikan READY untuk memunculkan pickup_code
  await ordersService.updateOrderStatus(
    tenantUser.id,
    order3.id,
    OrderStatus.READY,
  );
  order3 = await prisma.order.findUnique({ where: { id: order3.id } });
  console.log(
    `[Babak 5] Pesanan Siswa B (Order ID: ${order3.id}) berstatus READY dengan Pickup Code: ${order3.pickup_code}`,
  );

  console.log(
    `[Babak 5] Kantin Palsu mencoba scan Pickup Code milik Kantin Bu As...`,
  );
  try {
    await ordersService.scanPickup(
      fakeTenantUser.id,
      order3.pickup_code as string,
    );
    console.log(
      '[Babak 5] ❌ FAIL: Kantin Palsu berhasil menyelesaikan pesanan!',
    );
  } catch (error: any) {
    console.log(
      `[Babak 5] ✅ PASS: Sistem menolak dengan error -> "${error.message}"`,
    );
  }

  await app.close();
  console.log('\n🏁 Simulasi Selesai!');
}

bootstrap();
