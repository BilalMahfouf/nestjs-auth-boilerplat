import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import {
    CreateCheckoutEndpoint,
    CreateCheckoutHandler,
} from './features/create-checkout.feature';
import { PaymentEntity } from './entities/payment.entity';
import { InMemoryPaymentService } from './services/in-memory-payment.service';
import { PAYMENT_SERVICE } from './services/payment.service';

@Module({
    imports: [TypeOrmModule.forFeature([PaymentEntity, UserEntity])],
    controllers: [CreateCheckoutEndpoint],
    providers: [
        CreateCheckoutHandler,
        InMemoryPaymentService,
        {
            provide: PAYMENT_SERVICE,
            useExisting: InMemoryPaymentService,
        },
    ],
})
export class PaymentsModule { }
