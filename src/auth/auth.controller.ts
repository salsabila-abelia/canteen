import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('register')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Register akun baru (Admin Only)',
    description:
      'Hanya Super Admin yang dapat mendaftarkan akun baru. Role yang tersedia: ADMIN, TENANT, BUYER. Jika role = TENANT, profil kantin akan dibuat otomatis.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', example: 'siswa1@canteen.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'Budi Santoso' },
        role: {
          type: 'string',
          enum: ['ADMIN', 'TENANT', 'BUYER'],
          example: 'BUYER',
          description: 'Default: BUYER',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Akun berhasil dibuat, mengembalikan access_token',
    schema: {
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email sudah terdaftar' })
  @ApiResponse({ status: 401, description: 'Unauthorized – bukan Admin' })
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Login dengan email & password',
    description:
      'Mengembalikan JWT access_token yang digunakan untuk autentikasi semua endpoint lainnya. Token berlaku selama 12 jam.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'admin@canteen.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil',
    schema: {
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Email atau password salah' })
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
