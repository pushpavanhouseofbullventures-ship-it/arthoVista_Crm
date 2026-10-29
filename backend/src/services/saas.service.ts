import { Plan, IPlan } from '../models/Plan';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { UserOrganizationRole } from '../models/UserOrganizationRole';
import { Lead } from '../models/Lead';
import { Contact } from '../models/Contact';
import { Campaign } from '../models/Campaign';
import { FollowUp } from '../models/FollowUp';
import { Task } from '../models/Task';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { SaaSAuditLog } from '../models/SaaSAuditLog';

export class SaaSService {
  /**
   * Calculate subscription end date based on duration & unit
   */
  calculateEndDate(startDate: Date, duration: number, unit: 'days' | 'months' | 'years' | string): Date {
    const end = new Date(startDate.getTime());
    if (unit === 'days') {
      end.setDate(end.getDate() + duration);
    } else if (unit === 'months') {
      end.setMonth(end.getMonth() + duration);
    } else if (unit === 'years') {
      end.setFullYear(end.getFullYear() + duration);
    } else {
      end.setDate(end.getDate() + duration);
    }
    return end;
  }

  /**
   * Fetch all platform pricing plans
   */
  async getPlans(includeInactive: boolean = false): Promise<IPlan[]> {
    const query = includeInactive ? {} : { isActive: true };
    return Plan.find(query).sort({ sortOrder: 1, price: 1 });
  }

  async getAllPlans(): Promise<IPlan[]> {
    return this.getPlans(true);
  }

  async getPublicPlans(): Promise<IPlan[]> {
    return this.getPlans(false);
  }

  async manualAssignSubscription(params: any): Promise<any> {
    return this.assignSubscription(params);
  }

  /**
   * Create a new Pricing Plan (Admin)
   */
  async createPlan(data: Partial<IPlan>, adminUser: any): Promise<IPlan> {
    const plan = await Plan.create(data);

    // Audit Log
    await SaaSAuditLog.create({
      adminId: adminUser._id || adminUser.id,
      adminEmail: adminUser.email,
      adminName: `${adminUser.firstName || 'Admin'} ${adminUser.lastName || ''}`.trim(),
      action: 'PLAN_CREATED',
      newValue: (plan as any).toObject ? (plan as any).toObject() : plan,
      reason: `Created plan "${plan.name}" (₹${plan.price}/${plan.duration} ${plan.durationUnit})`
    });

    return plan;
  }

  /**
   * Update an existing Pricing Plan (Admin)
   */
  async updatePlan(id: string, data: Partial<IPlan>, adminUser: any): Promise<IPlan | null> {
    const oldPlan = await Plan.findById(id);
    if (!oldPlan) return null;

    const plan = await Plan.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!plan) return null;

    // Audit Log
    await SaaSAuditLog.create({
      adminId: adminUser._id || adminUser.id,
      adminEmail: adminUser.email,
      adminName: `${adminUser.firstName || 'Admin'} ${adminUser.lastName || ''}`.trim(),
      action: 'PLAN_UPDATED',
      oldValue: (oldPlan as any).toObject ? (oldPlan as any).toObject() : oldPlan,
      newValue: (plan as any).toObject ? (plan as any).toObject() : plan,
      reason: `Updated plan "${plan.name}".`
    });

    return plan;
  }

  /**
   * Toggle Plan Active status (Admin)
   */
  async togglePlanStatus(id: string, adminUser: any): Promise<IPlan | null> {
    const oldPlan = await Plan.findById(id);
    if (!oldPlan) return null;

    oldPlan.isActive = !oldPlan.isActive;
    if ((oldPlan as any).save) await (oldPlan as any).save();

    await SaaSAuditLog.create({
      adminId: adminUser._id || adminUser.id,
      adminEmail: adminUser.email,
      adminName: `${adminUser.firstName || 'Admin'} ${adminUser.lastName || ''}`.trim(),
      action: oldPlan.isActive ? 'PLAN_ACTIVATED' : 'PLAN_DEACTIVATED',
      newValue: { isActive: oldPlan.isActive },
      reason: `Plan "${oldPlan.name}" is now ${oldPlan.isActive ? 'Active for new purchases' : 'Deactivated'}`
    });

    return oldPlan;
  }

  /**
   * Get organization live resource usage
   */
  async getLiveUsage(organizationId: string): Promise<{
    users: number;
    leads: number;
    contacts: number;
    campaigns: number;
    followUps: number;
    tasks: number;
    invoices: number;
  }> {
    const orgId = String(organizationId);

    const [users, leads, contacts, campaigns, followUps, tasks, invoices] = await Promise.all([
      UserOrganizationRole.countDocuments({ organizationId: orgId }),
      Lead.countDocuments({ organizationId: orgId }),
      Contact.countDocuments({ organizationId: orgId }),
      Campaign.countDocuments({ organizationId: orgId }),
      FollowUp.countDocuments({ organizationId: orgId }),
      Task.countDocuments({ organizationId: orgId }),
      Invoice.countDocuments({ organizationId: orgId })
    ]);

    return { users, leads, contacts, campaigns, followUps, tasks, invoices };
  }

  /**
   * Get organization subscription details - Unrestricted Full Access for Office CRM
   */
  async getOrganizationSubscription(organizationId: string): Promise<{
    subscription: any;
    usage: any;
    daysRemaining: number;
    isExpired: boolean;
    isGracePeriod: boolean;
  }> {
    const orgId = String(organizationId);
    const usage = await this.getLiveUsage(orgId);

    const unlimitedSubscription = {
      _id: `sub_${orgId}`,
      organizationId: orgId,
      planName: 'Enterprise (Full Access)',
      status: 'active',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2099-12-31'),
      priceAtPurchase: 0,
      currencyAtPurchase: 'INR',
      durationAtPurchase: 100,
      durationUnitAtPurchase: 'years',
      maxUsersAtPurchase: -1,
      limitsAtPurchase: {
        leads: 999999,
        contacts: 999999,
        campaigns: 999999,
        followUps: 999999,
        tasks: 999999,
        invoices: 999999,
        storageMb: 999999
      },
      featuresAtPurchase: {
        email: true,
        whatsapp: true,
        instagram: true,
        phoneCalls: true,
        analytics: true,
        reports: true,
        automation: true,
        aiCopilot: true
      },
      paymentStatus: 'free',
      paymentProvider: 'free'
    };

    return {
      subscription: unlimitedSubscription,
      usage,
      daysRemaining: 99999,
      isExpired: false,
      isGracePeriod: false
    };
  }

  /**
   * Activate or Renew Subscription upon verified payment
   */
  async activateOrRenewSubscription(params: {
    organizationId: string;
    planId: string;
    paymentId?: string;
    orderId?: string;
    provider?: 'razorpay' | 'manual';
    paymentMethod?: string;
    autoRenew?: boolean;
    adminUser?: any;
  }): Promise<{ subscription: any; payment?: any }> {
    const { subscription } = await this.getOrganizationSubscription(params.organizationId);
    return { subscription, payment: null };
  }

  /**
   * Manually Assign / Change Subscription (Admin)
   */
  async assignSubscription(params: {
    organizationId: string;
    planId: string;
    startDate?: Date;
    duration?: number;
    durationUnit?: 'days' | 'months' | 'years';
    price?: number;
    paymentStatus?: 'paid' | 'pending' | 'free' | 'complimentary';
    autoRenew?: boolean;
    adminUser: any;
    reason?: string;
  }): Promise<any> {
    const { subscription } = await this.getOrganizationSubscription(params.organizationId);
    return subscription;
  }

  /**
   * Extend Subscription Expiry Date (Admin)
   */
  async extendSubscription(params: {
    subscriptionId: string;
    extendDays?: number;
    customEndDate?: Date;
    adminUser: any;
    reason?: string;
  }): Promise<any> {
    return {
      _id: params.subscriptionId,
      status: 'active',
      endDate: params.customEndDate || new Date('2099-12-31')
    };
  }

  /**
   * Change Subscription Plan (Admin)
   */
  async changeSubscriptionPlan(params: {
    subscriptionId: string;
    newPlanId: string;
    effective?: 'immediate' | 'at_expiry';
    adminUser: any;
    reason?: string;
  }): Promise<any> {
    return {
      _id: params.subscriptionId,
      planId: params.newPlanId,
      status: 'active'
    };
  }

  /**
   * Suspend Subscription (Admin)
   */
  async suspendSubscription(subscriptionId: string, _reason: string, _adminUser: any): Promise<any> {
    return {
      _id: subscriptionId,
      status: 'suspended'
    };
  }

  /**
   * Reactivate Subscription (Admin)
   */
  async reactivateSubscription(subscriptionId: string, _adminUser: any): Promise<any> {
    return {
      _id: subscriptionId,
      status: 'active'
    };
  }

  /**
   * Cancel Subscription (Admin)
   */
  async cancelSubscription(subscriptionId: string, _cancelImmediately: boolean, _adminUser: any): Promise<any> {
    return {
      _id: subscriptionId,
      status: 'cancelled'
    };
  }

  /**
   * Create Custom Customer Subscription (Admin)
   */
  async createCustomSubscription(params: {
    organizationId: string;
    customName?: string;
    price: number;
    duration: number;
    durationUnit: 'days' | 'months' | 'years';
    maxUsers: number;
    limits: any;
    features: any;
    adminUser: any;
    reason?: string;
  }): Promise<any> {
    const { subscription } = await this.getOrganizationSubscription(params.organizationId);
    return subscription;
  }

  /**
   * Platform Overview KPI aggregation for Admin Dashboard
   */
  async getPlatformOverview(): Promise<{
    kpis: {
      totalOrgs: number;
      totalUsers: number;
      activeSubscriptions: number;
      trialSubscriptions: number;
      expiredSubscriptions: number;
      suspendedOrganizations: number;
      totalRevenue: number;
      monthlyRecurringRevenue: number;
    };
    recentAuditLogs: any[];
    recentPayments: any[];
  }> {
    const [
      totalOrgs,
      totalUsers,
      totalRevenueResult,
      recentAuditLogs,
      recentPayments
    ] = await Promise.all([
      Organization.countDocuments(),
      User.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'captured' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      SaaSAuditLog.find().sort({ createdAt: -1 }).limit(8),
      Payment.find().populate('organizationId', 'name').sort({ createdAt: -1 }).limit(6)
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;

    return {
      kpis: {
        totalOrgs,
        totalUsers,
        activeSubscriptions: totalOrgs,
        trialSubscriptions: 0,
        expiredSubscriptions: 0,
        suspendedOrganizations: 0,
        totalRevenue,
        monthlyRecurringRevenue: 0
      },
      recentAuditLogs,
      recentPayments
    };
  }
}

export const saasService = new SaaSService();
