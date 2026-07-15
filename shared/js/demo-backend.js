/**
 * Backend demo lokal untuk Portal Permainan Nusantara v1.1 RC.
 * Tujuan: menguji alur siswa, guru, dan admin sebelum Supabase dikonfigurasi.
 * Data demo hanya tersimpan pada Local Storage browser dan tidak dipakai sebagai
 * sumber otorisasi pada mode produksi.
 */

export const DEMO_MODE_KEY = "ppnRuntimeModeV1";
export const DEMO_STATE_KEY = "ppnDemoBackendStateV1";
export const DEMO_SESSION_KEY = "ppnDemoSessionV1";

const DEMO_PASSWORD = "demo12345";

export const DEMO_ACCOUNTS = Object.freeze({
  student: { email: "siswa@demo.nusantara", password: DEMO_PASSWORD, userId: "demo-student" },
  teacher: { email: "guru@demo.nusantara", password: DEMO_PASSWORD, userId: "demo-teacher" },
  admin: { email: "admin@demo.nusantara", password: DEMO_PASSWORD, userId: "demo-admin" }
});

function nowMinus(days = 0, hours = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

function future(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

function uid(prefix = "demo") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeParse(value, fallback) {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
}

function eq(query, key) {
  const match = String(query || "").match(new RegExp(`(?:^|&)${key}=eq\\.([^&]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function inValues(query, key) {
  const match = String(query || "").match(new RegExp(`(?:^|&)${key}=in\\.\\(([^)]*)\\)`));
  return match ? match[1].split(",").map(item => decodeURIComponent(item.trim())).filter(Boolean) : [];
}

function has(query, fragment) { return String(query || "").includes(fragment); }

function initialState() {
  const profiles = [
    { id: "demo-student", full_name: "Ayu Penjelajah", role: "student", school_name: "SMP Nusantara", class_label: "VIII A", avatar: "🌟", xp: 2450, created_at: nowMinus(32), updated_at: nowMinus(1) },
    { id: "demo-teacher", full_name: "Pak Bima", role: "teacher", school_name: "SMP Nusantara", class_label: "Guru IPS", avatar: "🧑‍🏫", xp: 0, created_at: nowMinus(90), updated_at: nowMinus(2) },
    { id: "demo-admin", full_name: "Admin Portal", role: "admin", school_name: "Pengelola Portal", class_label: "Administrator", avatar: "🛠️", xp: 0, created_at: nowMinus(120), updated_at: nowMinus(1) },
    { id: "demo-candidate", full_name: "Bu Sari", role: "student", school_name: "SMP Bahari", class_label: "Guru IPA", avatar: "📚", xp: 120, created_at: nowMinus(6), updated_at: nowMinus(1) },
    { id: "demo-student-2", full_name: "Raka Nusantara", role: "student", school_name: "SMP Nusantara", class_label: "VIII A", avatar: "🧭", xp: 1750, created_at: nowMinus(28), updated_at: nowMinus(2) }
  ];

  const games = [
    { id: "game-gobak", slug: "gobak-sodor", title: "Gobak Sodor Nusantara", icon: "🏃", status: "active", launch_path: "games/gobak-sodor/game.html", updated_at: nowMinus(1) },
    { id: "game-jelajah", slug: "jelajah-nusantara", title: "Jelajah Nusantara", icon: "🧭", status: "active", launch_path: "games/jelajah-nusantara/index.html", updated_at: nowMinus(1) },
    { id: "game-congklak", slug: "congklak-cerdas", title: "Congklak Cerdas", icon: "🫘", status: "coming_soon", launch_path: "games.html", updated_at: nowMinus(3) },
    { id: "game-engklek", slug: "engklek-pintar", title: "Engklek Pintar", icon: "🟨", status: "coming_soon", launch_path: "games.html", updated_at: nowMinus(3) }
  ];

  const questionSets = [
    { id: "set-ips", owner_id: "demo-teacher", title: "IPS Nusantara Kelas VIII", description: "Budaya, geografi, dan keragaman Indonesia.", subject: "IPS", status: "published", is_public: false, created_at: nowMinus(20), updated_at: nowMinus(2) },
    { id: "set-mix", owner_id: "demo-teacher", title: "Latihan Campuran Pekan Ini", description: "Set draft untuk menguji editor soal.", subject: "Campuran", status: "draft", is_public: false, created_at: nowMinus(3), updated_at: nowMinus(1) }
  ];

  const baseQuestions = [
    ["Budaya", "Rumah Gadang berasal dari provinsi mana?", ["Sumatra Barat", "Jawa Barat", "Sulawesi Selatan", "Papua"], 0, "Rumah Gadang merupakan rumah adat Minangkabau di Sumatra Barat."],
    ["Geografi", "Pulau terbesar ketiga di dunia yang sebagian wilayahnya berada di Indonesia adalah...", ["Kalimantan", "Sulawesi", "Jawa", "Bali"], 0, "Kalimantan merupakan bagian Indonesia dari Pulau Borneo."],
    ["Budaya", "Angklung dimainkan dengan cara...", ["Digoyangkan", "Dipetik", "Ditiup", "Dipukul dengan stik"], 0, "Tabung bambu angklung menghasilkan bunyi ketika digoyangkan."],
    ["Sejarah", "Sumpah Pemuda diperingati setiap tanggal...", ["28 Oktober", "17 Agustus", "1 Juni", "10 November"], 0, "Kongres Pemuda II menghasilkan Sumpah Pemuda pada 28 Oktober 1928."],
    ["Geografi", "Selat yang memisahkan Pulau Jawa dan Sumatra adalah...", ["Selat Sunda", "Selat Makassar", "Selat Bali", "Selat Karimata"], 0, "Selat Sunda berada di antara Jawa dan Sumatra."],
    ["Budaya", "Tari Kecak berkembang kuat di daerah...", ["Bali", "Aceh", "Maluku", "Kalimantan Barat"], 0, "Tari Kecak dikenal sebagai pertunjukan budaya Bali."],
    ["Ekonomi", "Kegiatan menyalurkan barang dari produsen ke konsumen disebut...", ["Distribusi", "Produksi", "Konsumsi", "Investasi"], 0, "Distribusi menghubungkan produsen dan konsumen."],
    ["Geografi", "Garis khatulistiwa melewati salah satu kota berikut, yaitu...", ["Pontianak", "Surabaya", "Bandung", "Denpasar"], 0, "Pontianak dikenal sebagai Kota Khatulistiwa."],
    ["Budaya", "Sasando merupakan alat musik tradisional dari...", ["Nusa Tenggara Timur", "Jawa Tengah", "Sumatra Utara", "Maluku Utara"], 0, "Sasando berasal dari Pulau Rote, Nusa Tenggara Timur."],
    ["Pancasila", "Gotong royong paling dekat dengan penerapan sila ke...", ["3", "1", "2", "5"], 0, "Gotong royong memperkuat persatuan Indonesia."],
    ["IPA", "Perubahan air menjadi uap disebut...", ["Menguap", "Membeku", "Mengembun", "Mencair"], 0, "Menguap adalah perubahan wujud cair menjadi gas."],
    ["Matematika", "Hasil 12 × 8 adalah...", ["96", "88", "108", "86"], 0, "12 dikali 8 sama dengan 96."]
  ];

  const questions = [];
  baseQuestions.slice(0, 10).forEach((row, index) => questions.push({ id: `q-ips-${index + 1}`, question_set_id: "set-ips", category: row[0], prompt: row[1], choices: row[2], correct_index: row[3], explanation: row[4], order_index: index }));
  baseQuestions.slice(2, 12).forEach((row, index) => questions.push({ id: `q-mix-${index + 1}`, question_set_id: "set-mix", category: row[0], prompt: row[1], choices: row[2], correct_index: row[3], explanation: row[4], order_index: index }));

  const classes = [
    { id: "class-nusantara", teacher_id: "demo-teacher", name: "VIII A Nusantara", class_code: "NUSA88", school_name: "SMP Nusantara", academic_year: "2026/2027", is_active: true, created_at: nowMinus(45) }
  ];

  const classMembers = [
    { class_id: "class-nusantara", student_id: "demo-student", status: "active", joined_at: nowMinus(30) },
    { class_id: "class-nusantara", student_id: "demo-student-2", status: "active", joined_at: nowMinus(26) }
  ];

  const assignments = [
    { id: "assignment-jelajah", class_id: "class-nusantara", game_id: "game-jelajah", question_set_id: "set-ips", title: "Ekspedisi IPS Nusantara", instructions: "Selesaikan sepuluh soal dan raih minimal delapan jawaban benar.", due_at: future(5), is_active: true, created_by: "demo-teacher", created_at: nowMinus(2) },
    { id: "assignment-gobak", class_id: "class-nusantara", game_id: "game-gobak", question_set_id: null, title: "Strategi Gotong Royong", instructions: "Mainkan Gobak Sodor pada tingkat Normal.", due_at: future(8), is_active: true, created_by: "demo-teacher", created_at: nowMinus(1) }
  ];

  const gameSessions = [
    { id: "session-1", user_id: "demo-student", class_id: "class-nusantara", assignment_id: "assignment-jelajah", game_id: "game-jelajah", score: 9480, accuracy: 90, result: "won", mode: "Solo", difficulty: "Normal", level_id: "Nusantara", correct_count: 9, question_count: 10, duration_seconds: 118, verified: true, completed_at: nowMinus(1, 3), metadata: { source: "demo" } },
    { id: "session-2", user_id: "demo-student", class_id: "class-nusantara", assignment_id: null, game_id: "game-gobak", score: 2840, accuracy: 83, result: "won", mode: "Solo", difficulty: "Normal", level_id: "Jawa", correct_count: 5, question_count: 6, duration_seconds: 74, verified: false, completed_at: nowMinus(2, 2), metadata: { source: "demo" } },
    { id: "session-3", user_id: "demo-student-2", class_id: "class-nusantara", assignment_id: "assignment-jelajah", game_id: "game-jelajah", score: 10120, accuracy: 100, result: "won", mode: "Solo", difficulty: "Normal", level_id: "Nusantara", correct_count: 10, question_count: 10, duration_seconds: 105, verified: true, completed_at: nowMinus(1, 1), metadata: { source: "demo" } }
  ];

  const achievements = [
    { id: "ach-first", name: "Langkah Pertama", description: "Selesaikan satu permainan.", icon: "🎮", xp_reward: 100 },
    { id: "ach-smart", name: "Cerdas Nusantara", description: "Raih akurasi minimal 80%.", icon: "🧠", xp_reward: 200 }
  ];

  return {
    version: 1,
    profiles,
    games,
    classes,
    classMembers,
    questionSets,
    questions,
    assignments,
    gameSessions,
    teacherRequests: [{ id: "request-sari", user_id: "demo-candidate", note: "Guru IPA SMP Bahari. Memerlukan akses untuk membuat tugas.", status: "pending", created_at: nowMinus(1), reviewed_at: null }],
    auditLogs: [{ id: "audit-seed", action: "demo_seed_created", entity_type: "portal", entity_id: "v1.1", details: { mode: "demo" }, created_at: nowMinus(1) }],
    achievements,
    userAchievements: [{ user_id: "demo-student", achievement_id: "ach-first", unlocked_at: nowMinus(2) }, { user_id: "demo-student", achievement_id: "ach-smart", unlocked_at: nowMinus(1) }],
    remoteSessions: {},
    credentials: Object.values(DEMO_ACCOUNTS).map(account => ({ email: account.email, password: account.password, userId: account.userId }))
  };
}

export class DemoBackend {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.session = safeParse(storage?.getItem(DEMO_SESSION_KEY), null);
    this.state = this.loadState();
  }

  loadState() {
    const saved = safeParse(this.storage?.getItem(DEMO_STATE_KEY), null);
    const state = saved?.version === 1 ? saved : initialState();
    if (!Array.isArray(state.credentials)) state.credentials = Object.values(DEMO_ACCOUNTS).map(account => ({ email: account.email, password: account.password, userId: account.userId }));
    if (!state.remoteSessions || typeof state.remoteSessions !== "object") state.remoteSessions = {};
    this.saveState(state);
    return state;
  }

  saveState(state = this.state) {
    this.state = state;
    this.storage?.setItem(DEMO_STATE_KEY, JSON.stringify(state));
  }

  reset() {
    this.state = initialState();
    this.session = null;
    this.storage?.setItem(DEMO_STATE_KEY, JSON.stringify(this.state));
    this.storage?.removeItem(DEMO_SESSION_KEY);
    return clone(this.state);
  }

  get active() { return this.storage?.getItem(DEMO_MODE_KEY) === "demo"; }
  setActive(active = true) {
    if (active) this.storage?.setItem(DEMO_MODE_KEY, "demo");
    else this.storage?.removeItem(DEMO_MODE_KEY);
  }
  get user() { return this.session?.user || null; }
  get accessToken() { return this.session ? "demo-access-token" : ""; }
  get refreshToken() { return this.session ? "demo-refresh-token" : ""; }

  profile(id = this.user?.id) { return this.state.profiles.find(item => item.id === id) || null; }
  game(id) { return this.state.games.find(item => item.id === id) || null; }
  questionSet(id) { return this.state.questionSets.find(item => item.id === id) || null; }
  classById(id) { return this.state.classes.find(item => item.id === id) || null; }

  sessionFor(userId) {
    const profile = this.profile(userId);
    if (!profile) return null;
    return {
      access_token: "demo-access-token",
      refresh_token: "demo-refresh-token",
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      user: { id: profile.id, email: this.state.credentials.find(account => account.userId === profile.id)?.email || `${profile.id}@demo.nusantara`, user_metadata: { full_name: profile.full_name } }
    };
  }

  saveSession(session) {
    this.session = session || null;
    if (session) this.storage?.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    else this.storage?.removeItem(DEMO_SESSION_KEY);
  }

  async signIn(email, password) {
    const entry = this.state.credentials.find(account => account.email.toLowerCase() === String(email).toLowerCase());
    if (!entry || password !== entry.password) throw new Error("Akun demo atau password tidak cocok.");
    const session = this.sessionFor(entry.userId);
    this.saveSession(session);
    return clone(session);
  }

  async signInRole(role) {
    const account = DEMO_ACCOUNTS[role];
    if (!account) throw new Error("Role demo tidak tersedia.");
    return this.signIn(account.email, account.password);
  }

  async signUp({ email, password = "demo12345", fullName = "Pengguna Demo", schoolName = "Sekolah Demo", classLabel = "", avatar = "🌟" }) {
    const id = uid("demo-user");
    this.state.profiles.push({ id, full_name: fullName, role: "student", school_name: schoolName, class_label: classLabel, avatar, xp: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    this.state.credentials.push({ email: String(email).toLowerCase(), password, userId: id });
    this.saveState();
    const session = { ...this.sessionFor(id), user: { id, email, user_metadata: { full_name: fullName } } };
    this.saveSession(session);
    return clone(session);
  }

  async signOut() { this.saveSession(null); }
  async getUser() { return clone(this.user); }
  async ensureSession() { return clone(this.session); }

  async select(table, query = "select=*") {
    const s = this.state;
    const current = this.user?.id;
    let rows = [];

    if (table === "profiles") {
      const id = eq(query, "id");
      rows = id ? s.profiles.filter(item => item.id === id) : s.profiles;
    } else if (table === "games") {
      rows = s.games;
      const status = eq(query, "status");
      if (status) rows = rows.filter(item => item.status === status);
    } else if (table === "classes") {
      const teacherId = eq(query, "teacher_id");
      rows = teacherId ? s.classes.filter(item => item.teacher_id === teacherId) : s.classes;
    } else if (table === "class_members") {
      const ids = inValues(query, "class_id");
      if (has(query, "profiles!")) {
        rows = s.classMembers.filter(item => !ids.length || ids.includes(item.class_id)).map(item => ({ ...item, profiles: clone(this.profile(item.student_id)) }));
      } else {
        rows = s.classMembers.filter(item => item.student_id === current).map(item => ({ ...item, classes: clone(this.classById(item.class_id)) }));
      }
    } else if (table === "assignments") {
      const id = eq(query, "id");
      const ids = inValues(query, "class_id");
      rows = s.assignments.filter(item => (!id || item.id === id) && (!ids.length || ids.includes(item.class_id)));
      rows = rows.map(item => ({ ...item, games: clone(this.game(item.game_id)), question_sets: clone(this.questionSet(item.question_set_id)) }));
    } else if (table === "question_sets") {
      const ownerId = eq(query, "owner_id");
      rows = ownerId ? s.questionSets.filter(item => item.owner_id === ownerId) : s.questionSets;
    } else if (table === "game_sessions") {
      const userId = eq(query, "user_id");
      const classIds = inValues(query, "class_id");
      rows = s.gameSessions.filter(item => (!userId || item.user_id === userId) && (!classIds.length || classIds.includes(item.class_id)));
      rows = rows.map(item => ({ ...item, games: clone(this.game(item.game_id)), profiles: clone(this.profile(item.user_id)) }));
    } else if (table === "teacher_requests") {
      rows = s.teacherRequests.map(item => ({ ...item, profiles: clone(this.profile(item.user_id)) }));
    } else if (table === "audit_logs") {
      rows = s.auditLogs;
    } else if (table === "user_achievements") {
      const userId = eq(query, "user_id") || current;
      rows = s.userAchievements.filter(item => item.user_id === userId).map(item => ({ ...item, achievements: clone(s.achievements.find(achievement => achievement.id === item.achievement_id)) }));
    }

    if (has(query, "status=eq.active")) rows = rows.filter(item => item.status === "active" || item.is_active === true);
    if (has(query, "is_active=eq.true")) rows = rows.filter(item => item.is_active === true);
    if (has(query, "result=neq.abandoned")) rows = rows.filter(item => item.result !== "abandoned");
    const limitMatch = query.match(/(?:^|&)limit=(\d+)/);
    if (limitMatch) rows = rows.slice(0, Number(limitMatch[1]));
    return clone(rows);
  }

  async rest(table, options = {}) { return this.select(table, options.query || "select=*"); }

  async insert(table, values) {
    const item = { ...clone(values) };
    const current = new Date().toISOString();
    if (table === "classes") {
      item.id ||= uid("class"); item.created_at ||= current; this.state.classes.unshift(item);
    } else if (table === "question_sets") {
      item.id ||= uid("set"); item.created_at ||= current; item.updated_at ||= current; this.state.questionSets.unshift(item);
    } else if (table === "assignments") {
      item.id ||= uid("assignment"); item.created_at ||= current; this.state.assignments.unshift(item);
    } else throw new Error(`Insert demo untuk tabel ${table} belum tersedia.`);
    this.saveState();
    return [clone(item)];
  }

  async update(table, query, values) {
    const id = eq(query, "id");
    const mapping = { profiles: "profiles", assignments: "assignments", question_sets: "questionSets" };
    const key = mapping[table];
    if (!key || !id) throw new Error("Target update demo tidak valid.");
    const item = this.state[key].find(row => row.id === id);
    if (!item) throw new Error("Data demo tidak ditemukan.");
    Object.assign(item, clone(values), { updated_at: new Date().toISOString() });
    this.saveState();
    return [clone(item)];
  }

  async remove(table, query) {
    const id = eq(query, "id");
    const mapping = { assignments: "assignments", question_sets: "questionSets" };
    const key = mapping[table];
    if (!key || !id) return [];
    const index = this.state[key].findIndex(row => row.id === id);
    if (index < 0) return [];
    const [removed] = this.state[key].splice(index, 1);
    this.saveState();
    return [clone(removed)];
  }

  audit(action, entityType, entityId, details = {}) {
    this.state.auditLogs.unshift({ id: uid("audit"), action, entity_type: entityType, entity_id: entityId, details, created_at: new Date().toISOString() });
  }

  async rpc(name, args = {}) {
    const s = this.state;
    if (!this.user && name !== "get_portal_leaderboard") throw new Error("Login demo diperlukan.");

    if (name === "join_class_by_code") {
      const target = s.classes.find(item => item.class_code.toLowerCase() === String(args.p_code || "").toLowerCase() && item.is_active);
      if (!target) throw new Error("Kode kelas demo tidak ditemukan.");
      if (!s.classMembers.some(item => item.class_id === target.id && item.student_id === this.user.id)) s.classMembers.push({ class_id: target.id, student_id: this.user.id, status: "active", joined_at: new Date().toISOString() });
      this.saveState(); return { class_id: target.id };
    }
    if (name === "leave_class") {
      s.classMembers = s.classMembers.filter(item => !(item.class_id === args.p_class_id && item.student_id === this.user.id));
      this.saveState(); return true;
    }
    if (name === "request_teacher_access") {
      const existing = s.teacherRequests.find(item => item.user_id === this.user.id && item.status === "pending");
      if (existing) existing.note = args.p_note || existing.note;
      else s.teacherRequests.unshift({ id: uid("request"), user_id: this.user.id, note: args.p_note || "", status: "pending", created_at: new Date().toISOString(), reviewed_at: null });
      this.saveState(); return true;
    }
    if (name === "admin_review_teacher_request") {
      const request = s.teacherRequests.find(item => item.id === args.p_request_id);
      if (!request) throw new Error("Permintaan tidak ditemukan.");
      request.status = args.p_approve ? "approved" : "rejected";
      request.reviewed_at = new Date().toISOString();
      if (args.p_approve) this.profile(request.user_id).role = "teacher";
      this.audit("teacher_request_reviewed", "teacher_request", request.id, { approved: Boolean(args.p_approve) });
      this.saveState(); return true;
    }
    if (name === "admin_set_user_role") {
      const profile = this.profile(args.p_user_id); if (!profile) throw new Error("Pengguna tidak ditemukan.");
      profile.role = args.p_role; profile.updated_at = new Date().toISOString();
      this.audit("user_role_changed", "profile", profile.id, { role: args.p_role }); this.saveState(); return true;
    }
    if (name === "admin_set_game_status") {
      const game = this.game(args.p_game_id); if (!game) throw new Error("Game tidak ditemukan.");
      game.status = args.p_status; game.updated_at = new Date().toISOString();
      this.audit("game_status_changed", "game", game.id, { status: args.p_status }); this.saveState(); return true;
    }
    if (name === "teacher_get_questions") {
      return clone(s.questions.filter(item => item.question_set_id === args.p_question_set_id).sort((a, b) => a.order_index - b.order_index));
    }
    if (name === "teacher_upsert_question") {
      let question = args.p_question_id ? s.questions.find(item => item.id === args.p_question_id) : null;
      const data = { question_set_id: args.p_question_set_id, category: args.p_category, prompt: args.p_prompt, choices: clone(args.p_choices), correct_index: Number(args.p_correct_index), explanation: args.p_explanation || "", order_index: Number(args.p_order_index || 0) };
      if (question) Object.assign(question, data); else { question = { id: uid("question"), ...data }; s.questions.push(question); }
      const set = this.questionSet(args.p_question_set_id); if (set) set.updated_at = new Date().toISOString();
      this.saveState(); return clone(question);
    }
    if (name === "teacher_delete_question") {
      s.questions = s.questions.filter(item => item.id !== args.p_question_id); this.saveState(); return true;
    }
    if (name === "get_portal_leaderboard") {
      const slug = args.p_game_slug || null;
      return clone(s.gameSessions.filter(item => item.verified && (!slug || this.game(item.game_id)?.slug === slug)).sort((a, b) => b.score - a.score).slice(0, Number(args.p_limit || 20)).map(item => ({
        display_name: this.profile(item.user_id)?.full_name || "Pemain Demo",
        avatar: this.profile(item.user_id)?.avatar || "👤",
        game_title: this.game(item.game_id)?.title || "Game",
        game_slug: this.game(item.game_id)?.slug || "game",
        score: item.score,
        accuracy: item.accuracy,
        mode: item.mode,
        difficulty: item.difficulty,
        level_id: item.level_id,
        completed_at: item.completed_at,
        verified: true
      })));
    }
    throw new Error(`RPC demo ${name} belum tersedia.`);
  }

  async invoke(name, body = {}) {
    if (!this.user) throw new Error("Login demo diperlukan.");
    if (name === "submit-game-session") {
      if (body.action === "start") {
        const assignment = this.state.assignments.find(item => item.id === body.assignmentId && item.is_active);
        if (!assignment) throw new Error("Tugas demo tidak ditemukan.");
        const source = this.state.questions.filter(item => item.question_set_id === assignment.question_set_id).slice(0, 10);
        if (source.length < 10) throw new Error("Set soal demo belum lengkap.");
        const sessionId = uid("remote-session");
        this.state.remoteSessions[sessionId] = { userId: this.user.id, assignmentId: assignment.id, answers: [], startedAt: Date.now(), questions: source.map(item => item.id) };
        this.saveState();
        return { sessionId, questions: source.map(({ id, category, prompt, choices }) => ({ id, category, prompt, choices: clone(choices) })) };
      }
      if (body.action === "complete") {
        const remote = this.state.remoteSessions[body.sessionId];
        if (!remote) throw new Error("Sesi demo tidak ditemukan.");
        const assignment = this.state.assignments.find(item => item.id === remote.assignmentId);
        const correct = remote.answers.filter(item => item.correct).length;
        const total = remote.questions.length;
        const duration = Math.max(1, Math.round((Date.now() - remote.startedAt) / 1000));
        const score = correct * 1000 + Math.max(0, 180 - duration) * 2;
        const result = correct >= 8 && duration <= 180 ? "won" : "lost";
        const session = { id: uid("session"), user_id: this.user.id, class_id: assignment.class_id, assignment_id: assignment.id, game_id: assignment.game_id, score, accuracy: Math.round(correct / total * 100), result, mode: "Solo", difficulty: "Normal", level_id: "Nusantara", correct_count: correct, question_count: total, duration_seconds: duration, verified: true, completed_at: new Date().toISOString(), metadata: { source: "demo-verified" } };
        this.state.gameSessions.unshift(session); delete this.state.remoteSessions[body.sessionId]; this.saveState();
        return { score, accuracy: session.accuracy, result, verified: true };
      }
      const game = this.state.games.find(item => item.slug === body.gameSlug);
      if (!game) throw new Error("Game demo tidak ditemukan.");
      const session = { id: uid("session"), user_id: this.user.id, class_id: null, assignment_id: body.assignmentId || null, game_id: game.id, score: Number(body.score || 0), accuracy: Number(body.accuracy || 0), result: body.result || "lost", mode: body.mode || "Solo", difficulty: body.difficulty || "Normal", level_id: body.levelId || "—", correct_count: Number(body.correctCount || 0), question_count: Number(body.questionCount || 0), duration_seconds: Number(body.durationSeconds || 0), verified: false, completed_at: new Date().toISOString(), metadata: { ...(body.metadata || {}), source: "demo-client" } };
      this.state.gameSessions.unshift(session); this.saveState();
      return { sessionId: session.id, verified: false };
    }
    if (name === "answer-question") {
      const remote = this.state.remoteSessions[body.sessionId];
      if (!remote || !remote.questions.includes(body.questionId)) throw new Error("Pertanyaan tidak termasuk sesi demo.");
      const question = this.state.questions.find(item => item.id === body.questionId);
      const correct = Number(body.selectedIndex) === Number(question.correct_index);
      remote.answers.push({ questionId: question.id, selectedIndex: Number(body.selectedIndex), correct });
      this.saveState();
      return { correct, explanation: question.explanation || "" };
    }
    throw new Error(`Edge Function demo ${name} belum tersedia.`);
  }
}

export const demoBackend = new DemoBackend();
