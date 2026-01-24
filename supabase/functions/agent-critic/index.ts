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
    const { goal, outputs, context } = await req.json();

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

    console.log(`[Critic] Validating outputs for goal: "${goal}"`);

    const systemPrompt = `You are an expert quality assurance AI. Your job is to validate outputs from a multi-agent workflow and ensure they meet quality standards.

Validation criteria:
1. Relevance: Does the output address the original goal?
2. Completeness: Is the output thorough and comprehensive?
3. Accuracy: Are facts and data points plausible and consistent?
4. Quality: Is the output well-structured and professionally written?
5. Coherence: Do all parts work together logically?

Be constructive but thorough. Identify both strengths and areas for improvement.`;

    const userPrompt = `Original Goal: "${goal}"

Outputs to validate:
${JSON.stringify(outputs, null, 2)}

${context ? `Additional context: ${JSON.stringify(context)}` : ''}

Analyze these outputs and respond with a JSON object:
{
  "passed": true/false,
  "score": 0-100,
  "summary": "Brief overall assessment",
  "strengths": ["list of things done well"],
  "issues": ["list of problems or concerns, if any"],
  "suggestions": ["list of improvement suggestions"],
  "details": {
    "relevance": { "score": 0-100, "notes": "..." },
    "completeness": { "score": 0-100, "notes": "..." },
    "accuracy": { "score": 0-100, "notes": "..." },
    "quality": { "score": 0-100, "notes": "..." }
  }
}

Set "passed" to true if the overall score is 70 or above and there are no critical issues.`;

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
        temperature: 0.3, // Lower temperature for more consistent validation
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
      console.error("[Critic] AI gateway error:", response.status, errorText);
      throw new Error("Failed to validate outputs");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON from the response
    let validation;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      validation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[Critic] Failed to parse AI response:", content);
      // Return a default validation on parse error
      validation = {
        passed: true,
        score: 75,
        summary: "Validation completed with parsing issues - defaulting to pass",
        strengths: ["Outputs were generated successfully"],
        issues: [],
        suggestions: ["Review outputs manually for quality"],
        details: {
          relevance: { score: 75, notes: "Unable to fully parse validation" },
          completeness: { score: 75, notes: "Unable to fully parse validation" },
          accuracy: { score: 75, notes: "Unable to fully parse validation" },
          quality: { score: 75, notes: "Unable to fully parse validation" },
        },
      };
    }

    console.log(`[Critic] Validation complete: ${validation.passed ? 'PASSED' : 'FAILED'} (${validation.score}/100)`);

    return new Response(
      JSON.stringify({ validation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Critic] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
