import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER, Role.ADMIN)
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  addToCart(@Request() req: any, @Body() body: { productId: number; quantity: number }) {
    return this.cartService.addToCart(req.user.id, body.productId, body.quantity || 1);
  }

  @Delete(':itemId')
  removeFromCart(@Request() req: any, @Param('itemId') itemId: string) {
    return this.cartService.removeFromCart(req.user.id, +itemId);
  }

  @Delete()
  clearCart(@Request() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
