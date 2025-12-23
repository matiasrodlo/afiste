import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../../middleware/auth.middleware';
import prisma from '../../../config/database';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get list of users
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', search, kyc_status, kyc_level } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (kyc_status) {
      where.kycStatus = kyc_status;
    }

    if (kyc_level) {
      where.kycLevel = parseInt(kyc_level as string, 10);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          kycLevel: true,
          kycStatus: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Get user details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        kycLevel: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          include: {
            currency: {
              select: {
                id: true,
                code: true,
                name: true,
                symbol: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Update user KYC level
router.put('/:id/kyc_level', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { kyc_level, kyc_status } = req.body;

    if (kyc_level !== undefined && (kyc_level < 0 || kyc_level > 3)) {
      return res.status(400).json({ error: 'KYC level must be between 0 and 3' });
    }

    if (kyc_status && !['pending', 'verified', 'rejected'].includes(kyc_status)) {
      return res.status(400).json({ error: 'Invalid KYC status' });
    }

    const updateData: any = {};
    if (kyc_level !== undefined) {
      updateData.kycLevel = kyc_level;
    }
    if (kyc_status) {
      updateData.kycStatus = kyc_status;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        kycLevel: true,
        kycStatus: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to update KYC level' });
  }
});

export default router;

