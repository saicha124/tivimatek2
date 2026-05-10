import { Router, type IRouter } from "express";

const router: IRouter = Router();

function buildStalkerUrl(portal: string, params: Record<string, string>): string {
  const base = portal.replace(/\/+$/, "");
  const qs = new URLSearchParams({ ...params, JsHttpRequest: "1-xml" });
  return `${base}/server/load.php?${qs}`;
}

function stalkerHeaders(mac: string, token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Cookie: `mac=${mac}; stb_lang=en; timezone=America%2FNew_York`,
    "X-User-Agent": "Model: MAG250; Link: WiFi",
    "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C)",
    Accept: "application/json",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

router.get("/stalker/proxy", async (req, res) => {
  const { portal, mac, token, ...rest } = req.query as Record<string, string>;

  if (!portal || !mac) {
    res.status(400).json({ error: "portal and mac are required" });
    return;
  }

  const url = buildStalkerUrl(portal, rest);

  const response = await fetch(url, {
    headers: stalkerHeaders(mac, token),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    res.status(response.status).json({ error: `Portal returned ${response.status}` });
    return;
  }

  const text = await response.text();
  if (!text.trim()) {
    res.json({ js: null });
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    res.json({ js: null, _raw: text.slice(0, 200) });
    return;
  }
  res.json(data);
});

export default router;
