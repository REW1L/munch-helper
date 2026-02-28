import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';

dotenv.config();

const app = express();
const port = Number(process.env.GATEWAY_PORT || 8080);
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8081';
const roomServiceUrl = process.env.ROOM_SERVICE_URL || 'http://localhost:8082';
const characterServiceUrl = process.env.CHARACTER_SERVICE_URL || 'http://localhost:8083';

app.use(cors());
app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'gateway', status: 'ok' });
});

app.use('/users', createProxyMiddleware({
  target: userServiceUrl,
  changeOrigin: true,
  pathRewrite: (path: string) => `/users${path}`
}));

app.use('/rooms', createProxyMiddleware({
  target: roomServiceUrl,
  changeOrigin: true,
  pathRewrite: (path: string) => `/rooms${path}`
}));

app.use('/characters', createProxyMiddleware({
  target: characterServiceUrl,
  changeOrigin: true,
  pathRewrite: (path: string) => `/characters${path}`
}));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(502).json({ message: 'Gateway proxy error', details: err.message });
});

app.listen(port, () => {
  console.log(`gateway listening on :${port}`);
});