import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Role } from '../models/Role';
import { UserOrganizationRole } from '../models/UserOrganizationRole';
import { Session } from '../models/Session';
import { AuditLog } from '../models/AuditLog';
import logger from '../utils/logger';

// Helper to sign JWTs
const signAccessToken = (userId: string, email: string): string => {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET!, { expiresIn: '15m' });
};

const signRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, firstName, lastName, organizationName, phone, businessType } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
        errorCode: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create user (Mongoose ACID transaction is best for multiple models)
    const mongoSession = await User.startSession();
    mongoSession.startTransaction();

    try {
      // 3.1. Create User
      const [newUser] = await User.create(
        [
          {
            email,
            passwordHash,
            firstName,
            lastName,
            isVerified: false, // will require verification in production, mock true or verification pending
            status: 'active'
          }
        ],
        { session: mongoSession }
      );

      // 3.2. Fetch or Create Primary Organization
      let primaryOrg = await Organization.findOne({
        $or: [{ name: 'Artho Vista CRM' }, { name: 'Platform Admin Organization' }]
      }).session(mongoSession);

      if (!primaryOrg) {
        primaryOrg = await Organization.findOne().session(mongoSession);
      }

      if (!primaryOrg) {
        const [createdOrg] = await Organization.create(
          [
            {
              name: organizationName || 'Artho Vista CRM',
              businessType: businessType || 'general',
              phone: phone || '9999999999',
              email: 'info@arthovista.com',
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              isSuspended: false
            }
          ],
          { session: mongoSession }
        );
        primaryOrg = createdOrg;
      }

      if (!primaryOrg) {
        throw new Error('Primary organization not found. Please run migrations/seeds.');
      }

      const orgId = primaryOrg._id || primaryOrg.id;
      const orgName = primaryOrg.name;

      // 3.3. Fetch Role (Admin for master admins, otherwise Employee)
      const cleanEmail = email.trim().toLowerCase();
      const isMasterAdmin = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'].includes(cleanEmail);
      const roleName = isMasterAdmin ? 'Admin' : 'Employee';
      let userRole = await Role.findOne({ name: roleName, organizationId: null }).session(mongoSession);
      if (!userRole && roleName === 'Admin') {
        userRole = await Role.findOne({ name: 'Super Admin', organizationId: null }).session(mongoSession);
      }
      if (!userRole) {
        throw new Error(`Default ${roleName} role not found. Run seeds.`);
      }

      // 3.4. Link User to Organization with Role
      await UserOrganizationRole.create(
        [
          {
            userId: newUser._id,
            organizationId: orgId,
            roleId: userRole._id
          }
        ],
        { session: mongoSession }
      );

      // 3.5. Audit log
      await AuditLog.create(
        [
          {
            userId: newUser._id,
            organizationId: orgId,
            action: 'USER_REGISTERED',
            entity: 'User',
            entityId: newUser._id.toString(),
            newValue: { email, role: roleName }
          }
        ],
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: {
          user: {
            id: newUser._id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName
          },
          organization: {
            id: orgId,
            name: orgName
          }
        }
      });
    } catch (err) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      throw err;
    }
  } catch (error) {
    logger.error('Registration controller error:', error);
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errorCode: 'INVALID_CREDENTIALS'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated.',
        errorCode: 'ACCOUNT_DEACTIVATED'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Record failed login or log it
      logger.warn(`Failed login attempt for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errorCode: 'INVALID_CREDENTIALS'
      });
    }

    // Sign tokens
    const accessToken = signAccessToken(user._id.toString(), user.email);
    const refreshToken = signRefreshToken(user._id.toString());

    // Create session record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await Session.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Set refresh token in HTTP-Only cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Get user organization mappings
    const mappings = await UserOrganizationRole.find({ userId: user._id })
      .populate('organizationId', 'name businessType logoUrl isSuspended')
      .populate({
        path: 'roleId',
        populate: { path: 'permissions', select: 'name' }
      });

    const isUserMasterAdmin = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'].includes(user.email.toLowerCase());
    const activeOrganizations = mappings
      .filter((m: any) => m.organizationId && !m.organizationId.isSuspended)
      .map((m: any) => {
        const rawRole = m.roleId?.name;
        const normalizedRole = isUserMasterAdmin ? 'Admin' : (rawRole === 'Super Admin' ? 'Admin' : rawRole);
        const perms = m.roleId?.permissions?.map((p: any) => (typeof p === 'object' && p ? p.name : p)) || [];
        if (isUserMasterAdmin && !perms.includes('platform:admin')) {
          perms.push('platform:admin');
        }
        return {
          id: m.organizationId?._id || m.organizationId?.id,
          name: m.organizationId?.name,
          businessType: m.organizationId?.businessType,
          logoUrl: m.organizationId?.logoUrl,
          role: normalizedRole,
          permissions: perms
        };
      });

    // Audit log
    await AuditLog.create({
      userId: user._id,
      action: 'USER_LOGGED_IN',
      entity: 'User',
      entityId: user._id.toString()
    });

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        token: accessToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        organizations: activeOrganizations
      }
    });
  } catch (error) {
    logger.error('Login controller error:', error);
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
        errorCode: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify session in db
    const session = await Session.findOne({ token: refreshToken, isRevoked: false });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session.',
        errorCode: 'INVALID_SESSION'
      });
    }

    // Decode refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'User account inactive or deleted.',
          errorCode: 'USER_INACTIVE'
        });
      }

      // Issue new access token
      const accessToken = signAccessToken(user._id.toString(), user.email);

      return res.json({
        success: true,
        data: {
          token: accessToken
        }
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token verification failed.',
        errorCode: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (refreshToken) {
      await Session.updateOne({ token: refreshToken }, { isRevoked: true });
    }

    res.clearCookie('refresh_token');

    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated.',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    const mappings = await UserOrganizationRole.find({ userId: user._id })
      .populate('organizationId', 'name businessType logoUrl isSuspended')
      .populate({
        path: 'roleId',
        populate: { path: 'permissions', select: 'name' }
      });

    const organizations = mappings.map((m: any) => ({
      id: m.organizationId?._id,
      name: m.organizationId?.name,
      businessType: m.organizationId?.businessType,
      logoUrl: m.organizationId?.logoUrl,
      isSuspended: m.organizationId?.isSuspended,
      role: m.roleId?.name,
      permissions: m.roleId?.permissions.map((p: any) => p.name) || []
    })).filter(org => org.id && !org.isSuspended);

    return res.json({
      success: true,
      data: {
        user,
        organizations
      }
    });
  } catch (error) {
    logger.error('GetMe error:', error);
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security best practice: don't reveal if email doesn't exist
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    }

    // Generate mock token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    logger.info(`Password reset link (mock) requested for: ${email}. Reset Token: ${resetToken}`);

    // In a real application, email sending would be queued via BullMQ here.
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
      // Expose reset token in development mode only for easy manual validation
      ...(process.env.NODE_ENV !== 'production' && { devResetToken: resetToken })
    });
  } catch (error) {
    logger.error('ForgotPassword error:', error);
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
        errorCode: 'INVALID_RESET_TOKEN'
      });
    }

    // Hash new password
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    logger.info(`Password reset successful for: ${user.email}`);

    return res.json({
      success: true,
      message: 'Password has been reset successfully.'
    });
  } catch (error) {
    logger.error('ResetPassword error:', error);
    next(error);
  }
}
