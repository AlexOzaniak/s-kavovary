const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function readPort(value) {
  const port = Number.parseInt(value ?? "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port number.");
  }
  return port;
}

function readPublicSiteUrl(value, required) {
  if (!value) {
    if (required) throw new Error("PUBLIC_SITE_URL must be set in production.");
    return "";
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PUBLIC_SITE_URL must be an absolute URL, e.g. https://www.example.sk.");
  }

  if (url.protocol !== "https:") {
    throw new Error("PUBLIC_SITE_URL must use HTTPS in production.");
  }

  return url.origin;
}

const nodeEnv = process.env.NODE_ENV || "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production.");
}

const config = {
  port: readPort(process.env.PORT),
  nodeEnv,
  publicSiteUrl: readPublicSiteUrl(process.env.PUBLIC_SITE_URL, nodeEnv === "production"),
  trustProxy: nodeEnv === "production" ? 1 : false,
};

module.exports = config;