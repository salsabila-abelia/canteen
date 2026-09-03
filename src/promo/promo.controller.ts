import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PromoService } from './promo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Promo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
@Controller('api/promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Post()
  @ApiOperation({
    summary: 'Buat kode promo baru (Admin Only)',
    description:
      'Membuat kode diskon baru. Promo bisa berupa potongan FIXED (nominal Rupiah) atau PERCENTAGE (persen). Promo akan otomatis tidak berlaku setelah tanggal valid_until.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'type', 'value', 'valid_until'],
      properties: {
        code: { type: 'string', example: 'MERDEKA17', description: 'Kode unik promo' },
        type: { type: 'string', enum: ['FIXED', 'PERCENTAGE'], example: 'PERCENTAGE' },
        value: {
          type: 'number',
          example: 10,
          description: 'Nilai diskon: 10 untuk 10% (PERCENTAGE) atau 10000 untuk Rp10.000 (FIXED)',
        },
        valid_until: {
          type: 'string',
          format: 'date-time',
          example: '2026-12-31T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Promo berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Kode promo sudah digunakan' })
  create(@Body() createPromoDto: any) {
    return this.promoService.create(createPromoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lihat semua kode promo (Admin Only)',
    description: 'Menampilkan semua kode promo yang ada, termasuk yang sudah kadaluarsa.',
  })
  @ApiResponse({ status: 200, description: 'Daftar semua promo' })
  findAll() {
    return this.promoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail promo berdasarkan ID (Admin Only)' })
  @ApiParam({ name: 'id', description: 'ID promo', example: 1 })
  @ApiResponse({ status: 200, description: 'Data promo' })
  @ApiResponse({ status: 404, description: 'Promo tidak ditemukan' })
  findOne(@Param('id') id: string) {
    return this.promoService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update promo (Admin Only)',
    description: 'Mengubah data promo yang sudah ada. Semua field bersifat opsional.',
  })
  @ApiParam({ name: 'id', description: 'ID promo', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'MERDEKA17' },
        type: { type: 'string', enum: ['FIXED', 'PERCENTAGE'] },
        value: { type: 'number', example: 15 },
        valid_until: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Promo berhasil diupdate' })
  update(@Param('id') id: string, @Body() updatePromoDto: any) {
    return this.promoService.update(+id, updatePromoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus promo (Admin Only)' })
  @ApiParam({ name: 'id', description: 'ID promo', example: 1 })
  @ApiResponse({ status: 200, description: 'Promo berhasil dihapus' })
  remove(@Param('id') id: string) {
    return this.promoService.remove(+id);
  }
}
