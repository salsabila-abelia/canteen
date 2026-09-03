import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
      include: {
        cart_items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { user_id: userId },
        include: { cart_items: { include: { product: true } } },
      });
    }
    return cart;
  }

  async addToCart(userId: number, productId: number, quantity: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { user_id: userId } });
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cart_id: cart.id, product_id: productId },
    });

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cart_id: cart.id,
        product_id: productId,
        quantity,
      },
    });
  }

  async removeFromCart(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart_id: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
    });
    if (!cart) return { count: 0 };
    return this.prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
  }
}
