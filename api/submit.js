const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://heydoofus.github.io";
const apiBaseUrl = process.env.INFOBIP_BASE_URL || "https://3xkgm.api.infobip.com";
const formId = process.env.INFOBIP_FORM_ID;
const rawAppKey = process.env.INFOBIP_APP_KEY;
const submissionSource = process.env.IB_SUBMISSION_SOURCE || "";
const submissionCampaign = process.env.IB_SUBMISSION_FORM_CAMPAIGN || "";

const requiredEnv = { INFOBIP_FORM_ID: formId, INFOBIP_APP_KEY: rawAppKey };

const appKey = rawAppKey && rawAppKey.startsWith("App ")
  ? rawAppKey.slice(4)
  : rawAppKey;

function envIsMissing() {
  return Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const missing = envIsMissing();
  if (missing.length > 0) {
    return res.status(500).json({
      error: "Server misconfiguration",
      detail: `Missing environment variables: ${missing.join(", ")}`
    });
  }

  try {
    const infobipResponse = await fetch(
      `${apiBaseUrl}/forms/1/forms/${formId}/data`,
      {
        method: "POST",
        headers: {
          Authorization: `App ${appKey}`,
          "Content-Type": "application/json",
          ...(submissionSource ? { "ib-submission-source": submissionSource } : {}),
          ...(submissionCampaign ? { "ib-submission-form-campaign": submissionCampaign } : {})
        },
        body: JSON.stringify(req.body || {})
      }
    );

    if (!infobipResponse.ok) {
      const detail = await infobipResponse.text();
      return res.status(infobipResponse.status).json({
        error: "Infobip request failed",
        detail
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Proxy error", detail: error.message });
  }
}
