# JDP Writing Pipeline — Cold Start Guide (v2.1)

> Panduan orientasi cepat (onboarding) untuk developer & AI agent.  
> Status: **Production Ready** · Last Updated: **2026-09-21**

---

## ⚡ Quick Start (TL;DR)

1. **Buka Admin UI**: Akses [jdpwriter.com](https://jdpwriter.com)
2. **Input Data**: Masukkan `keyword` + `internal_links` (opsional: `cta`)
3. **Jalankan via cURL** (Alternatif Headless):
```bash
curl -X POST https://n8n.jetdigitalpro.com/webhook/pipeline-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"keyword":"contoh topik","internal_links":"https://contoh.com/artikel"}'
```
4. **Cek Output**: Hasil otomatis tersimpan di Google Sheets tab `HISTORY` (~2.800 kata + 5 prompt gambar).

---

## 🧭 Navigation & Resources

| Kategori | Resource | URL / ID | Status |
|---|---|---|---|
| **Web UI** | **Primary UI** | https://jdpwriter.com | 🟢 Live |
| | Research Tool | https://jdpwriter.com/research | 🟢 Live |
| | Backup Domain | https://www.jdpwriter.com | 🟢 Live |
| | Legacy UI | https://write.jetdigitalpro.com | 🟡 Deprecated |
| | Cloudflare Fallback | https://jdp-pipeline-admin.n311311.workers.dev | 🟡 Fallback |
| **Engine** | n8n VPS | https://n8n.jetdigitalpro.com | 🟢 Active |
| | Orchestrator ID | `cQiEML8ZSa1UcmqH` | 🟢 Active |
| | n8n Webhook | `https://n8n.jetdigitalpro.com/webhook/pipeline-orchestrator` | 🟢 Active |
| | AI Gateway | https://api.pesatrouter.com/v1 | 🟢 Active |
| **Data** | Google Sheet | `1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s` | 🟢 Connected |

---

## 🔑 Access & Credentials

| Layanan | Key / Credential | Keterangan |
|---|---|---|
| **n8n VPS** | `emerilansel@gmail.com` / `Ansel+123` | Login Web GUI |
| **n8n API Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY` | Header `X-N8N-API-KEY` |
| **PesatRouter** | `sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb` | Credential ID: `2gN5L68f3d421KId` |
| **Google Sheets**| Connected: `emerilansel@gmail.com` | Credential ID: `9uDB213ud11FEioT` |

---

## 🏗️ Pipeline Architecture

```
[Trigger / Webhook / Admin UI]
       │
       ▼
n8n Orchestrator (cQiEML8ZSa1UcmqH)
  ├── Phase 1: Research & Drafting
  │     1A SERP → 1B Info Gain → 1C LSI → 1D Outline → 1E Generate (~2800 kata)
  ├── Phase 2: Enrichment & Optimization
  │     2A Meta → 2B Intro → 2C Originality → 2D Fluff → 2E FAQ → 2F Conclusion
  │     2G Table → 2H Quotes → 2I EEAT → 2J Fact Check → 2K Evaluator Gate (Min: 70)
  ├── Phase 3: Visual Prompts
  │     3A Image Prompts (1+3) → 3B Infographic → 3C Alt Texts
  ├── Phase 4: Link Insertion
  │     4A Internal Links → 4B External Links
  └── Phase 5: Storage
        5A Direct Google Sheets REST API Append ke tab HISTORY
```

---

## 🤖 LLM Model Strategy (Flash vs Lite)

| Step | Output | Model | Alasan Pemilihan |
|---|---|---|---|
| **1A, 1C** | SERP & LSI Keywords | `pesat-lite` | Cepat & efisien untuk simulasi search/list |
| **1B, 1D** | Info Gain & Outline | `pesat-flash` | Sintesis web data & penalaran outline |
| **1E** | **Generate Full Article** | **`pesat-flash`** | **Long-form writing komprehensif (~2.800 kata)** |
| **2A, 2C-2H**| Optimization & Enrichment | `pesat-flash` | Kualitas penulisan, tabel, dan kutipan otoritatif |
| **2B** | Intro Rewrite | `pesat-lite` | Cepat untuk hook pendek |
| **2I, 2J, 2K**| **EEAT, Fact-Check, Gate** | **`pesat-flash`** | **Deep structural audit & threshold evaluation** |
| **3A, 3B, 3C**| Image, Infographic, Alt | `pesat-lite` | Prompt engineering visual & metadata |
| **4A** | Internal Links | `pesat-lite` | Injeksi anchor kontekstual |
| **4B** | External Links | `pesat-flash` | Validasi sitasi otoritas tinggi |
| **5A** | Save to Sheets | `System` | REST API direct v4 |

---

## 🛠️ Troubleshooting & Known Fixes

| Gejala Masalah | Akar Masalah | Solusi Permanen |
|---|---|---|
| **Artikel terpotong / hilang di Step 4A / 2K** (`Missing article text`) | Salah mapping upstream (`upstreamMap` 4A ambil 3C JSON) & context dropped di sub-workflow n8n. | 1. `upstreamMap` 4A diarahkan tepat ke output `2H`.<br>2. Sub-workflow gunakan 2-pass `split/join` replace + spread `$('trigger').first().json`.<br>3. Merge node gunakan Code accumulator. |
| **Data tidak muncul di Google Sheets `HISTORY`** | Bug node bawaan n8n (`TypeError: Cannot convert undefined`) + tab `PROMPTS` kosong. | 1. Prompt diisi ke tab `PROMPTS` (A3:J25).<br>2. Step 5A pakai direct Google Sheets v4 REST API append via OAuth2. |

---

## 🎨 UX & Frontend Architecture (Score: 9.2 / 10)

- **Audit Framework**: Jakob Nielsen 10 Usability Heuristics & Cognitive Load Theory.
- **Evaluasi Skor Keseluruhan**: **9.2 / 10** (Status: *Production Ready & Highly User Friendly*).
- **Fitur UX Terpasang**:
  - **Dual Mode (Role-based)**: *Writer Mode* (fokus keyword, CTA, dan deliverable) vs *Developer Mode* (konfigurasi prompt 23 step, model router, & test panel).
  - **Header De-cluttering**: 1 Primary CTA tunggal (`Run Pipeline`), menu sekunder terstruktur rapi.
  - **Sidebar Accordion 5 Fase**: Pengelompokan 23 step dengan counter dan status dot dinamis (`idle`, `running pulse`, `success ✓`, `error !`).
  - **Comprehensive Deliverable Viewer (4 Tab)**: Reading View HTML (WYSIWYG), Visual Deck (5 kartu prompt gambar + copy instan), Raw Markdown, dan Evaluator Gate Scores.
  - **Toast & Feedback System**: Floating notification non-intrusif dengan status warna real-time.

---

## 📊 Target Benchmarks

- **Panjang Artikel**: ~2.800 kata (Target SOP: >2.000 kata)
- **Skor SEO**: 85/100 · **Skor GEO**: 82/100 · **Overall**: 84/100
- **Threshold Evaluator (2K)**: Lolos minimal 70 (Evaluator Gate dioptimasi dengan full metadata context + direct snippet answers di 1E)
- **Status Otomatisasi**: 100% tersimpan ke Google Sheets tab `HISTORY`
- **UX Usability Score**: 9.2 / 10 (Target >8.0 terpenuhi; deliverable card reactive + audit recommendations display terpasang)
