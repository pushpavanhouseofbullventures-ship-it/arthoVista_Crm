import { Request, Response, NextFunction } from 'express';
import { Ticket } from '../models/Ticket';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { Activity } from '../models/Activity';
import { User } from '../models/User';
import { WorkflowService } from '../services/workflow.service';

// Helper to check if the current user is a Client, and return their customerId link
async function getClientCustomerId(orgId: string, email?: string): Promise<string | null> {
  if (!email) return null;
  // Check if email matches customer directory email or contact email
  const customer = await Customer.findOne({ organizationId: orgId, email, isDeleted: false });
  if (customer) return String(customer._id || customer.id);

  const contact = await Contact.findOne({ organizationId: orgId, email, isDeleted: false });
  if (contact) return String(contact.customerId);

  return null;
}

export async function getTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userEmail = req.user?.email;
    const { status, priority, category } = req.query;

    const query: any = { organizationId: orgId, isDeleted: false };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    // Enforce Client Isolation
    const clientCustomerId = await getClientCustomerId(orgId as string, userEmail);
    if (clientCustomerId) {
      query.customerId = clientCustomerId;
    }

    const tickets = await Ticket.find(query)
      .populate('customerId', 'name companyName email')
      .populate('assignedTo', 'firstName lastName')
      .sort({ updatedAt: -1, createdAt: -1 });

    return res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userEmail = req.user?.email;
    const { id } = req.params;

    const ticket = await Ticket.findOne({ _id: id, organizationId: orgId, isDeleted: false })
      .populate('customerId', 'name companyName email phone')
      .populate('assignedTo', 'firstName lastName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    // Enforce Client Isolation
    const clientCustomerId = await getClientCustomerId(orgId as string, userEmail);
    if (clientCustomerId && ticket.customerId.toString() !== clientCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this ticket.',
        errorCode: 'FORBIDDEN'
      });
    }

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
}

export async function createTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    let userName = 'Client Contact';
    if (userId) {
      const userDoc = await User.findById(userId);
      if (userDoc) {
        userName = `${userDoc.firstName} ${userDoc.lastName}`;
      }
    }

    const { title, description, priority, category, customerId: reqCustomerId } = req.body;

    let customerId = reqCustomerId;

    // Enforce Client Isolation on creation
    const clientCustomerId = await getClientCustomerId(orgId as string, userEmail);
    if (clientCustomerId) {
      customerId = clientCustomerId;
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer identifier is required.',
        errorCode: 'BAD_REQUEST'
      });
    }

    // Initialize messages list with the ticket description
    const messages = [{
      senderId: String(userId),
      senderName: userName,
      senderType: clientCustomerId ? ('customer' as const) : ('user' as const),
      content: description,
      date: new Date()
    }];

    const ticket = await Ticket.create({
      organizationId: orgId,
      customerId,
      title,
      description,
      priority,
      category,
      status: 'open',
      messages
    });

    // Log Activity
    await Activity.create({
      organizationId: orgId,
      customerId,
      userId,
      type: 'note',
      content: `Ticket "${title}" opened (Ticket ID: ${ticket.ticketId}) under category "${category.toUpperCase()}".`
    });

    // Trigger automation workflows
    await WorkflowService.triggerWorkflows(orgId as string, 'ticket_created', ticket);

    return res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userEmail = req.user?.email;
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;

    const ticket = await Ticket.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    // Enforce Client Isolation
    const clientCustomerId = await getClientCustomerId(orgId as string, userEmail);
    if (clientCustomerId && ticket.customerId.toString() !== clientCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this ticket.',
        errorCode: 'FORBIDDEN'
      });
    }

    // Apply updates
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;

    await ticket.save();

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
}

// Post message reply inside Ticket board thread
export async function postTicketMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    let userName = 'Client Contact';
    if (userId) {
      const userDoc = await User.findById(userId);
      if (userDoc) {
        userName = `${userDoc.firstName} ${userDoc.lastName}`;
      }
    }

    const { id } = req.params;
    const { content } = req.body;

    const ticket = await Ticket.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    // Enforce Client Isolation
    const clientCustomerId = await getClientCustomerId(orgId as string, userEmail);
    if (clientCustomerId && ticket.customerId.toString() !== clientCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this ticket.',
        errorCode: 'FORBIDDEN'
      });
    }

    const senderType = clientCustomerId ? 'customer' : 'user';

    // Append reply
    const messages = ticket.messages || [];
    messages.push({
      senderId: String(userId),
      senderName: userName,
      senderType,
      content,
      date: new Date()
    });
    ticket.messages = messages;

    // Auto update status: if client replies, set back to "open"; if rep replies, set to "in_progress"
    if (senderType === 'customer') {
      ticket.status = 'open';
    } else {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
}
