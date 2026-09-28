const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

async function queryAI(model, systemPrompt, userPrompt, temperature = 0.2, maxTokens = 2500, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
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
          timeout: 45000,
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
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
    } catch (err) {
      if (attempt < retries) {
        console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err;
      }
    }
  }
}

async function diagnose() {
  const keyword = 'sleep fast or late';
  const title = 'Sleep Fast or Late: What Science Says on Ideal Rest';
  const slug = 'sleep-fast-or-late';
  const metaDesc = 'Explore what science says about whether you should sleep fast or late, how circadian rhythm works, and optimal sleep onset.';
  
  // Let's test what Step 2K says if previous analysis EEAT or Quality was low or mismatched
  const prompt2K = `FINAL EVALUATION for article about '${keyword}'.

Target Keyword: ${keyword}
Title Tag: ${title}
Meta Description: ${metaDesc}
URL Slug: ${slug}
Planned Internal Links: https://jetdigitalpro.com/sleep-tips
Planned External Links: https://www.sleepfoundation.org, https://www.cdc.gov

Article:
# Sleep Fast or Late: What Science Says on Ideal Rest

Meta description: Learn what science says about whether you should sleep fast or late.

Falling asleep within 10 to 20 minutes while aligning with your natural circadian chronotype is the clinical foundation of restorative rest. Whether you fall asleep fast or sleep late impacts your cardiovascular system, hormonal regulation, and cognitive performance.

## Key Takeaways
- Optimal sleep latency ranges between 10 and 20 minutes for healthy adults.
- Chronotype determines whether you naturally sleep early or sleep late.
- Circadian misalignment increases systemic inflammation by up to 27%.

## What Does Science Say About Sleeping Early Versus Sleeping Late?
Sleeping early aligns more closely with solar circadian cues, promoting deeper slow-wave sleep during the initial hours of the night. People who stay up late and wake late often experience social jetlag, where societal work schedules force wakefulness during biological sleep phases.

Research from the Sleep Foundation indicates that evening chronotypes face a 10% higher risk of all-cause morbidity when forced into morning schedules.

| Sleep Pattern | Optimal Bedtime Window | Hormone Peak Alignment | Key Health Risks |
|---|---|---|---|
| Early Sleeper (Lark) | 09:00 PM – 10:30 PM | Early evening melatonin surge | Low cardiovascular strain |
| Intermediate | 10:00 PM – 11:30 PM | Balanced circadian phase | Standard baseline health |
| Late Sleeper (Owl) | 12:00 AM – 01:30 AM | Delayed melatonin peak | Elevated social jetlag risk |

## How Can You Fall Asleep Faster Regardless of Your Bedtime?
You can fall asleep faster by managing light exposure, lowering core body temperature, and practicing structured bedtime wind-down routines.

> "The circadian timing system coordinates behavioral rhythms with environmental 24-hour cycles, ensuring metabolic and neural homeostasis." — [National Institute of General Medical Sciences, 2023](https://www.nih.gov)

Follow these evidence-based steps:
1. Dim ambient lighting 60 minutes before your scheduled bedtime.
2. Keep the bedroom temperature around 65 degrees Fahrenheit (18 degrees Celsius).
3. Discontinue screen use to allow natural pineal melatonin secretion.

## Frequently Asked Questions

### Is it harmful to naturally be a night owl?
Being an evening chronotype is genetically influenced and not harmful by itself, provided you can sleep for 7 to 9 hours consistently without chronic alarm disruptions.

### How fast is too fast when falling asleep?
Falling asleep in fewer than five minutes indicates pathological sleepiness or chronic sleep deprivation according to the American Academy of Sleep Medicine.

### Does waking up at the same time every day really help?
Yes, consistent wake times stabilize your suprachiasmatic nucleus, ensuring reliable melatonin release each evening.

## Conclusion and Next Steps
Balancing when you sleep with how quickly you transition into rest is key to lifelong vitality. Download our free circadian alignment guide at [JetDigitalPro](https://jetdigitalpro.com/sleep-tips) to optimize your personal sleep latency tonight.`;

  console.log('Testing 2K evaluation on this article...');
  const res = await queryAI('pesat-flash', 'You are a hybrid SEO and GEO expert.', prompt2K, 0.2, 2500);
  console.log('Result:\n', res);
}

diagnose().catch(console.error);
