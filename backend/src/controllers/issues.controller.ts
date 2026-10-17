import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { storageService } from '../services/storage.service';
import logger from '../utils/logger';

export async function getIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { status, severity, module: mod, category, search, myIssues } = req.query;

    const conditions: string[] = ['i."organizationId" = $1', 'i."isDeleted" = false'];
    const params: any[] = [orgId];
    let paramIdx = 2;

    if (status && status !== 'all') {
      conditions.push(`i."status" = $${paramIdx++}`);
      params.push(status);
    }

    if (severity && severity !== 'all') {
      conditions.push(`i."severity" = $${paramIdx++}`);
      params.push(severity);
    }

    if (mod && mod !== 'all') {
      conditions.push(`i."module" = $${paramIdx++}`);
      params.push(mod);
    }

    if (category && category !== 'all') {
      conditions.push(`i."category" = $${paramIdx++}`);
      params.push(category);
    }

    if (myIssues === 'true') {
      conditions.push(`i."reportedBy" = $${paramIdx++}`);
      params.push(userId);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(i."title") LIKE $${paramIdx} OR 
        LOWER(i."description") LIKE $${paramIdx} OR 
        LOWER(i."issueId") LIKE $${paramIdx} OR 
        LOWER(u."firstName" || ' ' || u."lastName") LIKE $${paramIdx}
      )`);
      params.push(term);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const issuesQuery = `
      SELECT 
        i.*,
        u."firstName" as "reporterFirstName",
        u."lastName" as "reporterLastName",
        u."email" as "reporterEmail",
        res."firstName" as "resolverFirstName",
        res."lastName" as "resolverLastName",
        COUNT(c."id")::int as "commentsCount"
      FROM "IssueReport" i
      LEFT JOIN "User" u ON i."reportedBy" = u."id"
      LEFT JOIN "User" res ON i."resolvedBy" = res."id"
      LEFT JOIN "IssueComment" c ON i."id" = c."issueReportId"
      WHERE ${whereClause}
      GROUP BY i."id", u."firstName", u."lastName", u."email", res."firstName", res."lastName"
      ORDER BY 
        CASE 
          WHEN i."severity" = 'critical' AND i."status" = 'open' THEN 1
          WHEN i."severity" = 'high' AND i."status" = 'open' THEN 2
          ELSE 3
        END,
        i."createdAt" DESC
    `;

    const issues: any[] = await prisma.$queryRawUnsafe(issuesQuery, ...params);

    // Compute stats for current organization
    const statsQuery = `
      SELECT 
        COUNT(*)::int as "total",
        COUNT(CASE WHEN "status" = 'open' THEN 1 END)::int as "open",
        COUNT(CASE WHEN "status" = 'in_progress' THEN 1 END)::int as "inProgress",
        COUNT(CASE WHEN "status" = 'resolved' THEN 1 END)::int as "resolved",
        COUNT(CASE WHEN "status" = 'closed' THEN 1 END)::int as "closed",
        COUNT(CASE WHEN "severity" = 'critical' AND "status" IN ('open', 'in_progress') THEN 1 END)::int as "critical"
      FROM "IssueReport"
      WHERE "organizationId" = $1 AND "isDeleted" = false
    `;

    const statsResult: any[] = await prisma.$queryRawUnsafe(statsQuery, orgId);
    const stats = statsResult[0] || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, critical: 0 };

    return res.json({
      success: true,
      data: issues,
      stats
    });
  } catch (error) {
    logger.error('Error in getIssues:', error);
    next(error);
  }
}

export async function getIssueById(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const issueQuery = `
      SELECT 
        i.*,
        u."firstName" as "reporterFirstName",
        u."lastName" as "reporterLastName",
        u."email" as "reporterEmail",
        res."firstName" as "resolverFirstName",
        res."lastName" as "resolverLastName"
      FROM "IssueReport" i
      LEFT JOIN "User" u ON i."reportedBy" = u."id"
      LEFT JOIN "User" res ON i."resolvedBy" = res."id"
      WHERE i."id" = $1 AND i."organizationId" = $2 AND i."isDeleted" = false
    `;

    const issueResult: any[] = await prisma.$queryRawUnsafe(issueQuery, id, orgId);
    if (!issueResult || issueResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue report not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    const issue = issueResult[0];

    const commentsQuery = `
      SELECT 
        c.*,
        u."firstName" as "authorFirstName",
        u."lastName" as "authorLastName",
        u."email" as "authorEmail"
      FROM "IssueComment" c
      LEFT JOIN "User" u ON c."userId" = u."id"
      WHERE c."issueReportId" = $1
      ORDER BY c."createdAt" ASC
    `;

    const comments: any[] = await prisma.$queryRawUnsafe(commentsQuery, id);
    issue.comments = comments;

    return res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    logger.error('Error in getIssueById:', error);
    next(error);
  }
}

export async function createIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;

    if (!orgId || !userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to report issues.',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const {
      title,
      description,
      module = 'general',
      category = 'bug',
      severity = 'medium',
      pageUrl = '',
      browserInfo = '',
      screenshotUrl = null,
      stepsToReproduce = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Issue title is required.',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Issue description is required.',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Auto-calculate sequential issue ID (e.g., ISS-1001)
    const countResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "IssueReport" WHERE "organizationId" = $1`,
      orgId
    );
    const count = countResult[0]?.count || 0;
    const issueId = `ISS-${1001 + count}`;
    const id = uuidv4();
    const now = new Date();

    const insertQuery = `
      INSERT INTO "IssueReport" (
        "id", "organizationId", "issueId", "reportedBy", "title", "description",
        "module", "category", "severity", "status", "pageUrl", "browserInfo",
        "screenshotUrl", "stepsToReproduce", "isDeleted", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, $11, $12, $13, false, $14, $14
      )
      RETURNING *;
    `;

    const created: any[] = await prisma.$queryRawUnsafe(
      insertQuery,
      id,
      orgId,
      issueId,
      userId,
      title.trim(),
      description.trim(),
      module,
      category,
      severity,
      pageUrl || null,
      browserInfo || null,
      screenshotUrl || null,
      stepsToReproduce ? stepsToReproduce.trim() : null,
      now
    );

    logger.info(`[IssueReport] Employee ${userId} reported new issue ${issueId}: "${title}"`);

    return res.status(201).json({
      success: true,
      message: `Issue ${issueId} reported successfully. Our team will review it.`,
      data: created[0]
    });
  } catch (error) {
    logger.error('Error in createIssue:', error);
    next(error);
  }
}

export async function updateIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { status, severity, resolutionNotes } = req.body;

    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "IssueReport" WHERE "id" = $1 AND "organizationId" = $2 AND "isDeleted" = false`,
      id,
      orgId
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue report not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    const current = existing[0];
    const newStatus = status !== undefined ? status : current.status;
    const newSeverity = severity !== undefined ? severity : current.severity;
    const newNotes = resolutionNotes !== undefined ? resolutionNotes : current.resolutionNotes;

    let resolvedBy = current.resolvedBy;
    let resolvedAt = current.resolvedAt;

    if (newStatus === 'resolved' || newStatus === 'closed') {
      if (!resolvedAt) {
        resolvedBy = userId;
        resolvedAt = new Date();
      }
    } else {
      // Re-opened or in progress
      resolvedBy = null;
      resolvedAt = null;
    }

    const updateQuery = `
      UPDATE "IssueReport"
      SET 
        "status" = $1,
        "severity" = $2,
        "resolutionNotes" = $3,
        "resolvedBy" = $4,
        "resolvedAt" = $5,
        "updatedAt" = NOW()
      WHERE "id" = $6 AND "organizationId" = $7
      RETURNING *;
    `;

    const updated: any[] = await prisma.$queryRawUnsafe(
      updateQuery,
      newStatus,
      newSeverity,
      newNotes,
      resolvedBy,
      resolvedAt,
      id,
      orgId
    );

    return res.json({
      success: true,
      message: 'Issue updated successfully.',
      data: updated[0]
    });
  } catch (error) {
    logger.error('Error in updateIssue:', error);
    next(error);
  }
}

export async function addIssueComment(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty.',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Verify issue exists
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id" FROM "IssueReport" WHERE "id" = $1 AND "organizationId" = $2 AND "isDeleted" = false`,
      id,
      orgId
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue report not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    const commentId = uuidv4();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "IssueComment" ("id", "issueReportId", "userId", "comment", "createdAt")
       VALUES ($1, $2, $3, $4, $5)`,
      commentId,
      id,
      userId,
      comment.trim(),
      now
    );

    // Fetch user details for instant frontend response
    const authorResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT "firstName" as "authorFirstName", "lastName" as "authorLastName", "email" as "authorEmail" FROM "User" WHERE "id" = $1`,
      userId
    );

    const author = authorResult[0] || {};

    return res.status(201).json({
      success: true,
      data: {
        id: commentId,
        issueReportId: id,
        userId,
        comment: comment.trim(),
        createdAt: now,
        authorFirstName: author.authorFirstName,
        authorLastName: author.authorLastName,
        authorEmail: author.authorEmail
      }
    });
  } catch (error) {
    logger.error('Error in addIssueComment:', error);
    next(error);
  }
}

export async function uploadScreenshot(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided.',
        errorCode: 'MISSING_FILE'
      });
    }

    const key = await storageService.uploadFile(req.file, 'issues');
    const url = await storageService.getFileUrl(key);

    return res.json({
      success: true,
      data: {
        key,
        url
      }
    });
  } catch (error) {
    logger.error('Error in uploadScreenshot:', error);
    next(error);
  }
}
