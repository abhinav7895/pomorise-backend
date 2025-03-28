import type { Context, Next } from "hono";
import { supabase } from "../config/supabase.js";

export const authenticateToken = async (c: Context<{ Variables: { user: any } }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  c.set('user', data.user);
  await next();
}