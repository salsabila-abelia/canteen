import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('api/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.BUYER)
  @Post()
  @ApiOperation({
    summary: 'Buat pesanan baru / Checkout (Buyer Only)',
    description: `Membuat pesanan baru dari keranjang. Validasi yang dilakukan:
- Kantin harus buka (is_open = true) dan tidak disuspensi
- pickup_time harus hari ini
- pickup_time harus dalam rentang jam buka–tutup kantin
- Stok harus cukup (menggunakan pessimistic lock untuk mencegah race condition)
- Promo jika digunakan harus valid dan belum kadaluarsa
- Untuk CASH: status langsung PROCESSING. Untuk QRIS: status PENDING (tunggu upload bukti bayar)`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tenant_id', 'items', 'pickup_time'],
      properties: {
        tenant_id: { type: 'number', example: 1, description: 'ID kantin tujuan' },
        items: {
          type: 'array',
          items: {
            properties: {
              productId: { type: 'number', example: 1 },
              quantity: { type: 'number', example: 2 },
            },
          },
          example: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }],
        },
        pickup_time: {
          type: 'string',
          format: 'date-time',
          example: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
          description: 'Harus hari ini, dalam jam buka kantin',
        },
        notes: { type: 'string', example: 'Sambalnya dipisah ya kak', nullable: true },
        payment_method: {
          type: 'string',
          enum: ['QRIS', 'CASH'],
          example: 'QRIS',
          description: 'Default: QRIS',
        },
        promo_id: { type: 'number', example: 1, nullable: true, description: 'ID promo (opsional)' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pesanan berhasil dibuat',
    schema: {
      properties: {
        id: { type: 'number', example: 10 },
        status: { type: 'string', example: 'PENDING' },
        total_amount: { type: 'string', example: '35000.00' },
        pickup_time: { type: 'string', example: '2026-09-03T05:00:00.000Z' },
        pickup_code: { type: 'string', example: null, nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Kantin tutup / pickup_time tidak valid / stok habis' })
  async createOrder(
    @Request() req,
    @Body()
    body: {
      tenant_id: number;
      items: { productId: number; quantity: number }[];
      pickup_time: string;
      notes?: string;
      payment_method?: PaymentMethod;
      promo_id?: number;
    },
  ) {
    return this.ordersService.createOrder(
      req.user.id,
      body.tenant_id,
      body.items,
      body.pickup_time,
      body.notes,
      body.payment_method,
      body.promo_id,
    );
  }

  @Roles(Role.BUYER)
  @Post(':id/payment-proof')
  @ApiOperation({
    summary: 'Upload bukti pembayaran QRIS (Buyer Only)',
    description:
      'Upload foto/screenshot bukti transfer QRIS. Setelah diupload, status pesanan berubah dari PENDING → VERIFYING dan notifikasi dikirim ke kantin (via WebSocket). Hanya berlaku untuk pesanan dengan metode QRIS.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID pesanan', example: 10 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Screenshot/foto bukti pembayaran QRIS',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Bukti bayar berhasil diupload, status berubah ke VERIFYING',
  })
  @ApiResponse({ status: 400, description: 'Pesanan bukan PENDING atau metode CASH' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadPaymentProof(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ordersService.uploadPaymentProof(
      req.user.id,
      parseInt(id, 10),
      file.filename,
    );
  }

  @Roles(Role.BUYER)
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Batalkan pesanan (Buyer Only)',
    description: `Buyer dapat membatalkan pesanan selama statusnya masih PENDING atau VERIFYING.
**Aturan pembatalan:**
- ✅ PENDING → bisa dibatalkan (stok dikembalikan)
- ✅ VERIFYING → bisa dibatalkan (stok dikembalikan)
- ❌ PROCESSING → TIDAK bisa dibatalkan (kantin sudah mulai memasak)
- ❌ READY, COMPLETED, EXPIRED, CANCELED → tidak relevan`,
  })
  @ApiParam({ name: 'id', description: 'ID pesanan yang akan dibatalkan', example: 10 })
  @ApiResponse({ status: 200, description: 'Pesanan berhasil dibatalkan, stok dikembalikan' })
  @ApiResponse({
    status: 400,
    description: 'Pesanan tidak dapat dibatalkan karena sudah diproses oleh kantin',
  })
  async cancelOrder(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(req.user.id, parseInt(id, 10));
  }

  @Roles(Role.TENANT)
  @Patch(':id/verify-payment')
  @ApiOperation({
    summary: 'Verifikasi bukti pembayaran (Tenant Only)',
    description: `Tenant memeriksa bukti pembayaran QRIS yang diupload buyer.
- **is_valid: true** → Pembayaran diterima, status berubah VERIFYING → PROCESSING
- **is_valid: false** → Pembayaran ditolak, status berubah VERIFYING → CANCELED, stok dikembalikan`,
  })
  @ApiParam({ name: 'id', description: 'ID pesanan', example: 10 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['is_valid'],
      properties: {
        is_valid: { type: 'boolean', example: true, description: 'true = terima, false = tolak' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status pesanan diperbarui' })
  async verifyPayment(
    @Request() req,
    @Param('id') id: string,
    @Body('is_valid') isValid: boolean,
  ) {
    return this.ordersService.verifyPayment(
      req.user.id,
      parseInt(id, 10),
      isValid,
    );
  }

  @Roles(Role.TENANT)
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update status pesanan (Tenant Only)',
    description: `Tenant mengubah status pesanan sesuai alur produksi.
**Alur status yang direkomendasikan:**
\`PROCESSING\` → \`READY\`

Saat status diubah ke READY, sistem otomatis generate **pickup_code** (kode QR 6 karakter) yang dikirimkan ke buyer via notifikasi WebSocket.`,
  })
  @ApiParam({ name: 'id', description: 'ID pesanan', example: 10 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['PROCESSING', 'READY', 'COMPLETED'],
          example: 'READY',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status diperbarui. Jika READY, pickup_code akan digenerate.',
    schema: {
      properties: {
        id: { type: 'number' },
        status: { type: 'string', example: 'READY' },
        pickup_code: { type: 'string', example: 'A1B2C3' },
      },
    },
  })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateOrderStatus(
      req.user.id,
      parseInt(id, 10),
      status,
    );
  }

  @Roles(Role.TENANT)
  @Post('scan-pickup')
  @ApiOperation({
    summary: 'Scan QR Code pickup (Tenant Only)',
    description: `Tenant melakukan scan QR Code milik buyer untuk menyelesaikan pengambilan pesanan.
**Validasi yang dilakukan:**
- Pickup code harus valid dan ada di database
- Pesanan harus milik kantin yang melakukan scan (keamanan anti-fraud)
- Status pesanan harus READY
- Untuk pesanan CASH: pembayaran ditandai SUCCESS sekaligus
- Status pesanan berubah → COMPLETED`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pickup_code'],
      properties: {
        pickup_code: { type: 'string', example: 'A1B2C3', description: 'Kode 6 karakter dari buyer' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pickup berhasil, pesanan COMPLETED',
    schema: {
      properties: {
        id: { type: 'number' },
        status: { type: 'string', example: 'COMPLETED' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Kode tidak valid / pesanan bukan milik kantin ini / belum READY' })
  async scanPickup(@Request() req, @Body('pickup_code') pickupCode: string) {
    return this.ordersService.scanPickup(req.user.id, pickupCode);
  }
}
