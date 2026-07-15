import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method tidak didukung." }, 405);

  try {
    const url = requiredEnv("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || requiredEnv("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization") || "";

    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Login diperlukan." }, 401);

    const body = await req.json();
    const questionId = String(body.questionId || "");
    const sessionId = String(body.sessionId || "");
    const selectedIndex = Number(body.selectedIndex);
    if (!isUuid(questionId) || !isUuid(sessionId) || !Number.isInteger(selectedIndex)) {
      return json({ error: "Data jawaban tidak lengkap atau tidak valid." }, 400);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: session, error: sessionError } = await admin
      .from("game_sessions")
      .select("id,user_id,result,assignment_id,metadata")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    if (sessionError || !session) return json({ error: "Sesi permainan tidak valid." }, 403);
    if (session.result !== "abandoned") return json({ error: "Sesi sudah ditutup." }, 409);
    if (!session.assignment_id) return json({ error: "Sesi terverifikasi harus berasal dari tugas aktif." }, 403);

    const { data: assignment, error: assignmentError } = await admin
      .from("assignments")
      .select("id,question_set_id,is_active,due_at")
      .eq("id", session.assignment_id)
      .eq("is_active", true)
      .single();
    if (assignmentError || !assignment?.question_set_id) {
      return json({ error: "Tugas atau set soal tidak lagi aktif." }, 403);
    }
    if (assignment.due_at && new Date(assignment.due_at).getTime() < Date.now()) {
      return json({ error: "Tenggat tugas sudah lewat." }, 403);
    }

    const metadata = asRecord(session.metadata);
    if (metadata.questionSetId !== assignment.question_set_id) {
      return json({ error: "Set soal sesi tidak cocok dengan tugas." }, 409);
    }
    const selectedQuestionIds = Array.isArray(metadata.selectedQuestionIds)
      ? metadata.selectedQuestionIds.map(String)
      : [];
    if (selectedQuestionIds.length !== 10 || !selectedQuestionIds.includes(questionId)) {
      return json({ error: "Soal ini tidak termasuk dalam sesi yang dimulai." }, 403);
    }

    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("id,choices,question_set_id")
      .eq("id", questionId)
      .eq("question_set_id", assignment.question_set_id)
      .single();
    if (questionError || !question) return json({ error: "Soal tidak ditemukan pada set tugas." }, 404);
    if (!Array.isArray(question.choices) || selectedIndex < 0 || selectedIndex >= question.choices.length) {
      return json({ error: "Pilihan jawaban tidak valid." }, 400);
    }

    const { data: key, error: keyError } = await admin
      .from("question_keys")
      .select("correct_index,explanation")
      .eq("question_id", questionId)
      .single();
    if (keyError || !key) return json({ error: "Kunci soal belum tersedia." }, 422);

    const isCorrect = selectedIndex === key.correct_index;
    const { error: insertError } = await admin.from("question_attempts").insert({
      session_id: sessionId,
      question_id: questionId,
      selected_index: selectedIndex,
      is_correct: isCorrect
    });
    if (insertError) {
      if (insertError.code === "23505") return json({ error: "Soal ini sudah dijawab pada sesi tersebut." }, 409);
      throw insertError;
    }

    return json({ correct: isCorrect, explanation: key.explanation || "", answeredAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Terjadi kesalahan server." }, 500);
  }
});

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Environment ${name} belum tersedia.`);
  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
