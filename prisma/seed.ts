import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Menjalankan database seed...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@canteen.com' },
    update: {},
    create: { email: 'admin@canteen.com', name: 'Super Admin', password_hash: passwordHash, role: Role.ADMIN },
  });

  // 2. Tenant (Kantin)
  const tenantUser = await prisma.user.upsert({
    where: { email: 'kantin1@canteen.com' },
    update: {},
    create: { email: 'kantin1@canteen.com', name: 'Kantin Satu', password_hash: passwordHash, role: Role.TENANT },
  });

  const tenant = await prisma.tenant.upsert({
    where: { user_id: tenantUser.id },
    update: {},
    create: { user_id: tenantUser.id, name: 'Kantin Bu As', is_open: true, open_time: '07:00', close_time: '15:00' },
  });

  // Tambahkan Menu
  await prisma.product.createMany({
    data: [
      { tenant_id: tenant.id, name: 'Ayam Geprek', price: 15000, stock: 50 },
      { tenant_id: tenant.id, name: 'Es Teh Manis', price: 5000, stock: 100 },
    ]
  });

  // 3. Buyer (Siswa)
  const buyer = await prisma.user.upsert({
    where: { email: 'siswa1@canteen.com' },
    update: {},
    create: { email: 'siswa1@canteen.com', name: 'Siswa Satu', password_hash: passwordHash, role: Role.BUYER },
  });

  console.log('Seed berhasil ditambahkan!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
