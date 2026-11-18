/**
 * Map It Out (Mapit Estimating) - deploy-time overrides. Loaded before mapitout/config.js.
 * Keep this file free of secrets: it is served to every browser that loads the page.
 *
 * Example LLM override (LM Studio / local Gemma or coding model):
 *
 * window.MAPITOUT_LLM = {
 *   baseUrl: 'http://localhost:1234/v1',
 *   models: [
 *     {name: 'Gemma (LM Studio)', model: 'gemma-3-12b-it'},
 *     {name: 'Qwen 2.5 Coder 14B (LM Studio)', model: 'qwen2.5-coder-14b-instruct'}
 *   ]
 * };
 *
 * Example first-party telemetry override (sink destination OPEN until monorepo control plane is wired):
 *
 * window.MAPITOUT_TELEMETRY_CONFIG = {
 *   enabled: true,
 *   endpoint: null, // e.g. 'http://localhost:8787/telemetry'
 *   format: 'json'  // 'json' or 'html'
 * };
 */
