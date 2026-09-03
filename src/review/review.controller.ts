import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Roles(Role.BUYER)
  @Post(':orderId')
  createReview(@Request() req: any, @Param('orderId') orderId: string, @Body() body: { rating: number; comment?: string }) {
    return this.reviewService.createReview(req.user.id, +orderId, body.rating, body.comment);
  }

  @Roles(Role.TENANT)
  @Get('tenant')
  getTenantReviews(@Request() req: any) {
    return this.reviewService.getTenantReviews(req.user.id);
  }
}
