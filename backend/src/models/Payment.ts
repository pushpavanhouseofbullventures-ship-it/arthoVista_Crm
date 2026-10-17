import prisma from '../config/prisma';
import { createPrismaModel, IBaseDocument } from './prismaAdapter';
import { Payment as PrismaPayment } from '@prisma/client';

export interface IPayment extends PrismaPayment, IBaseDocument {}

export const Payment = createPrismaModel<IPayment>(
  'Payment',
  () => prisma.payment,
  {
    beforeCreate: (data: any) => {
      if (data.status === undefined) data.status = 'created';
      if (data.provider === undefined) data.provider = 'razorpay';
      if (data.currency === undefined) data.currency = 'INR';
      return data;
    },
  }
);

export default Payment;
