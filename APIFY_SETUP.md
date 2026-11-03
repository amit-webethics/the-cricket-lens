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

Generation is an authenticated same-origin POST. It uses the section's existing text, title/introduction, fetched source text, and stored collected summaries for the saved article. Use Fetch source content in the article/news editor to retrieve accessible source text first. Generation uses that fetched reference text when supplied; it does not browse or verify facts. For articles not created from the queue, provide facts in the section or notes. Each click makes one model request with no automatic retries, a 45-second timeout and a 6000-token output cap. Normal model usage costs apply.

Regeneration updates the selected editable field directly and clears factual verification. Undo AI update restores the previous text. If the field or its context changes while generating, the stale result is discarded. These actions do not save or publish; review and save through the usual editor workflow.

Validation: TypeScript, production build, CMS/import/drafting tests, and collector parser/workbook tests. A live Cricbuzz run in Apify and a live model call still need to be confirmed after configuration.


## Fetch source content and regenerate

Article and news detail editors now have a **Source content** panel. Choose a saved source URL and select **Fetch source content**. Supported URLs are HTTPS article pages on ESPNcricinfo and Cricbuzz. Readable article text is extracted from public HTML/structured metadata, with publisher, title, URL, timestamp and section headings. Access restrictions are not bypassed. Some pages require JavaScript or omit portions of their content; extraction flags limits and completeness should be checked against the original. Images, embedded media, tables and live score widgets are not imported.

Fetching fills the editable article paragraphs or news summary directly. The original fetched material is also retained privately for AI context. Save the item to retain your changes. This feature stores references in the existing JSON content field, so no new database migration is needed. Private sourceContent is removed by public database queries, including /api/content responses.

Fetching an article fills its sections and paragraph fields using the source structure. Each body section offers **Regenerate with AI** when it already has text, or **Generate draft** when empty. News has the same control beside its summary. AI updates the current field directly using that text and the retained source evidence. Review the result and any fact checks, and use Undo if needed. Every change clears factual verification and still requires an explicit save/publish action.

Up to five source references and 200,000 text characters can be stored per item (100,000 per source). Each fetch has network time/size limits and validates hosts, redirect destinations and resolved addresses. Regeneration uses the existing AI_GATEWAY_API_KEY and AI_DRAFT_MODEL settings; fetched material is sent to the configured model when generating. No Actor rebuild or additional credentials are required for this editor update.

Validation includes extraction fixtures, redirects/URL restrictions, private-reference persistence/public exclusion, article/news generation payloads, the news character limit, TypeScript and production build. The browser binary could not be installed in the workspace; authenticated browser interaction and live publisher/model calls must be checked on the deployed site.


## Direct editing workflow

Fetch content now places the accessible source text directly into article paragraph fields, preserving source section headings, or into the news summary. The extra instructions, fetched-text and suggestion textareas are removed. Original references remain stored privately as AI context. Fetch replaces the current editable body; Undo fetch restores the previous text until you edit it again. Nothing is saved or published automatically.

Regenerate with AI works directly on the text in the selected field. A successful rewrite replaces that field immediately and clears verification. Undo AI update restores the previous text. If you change the text while a request is running, the older response is discarded. Failed fetches or model calls leave the current text in place. Checks from the model are shown in a collapsed list without another editing area.

News drafts can temporarily hold the full fetched text up to 100,000 characters. Published summaries are still limited to 1,200 characters. Regenerate produces a summary within that limit. Save and verify only when you are ready to publish. Article regeneration accepts up to 100,000 characters in the selected section. The model output-token ceiling is now 6,000 to allow structured responses from reasoning models; automatic retries remain disabled. Gateway failures now distinguish access, credit/budget, rate-limit, model configuration and incomplete-output errors where the SDK provides that information.

This update requires a merge and redeploy, with the existing AI Gateway settings. No migration or Actor rebuild is needed. DOM interaction tests cover direct article/news updates, undo, concurrent edits and error preservation with mocked network responses. Live Gateway credentials and production interactions still need confirmation in the deployed environment.


## News summary, details and Gateway access

News now has two editable fields: a homepage sidebar summary (aim for around 200 words, maximum 250 when publishing) and full details for `/news/<slug>/`. Each has its own AI regeneration action. Fetch content fills the full details, preserving the independently edited summary. Existing news without details continues to display its saved summary on the detail page, and the editor preloads that older text as details when opened. The homepage links headlines and Read full story to the news detail page; full detail text is not passed to the homepage client component.

Required markers are inline with labels throughout the admin. Source names, URLs and team fields are arranged in a compact responsive row. The source-fetch selector and action also use a compact layout.

Gateway authentication accepts a normalized AI_GATEWAY_API_KEY or, if no key is configured, the deployment's existing VERCEL_OIDC_TOKEN through the SDK. AI_DRAFT_MODEL is still required. The app does not create credentials, switch away from an explicitly configured invalid key, or change Vercel account settings. Provider OpenAI keys (`sk-...`) are identified as the wrong credential type for the Gateway variable. Failure messages distinguish invalid credentials, denied team/model access, account verification, credits, throttling and incomplete output. Credential values are not logged.

For persistent access errors, create a key in Vercel AI Gateway under the team owning this website, save it as AI_GATEWAY_API_KEY for Production and redeploy. AI_DRAFT_MODEL must be a model ID available to that account. A customer_verification_required error needs the verification/payment-method step in the Gateway dashboard. Alternatively, remove an obsolete explicit key to use authorized deployment identity when Gateway is enabled for that team. Deployment environment/log access was denied to this workspace, so current production credentials could not be verified and no live regeneration was performed.

This update uses the existing JSON content field and needs no database migration. Merge and deploy. The Actor and schedule are unchanged.
