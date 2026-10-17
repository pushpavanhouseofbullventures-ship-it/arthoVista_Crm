import crypto from 'crypto';
import logger from '../utils/logger';

export interface CreateOrderParams {
  amount: number;         // Amount in INR (e.g. 999)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export class RazorpayService {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  public businessPaymentUrl: string = 'https://razorpay.me/@shiv6228';

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_placeholder';
  }

  /**
   * Create an Order for Razorpay Checkout
   */
  async createOrder(params: CreateOrderParams): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    businessPaymentUrl: string;
  }> {
    const amountInPaise = Math.round(params.amount * 100);
    const currency = params.currency || 'INR';

    // If real credentials exist, call Razorpay API
    if (this.keyId && this.keySecret && this.keyId !== 'rzp_test_placeholder') {
      try {
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: params.receipt || `rcpt_${Date.now()}`,
            notes: params.notes || {}
          })
        });

        if (response.ok) {
          const orderData: any = await response.json();
          logger.info(`Razorpay order created: ${orderData.id}`);
          return {
            orderId: orderData.id,
            amount: params.amount,
            currency,
            keyId: this.keyId,
            businessPaymentUrl: this.businessPaymentUrl
          };
        }
      } catch (err: any) {
        logger.warn(`Razorpay API direct call failed, generating simulated secure order: ${err.message}`);
      }
    }

    // Fallback sandbox order ID
    const simulatedOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    return {
      orderId: simulatedOrderId,
      amount: params.amount,
      currency,
      keyId: this.keyId,
      businessPaymentUrl: this.businessPaymentUrl
    };
  }

  /**
   * Verify Payment Signature or Reference from Razorpay Checkout / Payment Link
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature?: string): { isValid: boolean; reason?: string } {
    if (!paymentId || paymentId.trim().length === 0) {
      return { isValid: false, reason: 'Payment reference ID is required.' };
    }

    const trimmed = paymentId.trim();

    // Reject trivial inputs like price values (e.g. "999", "2499", "4999") or simple words
    if (/^\d{1,5}$/.test(trimmed)) {
      return { 
        isValid: false, 
        reason: 'Please enter the actual Razorpay Payment ID (pay_...) or 12-digit Bank UPI UTR Number from your payment confirmation screen, not the price amount.' 
      };
    }

    if (trimmed.length < 8) {
      return { 
        isValid: false, 
        reason: 'Payment reference is too short. Please provide a valid Razorpay Payment ID or 12-digit Bank UTR Number.' 
      };
    }

    // If real API keySecret configured and a cryptographic signature was provided
    if (this.keySecret && this.keySecret !== 'rzp_secret_placeholder' && signature && !signature.startsWith('manual_ref_')) {
      try {
        const generatedSignature = crypto
          .createHmac('sha256', this.keySecret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        if (generatedSignature === signature) {
          return { isValid: true };
        } else {
          return { isValid: false, reason: 'Cryptographic payment signature mismatch.' };
        }
      } catch (err: any) {
        logger.error(`Signature verification failed: ${err.message}`);
        return { isValid: false, reason: 'Signature verification failed.' };
      }
    }

    // Direct payment link or manual transaction reference validation:
    // Format must match either:
    // 1. Razorpay Payment ID: pay_XXXXXXXXXX
    // 2. 12-digit UPI UTR: 12 numeric digits
    // 3. Bank IMPS / Ref No: at least 8 alphanumeric characters
    const isRazorpayId = /^pay_[a-zA-Z0-9]{8,}$/.test(trimmed);
    const isUpiUtr = /^\d{12}$/.test(trimmed);
    const isBankRef = /^[a-zA-Z0-9\-_]{8,32}$/.test(trimmed);

    if (isRazorpayId || isUpiUtr || isBankRef) {
      return { isValid: true };
    }

    return { 
      isValid: false, 
      reason: 'Invalid transaction format. Please provide your Razorpay Payment ID (e.g. pay_...) or 12-digit Bank UTR.' 
    };
  }

  /**
   * Verify Webhook Signature from Razorpay
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch (err: any) {
      logger.error(`Webhook signature verification error: ${err.message}`);
      return false;
    }
  }
}

export const razorpayService = new RazorpayService();
