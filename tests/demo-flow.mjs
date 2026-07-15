import assert from "node:assert/strict";

class Storage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new Storage();
globalThis.window = { localStorage, dispatchEvent() {}, addEventListener() {} };
globalThis.CustomEvent = class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.atob = value => Buffer.from(value, "base64").toString("binary");

const { SupabaseApi, DEMO_ACCOUNTS } = await import("../shared/js/supabase-api.js");
const api = new SupabaseApi();

await api.startDemo("student");
assert.equal(api.backendMode, "demo");
assert.equal(api.user.id, "demo-student");
let rows = await api.select("class_members", "select=class_id,status,classes(id,name)&status=eq.active");
assert.equal(rows.length, 1);
assert.equal(rows[0].classes.class_code, "NUSA88");
rows = await api.select("assignments", "select=id,title,games(slug)&class_id=in.(class-nusantara)&is_active=eq.true");
assert.equal(rows.length, 2);

const start = await api.invoke("submit-game-session", { action: "start", assignmentId: "assignment-jelajah" });
assert.equal(start.questions.length, 10);
for (const question of start.questions) {
  await api.invoke("answer-question", { sessionId: start.sessionId, questionId: question.id, selectedIndex: 0 });
}
const complete = await api.invoke("submit-game-session", { action: "complete", sessionId: start.sessionId });
assert.equal(complete.verified, true);
assert.equal(complete.result, "won");

await api.startDemo("teacher");
rows = await api.select("classes", "select=*&teacher_id=eq.demo-teacher");
assert.equal(rows.length, 1);
const inserted = await api.insert("question_sets", { owner_id: "demo-teacher", title: "Set Test", subject: "IPA", status: "draft", is_public: false });
assert.equal(inserted[0].title, "Set Test");
await api.rpc("teacher_upsert_question", { p_question_set_id: inserted[0].id, p_question_id: null, p_category: "IPA", p_prompt: "Air membeku pada?", p_choices: ["0°C", "50°C"], p_correct_index: 0, p_explanation: "Tekanan normal.", p_order_index: 0 });
rows = await api.rpc("teacher_get_questions", { p_question_set_id: inserted[0].id });
assert.equal(rows.length, 1);

await api.startDemo("admin");
await api.rpc("admin_review_teacher_request", { p_request_id: "request-sari", p_approve: true });
rows = await api.select("profiles", "select=*");
assert.equal(rows.find(item => item.id === "demo-candidate").role, "teacher");
const leaderboard = await api.rpc("get_portal_leaderboard", { p_game_slug: null, p_limit: 50 }, { auth: false });
assert.ok(leaderboard.length >= 2);
assert.ok(leaderboard.every(item => item.verified));

console.log("demo-flow: PASS");
