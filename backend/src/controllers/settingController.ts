import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { settingSchema } from '../lib/validation';

/**
 * GET /api/admin/settings
 * List all settings
 */
export async function listSettings(req: Request, res: Response) {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({ settings });
  } catch (error) {
    logger.error('List settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * GET /api/admin/settings/:key
 * Get a single setting
 */
export async function getSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    logger.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
}

/**
 * PUT /api/admin/settings/:key
 * Upsert a setting
 */
export async function upsertSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const data = settingSchema.parse(req.body);

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: data.value },
      create: { key, value: data.value },
    });

    logger.info(`Setting updated: ${key} = ${data.value}`);

    res.json({ setting });
  } catch (error: any) {
    logger.error('Upsert setting error:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
}

/**
 * GET /api/admin/settings/passing-score
 * Get the configurable passing score (default 75)
 */
export async function getPassingScore(req: Request, res: Response) {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'passing_score' },
    });

    const passingScore = setting ? parseInt(setting.value, 10) : 75;

    res.json({ passingScore });
  } catch (error) {
    logger.error('Get passing score error:', error);
    res.status(500).json({ error: 'Failed to fetch passing score' });
  }
}