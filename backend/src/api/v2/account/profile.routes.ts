import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import prisma from '../../../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        birthDate: true,
        country: true,
        city: true,
        address: true,
        postalCode: true,
        kycLevel: true,
        kycStatus: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      firstName,
      lastName,
      phone,
      birthDate,
      country,
      city,
      address,
      postalCode,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        phone: phone !== undefined ? phone : undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        country: country !== undefined ? country : undefined,
        city: city !== undefined ? city : undefined,
        address: address !== undefined ? address : undefined,
        postalCode: postalCode !== undefined ? postalCode : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        birthDate: true,
        country: true,
        city: true,
        address: true,
        postalCode: true,
        kycLevel: true,
        kycStatus: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

export default router;

