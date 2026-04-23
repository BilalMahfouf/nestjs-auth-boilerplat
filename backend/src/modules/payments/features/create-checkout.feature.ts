import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Inject,
  Injectable,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';
import { Repository } from 'typeorm';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import {
  ApiAccessTokenAuth,
  ApiUnexpectedServerErrorResponse,
  ApiValidationErrorResponse,
} from '../../../common/swagger/swagger.responses';
import { UserEntity } from '../../users/entities/user.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentStatus } from '../entities/payment-status.enum';
import { PaymentsErrors } from '../payments.errors';
import {
  PAYMENT_SERVICE,
  type PaymentService,
} from '../services/payment.service';

const DEFAULT_PROVIDER = 'InMemoryProvider';

export class CreateCheckoutCommandDto {
  @ApiProperty({
    example: 59.99,
    minimum: 0.01,
    description: 'Payment amount to process for checkout.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'USD',
    description: 'ISO 4217 currency code in 3 uppercase letters.',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

export class CreateCheckoutResponseDto {
  @ApiProperty({ example: '0aa41a44-aec1-4c53-b07a-8fcb13d92d44' })
  paymentId!: string;

  @ApiProperty({ example: 'Pending', enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ example: 'InMemoryProvider' })
  provider!: string;

  @ApiProperty({ example: 'in-memory-ef0b78a7-33ab-45ca-bf1e-77a052ecf1ea' })
  providerPaymentId!: string;

  @ApiProperty({ example: 'e0ee0f8c-3e66-4f8f-8f53-8787f3526ccf' })
  idempotencyKey!: string;

  @ApiProperty({ example: 59.99 })
  amount!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({
    example:
      'https://checkout.in-memory.local/payments/in-memory-ef0b78a7-33ab-45ca-bf1e-77a052ecf1ea',
    required: false,
    nullable: true,
  })
  checkoutUri!: string | null;
}

@Injectable()
export class CreateCheckoutHandler {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: PaymentService,
  ) { }

  async handle(
    userId: string,
    command: CreateCheckoutCommandDto,
    idempotencyKey: string,
  ): Promise<CreateCheckoutResponseDto> {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw PaymentsErrors.idempotencyKeyRequired();
    }
    const existingPayment = await this.paymentsRepository.findOne({
      where: { idempotencyKey: idempotencyKey },
    });
    if (existingPayment) {
      const checkout = existingPayment.providerPaymentId
        ? await this.paymentService.getCheckoutByProviderPaymentId(
          existingPayment.providerPaymentId,
        )
        : null;

      return this.toResponse(existingPayment, checkout?.checkoutUri ?? null);
    }

    const userExists = await this.usersRepository.exists({
      where: { id: userId },
    });

    if (!userExists) {
      throw PaymentsErrors.userNotFoundById(userId);
    }

    const payment = PaymentEntity.createPending({
      userId,
      amount: command.amount,
      currency: command.currency,
      provider: DEFAULT_PROVIDER,
      idempotencyKey,
    });

    let processResult: Awaited<ReturnType<PaymentService['process']>>;

    try {
      processResult = await this.paymentService.process(
        command.amount,
        command.currency,
      );
      payment.setProviderPaymentId(processResult.providerPaymentId);
      payment.setProviderMetadata(processResult.providerMetadata ?? null);
    } catch {
      throw PaymentsErrors.providerProcessFailed();
    }

    const savedPayment = await this.paymentsRepository.save(payment);

    const checkout = savedPayment.providerPaymentId
      ? await this.paymentService.getCheckoutByProviderPaymentId(
        savedPayment.providerPaymentId,
      )
      : null;

    return this.toResponse(
      savedPayment,
      checkout?.checkoutUri ?? processResult.checkoutUri ?? null,
    );
  }

  private toResponse(
    payment: PaymentEntity,
    checkoutUri: string | null,
  ): CreateCheckoutResponseDto {
    return {
      paymentId: payment.id,
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? '',
      idempotencyKey: payment.idempotencyKey,
      amount: Number(payment.amount),
      currency: payment.currency,
      checkoutUri,
    };
  }
}

@Controller('payments')
@ApiTags('Payments')
export class CreateCheckoutEndpoint {
  constructor(private readonly handler: CreateCheckoutHandler) { }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create checkout payment',
    description:
      'Method: POST. Path: /api/v1/payments/checkout. Headers: Authorization: Bearer <access-token>, idempotency-key: <unique-key>. Body: amount (positive number, max 2 decimals), currency (3-letter ISO code). Side effects: creates a pending payment row in the database and calls the configured payment service abstraction for checkout processing.',
  })
  @ApiAccessTokenAuth()
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description:
      'Client-generated unique key used to enforce request idempotency.',
    schema: {
      type: 'string',
      example: 'checkout-3d4fe68b-0c0e-4de8-95cf-85f71bd27f23',
    },
  })
  @ApiBody({ type: CreateCheckoutCommandDto })
  @ApiCreatedResponse({
    description: 'Checkout payment created successfully.',
    type: CreateCheckoutResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body or missing idempotency-key header.',
    schema: {
      example: {
        statusCode: 400,
        code: 'Payment.IdempotencyKeyRequired',
        message: 'idempotency-key header is required',
      },
    },
  })
  @ApiValidationErrorResponse()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT access token.',
    schema: {
      example: {
        statusCode: 401,
        code: 'User.InvalidCredentials',
        message: 'The provided credentials are invalid',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated user is not allowed by policy to create checkout.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user does not exist anymore.',
    schema: {
      example: {
        statusCode: 404,
        code: 'Payment.UserNotFound',
        message:
          'User with id 41d2f0f8-b4ce-4f11-8c6f-7fdd2b63e4b6 is not found',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Provider processing or unexpected internal failure.',
    schema: {
      example: {
        statusCode: 500,
        code: 'Payment.ProviderProcessFailed',
        message: 'Unable to process payment with provider',
      },
    },
  })
  @ApiUnexpectedServerErrorResponse()
  async execute(
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() command: CreateCheckoutCommandDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<CreateCheckoutResponseDto> {
    try {
      return await this.handler.handle(
        currentUser.userId,
        command,
        idempotencyKey,
      );
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw error;
    }
  }
}
