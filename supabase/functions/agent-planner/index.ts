import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goal, context } = await req.json();

    if (!goal) {
      return new Response(
        JSON.stringify({ error: "Goal is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[Planner] Creating execution plan for goal: "${goal}"`);

    const systemPrompt = `You are an expert workflow planner AI. Your job is to break down complex goals into clear, actionable steps that can be executed by specialized agents.

Available agent types:
- research: Gathers information, searches data sources, collects relevant facts
- execution: Performs concrete actions like generating content, analyzing data, transforming inputs
- critic: Validates and reviews outputs for quality, completeness, and accuracy
- memory: Stores and consolidates final results

Rules:
1. Start with a research step when information gathering is needed
2. Use execution steps for content generation, analysis, or data transformation
3. Always include a critic step to validate important outputs
4. End with a memory step to consolidate and store results
5. Each step should have clear, specific objectives
6. Keep plans focused - typically 3-6 steps
7. Steps execute sequentially - each step can use outputs from previous steps`;

    const userPrompt = `Create an execution plan for this goal: "${goal}"

${context ? `Additional context: ${JSON.stringify(context)}` : ''}

Respond with a JSON object using this exact structure:
{
  "goal": "the original goal",
  "summary": "brief description of what the plan will accomplish",
  "steps": [
    {
      "step_number": 1,
      "agent_type": "research|execution|critic|memory",
      "name": "Short step name",
      "description": "Detailed description of what this step does",
      "dependencies": [],
      "expected_output": "What this step will produce"
    }
  ],
  "estimated_duration": "estimated time like '2-3 minutes'"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[Planner] AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate plan from AI");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON from the response (handle markdown code blocks)
    let plan;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      plan = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[Planner] Failed to parse AI response:", content);
      throw new Error("Failed to parse execution plan from AI response");
    }

    // Validate plan structure
    if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      throw new Error("Invalid plan: no steps found");
    }

    console.log(`[Planner] Generated plan with ${plan.steps.length} steps`);

    return new Response(
      JSON.stringify({ plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Planner] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
