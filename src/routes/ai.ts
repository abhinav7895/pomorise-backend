import { Hono } from 'hono';
import { getAction } from '../controllers/aiController.js';


const aiRoutes = new Hono();

aiRoutes.post('/', getAction);

export default aiRoutes;