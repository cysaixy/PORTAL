import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { insensitive, paginate, str } from '../lib/http';
import { paginationSchema } from '../lib/validation';

/** GET /api/admin/audit-logs?action=&entity=&search= */
export async function listAuditLogs(req: Request, res: Response) {
  const { page, limit, search } = paginationSchema.parse(req.query);
  const action = str(req.query.action);
  const entity = str(req.query.entity);

  const where: Prisma.AuditLogWhereInput = {
    ...(action && { action }),
    ...(entity && { entity }),
    ...(search && { OR: [{ user: { email: insensitive(search) } }, { entityId: { contains: search } }] }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, pagination: paginate(page, limit, total) });
}

/** GET /api/admin/audit-logs/filters — distinct actions and entities for the filter dropdowns */
export async function getAuditLogFilters(_req: Request, res: Response) {
  const [actions, entities] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
  ]);
  res.json({ actions: actions.map((a) => a.action), entities: entities.map((e) => e.entity) });
}
