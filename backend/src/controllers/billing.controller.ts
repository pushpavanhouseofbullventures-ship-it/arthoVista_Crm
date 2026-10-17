import { Request, Response, NextFunction } from 'express';
import { saasService } from '../services/saas.service';
import { razorpayService } from '../services/razorpay.service';
import { Payment } from '../models/Payment';
import { Plan } from '../models/Plan';

/**
 * Public endpoint to fetch all dynamic active plans for pricing page
 */
export async function getPublicPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await saasService.getPublicPlans();
    return res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

/**
 * Get organization billing details, live usage counters, features, and payment history
 */
export async function getSubscriptionDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization context required.' });
    }

    const { subscription, usage, daysRemaining, isExpired, isGracePeriod } = 
      await saasService.getOrganizationSubscription(orgId);

    // Fetch payments for this organization
    const payments = await Payment.find({ organizationId: orgId })
      .populate('planId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      data: {
        subscription,
        usage,
        daysRemaining,
        isExpired,
        isGracePeriod,
        payments,
        activeSeatsCount: usage.users
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a Razorpay Order for plan subscription checkout
 */
export async function createCheckoutOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { planId } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Selected plan does not exist.' });
    }

    // If free plan (₹0), no online payment needed
    if (plan.price === 0) {
      const { subscription } = await saasService.activateOrRenewSubscription({
        organizationId: orgId!,
        planId: plan._id.toString(),
        provider: 'manual',
        adminUser: req.user
      });

      return res.json({
        success: true,
        isFreePlan: true,
        message: `Plan "${plan.name}" activated successfully.`,
        data: { subscription }
      });
    }

    // Generate Razorpay Order
    const order = await razorpayService.createOrder({
      amount: plan.price,
      currency: plan.currency,
      receipt: `rcpt_${orgId}_${Date.now()}`,
      notes: {
        organizationId: orgId!.toString(),
        planId: plan._id.toString(),
        planName: plan.name
      }
    });

    return res.json({
      success: true,
      isFreePlan: false,
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        planName: plan.name,
        businessPaymentUrl: order.businessPaymentUrl
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify Razorpay payment and activate / renew subscription
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { planId, orderId, paymentId, signature } = req.body;

    // Verify cryptographic signature or reference format
    const verification = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!verification.isValid) {
      return res.status(400).json({
        success: false,
        message: verification.reason || 'Payment verification failed. Invalid transaction reference.',
        errorCode: 'INVALID_PAYMENT_SIGNATURE'
      });
    }

    // Activate subscription
    const result = await saasService.activateOrRenewSubscription({
      organizationId: orgId!,
      planId,
      paymentId,
      orderId,
      provider: 'razorpay',
      paymentMethod: 'online',
      adminUser: req.user
    });

    return res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully!',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Legacy upgrade endpoint for backward compatibility
 */
export async function subscribeToPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { planName, planId } = req.body;

    let targetPlan;
    if (planId) {
      targetPlan = await Plan.findById(planId);
    } else if (planName) {
      targetPlan = await Plan.findOne({ 
        $or: [
          { slug: planName.toLowerCase() },
          { name: new RegExp(`^${planName}$`, 'i') }
        ] 
      });
    }

    if (!targetPlan) {
      targetPlan = await Plan.findOne({ isActive: true });
    }

    if (!targetPlan) {
      return res.status(400).json({ success: false, message: 'No available plan found.' });
    }

    const result = await saasService.activateOrRenewSubscription({
      organizationId: orgId!,
      planId: targetPlan._id.toString(),
      provider: 'manual',
      adminUser: req.user
    });

    return res.json({
      success: true,
      message: `Subscription successfully updated to ${targetPlan.name} plan.`,
      data: result.subscription
    });
  } catch (error) {
    next(error);
  }
}
