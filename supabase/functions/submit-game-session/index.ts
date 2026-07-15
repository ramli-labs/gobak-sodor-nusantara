import { createClient } from "npm:@supabase/supabase-js@2";

const VERIFIED_QUESTION_COUNT = 10;
const VERIFIED_TIME_LIMIT_SECONDS = 180;
const VERIFIED_WIN_MIN_CORRECT = 8;
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
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Login diperlukan." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json();
    const action = String(body.action || "quick");

    if (action === "start") return await startSession(admin, user.id, body);
    if (action === "complete") return await completeSession(admin, user.id, body);
    if (action === "quick") return await quickSession(admin, user.id, body);
    return json({ error: "Action tidak dikenal." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Terjadi kesalahan server." }, 500);
  }
});

async function getGame(admin: any, slug: string) {
  const { data, error } = await admin.from("games")
    .select("id,slug,title,max_score,status")
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  if (error || !data) throw new Error("Game tidak ditemukan atau tidak aktif.");
  return data;
}

async function resolveAssignment(admin: any, userId: string, assignmentId?: string) {
  if (!assignmentId) return { assignmentId: null, classId: null, gameId: null, questionSetId: null };
  if (!isUuid(String(assignmentId))) throw new Error("ID tugas tidak valid.");

  const { data: assignment, error } = await admin.from("assignments")
    .select("id,class_id,game_id,question_set_id,is_active,due_at")
    .eq("id", assignmentId)
    .eq("is_active", true)
    .single();
  if (error || !assignment) throw new Error("Tugas tidak ditemukan atau tidak aktif.");
  if (assignment.due_at && new Date(assignment.due_at).getTime() < Date.now()) throw new Error("Tenggat tugas sudah lewat.");

  const { data: membership } = await admin.from("class_members")
    .select("class_id")
    .eq("class_id", assignment.class_id)
    .eq("student_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) throw new Error("Anda bukan anggota kelas tugas ini.");

  return {
    assignmentId: assignment.id,
    classId: assignment.class_id,
    gameId: assignment.game_id,
    questionSetId: assignment.question_set_id
  };
}

async function startSession(admin: any, userId: string, body: any) {
  const game = await getGame(admin, String(body.gameSlug || ""));
  const assignment = await resolveAssignment(admin, userId, body.assignmentId);
  if (!assignment.assignmentId) return json({ error: "Sesi terverifikasi harus berasal dari tugas kelas." }, 400);
  if (assignment.gameId !== game.id) return json({ error: "Game tidak sesuai dengan tugas." }, 400);
  if (game.slug !== "jelajah-nusantara") return json({ error: "Alur sesi terverifikasi ini hanya tersedia untuk Jelajah Nusantara." }, 400);
  if (!assignment.questionSetId) return json({ error: "Tugas belum memiliki set soal." }, 422);

  const { data: completed } = await admin.from("game_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("assignment_id", assignment.assignmentId)
    .eq("verified", true)
    .limit(1)
    .maybeSingle();
  if (completed) return json({ error: "Tugas ini sudah pernah diselesaikan dan diverifikasi." }, 409);

  const { data: questionRows, error: questionsError } = await admin.from("questions")
    .select("id,category,prompt,choices,order_index")
    .eq("question_set_id", assignment.questionSetId)
    .order("order_index", { ascending: true })
    .limit(500);
  if (questionsError) throw questionsError;
  if (!Array.isArray(questionRows) || questionRows.length < VERIFIED_QUESTION_COUNT) {
    return json({ error: `Set tugas harus memiliki minimal ${VERIFIED_QUESTION_COUNT} soal.` }, 422);
  }

  // Pemilihan soal dilakukan server agar siswa tidak dapat memilih sendiri soal termudah.
  const selected = secureShuffle(questionRows).slice(0, VERIFIED_QUESTION_COUNT);
  const selectedQuestionIds = selected.map((item: any) => String(item.id));

  // Hanya satu sesi terbuka per siswa/tugas. Attempt lama ikut terhapus melalui ON DELETE CASCADE.
  const { error: deleteError } = await admin.from("game_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("assignment_id", assignment.assignmentId)
    .eq("result", "abandoned");
  if (deleteError) throw deleteError;

  const startedAt = new Date().toISOString();
  const { data, error } = await admin.from("game_sessions").insert({
    user_id: userId,
    game_id: game.id,
    class_id: assignment.classId,
    assignment_id: assignment.assignmentId,
    score: 0,
    accuracy: 0,
    result: "abandoned",
    mode: "Solo",
    difficulty: "Normal",
    level_id: "nusantara",
    duration_seconds: 0,
    correct_count: 0,
    question_count: 0,
    verified: false,
    started_at: startedAt,
    completed_at: startedAt,
    metadata: {
      gameVersion: String(body?.metadata?.gameVersion || "").slice(0, 30),
      questionSetId: assignment.questionSetId,
      selectedQuestionIds,
      expectedQuestionCount: VERIFIED_QUESTION_COUNT,
      scoring: "pending-server-v2"
    }
  }).select("id,started_at").single();
  if (error) throw error;

  return json({
    sessionId: data.id,
    startedAt: data.started_at,
    verified: false,
    expectedQuestionCount: VERIFIED_QUESTION_COUNT,
    questions: selected.map((item: any) => ({
      id: item.id,
      category: item.category,
      prompt: item.prompt,
      choices: item.choices,
      orderIndex: item.order_index
    }))
  });
}

async function completeSession(admin: any, userId: string, body: any) {
  const sessionId = String(body.sessionId || "");
  if (!isUuid(sessionId)) return json({ error: "ID sesi tidak valid." }, 400);

  const { data: session, error } = await admin.from("game_sessions")
    .select("id,user_id,game_id,result,assignment_id,metadata,started_at,score,accuracy,verified,duration_seconds,completed_at,games(max_score,slug)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error || !session) return json({ error: "Sesi tidak ditemukan." }, 404);
  if (session.result !== "abandoned") {
    if (session.verified) {
      const { data: rewards } = await admin.rpc("award_session_rewards", { p_session_id: sessionId });
      return json({ id: session.id, score: session.score, accuracy: session.accuracy, verified: true, result: session.result, duration_seconds: session.duration_seconds, completed_at: session.completed_at, alreadyCompleted: true, rewards: rewards || null });
    }
    return json({ error: "Sesi sudah ditutup." }, 409);
  }
  if (!session.assignment_id) return json({ error: "Sesi ini bukan sesi tugas terverifikasi." }, 403);

  const { data: activeAssignment, error: assignmentError } = await admin.from("assignments")
    .select("id,is_active,due_at")
    .eq("id", session.assignment_id)
    .eq("is_active", true)
    .single();
  if (assignmentError || !activeAssignment) return json({ error: "Tugas tidak lagi aktif." }, 403);
  if (activeAssignment.due_at && new Date(activeAssignment.due_at).getTime() < Date.now()) {
    return json({ error: "Tenggat tugas sudah lewat." }, 403);
  }

  const metadata = asRecord(session.metadata);
  const expected = Number(metadata.expectedQuestionCount || 0);
  const expectedIds = Array.isArray(metadata.selectedQuestionIds) ? metadata.selectedQuestionIds.map(String) : [];
  if (expected !== VERIFIED_QUESTION_COUNT || expectedIds.length !== VERIFIED_QUESTION_COUNT) {
    return json({ error: "Metadata sesi tidak lengkap." }, 409);
  }

  const { data: attempts, error: attemptError } = await admin.from("question_attempts")
    .select("question_id,is_correct")
    .eq("session_id", sessionId);
  if (attemptError) throw attemptError;
  const answeredIds = new Set((attempts || []).map((item: any) => String(item.question_id)));
  if (attempts.length !== expected || expectedIds.some(id => !answeredIds.has(id))) {
    return json({ error: `Selesaikan seluruh ${expected} soal sebelum menutup sesi.` }, 422);
  }

  const correct = attempts.filter((item: any) => item.is_correct).length;
  const accuracy = Math.round((correct / expected) * 10000) / 100;
  const startedMs = new Date(session.started_at).getTime();
  const duration = Math.round(clampNumber((Date.now() - startedMs) / 1000, 0, 7200));
  const score = Math.min(
    Number(session.games.max_score) || 20000,
    Math.max(0, correct * 1000 + Math.max(0, VERIFIED_TIME_LIMIT_SECONDS - duration) * 5)
  );
  const result = correct >= VERIFIED_WIN_MIN_CORRECT && duration <= VERIFIED_TIME_LIMIT_SECONDS ? "won" : "lost";
  const completedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await admin.from("game_sessions").update({
    score,
    accuracy,
    result,
    duration_seconds: duration,
    correct_count: correct,
    question_count: expected,
    verified: true,
    metadata: {
      ...metadata,
      clientVersion: String(body?.metadata?.gameVersion || "").slice(0, 30),
      scoring: "server-v2",
      timeLimitSeconds: VERIFIED_TIME_LIMIT_SECONDS,
      winMinCorrect: VERIFIED_WIN_MIN_CORRECT
    },
    completed_at: completedAt
  }).eq("id", sessionId).eq("result", "abandoned").select("id,score,accuracy,verified,result,duration_seconds,completed_at").maybeSingle();

  if (updateError) {
    if (updateError.code === "23505") return json({ error: "Tugas ini sudah memiliki hasil terverifikasi." }, 409);
    throw updateError;
  }
  if (!updated) return json({ error: "Sesi telah ditutup oleh permintaan lain." }, 409);

  const { data: rewards, error: rewardError } = await admin.rpc("award_session_rewards", { p_session_id: sessionId });
  if (rewardError) console.warn("Reward sesi gagal diberikan:", rewardError);
  return json({ ...updated, rewards: rewards || null });
}

async function quickSession(admin: any, userId: string, body: any) {
  const game = await getGame(admin, String(body.gameSlug || ""));
  const assignment = await resolveAssignment(admin, userId, body.assignmentId);
  if (assignment.gameId && assignment.gameId !== game.id) return json({ error: "Game tidak sesuai dengan tugas." }, 400);
  if (assignment.assignmentId && assignment.questionSetId) {
    return json({ error: "Tugas dengan set soal harus memakai alur jawaban terverifikasi." }, 400);
  }

  const score = Math.round(clampNumber(body.score, 0, game.max_score));
  const accuracy = clampNumber(body.accuracy, 0, 100);
  const total = Math.round(clampNumber(body.questionCount, 0, 500));
  const correct = Math.round(clampNumber(body.correctCount, 0, total));
  const result = ["won", "lost", "completed"].includes(body.result) ? body.result : "completed";
  const safeMetadata = asRecord(body.metadata);
  const clientSessionId = String(safeMetadata.clientSessionId || "").trim().slice(0, 100);

  if (clientSessionId) {
    const { data: existing } = await admin.from("game_sessions")
      .select("id,score,accuracy,verified,result")
      .eq("user_id", userId)
      .eq("game_id", game.id)
      .contains("metadata", { clientSessionId })
      .maybeSingle();
    if (existing) return json(existing);
  }

  const now = new Date().toISOString();
  const record = {
    user_id: userId,
    game_id: game.id,
    class_id: assignment.classId,
    assignment_id: assignment.assignmentId,
    score,
    accuracy,
    result,
    mode: String(body.mode || "Solo").slice(0, 30),
    difficulty: String(body.difficulty || "Normal").slice(0, 30),
    level_id: String(body.levelId || "").slice(0, 80),
    duration_seconds: clampNumber(body.durationSeconds, 0, 7200),
    correct_count: correct,
    question_count: total,
    verified: false,
    started_at: now,
    completed_at: now,
    metadata: {
      gameVersion: String(safeMetadata.gameVersion || "").slice(0, 30),
      clientSessionId,
      source: "client-quick",
      questionSetId: null,
      collisions: clampNumber(safeMetadata.collisions, 0, 1000),
      livesRemaining: safeMetadata.livesRemaining == null ? null : clampNumber(safeMetadata.livesRemaining, 0, 100),
      practiceMode: Boolean(safeMetadata.practiceMode),
      questionSet: String(safeMetadata.questionSet || "").slice(0, 120)
    }
  };

  const { data, error } = await admin.from("game_sessions").insert(record).select("id,score,accuracy,verified,result").single();
  if (error) {
    if (error.code === "23505" && clientSessionId) {
      const { data: existing } = await admin.from("game_sessions")
        .select("id,score,accuracy,verified,result")
        .eq("user_id", userId)
        .eq("game_id", game.id)
        .contains("metadata", { clientSessionId })
        .maybeSingle();
      if (existing) return json(existing);
    }
    throw error;
  }
  return json(data);
}

function secureShuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clampNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Environment ${name} belum tersedia.`);
  return value;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
