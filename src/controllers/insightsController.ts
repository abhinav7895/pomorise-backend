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
    let prompt = `
      You are an expert personal growth and productivity coach, skilled in extracting meaningful insights from user data and providing actionable advice. Generate a JSON object adhering to the 'InsightsResponseSchema' based on the following user data:

      ${hasHabits ? 'Habits:\n' + habits.map((h: any) => `- ${h.name} - ${h.description} (Current Streak: ${h.currentStreak}, Target: ${h.targetDays} days)`).join('\n') : 'No habits provided.'}
      ${hasTasks ? 'Tasks:\n' + tasks.map((t: any) => `- ${t.title} - ${t.notes || 'No notes'} (Progress: ${t.completedPomodoros}/${t.estimatedPomodoros} pomodoros)`).join('\n') : 'No tasks provided.'}

      Specifically:
      - Craft the 'story' field as a single paragraph inspired by a relatable, real-world example (e.g., James Clear, who struggled post-injury but built the "atomic habits" framework). Tailor the story to reflect the user's situation—whether they have habits, tasks, or both—and provide context and inspiration.
      - Generate the 'tips' field with 3 practical, actionable tips relevant to the provided habits and/or tasks (or general productivity if none).
      - Create the 'feedback' field with a concise, positive assessment of the user's progress based on the data (or encouragement if minimal data).
      - List 2 specific 'areasToImprove' based on the habits and/or tasks (or onboarding steps if none).
      Return the response in JSON format with all content under the 'insights' key.
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