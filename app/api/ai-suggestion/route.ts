import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Type for OpenAI API response
interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageUrl, ctaType } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const suggestion = await generateContentSuggestion(imageUrl, ctaType);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Error in AI suggestion API:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}

async function generateContentSuggestion(
  imageUrl: string,
  ctaType: string | undefined
): Promise<string> {
  try {
    // Create a prompt for GPT
    const prompt = `
      You are an AI assistant for a business social media manager.
      Analyze this image at ${imageUrl} and suggest compelling social media post content.
      
      ${
        ctaType
          ? `The post will include a call-to-action button of type: ${ctaType}.`
          : ""
      }
      
      Create an engaging, professional post that would work well for a business profile, 
      highlighting what's visible in the image. Keep it under 70 words + 10 hashtags + SEO optimized keywords.
      
      Only respond with the post content itself, no explanations or additional text.
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const data: OpenAIResponse = await response.json();
    console.log("AI Suggestion::", data);
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating content suggestion:", error);
    throw error;
  }
}
