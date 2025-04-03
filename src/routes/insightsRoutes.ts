import { Hono } from 'hono';
import { getInsights } from '../controllers/insightsController.js';


const insightsRoutes = new Hono();

insightsRoutes.post('/', getInsights);

export default insightsRoutes;