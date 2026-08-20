/* ------------------------------------------------------------------ */
/*  Replaces the standalone engine's setInterval polling loop, which     */
/*  can't survive on serverless (nothing keeps a Netlify Function alive  */
/*  between requests). Netlify's scheduler calls this on the cron below   */
/*  — no admin session to check, since a browser never calls this          */
/*  directly. One account per run, kept deliberately small so a single    */
/*  slow enrichment can't eat into the next run's window.                 */
/* ------------------------------------------------------------------ */

import type { Config } from "@netlify/functions";
import { processEnrichmentQueue } from "./_beesearch/ai";

export default async (): Promise<Response> => {
  try {
    await processEnrichmentQueue(1);
  } catch {
    // Failures land on the account row itself (enrichment_status: 'failed')
    // via processEnrichmentQueue — nothing else to do with them here.
  }
  return new Response("ok");
};

export const config: Config = {
  schedule: "* * * * *",
};
