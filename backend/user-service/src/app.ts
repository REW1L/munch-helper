import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

export interface UserLike {
  id: string;
  name: string;
  avatarId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserModelLike {
  create: (payload: { name: string; avatarId: number }) => Promise<UserLike>;
  findById: (id: string) => Promise<UserLike | null>;
  findByIdAndUpdate: (
    id: string,
    updates: Record<string, unknown>,
    options: { new: boolean; runValidators: boolean }
  ) => Promise<UserLike | null>;
}

interface CreateUserAppOptions {
  routePrefix?: string;
}

const normalizeRoutePrefix = (value: string | undefined): string => {
  if (!value) {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
};

export function createApp(userModel: UserModelLike, options: CreateUserAppOptions = {}) {
  const app = express();
  const routePrefix = normalizeRoutePrefix(options.routePrefix);

  const toParamString = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  if (routePrefix !== '/') {
    // Lambda events may contain stage-prefixed URLs; strip once so route handlers stay unchanged.
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.url === routePrefix) {
        req.url = '/';
      } else if (req.url.startsWith(`${routePrefix}/`)) {
        req.url = req.url.slice(routePrefix.length) || '/';
      }
      next();
    });
  }

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'user-service', status: 'ok' });
  });

  app.post('/users', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, avatarId } = req.body || {};

      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Field name is required and must be a non-empty string' });
      }

      if (typeof avatarId !== 'number') {
        return res.status(400).json({ message: 'Field avatarId is required and must be a number' });
      }

      const user = await userModel.create({
        name: name.trim(),
        avatarId
      });

      res.status(201).json({
        id: user.id,
        name: user.name,
        avatarId: user.avatarId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = toParamString(req.params.userId as string | string[] | undefined);
      const user = await userModel.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        name: user.name,
        avatarId: user.avatarId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'CastError') {
        return res.status(404).json({ message: 'User not found' });
      }
      next(error);
    }
  });

  app.patch('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = toParamString(req.params.userId as string | string[] | undefined);
      const updates: Record<string, unknown> = {};

      if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
        if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
          return res.status(400).json({ message: 'Field name must be a non-empty string when provided' });
        }
        updates.name = req.body.name.trim();
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'avatarId')) {
        if (typeof req.body.avatarId !== 'number') {
          return res.status(400).json({ message: 'Field avatarId must be a number when provided' });
        }
        updates.avatarId = req.body.avatarId;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update' });
      }

      const user = await userModel.findByIdAndUpdate(userId, updates, {
        new: true,
        runValidators: true
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        name: user.name,
        avatarId: user.avatarId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'CastError') {
        return res.status(404).json({ message: 'User not found' });
      }
      next(error);
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ message: 'Internal server error', details: err.message });
  });

  return app;
}