import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { gradeLevelSchema, strandSchema } from '../lib/validation';

const asString = (val: string | string[] | undefined): string | undefined => {
  if (val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
};

// ============================================================================
// Grade Levels
// ============================================================================

export async function listGradeLevels(req: Request, res: Response) {
  try {
    const gradeLevels = await prisma.gradeLevel.findMany({
      orderBy: { number: 'asc' },
      include: {
        sections: true,
        subjects: true,
      },
    });

    res.json({
      gradeLevels: gradeLevels.map((gl) => ({
        ...gl,
        sectionCount: gl.sections.length,
        subjectCount: gl.subjects.length,
      })),
    });
  } catch (error) {
    logger.error('List grade levels error:', error);
    res.status(500).json({ error: 'Failed to fetch grade levels' });
  }
}

export async function createGradeLevel(req: Request, res: Response) {
  try {
    const data = gradeLevelSchema.parse(req.body);

    const gradeLevel = await prisma.gradeLevel.create({
      data: {
        number: data.number,
        name: data.name,
        isSeniorHigh: data.isSeniorHigh,
      },
    });

    logger.info(`Grade level created: ${gradeLevel.name}`);

    res.status(201).json({ gradeLevel });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Grade level with this number already exists' });
    }
    logger.error('Create grade level error:', error);
    res.status(500).json({ error: 'Failed to create grade level' });
  }
}

export async function updateGradeLevel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = gradeLevelSchema.partial().parse(req.body);

    const gradeLevel = await prisma.gradeLevel.update({
      where: { id },
      data,
    });

    res.json({ gradeLevel });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Grade level not found' });
    }
    logger.error('Update grade level error:', error);
    res.status(500).json({ error: 'Failed to update grade level' });
  }
}

export async function deleteGradeLevel(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const gradeLevel = await prisma.gradeLevel.findUnique({
      where: { id },
      include: {
        sections: true,
        subjects: true,
      },
    });

    if (!gradeLevel) {
      return res.status(404).json({ error: 'Grade level not found' });
    }

    if (gradeLevel.sections.length > 0 || gradeLevel.subjects.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete grade level with existing sections or subjects',
      });
    }

    await prisma.gradeLevel.delete({ where: { id } });

    res.json({ message: 'Grade level deleted' });
  } catch (error) {
    logger.error('Delete grade level error:', error);
    res.status(500).json({ error: 'Failed to delete grade level' });
  }
}

// ============================================================================
// Strands
// ============================================================================

export async function listStrands(req: Request, res: Response) {
  try {
    const strands = await prisma.strand.findMany({
      orderBy: { code: 'asc' },
      include: {
        sections: true,
        subjects: true,
      },
    });

    res.json({
      strands: strands.map((s) => ({
        ...s,
        sectionCount: s.sections.length,
        subjectCount: s.subjects.length,
      })),
    });
  } catch (error) {
    logger.error('List strands error:', error);
    res.status(500).json({ error: 'Failed to fetch strands' });
  }
}

export async function createStrand(req: Request, res: Response) {
  try {
    const data = strandSchema.parse(req.body);

    const strand = await prisma.strand.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
    });

    logger.info(`Strand created: ${strand.code}`);

    res.status(201).json({ strand });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Strand with this code already exists' });
    }
    logger.error('Create strand error:', error);
    res.status(500).json({ error: 'Failed to create strand' });
  }
}

export async function updateStrand(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = strandSchema.partial().parse(req.body);

    const strand = await prisma.strand.update({
      where: { id },
      data,
    });

    res.json({ strand });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Strand not found' });
    }
    logger.error('Update strand error:', error);
    res.status(500).json({ error: 'Failed to update strand' });
  }
}

export async function deleteStrand(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const strand = await prisma.strand.findUnique({
      where: { id },
      include: {
        sections: true,
        subjects: true,
      },
    });

    if (!strand) {
      return res.status(404).json({ error: 'Strand not found' });
    }

    if (strand.sections.length > 0 || strand.subjects.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete strand with existing sections or subjects',
      });
    }

    await prisma.strand.delete({ where: { id } });

    res.json({ message: 'Strand deleted' });
  } catch (error) {
    logger.error('Delete strand error:', error);
    res.status(500).json({ error: 'Failed to delete strand' });
  }
}