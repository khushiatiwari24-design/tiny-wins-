import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "npm:resend@4.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!request.headers.get("Authorization")) return json({ error: "Authentication required" }, 401);

  try {
    const body = await request.json() as { invitee_email?: unknown; group_name?: unknown; invite_link?: unknown };
    const inviteeEmail = typeof body.invitee_email === "string" ? body.invitee_email.trim() : "";
    const groupName = typeof body.group_name === "string" ? body.group_name.trim() : "";
    const inviteLink = typeof body.invite_link === "string" ? body.invite_link.trim() : "";
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!inviteeEmail || !groupName || !isValidHttpUrl(inviteLink)) return json({ error: "invitee_email, group_name, and a valid invite_link are required" }, 400);
    if (!resendApiKey || !fromEmail) return json({ error: "Email delivery is not configured" }, 500);

    const resend = new Resend(resendApiKey);
    const safeGroupName = escapeHtml(groupName);
    const safeInviteLink = escapeHtml(inviteLink);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: inviteeEmail,
      subject: `You're invited to join ${groupName} on Tiny Wins`,
      html: `<!doctype html><html><body style="margin:0;background:#09090b;color:#f4f4f5;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:40px 24px"><div style="border:1px solid #27272a;border-radius:16px;background:#18181b;padding:32px"><p style="margin:0;color:#fdba74;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tiny Wins</p><h1 style="margin:16px 0 8px;font-size:28px">You have a streak group invitation</h1><p style="color:#a1a1aa;font-size:16px;line-height:1.6">You have been invited to join <strong style="color:#fff">${safeGroupName}</strong>. Keep your daily momentum going together.</p><a href="${safeInviteLink}" style="display:inline-block;margin-top:16px;border-radius:10px;background:#c4b5fd;color:#18181b;padding:13px 20px;font-weight:700;text-decoration:none">Accept Invite</a><p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.5">If you were not expecting this invitation, you can safely ignore this email.</p></div></main></body></html>`,
    });

    if (error) return json({ error: error.message || "Unable to send invitation email" }, 502);
    return json({ sent: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to send invitation email" }, 500);
  }
});
