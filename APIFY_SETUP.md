# Apify → Editorial admin

This integration reads the current collector's existing dataset format. No Actor source change or rebuild is required.

## Server setup
1. Run `npm run db:migrate` with the correct database environment loaded. This adds `cms_collected` without changing existing content. Test the migration on a development database first.
2. Set these server-only Vercel environment variables:
   - `APIFY_API_TOKEN`: a token with read access to the collector's runs and datasets.
   - `APIFY_ACTOR_ID`: the collector's exact Apify Actor ID (not its name or run ID).
   - `APIFY_WEBHOOK_SECRET`: a fresh random secret of at least 32 characters. Keep it out of GitHub and browser code.
3. Deploy this website version.

## Import the already-completed run
Sign in, open **Collected stories**, paste the Apify run ID and select **Import run**. Only successful runs belonging to APIFY_ACTOR_ID are accepted. Results report inserted, duplicate and invalid counts.

## Automatic imports after future runs
In your collector's Apify Integrations/Webhooks settings create a webhook:
- Event: Actor run succeeded (`ACTOR.RUN.SUCCEEDED`).
- URL: your production website origin followed by `/api/integrations/apify`.
- Header: `Authorization: Bearer YOUR_APIFY_WEBHOOK_SECRET` (use the same secret as the server variable).
- Keep the default JSON payload, including `eventType` and `resource.id`.

Run the collector once and verify that stories appear in the admin. Apify webhook delivery failures should be retried or recovered using the manual run import. Keep the existing Actor schedule and Excel output.

## Classification and publishing
- Source tags have priority, followed by the Actor's non-default type suggestion and headline keywords.
- Match reports / reviews → Blog articles / Match Reports.
- Previews → Blog articles / Match Previews.
- Player analysis / profiles → Blog articles / Player Analysis.
- Opinions, explainers and general analysis → Blog articles / Opinions & Explainers.
- Explicit news / squad / injury / appointment / retirement updates → Cricket news / right sidebar.
- Insufficient metadata → Choose a section; never silently default unknown stories to News.
- Suggestions remain editable. RSS metadata cannot guarantee perfect classification or identify every series.
- An article needs an active category and a website author. Source authors are not assigned as your byline. Original summaries, URLs, timestamps and tags remain in the queue.
- Select **Create draft and open editor**, review/rewrite the reference text, then publish through the existing editor. Articles appear in the centre/recent articles; news appears in the right sidebar. Imports never publish automatically.
- Missing or future source dates stay visible as review flags.

## Duplicate safety and limits
Canonical source URL is unique across runs, with common tracking parameters removed. Duplicate delivery never changes an existing collected story or its draft/published content. Concurrent conversion is protected by a row lock. Different publishers covering one event remain separate references. The queue displays the latest 500 entries; imports support up to 5000 rows per run and fetch in pages. This is a review queue, not full article extraction or AI rewriting.

## Tests
`node --import tsx --test tests/collected.test.ts` covers classification, URL deduplication, SQL import/conversion behavior, publication isolation, and server integration validation. `npm run typecheck` and `npm run build` check the application.


## Publisher grouping and section drafting

After merging this update, pull main and run:
```
npm ci
node --env-file=.env.local --import tsx scripts/migrate.ts
```
Use the production database connection for the production deployment. The new `004_story_groups.sql` adds a grouping column and index; it does not remove stories or edit articles. Deploy after migrating, with Node.js 22 or newer.

The Actor now uses ESPNcricinfo RSS and Cricbuzz news-page metadata only. Rebuild the collector after merging its PR. Saved input containing BBC is intentionally ignored; lookbackHours and maxItemsPerSource still apply. The schedule and success webhook can keep their current settings. Previous BBC stories remain in the queue for reference.

Identical URLs are still ignored across all runs. Within the recent seven-day import history, closely matching dated headlines and summaries are grouped conservatively. Matching source publication times must be within 36 hours. Distinct story types and differing match numbers stay separate; opinion/analysis is never automatically grouped. Missing dates and paraphrased headlines may require manual review. This is a heuristic, not a guarantee of detecting every same-event article. All publisher records remain stored separately with their original metadata.

Each group displays every source's name, headline, link and date. Possible matches are flagged. Use **Combine source coverage** to combine unconverted stories, including older imported coverage; stories already sent to the editor cannot be manually merged. No existing editorial content is overwritten. Group conversion creates a single unpublished item with the references present at conversion time. Later references are visible in Collected stories and available to the AI drafting context, without changing your saved article. Reference lists in article/news data are capped at 30; the queue retains all source records.

For **Generate draft** on every article body section, configure these server-only Vercel variables and redeploy:
- `AI_GATEWAY_API_KEY`: your Vercel AI Gateway key.
- `AI_DRAFT_MODEL`: an available `provider/model` text model supporting structured output, selected from your Gateway model catalogue.

Generation is an authenticated same-origin POST. It uses the section's existing text, title/introduction, your notes, and stored collected summaries for the saved article. It does not fetch full articles from URLs, browse, or verify facts. For articles not created from the queue, provide facts in the section or notes. Each click makes one model request with no automatic retries, a 45-second timeout and a 1600-token output cap. Normal model usage costs apply.

Suggestions are shown separately with facts to check; use, edit or discard them. Applying a suggestion changes only that body section and clears the verification checkbox. It does not save or publish. If the section or context changed while generating, the stale suggestion cannot be applied. Generate a fresh one. Review the facts, save and publish through the usual editor workflow.

Validation: TypeScript, production build, CMS/import/drafting tests, and collector parser/workbook tests. A live Cricbuzz run in Apify and a live model call still need to be confirmed after configuration.
