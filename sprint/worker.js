import roadmap from "./public/index.html";
import allaRoadmap from "./public/alla-soldatova.html";
import mariaRoadmap from "./public/maria-surovtseva.html";
import groupOffer from "./public/gruppa.html";
import individualOffer from "./public/soprovozhdenie.html";
import stylesheet from "./public/styles.css";
import favicon from "./public/favicon.ico";
import allaPhoto from "./public/alla-soldatova.webp";
import mariaPhoto from "./public/maria-surovtseva.webp";
import fontStylesheet from "./public/fonts/fonts.css";
import golosLicense from "./public/fonts/golos-text-OFL.txt";
import golosCyrillicExtended from "./public/fonts/golos-text-cyrillic-ext-wght-normal.woff2";
import golosCyrillic from "./public/fonts/golos-text-cyrillic-wght-normal.woff2";
import golosLatinExtended from "./public/fonts/golos-text-latin-ext-wght-normal.woff2";
import golosLatin from "./public/fonts/golos-text-latin-wght-normal.woff2";
import unboundedLicense from "./public/fonts/unbounded-OFL.txt";
import unboundedCyrillicExtended from "./public/fonts/unbounded-cyrillic-ext-wght-normal.woff2";
import unboundedCyrillic from "./public/fonts/unbounded-cyrillic-wght-normal.woff2";
import unboundedLatinExtended from "./public/fonts/unbounded-latin-ext-wght-normal.woff2";
import unboundedLatin from "./public/fonts/unbounded-latin-wght-normal.woff2";
import unboundedVietnamese from "./public/fonts/unbounded-vietnamese-wght-normal.woff2";

const html = "text/html; charset=utf-8";
const css = "text/css; charset=utf-8";
const text = "text/plain; charset=utf-8";
const font = "font/woff2";

const assets = new Map([
  ["/", [roadmap, html]],
  ["/alla-soldatova", [allaRoadmap, html]],
  ["/maria-surovtseva", [mariaRoadmap, html]],
  ["/gruppa", [groupOffer, html]],
  ["/soprovozhdenie", [individualOffer, html]],
  ["/styles.css", [stylesheet, css]],
  ["/favicon.ico", [favicon, "image/x-icon"]],
  ["/alla-soldatova.webp", [allaPhoto, "image/webp"]],
  ["/maria-surovtseva.webp", [mariaPhoto, "image/webp"]],
  ["/fonts/fonts.css", [fontStylesheet, css]],
  ["/fonts/golos-text-OFL.txt", [golosLicense, text]],
  ["/fonts/golos-text-cyrillic-ext-wght-normal.woff2", [golosCyrillicExtended, font]],
  ["/fonts/golos-text-cyrillic-wght-normal.woff2", [golosCyrillic, font]],
  ["/fonts/golos-text-latin-ext-wght-normal.woff2", [golosLatinExtended, font]],
  ["/fonts/golos-text-latin-wght-normal.woff2", [golosLatin, font]],
  ["/fonts/unbounded-OFL.txt", [unboundedLicense, text]],
  ["/fonts/unbounded-cyrillic-ext-wght-normal.woff2", [unboundedCyrillicExtended, font]],
  ["/fonts/unbounded-cyrillic-wght-normal.woff2", [unboundedCyrillic, font]],
  ["/fonts/unbounded-latin-ext-wght-normal.woff2", [unboundedLatinExtended, font]],
  ["/fonts/unbounded-latin-wght-normal.woff2", [unboundedLatin, font]],
  ["/fonts/unbounded-vietnamese-wght-normal.woff2", [unboundedVietnamese, font]],
]);

export default {
  fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const canonicalPath = path === "/index.html" ? "/" : path.replace(/(?:\.html|\/)$/, "");
    const asset = assets.get(path) ?? assets.get(canonicalPath);
    if (!asset) return new Response(null, { status: 404 });

    if (!assets.has(path)) {
      url.pathname = canonicalPath;
      return Response.redirect(url, 307);
    }

    const [body, contentType] = asset;
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Cache-Control": contentType === html ? "no-cache" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
