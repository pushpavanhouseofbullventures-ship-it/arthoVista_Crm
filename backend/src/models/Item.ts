import prisma from '../config/prisma';
import { createPrismaModel, IBaseDocument } from './prismaAdapter';
import { Item as PrismaItem } from '@prisma/client';

export interface IItem extends PrismaItem, IBaseDocument {}

export const Item = createPrismaModel<IItem>(
  'Item',
  () => prisma.item,
  {
    beforeCreate: (data: any) => {
      if (data.isDeleted === undefined) data.isDeleted = false;
      if (data.rate === undefined) data.rate = 0;
      if (data.gstRate === undefined) data.gstRate = 18;
      if (data.unit === undefined) data.unit = 'Pcs';
      return data;
    },
  }
);

export default Item;
