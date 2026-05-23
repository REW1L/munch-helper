import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { logsRouter } from './routes/logs';
import { extractErrorFields, logSupportFailure } from './supportSignal';

interface BuildLogAppOptions {
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

export function buildLogApp(options: BuildLogAppOptions = {}) {
  const app = express();
  const routePrefix = normalizeRoutePrefix(options.routePrefix);

  console.info('[log-service] app initialized', {
    routePrefix
  });

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  if (routePrefix !== '/') {
    app.use(routePrefix, logsRouter);
  } else {
    app.use(logsRouter);
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({ message: 'Invalid JSON body' });
      return;
    }

    const { errorName, errorMessage } = extractErrorFields(error);
    logSupportFailure({
      subsystem: 'log',
      code: 'unexpected_error',
      message: 'Unhandled error in log-service',
      correlationId: null,
      httpStatus: 502,
      errorName,
      errorMessage
    });
    console.error('[log-service] unexpected error', error);
    response.status(502).json({ message: 'Unexpected error' });
  });

  return app;
}
