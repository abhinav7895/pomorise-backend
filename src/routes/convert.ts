import { Hono } from 'hono';
import { env } from "process";
import type { Context } from "hono";

const convert = new Hono();

convert.post('/', async (c: Context): Promise<Response> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
  
    try {
      const ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;

      console.log(ELEVENLABS_API_KEY)
      
      if (!ELEVENLABS_API_KEY) {
        console.error("ElevenLabs API key is not set");
        return c.json(
          {
            success: false,
            error: "ElevenLabs API key is not configured",
          },
          500
        );
      }
  
      const formData = await c.req.formData();
      const audioFile = formData.get("file");
  
      if (!audioFile || !(audioFile instanceof File)) {
        console.error("No valid audio file provided");
        return c.json(
          {
            success: false,
            error: "No valid audio file provided",
          },
          400
        );
      }
  
      console.log("Processing audio file:", {
        type: audioFile.type,
        size: audioFile.size,
        name: audioFile.name || "unnamed",
      });

      const elevenLabsFormData = new FormData();
      elevenLabsFormData.append("file", audioFile);
      elevenLabsFormData.append("model_id", "scribe_v1");
  
      console.log("Sending request to ElevenLabs API...");
      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: elevenLabsFormData,
      });
  
      if (!response.ok) {
        // Try to get more detailed error information
        let errorDetail = "";
        try {
          const errorResponse = await response.text();
          errorDetail = errorResponse;
        } catch (e) {
          errorDetail = "Could not parse error response";
        }
  
        console.error("ElevenLabs API error:", {
          status: response.status,
          statusText: response.statusText,
          detail: errorDetail,
        });
  
        return c.json(
          {
            success: false,
            error: `API error: ${response.status} - ${errorDetail}`,
          },
           500
        );
      }
  
      const data = await response.json();
      console.log("ElevenLabs API response received");

      const processingTime = Date.now() - startTime;
      console.log(`Request ${requestId} processed in ${processingTime}ms`);
  
      return c.json({
        success: true,
        text: data.text || "",
        processingTime,
      });
    } catch (error) {
      console.error("Error converting speech to text:", error);
      return c.json(
        {
          success: false,
          error: "Failed to process speech to text conversion",
          ...(process.env.NODE_ENV === "development" && {
            details: error instanceof Error ? error.message : "Unknown error",
          }),
        },
        500
      );
    }
  });

export default convert;