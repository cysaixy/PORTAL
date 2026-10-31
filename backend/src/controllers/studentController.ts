import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

/**
 * Get student dashboard data
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                gradeLevel: true,
                strand: true,
                schoolYear: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({ student });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

/**
 * Get student profile
 */
export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        lrn: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        birthdate: true,
        sex: true,
        photoUrl: true,
        signatureUrl: true,
        guardianName: true,
        guardianContact: true,
        guardianEmail: true,
        address: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({ student });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * Upload photo and signature
 */
export async function uploadIdDocuments(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || (!files.photo && !files.signature)) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const updateData: any = {};

    // Handle photo upload
    if (files.photo && files.photo[0]) {
      const photoPath = `/uploads/${files.photo[0].filename}`;
      updateData.photoUrl = photoPath;
      logger.info(`Photo uploaded for student ${student.id}: ${photoPath}`);
    }

    // Handle signature upload
    if (files.signature && files.signature[0]) {
      const signaturePath = `/uploads/${files.signature[0].filename}`;
      updateData.signatureUrl = signaturePath;
      logger.info(`Signature uploaded for student ${student.id}: ${signaturePath}`);
    }

    // Update student record
    const updatedStudent = await prisma.student.update({
      where: { userId: req.user.id },
      data: updateData,
      select: {
        id: true,
        photoUrl: true,
        signatureUrl: true,
      },
    });

    res.json({
      message: 'Files uploaded successfully',
      student: updatedStudent,
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
}
