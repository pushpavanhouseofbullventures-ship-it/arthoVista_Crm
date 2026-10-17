import { Request, Response, NextFunction } from 'express';
import { Item } from '../models/Item';
import { AuditLog } from '../models/AuditLog';

export async function getItems(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const items = await Item.find({ organizationId: orgId, isDeleted: false }).sort({ sku: 1 });

    return res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const item = await Item.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
        errorCode: 'ITEM_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
}

export async function createItem(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { sku, name, description, rate, unit, gstRate } = req.body;

    // Check duplicate SKU
    const existing = await Item.findOne({ organizationId: orgId, sku, isDeleted: false });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An item with this SKU already exists in your catalog.',
        errorCode: 'DUPLICATE_SKU'
      });
    }

    const item = await Item.create({
      organizationId: orgId,
      sku,
      name,
      description,
      rate,
      unit,
      gstRate
    });

    // Audit log
    await AuditLog.create({
      userId,
      organizationId: orgId,
      action: 'ITEM_CREATED',
      entity: 'Item',
      entityId: item._id.toString(),
      newValue: { sku, name, rate }
    });

    return res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, description, rate, unit, gstRate } = req.body;

    const oldItem = await Item.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!oldItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
        errorCode: 'ITEM_NOT_FOUND'
      });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { $set: { name, description, rate, unit, gstRate } },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      userId,
      organizationId: orgId,
      action: 'ITEM_UPDATED',
      entity: 'Item',
      entityId: id,
      oldValue: oldItem.toObject(),
      newValue: updatedItem?.toObject()
    });

    return res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    const item = await Item.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
        errorCode: 'ITEM_NOT_FOUND'
      });
    }

    // Audit log
    await AuditLog.create({
      userId,
      organizationId: orgId,
      action: 'ITEM_DELETED',
      entity: 'Item',
      entityId: id
    });

    return res.json({
      success: true,
      message: 'Item deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}
