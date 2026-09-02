import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async createProduct(userId: number, data: any, filename?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: userId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.product.create({
      data: {
        name: data.name,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
        image_url: filename ? `/uploads/${filename}` : null,
        tenant_id: tenant.id,
      },
    });
  }

  async updateStock(userId: number, productId: number, stock: number, isAvailable: boolean) {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: userId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.tenant_id !== tenant.id) {
      throw new NotFoundException('Product not found or not owned by you');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        stock,
        is_available: isAvailable,
      },
    });
  }
}
