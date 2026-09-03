import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Tenants')
@Controller('api/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({
    summary: 'Daftar semua kantin',
    description:
      'Menampilkan semua kantin. Bisa difilter berdasarkan status buka/tutup. Endpoint ini publik (tidak perlu login).',
  })
  @ApiQuery({
    name: 'is_open',
    required: false,
    type: String,
    enum: ['true', 'false'],
    description: 'Filter kantin yang sedang buka atau tutup',
  })
  @ApiResponse({
    status: 200,
    description: 'List kantin berhasil diambil',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Kantin Bu As' },
          is_open: { type: 'boolean', example: true },
          open_time: { type: 'string', example: '07:00' },
          close_time: { type: 'string', example: '15:00' },
          qris_image_url: { type: 'string', example: '/uploads/qris.jpg', nullable: true },
          is_suspended: { type: 'boolean', example: false },
        },
      },
    },
  })
  async getTenants(@Query('is_open') isOpenStr: string) {
    let isOpen: boolean | undefined;
    if (isOpenStr === 'true') isOpen = true;
    if (isOpenStr === 'false') isOpen = false;
    return this.tenantService.findAll(isOpen);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TENANT)
  @Patch('qris')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Upload gambar QRIS kantin (Tenant Only)',
    description:
      'Upload gambar QRIS untuk metode pembayaran. File akan disimpan di folder /uploads. Gambar ini ditampilkan ke buyer saat checkout dengan metode QRIS.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File gambar QRIS (jpg/png)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'QRIS berhasil diupdate' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant tidak ditemukan' })
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
  async updateQris(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tenantService.updateQris(req.user.id, file.filename);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/warn')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Kirim peringatan ke kantin (Admin Only)',
    description:
      'Admin dapat mengirim pesan peringatan ke kantin. Jika kantin telah menerima 3 peringatan atau lebih, kantin akan otomatis disuspensi (is_suspended = true) dan tidak bisa menerima pesanan baru.',
  })
  @ApiParam({ name: 'id', description: 'ID kantin', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string',
          example: 'Kantin Anda mendapatkan keluhan dari pembeli terkait kebersihan.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Peringatan terkirim. Jika total peringatan >= 3, kantin disuspensi.',
  })
  warnTenant(@Param('id') id: string, @Body('message') message: string) {
    return this.tenantService.warnTenant(+id, message);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TENANT)
  @Get('income')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Total pendapatan kantin (Tenant Only)',
    description:
      'Menampilkan total pendapatan kantin dari semua order berstatus COMPLETED. Hanya menghitung pesanan yang sudah selesai sepenuhnya.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total pendapatan berhasil dihitung',
    schema: {
      properties: {
        total_income: { type: 'number', example: 1250000 },
      },
    },
  })
  getIncome(@Request() req: { user: { id: number } }) {
    return this.tenantService.getIncome(req.user.id);
  }
}
