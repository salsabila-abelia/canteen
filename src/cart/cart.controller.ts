import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
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

@ApiTags('Cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER, Role.ADMIN)
@ApiBearerAuth('access-token')
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Lihat isi keranjang belanja (Buyer)',
    description:
      'Menampilkan semua item dalam keranjang belanja buyer yang sedang login, beserta detail produk dan subtotal.',
  })
  @ApiResponse({
    status: 200,
    description: 'Isi keranjang',
    schema: {
      properties: {
        id: { type: 'number', example: 1 },
        user_id: { type: 'number', example: 3 },
        cart_items: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'number' },
              product_id: { type: 'number' },
              quantity: { type: 'number' },
              product: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Ayam Geprek' },
                  price: { type: 'string', example: '15000.00' },
                },
              },
            },
          },
        },
      },
    },
  })
  getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Tambah item ke keranjang (Buyer)',
    description:
      'Menambahkan produk ke keranjang. Jika produk sudah ada di keranjang, kuantitas akan bertambah. Keranjang hanya bisa memuat produk dari satu kantin (multi-kantin tidak didukung dalam satu checkout).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['productId'],
      properties: {
        productId: { type: 'number', example: 1 },
        quantity: { type: 'number', example: 2, description: 'Default: 1' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Item berhasil ditambahkan ke keranjang' })
  addToCart(
    @Request() req: any,
    @Body() body: { productId: number; quantity: number },
  ) {
    return this.cartService.addToCart(
      req.user.id,
      body.productId,
      body.quantity || 1,
    );
  }

  @Delete(':itemId')
  @ApiOperation({
    summary: 'Hapus item dari keranjang (Buyer)',
    description: 'Menghapus satu item tertentu dari keranjang berdasarkan ID item keranjang (bukan ID produk).',
  })
  @ApiParam({ name: 'itemId', description: 'ID item di keranjang (cart_items.id)', example: 5 })
  @ApiResponse({ status: 200, description: 'Item berhasil dihapus dari keranjang' })
  removeFromCart(@Request() req: any, @Param('itemId') itemId: string) {
    return this.cartService.removeFromCart(req.user.id, +itemId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Kosongkan semua isi keranjang (Buyer)',
    description: 'Menghapus semua item dari keranjang sekaligus. Biasanya dipanggil otomatis setelah checkout.',
  })
  @ApiResponse({ status: 200, description: 'Keranjang berhasil dikosongkan' })
  clearCart(@Request() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
