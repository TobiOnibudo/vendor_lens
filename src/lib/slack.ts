import crypto from "crypto";

const SLACK_API = "https://slack.com/api";
const SIGNATURE_MAX_AGE_SEC = 60 * 5;

type SlackApiResponse = { ok: boolean; error?: string };

function getBotToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN;
}

function getSigningSecret(): string | undefined {
  return process.env.SLACK_SIGNING_SECRET;
}

export function isSlackConfigured(): boolean {
  return Boolean(getBotToken());
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:5173"
  );
}

async function slackFetch<T extends SlackApiResponse>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = getBotToken();
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T;
  if (!data.ok) {
    throw new Error(data.error || `Slack API ${method} failed`);
  }
  return data;
}

async function slackGet<T extends SlackApiResponse>(
  method: string,
  params: Record<string, string>
): Promise<T> {
  const token = getBotToken();
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${SLACK_API}/${method}?${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as T;
  return data;
}

function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }
  return normalized;
}

/** Fallback when lookupByEmail is blocked or email differs slightly in Slack. */
async function findUserIdByEmailViaList(email: string): Promise<string | null> {
  const token = getBotToken();
  if (!token) return null;

  let cursor: string | undefined;
  do {
    const params: Record<string, string> = { limit: "200" };
    if (cursor) params.cursor = cursor;

    const data = await slackGet<{
      ok: boolean;
      error?: string;
      members?: Array<{
        id: string;
        deleted?: boolean;
        is_bot?: boolean;
        profile?: { email?: string };
      }>;
      response_metadata?: { next_cursor?: string };
    }>("users.list", params);

    if (!data.ok) {
      console.warn("[slack] users.list failed:", data.error);
      return null;
    }

    for (const member of data.members ?? []) {
      if (member.deleted || member.is_bot) continue;
      const memberEmail = member.profile?.email?.trim().toLowerCase();
      if (memberEmail === email) {
        return member.id;
      }
    }

    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return null;
}

export async function lookupUserByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    console.warn("[slack] Invalid email for lookup:", email);
    return null;
  }

  try {
    // Slack documents this method as GET; POST + JSON often returns invalid_arguments.
    const data = await slackGet<{
      ok: boolean;
      error?: string;
      user?: { id: string };
    }>("users.lookupByEmail", { email: normalized });

    if (data.ok && data.user?.id) {
      return data.user.id;
    }

    if (data.error === "users_not_found") {
      console.warn(
        "[slack] No workspace member with email (lookupByEmail):",
        normalized
      );
    } else if (data.error) {
      console.warn(
        "[slack] users.lookupByEmail error:",
        normalized,
        data.error
      );
    }
  } catch (err) {
    console.warn("[slack] users.lookupByEmail request failed:", normalized, err);
  }

  const viaList = await findUserIdByEmailViaList(normalized);
  if (viaList) {
    return viaList;
  }

  console.warn("[slack] No Slack user found for email:", normalized);
  return null;
}

export async function getUserEmail(slackUserId: string): Promise<string | null> {
  try {
    const data = await slackFetch<{
      ok: boolean;
      user: { profile?: { email?: string } };
    }>("users.info", { user: slackUserId });
    return data.user.profile?.email ?? null;
  } catch (err) {
    console.warn("[slack] users.info failed:", slackUserId, err);
    return null;
  }
}

export async function openDm(slackUserId: string): Promise<string> {
  const data = await slackFetch<{ ok: boolean; channel: { id: string } }>(
    "conversations.open",
    { users: slackUserId }
  );
  return data.channel.id;
}

export type AccessRequestDmParams = {
  requestId: string;
  requesterName: string;
  vendorName: string;
  reason?: string | null;
  approverEmail: string;
};

type Block = Record<string, unknown>;

export function buildAccessRequestBlocks(params: {
  requestId: string;
  requesterName: string;
  vendorName: string;
  reason?: string | null;
  appUrl: string;
  resolved?: { status: "approved" | "denied"; actorLabel: string };
}): Block[] {
  const {
    requestId,
    requesterName,
    vendorName,
    reason,
    appUrl,
    resolved,
  } = params;

  const reasonLine = reason?.trim()
    ? `\n*Reason:* ${reason.trim()}`
    : "";

  if (resolved) {
    const label =
      resolved.status === "approved" ? "Approved" : "Denied";
    const emoji = resolved.status === "approved" ? ":white_check_mark:" : ":x:";
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *Access request ${label.toLowerCase()}*\n*Vendor:* ${vendorName}\n*Requester:* ${requesterName}${reasonLine}\n*By:* ${resolved.actorLabel}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open VendorLens" },
            url: `${appUrl}/access`,
          },
        ],
      },
    ];
  }

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Access request needs approval",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${requesterName}* requested access to *${vendorName}*.${reasonLine}`,
      },
    },
    {
      type: "actions",
      block_id: `access_request_${requestId}`,
      elements: [
        {
          type: "button",
          action_id: "access_approve",
          text: { type: "plain_text", text: "Approve" },
          style: "primary",
          value: requestId,
        },
        {
          type: "button",
          action_id: "access_deny",
          text: { type: "plain_text", text: "Deny" },
          style: "danger",
          value: requestId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Open VendorLens" },
          url: `${appUrl}/access`,
        },
      ],
    },
  ];
}

export async function notifyApproverOfAccessRequest(
  params: AccessRequestDmParams
): Promise<void> {
  const { requestId, requesterName, vendorName, reason, approverEmail } =
    params;

  const slackUserId = await lookupUserByEmail(approverEmail);
  if (!slackUserId) {
    return;
  }

  const channelId = await openDm(slackUserId);
  const appUrl = getAppUrl();
  const blocks = buildAccessRequestBlocks({
    requestId,
    requesterName,
    vendorName,
    reason,
    appUrl,
  });

  await slackFetch("chat.postMessage", {
    channel: channelId,
    text: `Access request: ${requesterName} requested access to ${vendorName}`,
    blocks,
  });
}

export function verifySlackSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const secret = getSigningSecret();
  if (!secret || !timestamp || !signature) {
    return false;
  }

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - ts);
  if (age > SIGNATURE_MAX_AGE_SEC) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hmac}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function postToResponseUrl(
  responseUrl: string,
  payload: {
    replace_original?: boolean;
    text?: string;
    blocks?: Block[];
    response_type?: "ephemeral" | "in_channel";
  }
): Promise<void> {
  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[slack] response_url failed:", res.status, body);
  }
}

export type SlackBlockActionPayload = {
  type: string;
  user: { id: string; name?: string; username?: string };
  response_url: string;
  actions: Array<{
    action_id: string;
    value: string;
  }>;
  message?: {
    blocks?: Block[];
    text?: string;
  };
};

export function parseSlackPayload(rawBody: string): SlackBlockActionPayload {
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    throw new Error("Missing payload in Slack request");
  }
  return JSON.parse(payloadStr) as SlackBlockActionPayload;
}
