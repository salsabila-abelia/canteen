import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { ProductService } from './product.service';
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
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Products')
@Controller('api/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Roles(Role.TENANT)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Tambah produk/menu baru (Tenant Only)',
    description:
      'Tenant dapat menambahkan produk baru ke menu kantinnya. Mendukung upload gambar produk sekaligus menggunakan multipart/form-data. Produk akan dikaitkan otomatis ke kantin milik tenant yang login.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'price', 'stock'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Gambar produk (opsional)',
        },
        name: { type: 'string', example: 'Ayam Geprek' },
        price: { type: 'number', example: 15000 },
        stock: { type: 'number', example: 50 },
        is_available: { type: 'boolean', example: true, description: 'Default: true' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Produk berhasil ditambahkan',
    schema: {
      properties: {
        id: { type: 'number', example: 1 },
        tenant_id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Ayam Geprek' },
        price: { type: 'string', example: '15000.00' },
        stock: { type: 'number', example: 50 },
        image_url: { type: 'string', example: '/uploads/1234567890-123456789.jpg', nullable: true },
        is_available: { type: 'boolean', example: true },
      },
    },
  })
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
  async createProduct(
    @Request() req,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.createProduct(req.user.id, body, file?.filename);
  }

  @Roles(Role.TENANT)
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update stok dan ketersediaan produk (Tenant Only)',
    description:
      'Tenant dapat mengubah jumlah stok dan status ketersediaan produk. Hanya bisa mengubah produk milik kantin sendiri. Gunakan `is_available: false` untuk menyembunyikan menu sementara tanpa menghapusnya.',
  })
  @ApiParam({ name: 'id', description: 'ID produk', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        stock: { type: 'number', example: 30, description: 'Jumlah stok baru' },
        is_available: { type: 'boolean', example: true, description: 'Status ketersediaan produk' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Produk berhasil diupdate' })
  @ApiResponse({ status: 403, description: 'Produk bukan milik kantin Anda' })
  @ApiResponse({ status: 404, description: 'Produk tidak ditemukan' })
  async updateStock(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { stock: number; is_available: boolean },
  ) {
    return this.productService.updateStock(
      req.user.id,
      parseInt(id, 10),
      body.stock,
      body.is_available,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Dapatkan daftar produk (Publik/All Roles)',
    description: 'Bisa difilter berdasarkan tenantId (Kantin)',
  })
  @ApiResponse({ status: 200, description: 'Daftar produk' })
  async getProducts(@Query('tenantId') tenantId?: string) {
    return this.productService.getProducts(tenantId ? parseInt(tenantId, 10) : undefined);
  }
}
