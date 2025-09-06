/* eslint-env node */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

function clientAsService() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

export async function handler(event) {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return respond(200, { ok: true });
    }
    const supabase = clientAsService();

    // Verify caller is an admin by checking their JWT via getUser and profiles
    // Netlify will forward the cookie/Authorization header; we expect a Supabase user session JWT
    const authHeader =
      event.headers["authorization"] || event.headers["Authorization"];
    if (!authHeader) return unauthorized("Missing Authorization header");

    const jwt = authHeader.replace("Bearer ", "").trim();
    const { data: authed } = await supabase.auth.getUser(jwt);
    const user = authed?.user;
    if (!user?.id) return unauthorized("Invalid token");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin")
      return unauthorized("Not admin");

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { email, password, username, role = "user" } = body;
      if (!email || !password || !username) return badRequest("Missing fields");

      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
      if (createErr) return respond(400, { error: createErr.message });

      const uid = created.user.id;
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert({ id: uid, username, role });
      if (upsertErr) return respond(400, { error: upsertErr.message });

      return respond(200, { id: uid, email, username, role });
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { id } = body;
      if (!id) return badRequest("Missing id");

      await supabase.from("profiles").delete().eq("id", id);
      const { error: delErr } = await supabase.auth.admin.deleteUser(id);
      if (delErr) return respond(400, { error: delErr.message });
      return respond(200, { success: true });
    }

    return respond(405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return respond(500, { error: "Internal error" });
  }
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function badRequest(message) {
  return respond(400, { error: message });
}
function unauthorized(message) {
  return respond(401, { error: message });
}
