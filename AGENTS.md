<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep simulation state in memory only; this planning tool does not persist financial inputs or require accounts.
- Use the shared cents-integer simulation module for generation, editing and verification so displayed and exported figures agree.
- Generate PDF files in the browser with jsPDF and AutoTable, including repeated A4 simulation headers and footers; never reuse bank reference pages.
- Use the centralized Fluxa semantic stylesheet tokens for all screen styling and the document palette for PDF rendering.
- Share statement-only date and amount formatters between the screen statement and PDF so the reference-style presentation never changes simulation calculations.
- Keep business-niche activity catalogs in one browser-safe module used by the selector and simulation generator; niche selection changes transaction context, not financial targets or calculations.
- Render statement previews on a fixed A4-proportioned canvas with horizontal scrolling on narrow screens; keep matching PDF geometry so screen width never reflows the document layout.
- Gateway statements (src/lib/gateway.ts) always carry the fixed non-real demonstration watermark on screen and every PDF page; never make it optional, because the output must not pass as a real document.
