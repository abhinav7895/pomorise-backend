import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { Context } from 'hono';
import { env } from 'process';
import { z } from 'zod';
import { config } from 'dotenv';
import { InsightsResponseSchema } from '../types/index.js';


config();

console.log('OpenAI API Key:', env.OPENAI_API_KEY);

// Initialize OpenAI
const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY || 'your-openai-api-key-here',
  baseURL : "https://api.novita.ai/v3/openai"
});

// Hardcoded fallback data
const fallbackData = {
  insights: {
    story:
      'James Clear, after suffering a severe injury as a teenager, struggled to regain his momentum. With no habits or tasks to guide him initially, he started small, focusing on consistency over intensity. This approach led him to develop the "atomic habits" framework, transforming his life and inspiring millions.',
    tips: [
      'Start with small, manageable actions to build momentum.',
      'Track your progress daily to stay motivated.',
      'Focus on consistency rather than perfection.',
    ],
    feedback: "You haven't started tracking habits or tasks yet—now's a great time to begin!",
    areasToImprove: [
      'Begin by adding at least one habit or task to analyze.',
      'Set clear, achievable goals to measure your progress.',
    ],
  },
};

export const getInsights = async (c: Context): Promise<Response> => {
  try {
    const body = await c.req.json();
    const { habits, tasks } = body;

    // Validate habits and tasks arrays
    const hasHabits = Array.isArray(habits) && habits.length > 0;
    const hasTasks = Array.isArray(tasks) && tasks.length > 0;

    // If no habits or tasks, return hardcoded data
    if (!hasHabits && !hasTasks) {
      return c.json(fallbackData, 200);
    }

    // Construct prompt dynamically based on available data
// Generate concise and clear insights  
let prompt = `  
  You are a productivity expert. Based on the user's habits and tasks, generate a JSON object following 'InsightsResponseSchema' with:  

  - A **short and simple motivational story** (three or four sentences) inspired by real-world examples.  
  - **Three clear and actionable tips** in simple language.  
  - **Concise feedback** (one sentence) that is easy to understand.  
  - **Two areas to improve**, written in simple and direct sentences.  

  User Data:  
  ${hasHabits ? 'Habits:\n' + habits.map((h: any) => `- ${h.name}: ${h.description} (Streak: ${h.currentStreak}/${h.targetDays})`).join('\n') : 'No habits provided.'}  
  ${hasTasks ? 'Tasks:\n' + tasks.map((t: any) => `- ${t.title}: ${t.notes || 'No notes'} (Progress: ${t.completedPomodoros}/${t.estimatedPomodoros})`).join('\n') : 'No tasks provided.'}  

  Keep all responses **short, clear, and easy to understand**. Format everything in **simple sentences** without complex words. Return in JSON format under the 'insights' key.  
`;

    const result = await generateObject({
      model: openai('meta-llama/llama-3.1-8b-instruct'),
      prompt,
      schema: InsightsResponseSchema,
      mode: 'json',
    });

    return c.json(result.object as z.infer<typeof InsightsResponseSchema>, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400);
    }
    console.error('Error generating insights:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};