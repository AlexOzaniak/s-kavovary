const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const config = require("./config/config");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

// Behind a proxy (Heroku / AWS / Nginx) express should trust the proxy
if (config.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["*"],
      },
    },
  })
);
app.use(compression());
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
app.use(
  cors({
    origin: config.corsOrigin,
  })
);
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "s-kavovary-backend" });
});

app.use("/api", bookingRoutes);

// Serve frontend static assets when deployed together
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath, { maxAge: config.nodeEnv === "production" ? "30d" : 0 }));

// Fallback to frontend index for non-API routes (useful when serving SPA)
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Nenájdené." });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Nastala chyba na serveri." });
});

app.listen(config.port, () => {
  console.log(`S-kávovary backend beží na porte ${config.port} (${config.nodeEnv})`);
});
