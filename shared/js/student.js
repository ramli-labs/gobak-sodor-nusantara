import { authManager } from "./auth.js";
import { supabaseApi } from "./supabase-api.js";
import { dashboardShellReady, escapeHtml, formatDate, safeLocalHref, setPageFeedback } from "./dashboard-common.js";

const state={classes:[],assignments:[],sessions:[]};

async function loadData(){
  const userId=authManager.user.id;
  const [members,sessions]=await Promise.all([
    supabaseApi.select("class_members","select=class_id,status,joined_at,classes(id,name,class_code,school_name,academic_year,teacher_id)&status=eq.active&order=joined_at.desc"),
    supabaseApi.select("game_sessions",`select=id,score,accuracy,result,mode,difficulty,level_id,completed_at,verified,games(title,slug,icon)&user_id=eq.${encodeURIComponent(userId)}&result=neq.abandoned&order=completed_at.desc&limit=20`)
  ]);
  state.classes=Array.isArray(members)?members:[];
  state.sessions=Array.isArray(sessions)?sessions:[];
  const ids=state.classes.map(item=>item.class_id).filter(Boolean);
  state.assignments=ids.length?await supabaseApi.select("assignments",`select=id,title,instructions,due_at,class_id,is_active,games(slug,title,launch_path,icon),question_sets(title)&class_id=in.(${ids.join(',')})&is_active=eq.true&order=due_at.asc.nullslast`):[];
  render();
}

function render(){
  const classes=document.querySelector("[data-student-classes]");
  classes.innerHTML=state.classes.length?state.classes.map(item=>{
    const c=item.classes||{};
    return `<article class="dashboard-list-item"><div><h3>${escapeHtml(c.name||"Kelas")}</h3><p>${escapeHtml(c.school_name||"")} · Kode ${escapeHtml(c.class_code||"")}</p></div><button class="button danger-ghost" type="button" data-leave-class="${item.class_id}">Keluar</button></article>`;
  }).join(""):'<div class="empty-mini">Belum bergabung ke kelas.</div>';

  const assignments=document.querySelector("[data-student-assignments]");
  assignments.innerHTML=state.assignments.length?state.assignments.map(item=>{
    const game=item.games||{};
    const launch=safeLocalHref(game.launch_path||"games.html", "games.html");
    const params=new URLSearchParams({assignment:item.id});
    if(item.question_sets?.title)params.set("set",item.question_sets.title);
    const expired=item.due_at&&new Date(item.due_at).getTime()<Date.now();
    return `<article class="dashboard-list-item"><div><h3>${escapeHtml(game.icon||"🎮")} ${escapeHtml(item.title)}</h3><p>${escapeHtml(game.title||"Game")} · ${item.due_at?`${expired?'Tenggat lewat':'Tenggat'} ${formatDate(item.due_at)}`:"Tanpa tenggat"}</p></div>${expired?'<span class="badge-state">Ditutup</span>':`<a class="button primary" href="${escapeHtml(launch)}${launch.includes("?")?"&":"?"}${params}">Mainkan</a>`}</article>`;
  }).join(""):'<div class="empty-mini">Belum ada tugas aktif.</div>';

  const sessions=document.querySelector("[data-student-sessions]");
  sessions.innerHTML=state.sessions.length?state.sessions.slice(0,8).map(item=>`<article class="dashboard-list-item"><div><h3>${escapeHtml(item.games?.icon||"🎮")} ${escapeHtml(item.games?.title||"Permainan")}</h3><p>${Number(item.score).toLocaleString('id-ID')} poin · ${Number(item.accuracy).toFixed(0)}% · ${formatDate(item.completed_at,true)}</p></div><span class="badge-state">${item.verified?"Terverifikasi":"Tersimpan"}</span></article>`).join(""):'<div class="empty-mini">Belum ada sesi online. Progres lokal tetap ada di perangkat.</div>';

  const wins=state.sessions.filter(x=>x.result==="won").length;
  const best=state.sessions.length?Math.max(...state.sessions.map(x=>Number(x.score)||0)):0;
  const avg=state.sessions.length?Math.round(state.sessions.reduce((s,x)=>s+(Number(x.accuracy)||0),0)/state.sessions.length):0;
  document.querySelector("[data-stat-classes]").textContent=state.classes.length;
  document.querySelector("[data-stat-assignments]").textContent=state.assignments.length;
  document.querySelector("[data-stat-best]").textContent=best.toLocaleString('id-ID');
  document.querySelector("[data-stat-accuracy]").textContent=`${avg}%`;
  document.querySelector("[data-stat-wins]")?.replaceChildren(String(wins));
}

async function init(){
  if(!await authManager.requireAuth({roles:["student"]}))return;
  dashboardShellReady();
  document.querySelector("[data-join-class-form]")?.addEventListener("submit",async event=>{
    event.preventDefault();const button=event.submitter;if(button)button.disabled=true;
    try{const code=String(new FormData(event.currentTarget).get("classCode")||"").trim();if(code.length<4)throw new Error("Masukkan kode kelas yang valid.");await supabaseApi.rpc("join_class_by_code",{p_code:code});setPageFeedback("Berhasil bergabung ke kelas.","success");event.currentTarget.reset();await loadData();}catch(error){setPageFeedback(error.message,"error");}finally{if(button)button.disabled=false;}
  });
  document.addEventListener("click",async event=>{const btn=event.target.closest("[data-leave-class]");if(!btn)return;if(!confirm("Keluar dari kelas ini?"))return;try{await supabaseApi.rpc("leave_class",{p_class_id:btn.dataset.leaveClass});await loadData();}catch(error){setPageFeedback(error.message,"error");}});
  document.querySelector("[data-teacher-request-form]")?.addEventListener("submit",async event=>{event.preventDefault();const button=event.submitter;if(button)button.disabled=true;try{const note=String(new FormData(event.currentTarget).get("note")||"").trim();await supabaseApi.rpc("request_teacher_access",{p_note:note});setPageFeedback("Permintaan akses guru dikirim dan menunggu persetujuan admin.","success");event.currentTarget.reset();}catch(error){setPageFeedback(error.message,"error");}finally{if(button)button.disabled=false;}});
  await loadData();
}

document.addEventListener("DOMContentLoaded",()=>init().catch(error=>setPageFeedback(error.message,"error")));
