// JDP Pipeline Import - Paste in n8n Console
(async () => {
  const API = "n8n_api_a62c028374a34f3d4693af39aa429ca37bac254ffe9798895bddd9f67ab3c28fc9ac653697e71604";
  const r = await fetch("/api/v1/workflows", { headers: { "X-N8N-API-KEY": API } });
  const existing = await r.json();
  console.log("Existing workflows:", existing.data?.length || 0);
  
  const files = ["orchestrator.json","step-1a-serp.json","step-1b-info-gain.json","step-1c-lsi-keywords.json","step-1d-outline.json","step-1e-article.json","step-2a-title-meta.json","step-2b-intro-rewrite.json","step-2c-originality-rewrite.json","step-2d-fluff-check.json","step-2e-faq-generation.json","step-2f-conclusion-optimizer.json","step-2g-add-table.json","step-2h-find-embed-quotes.json","step-2i-eeat-hcu-eav.json","step-2j-quality-fact-check.json","step-2k-seo-geo-evaluator.json","step-3a-image-prompts.json","step-3b-infographic-prompt.json","step-3c-alt-texts.json","step-4a-internal-linking.json","step-4b-external-linking.json"];
  let ok = 0, fail = 0;
  
  for (const file of files) {
    const resp = await fetch("/n8n-templates/" + file);
    if (!resp.ok) {
      console.log("❌ Cannot fetch", file, resp.status);
      fail++;
      continue;
    }
    const wf = await resp.json();
    if (!wf.settings) wf.settings = {};
    
    const res = await fetch("/api/v1/workflows", {
      method: "POST",
      headers: { "X-N8N-API-KEY": API, "Content-Type": "application/json" },
      body: JSON.stringify(wf)
    });
    const d = await res.json();
    if (d.id) { console.log("✅", wf.name, "→", d.id); ok++; }
    else { console.log("❌", wf.name, "→", d.message); fail++; }
    await new Promise(r => setTimeout(r, 300));
  }
  console.log("\nDone!", ok, "success,", fail, "failed");
})();
