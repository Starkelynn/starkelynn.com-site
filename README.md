# starkelynn.com-site

Marketing site for Lynn Starke, built with Jekyll on top of Minimal Mistakes.

## Local development

Run the site with Docker:

```bash
docker compose up
```

The site is available at [http://127.0.0.1:4000](http://127.0.0.1:4000).

## Notes

- Production assets belong in `assets/`.
- Source briefing material lives in `/briefing`, is gitignored, and is excluded from the built site.
- The Docker container watches the repo and rebuilds automatically on file changes.
