import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { allowedEmailSchema, paginationSchema } from '../lib/validation';

/**
 * GET /api/admin/allowed-emails
 * List allowed emails with pagination and search
 */
export async function listAllowedEmails(req: Request, res: Response) {
  try {
    const { page, limit, search } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { email: 'asc' },
        include: {
          student: {
            select: { id: true, lrn: true, firstName: true, lastName: true },
          },
          teacher: {
            select: { id: true, firstName: true, lastName: true, department: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List allowed emails error:', error);
    res.status(500).json({ error: 'Failed to fetch allowed emails' });
  }
}

/**
 * POST /api/admin/allowed-emails
 * Add an email to the allowlist
 */
export async function addAllowedEmail(req: Request, res: Response) {
  try {
    const data = allowedEmailSchema.parse(req.body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return res.status(409).json({ error: 'Email already in allowlist' });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        role: data.role,
        isActive: data.isActive,
      },
    });

    logger.info(`Allowed email added: ${user.email} (${user.role})`);

    res.status(201).json({ user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in allowlist' });
    }
    logger.error('Add allowed email error:', error);
    res.status(500).json({ error: 'Failed to add allowed email' });
  }
}

/**
 * PUT /api/admin/allowed-emails/:id
 * Update an allowed email (role, status)
 */
export async function updateAllowedEmail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = allowedEmailSchema.partial().parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.role && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        student: {
          select: { id: true, lrn: true, firstName: true, lastName: true },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
      },
    });

    res.json({ user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Allowed email not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    logger.error('Update allowed email error:', error);
    res.status(500).json({ error: 'Failed to update allowed email' });
  }
}

/**
 * DELETE /api/admin/allowed-emails/:id
 * Remove an email from the allowlist
 */
export async function deleteAllowedEmail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { student: true, teacher: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Allowed email not found' });
    }

    if (user._count.student > 0 || user._count.teacher > 0) {
      return res.status(400).json({
        error: 'Cannot remove email with linked profile. Deactivate instead.',
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Allowed email removed' });
  } catch (error) {
    logger.error('Delete allowed email error:', error);
    res.status(500).json({ error: 'Failed to remove allowed email' });
  }
}