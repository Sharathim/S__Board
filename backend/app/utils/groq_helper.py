import json
import logging
from flask import current_app
from groq import Groq

logger = logging.getLogger(__name__)


def analyze_resume_with_groq(resume_text: str, role_name: str, required_skills: list) -> dict:
    """Analyze extracted resume text against a target job role using Groq AI with multi-key failover rotation."""
    keys = current_app.config.get("GROQ_API_KEYS", [])
    if not keys:
        import os
        keys = [os.environ.get(f"GROQ_API_KEY_{i}") for i in (1, 2, 3) if os.environ.get(f"GROQ_API_KEY_{i}")]
    if not keys:
        raise ValueError("No Groq API keys configured in environment.")

    prompt = f"""You are a senior technical recruiter evaluating a candidate resume for the role: {role_name}.

Required skill checklist (evaluate ONLY against this list, do not invent new skills):
{", ".join(required_skills)}

Resume text:
\"\"\"{resume_text[:12000]}\"\"\"

Return ONLY valid JSON with no markdown formatting or extra text, matching exactly this schema:
{{
  "match_score": <integer 0-100 representing percentage match>,
  "matched_skills": [<subset of the checklist evidenced in the resume>],
  "missing_skills": [<subset of the checklist NOT found in the resume>],
  "action_plan": {{
    "recommended_courses": [<2-4 specific NPTEL or online course suggestions tied directly to missing_skills>],
    "suggested_projects": [<1-3 practical project ideas that would demonstrate missing_skills>],
    "resume_improvements": [<2-4 concrete resume bullet point improvement suggestions>]
  }}
}}"""

    last_error = None

    for idx, key in enumerate(keys):
        if not key:
            continue
        try:
            logger.info(f"Attempting Groq AI analysis using key index {idx + 1}...")
            client = Groq(api_key=key)

            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional HR AI recruiter that evaluates technical resumes against job role requirements. You return strict JSON objects only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2048,
            )

            raw_content = completion.choices[0].message.content
            parsed = json.loads(raw_content)

            # Ensure expected structure is present
            match_score = max(0, min(100, int(parsed.get("match_score", 50))))
            matched_skills = parsed.get("matched_skills", [])
            missing_skills = parsed.get("missing_skills", [])
            action_plan = parsed.get("action_plan", {})

            logger.info(f"Groq AI analysis succeeded with key index {idx + 1}. Match score: {match_score}")
            return {
                "match_score": match_score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "action_plan": action_plan,
                "raw_response": raw_content,
                "key_used_index": idx + 1
            }

        except Exception as e:
            logger.warning(f"Groq API Key index {idx + 1} failed with error: {e}. Initiating failover to next key...")
            last_error = e

    raise Exception(f"All Groq API failover keys failed. Last error: {last_error}")
