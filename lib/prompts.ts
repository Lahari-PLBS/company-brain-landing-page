export function buildAnswerPrompt(question: string, context: string) {
  return `You are Company Brain, an AI knowledge assistant for organizations.
Answer the user's question only using the provided context.
If the answer is incomplete, say what information is missing.
Do not invent facts.
Return a concise answer in plain English.

Question:
${question}

Context:
${context}`
}

export function buildInsightsPrompt(context: string) {
  return `You are analyzing company knowledge for operational clarity.
Using only the provided context, extract:
1. Decisions taken
2. Pending tasks
3. Risks
4. Missing documentation or unclear ownership
5. Possible duplicate work

Return valid JSON with this exact schema:
{
  "decisions": [],
  "pending_tasks": [],
  "risks": [],
  "missing_documentation": [],
  "duplicate_work": []
}

Context:
${context}`
}
