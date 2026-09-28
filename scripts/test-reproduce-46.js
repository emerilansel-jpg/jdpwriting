const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, systemPrompt, userPrompt, temperature = 0.2, maxTokens = 2500) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ]
    });

    const req = https.request({
      hostname: 'api.pesatrouter.com',
      path: '/v1/chat/completions',
      method: 'POST',
      family: 4,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PESAT_API_KEY}`
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error(json.error?.message || b.slice(0, 100)));
          }
        } catch (e) {
          reject(new Error(b));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const keyword = 'sleep fast or late';
  const article = `# Sleep Fast or Late: What Science Says on Ideal Rest

Meta description: Learn what science says about whether you should sleep fast or late. Discover clinical research on circadian rhythms and sleep latency.

Getting restorative sleep depends on two things: how fast you fall asleep and whether your bedtime matches your biological clock. When you fall asleep within 10 to 20 minutes, your body transitions smoothly into deep sleep. 

## Key Sleep Takeaways
- Healthy adults typically take 10 to 20 minutes to fall asleep.
- Going to bed early supports cardiovascular recovery during early slow-wave sleep cycles.
- Staying up late without a consistent schedule disrupts metabolic hormones like leptin and ghrelin.

## What Does Science Say About Sleep Timing and Latency?
Sleep timing refers to the hours you choose to rest, while sleep latency is the number of minutes it takes you to drift off. Research from the Sleep Foundation confirms that consistent schedules help 85% of adults maintain optimal autonomic health.

| Sleep Pattern | Ideal Bedtime Window | Natural Hormone Peak | Common Health Impact |
|---|---|---|---|
| Early Sleeper | 09:30 PM - 10:30 PM | Early evening melatonin surge | Lower cardiovascular stress |
| Intermediate | 10:30 PM - 11:30 PM | Balanced circadian phase | Standard baseline health |
| Late Sleeper | 12:00 AM - 01:00 AM | Delayed melatonin peak | Increased social jetlag risk |

## How Does Bedtime Timing Affect Your Heart and Metabolism?
Going to bed late often shortens the total duration of deep non-REM sleep. According to published clinical data, irregular sleep timing increases resting heart rate and blood pressure over time.

> "Circadian misalignment directly impairs glucose tolerance and alters nocturnal blood pressure dipping patterns." — [American Academy of Sleep Medicine, 2023](https://doi.org/10.5665/sleep.4716)

## Actionable Steps to Fall Asleep Faster Tonight
You can shorten sleep latency by using simple behavioral cues:
1. Turn off digital screens 45 minutes before bedtime to allow natural melatonin release.
2. Keep your sleeping space cool, around 65 degrees Fahrenheit.
3. Practice a simple wind-down routine such as reading or light stretching.

Learn more about healthy sleep routines at [JetDigitalPro](https://jetdigitalpro.com/sleep-tips) and explore our [circadian rhythm guide](https://jetdigitalpro.com/circadian-rhythm).

## Frequently Asked Questions

### Is it unhealthy to be a night owl?
Being a night owl is not harmful if you can get 7 to 9 hours of uninterrupted sleep every single night. Problems arise when morning alarm clocks force early waking.

### Why do I take more than 30 minutes to fall asleep?
Taking longer than 30 minutes to sleep is often caused by high stress, caffeine late in the day, or irregular sleep schedules.

### What is the 4-7-8 breathing method?
The 4-7-8 method is a relaxing breathing rhythm: inhale for 4 seconds, hold for 7 seconds, and exhale slowly for 8 seconds to lower heart rate.

## Next Steps for Better Rest
Consistency is the single most effective way to improve your sleep quality. Start by setting a fixed wake-up time every day this week. Download our free bedtime routine template at [JetDigitalPro](https://jetdigitalpro.com/sleep-tips) to personalize your nightly habits today.`;

  // Case 1: Strict JSON prompt with high calibration
  const prompt2K = `FINAL EVALUATION for article about '${keyword}'.

Target Keyword: ${keyword}
Title Tag: Sleep Fast or Late: What Science Says on Ideal Rest
Meta Description: Learn what science says about whether you should sleep fast or late. Discover clinical research on circadian rhythms and sleep latency.
URL Slug: sleep-fast-or-late
Planned Internal Links: https://jetdigitalpro.com/sleep-tips, https://jetdigitalpro.com/circadian-rhythm
Planned External Links: https://doi.org/10.5665/sleep.4716, https://www.cdc.gov

Article:
${article}

Previous Analysis Context:
EEAT: {"eeat":{"percentage":88},"hcu":{"percentage":90},"eav":{"percentage":86}}
Quality+FactCheck: {"quality_score":92,"readability":{"grade_level":7.4,"flesch_score":72}}

Evaluation Scope Note: Title, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Verify that content strictly uses clean text, lists, and tables only. Evaluate the actual content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively. Note on previous analysis: treat EEAT/Quality reports as diagnostic context for future polish; do not double-penalize for Phase 3/5 assets. Pass threshold is overall_score >= 70.

SEO DIMENSION (score 0-100): On-Page (25%), Technical (25%), Content (25%), UX (25%).
GEO DIMENSION (score 0-100): Citation-Worthiness (40%), ChatGPT (15%), Perplexity (15%), Gemini (15%), Copilot (15%).

Return RAW JSON only:
{"seo_score": <number>, "geo_score": <number>, "overall_score": <number>, "pass": <boolean>, "seo_breakdown": {"on_page": <number>, "technical": <number>, "content": <number>, "user_experience": <number>}, "geo_breakdown": {"citation_worthiness": <number>, "chatgpt": <number>, "perplexity": <number>, "gemini": <number>, "copilot": <number>}, "top_3_seo_fixes": [], "top_3_geo_fixes": [], "critical_blockers": []}`;

  const res = await queryAI('pesat-flash', 'You are a hybrid SEO and GEO expert. Output valid raw JSON only.', prompt2K, 0.2, 2000);
  console.log('Result:\n', res);
}

run().catch(console.error);
