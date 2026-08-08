const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const config = require("./config/config");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");
const indexTemplate = fs.readFileSync(path.join(frontendPath, "index.html"), "utf8");
const sitemapTemplate = fs.readFileSync(path.join(frontendPath, "sitemap.xml"), "utf8");
const robotsTemplate = fs.readFileSync(path.join(frontendPath, "robots.txt"), "utf8");

function renderTemplate(template) {
  return template.replaceAll("__PUBLIC_SITE_URL__", config.publicSiteUrl);
}

function sendHtml(res, body) {
  res.set("Cache-Control", "no-cache, must-revalidate");
  res.type("html").send(body);
}

app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "base-uri": ["'self'"],
        "frame-ancestors": ["'self'"],
        "frame-src": ["'self'", "https://www.google.com", "https://maps.google.com"],
        "img-src": ["'self'", "data:"],
        "object-src": ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

app.use(compression());
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ status: "ok", service: "s-kavovary" });
});

app.get("/", (req, res) => sendHtml(res, renderTemplate(indexTemplate)));
app.get("/sitemap.xml", (req, res) => {
  res.set("Cache-Control", "no-cache, must-revalidate");
  res.type("application/xml").send(renderTemplate(sitemapTemplate));
});
app.get("/robots.txt", (req, res) => {
  res.set("Cache-Control", "no-cache, must-revalidate");
  res.type("text").send(renderTemplate(robotsTemplate));
});

app.use(
  express.static(frontendPath, {
    index: false,
    etag: true,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.set("Cache-Control", "no-cache, must-revalidate");
      }
    },
  })
);

app.use((req, res) => {
  if (req.accepts("html")) {
    return res.status(404).sendFile(path.join(frontendPath, "404.html"), (error) => {
      if (error) res.status(404).type("text").send("Stránka nebola nájdená.");
    });
  }

  return res.status(404).json({ success: false, message: "Nenájdené." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: "Nastala chyba na serveri." });
});

const server = app.listen(config.port, () => {
  console.log(`S-kávovary beží na porte ${config.port} (${config.nodeEnv})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  server.close((error) => {
    if (error) {
      console.error("Server shutdown failed:", error);
      process.exit(1);
    }
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));