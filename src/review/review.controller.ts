import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewService } from './review.service';
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

@ApiTags('Review')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller('api/review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Roles(Role.BUYER)
  @Post(':orderId')
  @ApiOperation({
    summary: 'Buat ulasan untuk pesanan (Buyer Only)',
    description:
      'Buyer dapat memberikan rating (1-5) dan komentar untuk pesanan yang sudah COMPLETED. Setiap pesanan hanya bisa diulas satu kali.',
  })
  @ApiParam({ name: 'orderId', description: 'ID pesanan yang sudah COMPLETED', example: 10 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['rating'],
      properties: {
        rating: { type: 'number', minimum: 1, maximum: 5, example: 4, description: 'Nilai 1-5' },
        comment: {
          type: 'string',
          example: 'Ayam gepreknya enak, porsinya besar!',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Review berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Pesanan sudah diulas atau belum COMPLETED' })
  createReview(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.reviewService.createReview(
      req.user.id,
      +orderId,
      body.rating,
      body.comment,
    );
  }

  @Roles(Role.TENANT)
  @Get('tenant')
  @ApiOperation({
    summary: 'Lihat semua ulasan kantin (Tenant Only)',
    description:
      'Tenant dapat melihat semua review yang masuk untuk kantinnya, termasuk rating dan komentar dari buyer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar ulasan kantin',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'number' },
          rating: { type: 'number', example: 4 },
          comment: { type: 'string', example: 'Enak dan cepat!' },
          created_at: { type: 'string', format: 'date-time' },
          user: { type: 'object', properties: { name: { type: 'string', example: 'Budi' } } },
        },
      },
    },
  })
  getTenantReviews(@Request() req: any) {
    return this.reviewService.getTenantReviews(req.user.id);
  }
}
