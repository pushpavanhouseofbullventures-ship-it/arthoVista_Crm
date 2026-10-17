import { Request, Response, NextFunction } from 'express';
import { Organization } from '../models/Organization';
import { AuditLog } from '../models/AuditLog';
import logger from '../utils/logger';

export async function onboard(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, businessType, address, phone, email, website, gstin, pan } = req.body;

    // Check if the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication context missing.',
        errorCode: 'UNAUTHORIZED'
      });
    }

    // Create a new organization and assign the creator as Org Admin
    const org = await Organization.create({
      name,
      businessType,
      address,
      phone,
      email,
      website,
      gstin,
      pan,
      isSuspended: false
    });

    // Link user to this new organization
    require('../models/Permission');
    const { Role } = require('../models/Role');
    const { UserOrganizationRole } = require('../models/UserOrganizationRole');

    const orgAdminRole = await Role.findOne({ name: 'Organization Admin', organizationId: null });
    if (!orgAdminRole) {
      return res.status(500).json({
        success: false,
        message: 'System organization admin role not found.',
        errorCode: 'INTERNAL_ERROR'
      });
    }

    await UserOrganizationRole.create({
      userId: req.user.id,
      organizationId: org._id,
      roleId: orgAdminRole._id
    });

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      organizationId: org._id,
      action: 'ORGANIZATION_ONBOARDED',
      entity: 'Organization',
      entityId: org._id.toString(),
      newValue: { name, businessType }
    });

    return res.status(201).json({
      success: true,
      message: 'Organization onboarded successfully.',
      data: org
    });
  } catch (error) {
    logger.error('Organization onboarding error:', error);
    next(error);
  }
}

export async function getOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context missing.',
        errorCode: 'ORGANIZATION_CONTEXT_REQUIRED'
      });
    }

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found.',
        errorCode: 'ORGANIZATION_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: org
    });
  } catch (error) {
    logger.error('GetOrganization error:', error);
    next(error);
  }
}

export async function updateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context missing.',
        errorCode: 'ORGANIZATION_CONTEXT_REQUIRED'
      });
    }

    const { name, phone, email, website, address, gstin, pan, currency, timezone } = req.body;

    const oldOrg = await Organization.findById(req.organizationId);
    if (!oldOrg) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found.',
        errorCode: 'ORGANIZATION_NOT_FOUND'
      });
    }

    const updatedOrg = await Organization.findByIdAndUpdate(
      req.organizationId,
      {
        $set: {
          name,
          phone,
          email,
          website,
          address,
          gstin,
          pan,
          currency,
          timezone
        }
      },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      userId: req.user?.id,
      organizationId: req.organizationId,
      action: 'ORGANIZATION_UPDATED',
      entity: 'Organization',
      entityId: req.organizationId,
      oldValue: (oldOrg as any).toObject ? (oldOrg as any).toObject() : oldOrg,
      newValue: (updatedOrg as any)?.toObject ? (updatedOrg as any).toObject() : updatedOrg
    });

    return res.json({
      success: true,
      message: 'Organization updated successfully.',
      data: updatedOrg
    });
  } catch (error) {
    logger.error('UpdateOrganization error:', error);
    next(error);
  }
}
