import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/audit-logs
 * List audit logs with pagination and filters
 */
export async function listAuditLogs(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const { action, entity } = req.query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics (count by action type)
 */
export async function getAuditLogStats(req: Request, res: Response) {
  try {
    const stats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    res.json({ stats });
  } catch (error) {
    logger.error('Get audit log stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log stats' });
  }
}

/**
 * GET /api/admin/audit-logs/actions
 * Get distinct action types for filter chips
 */
export async function getAuditLogActions(req: Request, res: Response) {
  try {
    const actions = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });

    res.json({ actions: actions.map(a => a.action) });
  } catch (error) {
    logger.error('Get audit log actions error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log actions' });
  }
}

/**
 * GET /api/admin/audit-logs/entities
 * Get distinct entity types for filter chips
 */
export async function getAuditLogEntities(req: Request, res: Response) {
  try {
    const entities = await prisma.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    });

    res.json({ entities: entities.map(e => e.entity) });
  } catch (error) {
    logger.error('Get audit log entities error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log entities' });
  }
}