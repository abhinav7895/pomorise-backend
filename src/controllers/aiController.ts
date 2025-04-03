import { z } from "zod";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "process";
import type { Context } from "hono";

const ActionType = z.enum(["habits", "journal", "tasks", "pomodoros"]);
type ActionType = z.infer<typeof ActionType>;

const BaseActionSchema = z.object({
  text: z.string().min(1).describe("The text content for the action"),
  type: ActionType.describe("The type of action to perform"),
  id: z
    .string()
    .min(1)
    .optional()
    .describe("ID of the item for update/delete/complete actions"),
});

const HabitActionSchema = BaseActionSchema.extend({
  type: z.literal("habits"),
  action: z.enum(["add", "update", "delete", "complete", "reset"]),
  name: z.string().min(1).optional().describe("Name of the habit"),
  description: z
    .string()
    .min(1)
    .optional()
    .describe("Description of the habit"),
  isPositive: z.boolean().optional().describe("Whether it's a positive habit"),
  targetDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .describe("Target days for the habit"),
});

const JournalActionSchema = BaseActionSchema.extend({
  type: z.literal("journal"),
  action: z.enum(["add", "update", "delete", "archive"]),
  title: z.string().min(1).optional().describe("Title of the journal entry"),
  content: z
    .string()
    .min(1)
    .optional()
    .describe("Content of the journal entry"),
});

const TaskActionSchema = BaseActionSchema.extend({
  type: z.literal("tasks"),
  action: z.enum(["add", "update", "delete", "complete", "clear"]),
  title: z.string().min(1).optional().describe("Title of the task"),
  estimatedPomodoros: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Estimated pomodoros"),
  notes: z.string().min(1).optional().describe("Notes for the task"),
});

const ActionSchema = z.discriminatedUnion("type", [
  HabitActionSchema,
  JournalActionSchema,
  TaskActionSchema,
]);

type Action = z.infer<typeof ActionSchema>;

interface ContextData {
  tasks?: { id: string; title: string }[];
  habits?: { id: string; name: string }[];
  journals?: { id: string; title: string }[];
}

interface ApiResponse {
  success: boolean;
  data?: Action;
  error?: string;
}

const createSafeOpenAI = () => {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    return createOpenAI({ apiKey });
  } catch (error) {
    throw new Error("Failed to initialize AI service");
  }
};

const openai = createSafeOpenAI();

export const getAction = async (c: Context): Promise<Response> => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const { text, context } = await c.req.json<{
      text: string;
      context?: ContextData;
    }>();
    console.log(text);
    if (!text?.trim()) {
      return c.json(
        {
          success: false,
          error: "Text input is required",
        },
        400
      );
    }

    const { object: action } = await generateObject({
      model: openai("gpt-3.5-turbo"),
      schema: ActionSchema,
      prompt: buildPrompt(text, context),
      mode: "json",
    });

    return c.json({
      success: true,
      data: action,
    } as ApiResponse);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        error: "Unable to process this action",
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      } as ApiResponse,
      500
    );
  }
};

const buildPrompt = (text: string, context?: ContextData): string => {
  let contextParts = [];

  if (context?.tasks && context.tasks.length > 0) {
    contextParts.push(
      `Current Tasks:\n${context.tasks
        .map((t) => `- ${t.title} (ID: ${t.id})`)
        .join("\n")}`
    );
  }

  if (context?.habits && context.habits.length > 0) {
    contextParts.push(
      `Current Habits:\n${context.habits
        .map((h) => `- ${h.name} (ID: ${h.id})`)
        .join("\n")}`
    );
  }

  if (context?.journals && context.journals.length > 0) {
    contextParts.push(
      `Current Journals:\n${context.journals
        .map((j) => `- ${j.title} (ID: ${j.id})`)
        .join("\n")}`
    );
  }

  const contextBlock =
    contextParts.length > 0 ? `\n\nCONTEXT:\n${contextParts.join("\n\n")}` : "";

  return `
USER INPUT: "${text}"

INSTRUCTIONS:
1. Determine the most appropriate action type (tasks, habits, journal)
2. For update/delete/complete actions, include the ID from context if available
3. Follow these specific rules:

TASKS:
- "add": Must include title with emoji
- "update"/"delete"/"complete": Include ID from context if matching
- Example: {"type":"tasks","action":"complete","title":"Finish report","id":"123"}

HABITS:
- "add": Must include name and short
- "update"/"delete"/"complete": Include ID from context if matching
- Example: {"type":"habits","action":"complete","name":"Morning run","id":"456"}

JOURNAL:
- "add": Should include title and content (100 words only, based on the habits and task)
- "update"/"delete": Include ID from context if matching
- Example: {"type":"journal","action":"update","title":"3 April, Good day","content":"New content","id":"789"}


DEFAULT:
- When uncertain, default to tasks
- For ambiguous completions ("I did X"), use tasks with complete action
- For creation requests without clear type ("I need to X"), use tasks with add action
- For delete/update requests without clear type ("I need to X"), or does not exist in context use tasks with add action

${contextBlock}

OUTPUT FORMAT: JSON matching the schema exactly, with all required fields.

ANALYZE THIS INPUT: "${text}"
`;
};
