import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  Request,
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

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Register akun baru (Tenant / Admin) - Hanya Admin',
    description:
      'Dapat mendaftarkan akun baru. Role yang tersedia: TENANT (Pemilik Kantin), ADMIN. Hanya ADMIN yang bisa mendaftarkan TENANT.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name', 'role'],
      properties: {
        email: { type: 'string', example: 'tenant1@canteen.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'Kantin Bu Tin' },
        role: {
          type: 'string',
          enum: ['TENANT', 'ADMIN'],
          example: 'TENANT',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Akun berhasil dibuat',
  })
  @ApiResponse({ status: 400, description: 'Email sudah terdaftar atau role tidak valid' })
  async register(@Body() body: any) {
    if (body.role === Role.BUYER) {
      throw new BadRequestException('Use /register-buyer for BUYER registration');
    }
    return this.authService.register(body);
  }

  @Post('register-buyer')
  @ApiOperation({
    summary: 'Register akun mandiri untuk Buyer (Siswa)',
    description:
      'Pendaftaran mandiri khusus untuk Buyer (Siswa). Role otomatis di-set ke BUYER.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', example: 'siswa1@canteen.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'Budi Santoso' },
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
  async registerBuyer(@Body() body: any) {
    body.role = Role.BUYER;
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Ambil profil user aktif setelah login',
    description: 'Mendapatkan data user saat ini berdasarkan token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil user',
  })
  async getMe(@Request() req) {
    return req.user;
  }
}
