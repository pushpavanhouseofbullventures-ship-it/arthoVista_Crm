import prisma from '../config/prisma';

export async function initIssuesTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IssueReport" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "issueId" TEXT NOT NULL,
        "reportedBy" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "module" TEXT NOT NULL DEFAULT 'general',
        "category" TEXT NOT NULL DEFAULT 'bug',
        "severity" TEXT NOT NULL DEFAULT 'medium',
        "status" TEXT NOT NULL DEFAULT 'open',
        "pageUrl" TEXT,
        "browserInfo" TEXT,
        "screenshotUrl" TEXT,
        "stepsToReproduce" TEXT,
        "resolutionNotes" TEXT,
        "resolvedBy" TEXT,
        "resolvedAt" TIMESTAMP(3),
        "isDeleted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "IssueReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "IssueReport_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "IssueReport_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IssueReport_organizationId_issueId_key" ON "IssueReport"("organizationId", "issueId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IssueReport_organizationId_status_idx" ON "IssueReport"("organizationId", "status");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IssueReport_organizationId_reportedBy_idx" ON "IssueReport"("organizationId", "reportedBy");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IssueReport_organizationId_severity_idx" ON "IssueReport"("organizationId", "severity");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IssueComment" (
        "id" TEXT PRIMARY KEY,
        "issueReportId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "comment" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "IssueComment_issueReportId_fkey" FOREIGN KEY ("issueReportId") REFERENCES "IssueReport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "IssueComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IssueComment_issueReportId_createdAt_idx" ON "IssueComment"("issueReportId", "createdAt");
    `);

    console.log('✅ IssueReport and IssueComment tables initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize IssueReport tables:', error);
  }
}

if (require.main === module) {
  initIssuesTable().then(() => process.exit(0));
}
