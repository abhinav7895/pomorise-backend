import { z } from 'zod';

export interface Habit {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
  targetDays: number;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
  lastCompletedDate: string | null;
  reminderTime: string | null;
  stackedWith: string | null;
  created: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isCompleted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const InsightsRequestSchema = z.object({
  habits: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      isPositive: z.boolean(),
      targetDays: z.number(),
      currentStreak: z.number(),
      longestStreak: z.number(),
      completedDates: z.array(z.string()),
      lastCompletedDate: z.string().nullable(),
      reminderTime: z.string().nullable(),
      stackedWith: z.string().nullable(),
      created: z.string(),
      color: z.string(),
    })
  ).optional(),
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      estimatedPomodoros: z.number(),
      completedPomodoros: z.number(),
      isCompleted: z.boolean(),
      notes: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ).optional(),
});

export const InsightsResponseSchema = z.object({
  insights: z.object({
    story: z.string(),
    tips: z.array(z.string()),
    feedback: z.string(),
    areasToImprove: z.array(z.string()),
  }),
});