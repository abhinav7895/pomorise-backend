import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
import insightsRoutes from './routes/insightsRoutes.js';

config();

const app = new Hono();

const PORT = parseInt(process.env.PORT!) || 8000;
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5174',
  'http://localhost:5173',
  'https://pomorise.vercel.app',
];

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
    maxAge: 600,
    credentials: true,
  })
);

app.get('/health', (c) => c.json({   status: 'Good' }, 200));

app.route('/api', insightsRoutes);


serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);