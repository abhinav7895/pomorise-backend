import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const authRoutes = new Hono();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1, 'Name is required'),
});

authRoutes.post('/signin', async (c) => {
  const body = await c.req.json();
  const result = SignInSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.errors }, 400);

  const { email, password } = result.data;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return c.json({ error: error.message }, 401);

  return c.json({ token: data.session.access_token, user: data.user }, 200);
});

authRoutes.post('/signup', async (c) => {
    console.log('hhhh')
  const body = await c.req.json();
  const result = SignUpSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.errors }, 400);

  const { email, password, name } = result.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // Pass name as user metadata
    },
  });
  if (error) return c.json({ error: error.message }, 400);

  return c.json({ user: data.user }, 201); // No token until email is verified
});

authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  const { error } = await supabase.auth.signOut(token);
  if (error) return c.json({ error: error.message }, 400);

  return c.json({ message: 'Logged out successfully' }, 200);
});

export default authRoutes;