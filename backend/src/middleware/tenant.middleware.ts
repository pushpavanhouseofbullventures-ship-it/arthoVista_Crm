import { Request, Response, NextFunction } from 'express';
import { UserOrganizationRole } from '../models/UserOrganizationRole';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import logger from '../utils/logger';

interface CachedUserRoles {
  roles: any[];
  expiresAt: number;
}
const userRolesCache = new Map<string, CachedUserRoles>();

export async function tenantIsolation(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required context missing.',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const now = Date.now();
    let cached = userRolesCache.get(req.user.id);
    let userRoles: any[];

    if (cached && now < cached.expiresAt) {
      userRoles = cached.roles;
    } else {
      // 1. Fetch all memberships for this user
      userRoles = await UserOrganizationRole.find({ userId: req.user.id }).populate({
        path: 'roleId',
        populate: { path: 'permissions' }
      });
      userRolesCache.set(req.user.id, {
        roles: userRoles,
        expiresAt: now + 60 * 1000 // 60 seconds
      });
    }

    // 2. Extract organization ID from header/query or auto-fallback to user's organization
    let orgId = (req.headers['x-organization-id'] as string) || 
                (req.query.organizationId as string) || 
                (req.params.organizationId as string);

    let activeMembership = orgId 
      ? userRoles.find((ur: any) => ur.organizationId === orgId)
      : userRoles[0];

    if (!activeMembership && userRoles.length > 0) {
      activeMembership = userRoles[0];
      orgId = activeMembership.organizationId;
    }

    if (activeMembership) {
      req.organizationId = activeMembership.organizationId;
      const rId = (activeMembership as any).roleId || (activeMembership as any).role;
      req.userRoleId = (typeof rId === 'object' && rId ? (rId._id || rId.id) : (rId || '')).toString();
      req.userRole = typeof rId === 'object' && rId ? rId.name : ((activeMembership as any).role?.name || 'Employee');
      return next();
    }

    // 3. Fallback: If user has no explicit org role yet, check if Admin exists or assign to primary org
    const ADMIN_EMAILS = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'];
    const isMasterAdmin = ADMIN_EMAILS.includes((req.user.email || '').toLowerCase().trim());
    if (isMasterAdmin) {
      const adminRole = (await Role.findOne({ name: 'Admin', organizationId: null })) || (await Role.findOne({ name: 'Super Admin', organizationId: null }));
      if (adminRole) {
        req.organizationId = orgId || '';
        req.userRoleId = adminRole.id || adminRole._id;
        req.userRole = 'Admin';
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not belong to this organization.',
      errorCode: 'ORGANIZATION_ACCESS_DENIED'
    });
  } catch (error) {
    logger.error('Tenant isolation middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error validating tenant.',
      errorCode: 'INTERNAL_ERROR'
    });
  }
}
