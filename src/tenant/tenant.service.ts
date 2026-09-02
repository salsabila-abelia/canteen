import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findAll(isOpen?: boolean): Promise<Tenant[]> {
    if (isOpen !== undefined) {
      return this.prisma.tenant.findMany({ where: { is_open: isOpen } });
    }
    return this.prisma.tenant.findMany();
  }

  async updateQris(userId: number, filename: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: userId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { qris_image_url: `/uploads/${filename}` },
    });
  }
}
