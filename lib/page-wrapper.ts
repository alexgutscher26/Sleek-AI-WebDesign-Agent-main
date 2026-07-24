import { BASE_VARIABLES, FONT_VARIABLES } from "./prompt";
import { sanitizeGeneratedHtml } from "./html-guardrails";

const escapeHtml = (value: string) => (
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
);

const escapeJsString = (value: string) => (
  value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/</g, "\\x3C")
    .replace(/>/g, "\\x3E")
);

const sanitizeRootStyles = (value: string) => (
  value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => declaration.match(/^--([a-zA-Z0-9_-]+)\s*:\s*(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map(([, token, rawValue]) => ({
      token,
      value: (rawValue ?? "").trim()
    }))
    .filter(({ value }) => (
      !/[<>{}`]/.test(value)
      && !/@import/i.test(value)
      && !/expression\s*\(/i.test(value)
      && !/javascript:/i.test(value)
      && !/url\s*\(\s*['"]?\s*javascript:/i.test(value)
    ))
    .map(({ token, value: styleValue }) => `--${token}: ${styleValue}`)
    .join("; ")
);

export function getHTMLWrapper(
  htmlContent: string,
  name = "Untitled",
  rootStyles: string,
  pageId: string
) {
  const { html: safeHtml } = sanitizeGeneratedHtml(htmlContent)
  const safeName = escapeHtml(name)
  const safePageId = escapeJsString(pageId)
  const safeRootStyles = sanitizeRootStyles(rootStyles)

  const sanitizedHtml = safeHtml
    // Remove h-screen, min-h-screen, h-full from root div specifically
    .replace(
      /<div([^>]*)class="([^"]*)\b(h-screen|min-h-screen|h-full)\b([^"]*)"([^>]*)>/i,
      '<div$1class="$2$4"$5>'
    )
    // Remove min-h-screen from all sections (they should grow naturally)
    .replace(
      /<section([^>]*)class="([^"]*)\bmin-h-screen\b([^"]*)"([^>]*)>/gi,
      '<section$1class="$2$3"$4>'
    );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${safeName}</title>

  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>

  <style type="text/tailwindcss">
    :root {${safeRootStyles}${safeRootStyles ? ";" : ""}${FONT_VARIABLES}${BASE_VARIABLES}}
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {width:100%;min-height:100%;}
    body {font-family:var(--font-sans);background:var(--background);color:var(--foreground);line-height:1.45;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
    #root {width:100%;min-height:100vh;}
    #content {width:100%;min-height:100vh;}
    a {color:inherit;text-decoration:none;}
    button, input, textarea, select {font:inherit;color:inherit;}
    img, svg, video, canvas {display:block;max-width:100%;}
    * {scrollbar-width:none;-ms-overflow-style:none;}
    *::-webkit-scrollbar {display:none;}

  </style>
</head>
<body>
  <div id="root">
    <div id="content" class="relative">
      ${sanitizedHtml}
    </div>
  </div>

  <script>
    (()=>{
      const pageId='${safePageId}';
      const send=()=>{
        const r=document.getElementById('root')?.firstElementChild;
        const h=r?.className.match(/h-(screen|full)|min-h-screen/)?Math.max(900,innerHeight):Math.max(r?.scrollHeight||0,document.body.scrollHeight,900);
        parent.postMessage({type:'FRAME_HEIGHT',pageId:pageId,height:h},'*');
      };
      setTimeout(send,100);
      setTimeout(send,500);
    })();
  </script>
</body>
</html>`;
}
