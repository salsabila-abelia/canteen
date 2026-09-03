import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromoService {
  constructor(private prisma: PrismaService) {}

  create(createPromoDto: any) {
    // parse date properly if needed, assuming valid_until is a valid string
    return this.prisma.promo.create({
      data: {
        code: createPromoDto.code,
        type: createPromoDto.type,
        value: createPromoDto.value,
        valid_until: new Date(createPromoDto.valid_until),
      },
    });
  }

  findAll() {
    return this.prisma.promo.findMany();
  }

  findOne(id: number) {
    return this.prisma.promo.findUnique({ where: { id } });
  }

  update(id: number, updatePromoDto: any) {
    const data: any = { ...updatePromoDto };
    if (data.valid_until) {
      data.valid_until = new Date(data.valid_until);
    }
    return this.prisma.promo.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.promo.delete({ where: { id } });
  }
}
