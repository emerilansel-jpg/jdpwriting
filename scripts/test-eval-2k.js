const https = require('https');

const testArticle = `# How to Sleep Fast: The Evidence-Based Protocol for Rapid Sleep Onset

Meta description: Learn how to sleep fast with proven, science-backed protocols including the military method, 4-7-8 breathing, and cognitive offloading techniques.

Falling asleep within 10 to 20 minutes is the clinical standard for healthy sleep latency. If you struggle to fall asleep quickly, proven physiological techniques such as the military method, circadian light management, and progressive muscle relaxation can reliably induce rapid sleep onset.

## Key Takeaways
- Clinical sleep onset latency normally ranges between 10 and 20 minutes according to the American Academy of Sleep Medicine (AASM).
- The military method and somatic relaxation decrease sympathetic nervous system arousal within 120 seconds.
- Cognitive offloading via structured bedtime journaling reduces sleep latency by an average of 9 minutes.

## What Is Sleep Onset Latency and What Is Normal?
Sleep onset latency is the exact duration required to transition from full wakefulness to the initial stage of non-REM sleep. A healthy latency lasts between 10 and 20 minutes; values under 5 minutes suggest severe sleep deprivation, while values exceeding 30 minutes indicate sleep-onset insomnia.

According to research published by the American Academy of Sleep Medicine (2024), maintaining consistent biological sleep schedules directly normalizes sleep latency across 87% of observed adult cohorts.

| Sleep Latency Category | Time Range (Minutes) | Clinical Interpretation | Recommended Action |
|---|---|---|---|
| Pathological Sleepiness | < 5 minutes | Severe chronic sleep debt | Extend nightly baseline sleep |
| Optimal Sleep Latency | 10–20 minutes | Healthy autonomic balance | Maintain current routine |
| Mild Delayed Latency | 21–30 minutes | Mild hyperarousal or phase delay | Implement wind-down protocol |
| Sleep-Onset Insomnia | > 30 minutes | Clinical sleep difficulty | Consult sleep specialist |

## How Does the Military Method Accelerate Sleep?
The military method induces sleep within two minutes by sequentially relaxing facial muscles, dropping shoulders, releasing chest tension, and emptying mental focus through a 10-second visualization.

> "Somatic desensitization combined with autonomic deceleration rapidly resets prefrontal cortical arousal, priming subcortical sleep switches." — [Dr. Matthew Walker, Center for Human Sleep Science, 2024](https://www.sleepfoundation.org)

Follow this 4-step sequence:
1. Release all facial and jaw muscle tension while letting your tongue relax.
2. Drop your shoulders low and let both hands fall limp by your sides.
3. Exhale deeply, relaxing your chest, thighs, and calves in steady downward waves.
4. Clear your thoughts for 10 seconds by visualizing a calm lake or repeating "do not think".

## How Does Cognitive Offloading Prevent Bedtime Rumination?
Cognitive offloading prevents bedtime rumination by transferring unresolved executive tasks from active working memory onto paper before entering bed. 

A landmark Baylor University study revealed that participants who spent five minutes writing a specific to-do list fell asleep 9 minutes faster than those writing about completed tasks.

1. Keep a dedicated paper notebook at your bedside.
2. Spend exactly five minutes listing specific tomorrow commitments with designated time blocks.
3. Close the notebook firmly to trigger a psychological completion signal.

## Frequently Asked Questions

### What is the 4-7-8 breathing technique?
The 4-7-8 breathing technique is a pranayamic breathing pattern where you inhale quietly through your nose for 4 seconds, hold your breath for 7 seconds, and exhale audibly through your mouth for 8 seconds. This pattern stimulates vagal nerve tone and slows heart rate.

### How does blue light exposure delay sleep onset?
Blue light in the 450–480 nanometer wavelength suppresses pineal melatonin secretion by stimulating intrinsically photosensitive retinal ganglion cells (ipRGCs), shifting your circadian clock by up to two hours.

### When should I consult a doctor for sleep onset issues?
You should consult a physician or board-certified sleep specialist if taking longer than 30 minutes to fall asleep occurs at least three nights per week for more than three consecutive months.

## Conclusion and Next Steps
Achieving rapid sleep onset is a trainable biological skill rather than random chance. By anchoring your circadian cues, executing somatic relaxation, and offloading bedtime cognitive stress, you can consistently transition into restorative sleep within 15 minutes. Download our comprehensive rapid sleep routine to personalize your sleep architecture tonight.`;

const payload = {
  model: "pesat-flash",
  temperature: 0.2,
  messages: [
    {
      role: "system",
      content: "You are a hybrid SEO and GEO expert. Evaluate content for both traditional Google ranking and AI search engine citation-worthiness (ChatGPT, Perplexity, Gemini, Copilot). Provide pass/fail gate."
    },
    {
      role: "user",
      content: `FINAL EVALUATION for article about "how to sleep fast".

Target Keyword: how to sleep fast
Title Tag: How to Sleep Fast: The Evidence-Based Protocol for Rapid Sleep Onset
Meta Description: Learn how to sleep fast with proven, science-backed protocols including the military method, 4-7-8 breathing, and cognitive offloading techniques.
URL Slug: how-to-sleep-fast
Planned Internal Links: https://jetdigitalpro.com/sleep-tips
Planned External Links: https://www.sleepfoundation.org

Article:
${testArticle}

Previous Analysis Context:
EEAT: {"eeat":{"percentage":88},"hcu":{"percentage":90},"eav":{"percentage":85}}
Quality+FactCheck: {"quality_score":92,"readability":{"grade_level":9.2}}

Evaluation Scope Note: Title, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Evaluate content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively.

SEO DIMENSION (score 0-100): On-Page (25%) — title, meta, heading hierarchy, link readiness, schema markup. Technical (25%) — URL structure, mobile readability, scannability, freshness. Content (25%) — semantic keyword coverage, featured snippet direct answers, comparison tables, entity depth, FAQ coverage. UX (25%) — dwell time hooks, bounce rate reduction, scannability, CTA clarity.

GEO DIMENSION (score 0-100): Citation-Worthiness (40%) — direct answer density (<=40w under H2s), source-worthiness, citation phrases, statistical anchoring, unique insight. ChatGPT (15%) — conversational query match, step-by-step clarity, comparison framing. Perplexity (15%) — source diversity, inline citation format, recency. Gemini (15%) — multimodal readiness (tables, lists), KG alignment, contextual depth. Copilot (15%) — actionable guidance, technical precision.

Return JSON: seo_score, seo_breakdown:{on_page,technical,content,user_experience}, geo_score, geo_breakdown:{citation_worthiness,chatgpt,perplexity,gemini,copilot}, overall_score, pass (boolean, threshold 70), geo_citation_phrases:[], ai_engine_readiness:{chatgpt:{score,note},perplexity:{score,note},gemini:{score,note},copilot:{score,note}}, top_3_seo_fixes:[], top_3_geo_fixes:[], retry_prompt (string if <70), critical_blockers:[].`
    }
  ]
};

const req = https.request({
  hostname: "api.pesatrouter.com",
  path: "/v1/chat/completions",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb"
  }
}, res => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      const content = json.choices[0].message.content;
      console.log("Evaluator Response:\n", content);
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log("\nSummary:", {
        seo_score: parsed.seo_score,
        geo_score: parsed.geo_score,
        overall_score: parsed.overall_score,
        pass: parsed.pass,
        critical_blockers: parsed.critical_blockers
      });
    } catch (e) {
      console.error("Error parsing response:", e.message, data);
    }
  });
});

req.on("error", err => console.error(err));
req.write(JSON.stringify(payload));
req.end();
