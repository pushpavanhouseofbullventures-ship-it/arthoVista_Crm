import { Router, Request, Response } from 'express';
import { razorpayService } from '../services/razorpay.service';
import { saasService } from '../services/saas.service';
import { WebhookLog } from '../models/WebhookLog';
import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import { CallLog } from '../models/CallLog';
import { Organization } from '../models/Organization';
import { assignLeadRoundRobin } from '../controllers/leads.controller';
import logger from '../utils/logger';

const router = Router();

// 1. RAZORPAY WEBHOOK
router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      logger.warn('Razorpay webhook signature verification failed.');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = req.body;
    const eventId = event?.id || `event_${Date.now()}`;
    const eventType = event?.event || 'payment.captured';

    const existingLog = await WebhookLog.findOne({ eventId });
    if (existingLog) {
      logger.info(`Webhook event ${eventId} already processed.`);
      return res.status(200).json({ status: 'already_processed' });
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const notes = paymentEntity.notes || {};
      const organizationId = notes.organizationId;
      const planId = notes.planId;

      if (organizationId && planId) {
        await saasService.activateOrRenewSubscription({
          organizationId,
          planId,
          paymentId: paymentEntity.id,
          orderId: paymentEntity.order_id,
          provider: 'razorpay',
          paymentMethod: paymentEntity.method || 'online'
        });
        logger.info(`Subscription activated via webhook for org: ${organizationId}`);
      }
    }

    await WebhookLog.create({
      eventId,
      provider: 'razorpay',
      eventType,
      status: 'processed',
      payload: event
    });

    return res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    logger.error(`Error processing Razorpay webhook: ${error.message}`);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 2. JUSTDIAL IDEMPOTENT LEAD WEBHOOK / API
router.post('/justdial', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const orgHeader = (req.headers['x-organization-id'] as string) || req.query.orgId as string;
    
    // Fallback to first organization if no header provided in webhook
    let org: any = null;
    if (orgHeader) {
      org = await Organization.findById(orgHeader);
    }
    if (!org) {
      org = await Organization.findOne({ isSuspended: false });
    }

    if (!org) {
      return res.status(400).json({ success: false, message: 'No valid organization tenant mapped.' });
    }

    const externalLeadId = payload.lead_id || payload.leadid || payload.leadId || `JD_${Date.now()}`;
    const phone = (payload.mobile || payload.phone || payload.caller_id || '').toString().trim();
    const name = (payload.name || payload.caller_name || 'JustDial Caller').trim();
    const email = (payload.email || '').trim().toLowerCase();
    const service = payload.category || payload.service || payload.keywords || 'General Inquiry';

    // Validation
    if (!phone || phone.replace(/[^0-9]/g, '').length < 7) {
      await WebhookLog.create({
        eventId: externalLeadId,
        provider: 'justdial',
        eventType: 'lead_push_failed',
        status: 'failed',
        payload,
        error: 'Missing or malformed phone number'
      });
      return res.status(422).json({ success: false, message: 'Malformed payload: Valid phone number required.' });
    }

    // Idempotency check: Look for existing lead by external ID or clean phone
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    let lead = await Lead.findOne({
      organizationId: org._id,
      isDeleted: false,
      $or: [
        { externalLeadId },
        { phone: { $regex: cleanPhone } }
      ]
    });

    if (lead) {
      // Idempotent update
      lead.notes = `${lead.notes || ''}\n[JustDial Update ${new Date().toLocaleDateString('en-IN')}]: ${service}`;
      lead.lastContacted = new Date();
      if ((lead as any).save) await (lead as any).save();

      await Activity.create({
        organizationId: org._id,
        leadId: lead._id,
        userId: lead.assignedTo || org._id,
        type: 'system',
        content: `JustDial inquiry re-received (ID: ${externalLeadId}). Lead updated.`
      });

      await WebhookLog.create({
        eventId: externalLeadId,
        provider: 'justdial',
        eventType: 'lead_duplicate_updated',
        status: 'processed',
        payload
      });

      return res.status(200).json({ success: true, message: 'Existing lead updated.', leadId: lead.leadId });
    }

    // Auto-assign via Round Robin
    const assignedRep = await assignLeadRoundRobin(org._id.toString());

    lead = await Lead.create({
      organizationId: org._id,
      name,
      phone,
      email: email || undefined,
      whatsApp: phone,
      source: 'JustDial',
      serviceInterested: service,
      status: assignedRep ? 'Open' : 'New',
      assignedTo: assignedRep || undefined,
      externalLeadId,
      notes: `JustDial Lead ID: ${externalLeadId}\nService: ${service}\nCity: ${payload.city || 'N/A'}`
    });

    await Activity.create({
      organizationId: org._id,
      leadId: lead?._id || lead?.id,
      userId: assignedRep || org._id,
      type: 'system',
      content: `New lead received from JustDial (Lead ID: ${externalLeadId}).`
    });

    await WebhookLog.create({
      eventId: externalLeadId,
      provider: 'justdial',
      eventType: 'lead_created',
      status: 'processed',
      payload
    });

    return res.status(201).json({ success: true, message: 'JustDial lead imported successfully.', leadId: lead?.leadId });
  } catch (error: any) {
    logger.error('JustDial webhook error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. INDIAMART IDEMPOTENT PUSH API WEBHOOK
router.post('/indiamart', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const orgHeader = (req.headers['x-organization-id'] as string) || req.query.orgId as string;

    let org: any = null;
    if (orgHeader) {
      org = await Organization.findById(orgHeader);
    }
    if (!org) {
      org = await Organization.findOne({ isSuspended: false });
    }

    if (!org) {
      return res.status(400).json({ success: false, message: 'No valid organization tenant mapped.' });
    }

    // IndiaMART Push API Payload Fields
    const queryId = payload.QUERY_ID || payload.query_id || payload.queryId || `IM_${Date.now()}`;
    const name = (payload.SENDER_NAME || payload.sender_name || 'IndiaMART Buyer').trim();
    const phone = (payload.SENDER_MOBILE || payload.sender_mobile || payload.SENDER_PHONE || '').toString().trim();
    const email = (payload.SENDER_EMAIL || payload.sender_email || '').trim().toLowerCase();
    const company = (payload.GLUSR_USR_COMPANYNAME || payload.company || '').trim();
    const product = payload.SUBJECT || payload.PRODUCT_NAME || payload.query_product_name || 'B2B Catalog Item';
    const message = payload.QUERY_MESSAGE || payload.message || '';

    // Validation
    if (!phone || phone.replace(/[^0-9]/g, '').length < 7) {
      await WebhookLog.create({
        eventId: queryId,
        provider: 'indiamart',
        eventType: 'lead_push_failed',
        status: 'failed',
        payload,
        error: 'Missing or malformed phone number'
      });
      return res.status(422).json({ success: false, message: 'Malformed payload: Sender mobile required.' });
    }

    // Idempotency check: Look for existing lead by QUERY_ID or Phone
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    let lead = await Lead.findOne({
      organizationId: org._id,
      isDeleted: false,
      $or: [
        { externalLeadId: queryId },
        { phone: { $regex: cleanPhone } }
      ]
    });

    if (lead) {
      lead.notes = `${lead.notes || ''}\n[IndiaMART Query ${new Date().toLocaleDateString('en-IN')}]: ${product} - ${message}`;
      lead.lastContacted = new Date();
      if ((lead as any).save) await (lead as any).save();

      await Activity.create({
        organizationId: org._id,
        leadId: lead._id,
        userId: lead.assignedTo || org._id,
        type: 'system',
        content: `IndiaMART query re-received (Query ID: ${queryId}). Inquiry updated.`
      });

      await WebhookLog.create({
        eventId: queryId,
        provider: 'indiamart',
        eventType: 'lead_duplicate_updated',
        status: 'processed',
        payload
      });

      return res.status(200).json({ success: true, message: 'Existing IndiaMART lead updated.', leadId: lead.leadId });
    }

    const assignedRep = await assignLeadRoundRobin(org._id.toString());

    lead = await Lead.create({
      organizationId: org._id,
      name,
      company: company || undefined,
      phone,
      email: email || undefined,
      whatsApp: phone,
      source: 'IndiaMART',
      productInterested: product,
      status: assignedRep ? 'Open' : 'New',
      assignedTo: assignedRep || undefined,
      externalLeadId: queryId,
      notes: `IndiaMART Query ID: ${queryId}\nProduct: ${product}\nMessage: ${message}\nCity: ${payload.SENDER_CITY || 'N/A'}`
    });

    await Activity.create({
      organizationId: org._id,
      leadId: lead?._id || lead?.id,
      userId: assignedRep || org._id,
      type: 'system',
      content: `New lead received from IndiaMART (Query ID: ${queryId}) for product "${product}".`
    });

    await WebhookLog.create({
      eventId: queryId,
      provider: 'indiamart',
      eventType: 'lead_created',
      status: 'processed',
      payload
    });

    return res.status(201).json({ success: true, message: 'IndiaMART lead imported successfully.', leadId: lead?.leadId });
  } catch (error: any) {
    logger.error('IndiaMART webhook error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. VOIP / DIALER CALL EVENT WEBHOOK (Exotel / Knowlarity / PBX)
router.post('/dialer/call-event', async (req: Request, res: Response) => {
  try {
    const { CallSid, call_id, DialCallDuration, Duration, RecordingUrl, Status, DialCallStatus } = req.body;
    const providerCallId = CallSid || call_id;
    const duration = Number(DialCallDuration || Duration || 0);
    const recordingUrl = RecordingUrl || req.body.recording_url;

    if (providerCallId) {
      const callLog = await CallLog.findOne({ providerCallId });
      if (callLog) {
        if (duration > 0) callLog.duration = duration;
        if (recordingUrl) callLog.recordingUrl = recordingUrl;
        if (Status || DialCallStatus) {
          const s = (DialCallStatus || Status).toLowerCase();
          if (s.includes('completed') || s.includes('answered')) callLog.status = 'completed';
          else if (s.includes('busy')) callLog.status = 'busy';
          else if (s.includes('no-answer')) callLog.status = 'no_answer';
          else if (s.includes('failed')) callLog.status = 'failed';
        }
        if ((callLog as any).save) await (callLog as any).save();

        if (callLog.leadId) {
          await Lead.findByIdAndUpdate(callLog.leadId, { $set: { lastContacted: new Date() } });
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    logger.error('Dialer webhook error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 5. FAILED WEBHOOK / IMPORT QUEUE (Admin Review)
router.get('/failed-queue', async (req: Request, res: Response) => {
  try {
    const failedLogs = await WebhookLog.find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      data: failedLogs
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. RETRY FAILED WEBHOOK
router.post('/failed-queue/:id/retry', async (req: Request, res: Response) => {
  try {
    const log = await WebhookLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Failed log entry not found.' });
    }

    // Mark as processed upon manual resolution
    log.status = 'processed';
    if ((log as any).save) await (log as any).save();

    return res.json({
      success: true,
      message: 'Webhook payload flagged as resolved and queued.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. DAILY RECONCILIATION SUMMARY
router.get('/reconciliation', async (req: Request, res: Response) => {
  try {
    const [totalJustDialWebhooks, totalIndiaMARTWebhooks, totalJustDialLeads, totalIndiaMARTLeads, failedWebhooks] = await Promise.all([
      WebhookLog.countDocuments({ provider: 'justdial' }),
      WebhookLog.countDocuments({ provider: 'indiamart' }),
      Lead.countDocuments({ source: 'JustDial', isDeleted: false }),
      Lead.countDocuments({ source: 'IndiaMART', isDeleted: false }),
      WebhookLog.countDocuments({ status: 'failed' })
    ]);

    return res.json({
      success: true,
      data: {
        justdial: {
          webhookEvents: totalJustDialWebhooks,
          leadsImported: totalJustDialLeads,
          match: totalJustDialWebhooks === totalJustDialLeads
        },
        indiamart: {
          webhookEvents: totalIndiaMARTWebhooks,
          leadsImported: totalIndiaMARTLeads,
          match: totalIndiaMARTWebhooks === totalIndiaMARTLeads
        },
        failedQueueCount: failedWebhooks,
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
