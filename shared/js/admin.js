import { authManager } from "./auth.js";
import { supabaseApi } from "./supabase-api.js";
import { dashboardShellReady, escapeHtml, formatDate, setPageFeedback } from "./dashboard-common.js";

const state={requests:[],profiles:[],games:[],logs:[]};
async function load(){
  [state.requests,state.profiles,state.games,state.logs]=await Promise.all([
    supabaseApi.select("teacher_requests","select=id,user_id,note,status,created_at,reviewed_at,profiles!teacher_requests_user_id_fkey(full_name,school_name,avatar)&order=created_at.desc"),
    supabaseApi.select("profiles","select=id,full_name,role,school_name,class_label,avatar,created_at&order=created_at.desc&limit=200"),
    supabaseApi.select("games","select=id,slug,title,status,icon,launch_path,updated_at&order=title"),
    supabaseApi.select("audit_logs","select=id,action,entity_type,entity_id,details,created_at&order=created_at.desc&limit=30")
  ]);render();
}
function render(){
  document.querySelector("[data-admin-requests]").innerHTML=state.requests.filter(x=>x.status==="pending").length?state.requests.filter(x=>x.status==="pending").map(r=>`<article class="dashboard-list-item"><div><h3>${escapeHtml(r.profiles?.avatar||'👤')} ${escapeHtml(r.profiles?.full_name||'Pengguna')}</h3><p>${escapeHtml(r.profiles?.school_name||'')} · ${escapeHtml(r.note||'Tanpa catatan')}</p></div><div class="button-row"><button class="button primary" data-review="${r.id}" data-approve="true">Setujui</button><button class="button danger-ghost" data-review="${r.id}" data-approve="false">Tolak</button></div></article>`).join(''):'<div class="empty-mini">Tidak ada permintaan guru menunggu.</div>';
  document.querySelector("[data-admin-users]").innerHTML=state.profiles.map(p=>`<tr><td>${escapeHtml(p.avatar)} ${escapeHtml(p.full_name||'Belum bernama')}</td><td>${escapeHtml(p.school_name||'—')}</td><td><select data-role-user="${p.id}" ${p.id===authManager.user.id?'disabled':''}><option value="student" ${p.role==='student'?'selected':''}>Siswa</option><option value="teacher" ${p.role==='teacher'?'selected':''}>Guru</option><option value="admin" ${p.role==='admin'?'selected':''}>Admin</option></select></td><td>${formatDate(p.created_at)}</td></tr>`).join('');
  document.querySelector("[data-admin-games]").innerHTML=state.games.map(g=>`<tr><td>${escapeHtml(g.icon)} ${escapeHtml(g.title)}</td><td><code>${escapeHtml(g.slug)}</code></td><td><select data-game-status="${g.id}"><option value="active" ${g.status==='active'?'selected':''}>Aktif</option><option value="coming_soon" ${g.status==='coming_soon'?'selected':''}>Segera hadir</option><option value="hidden" ${g.status==='hidden'?'selected':''}>Sembunyi</option></select></td><td>${escapeHtml(g.launch_path)}</td></tr>`).join('');
  document.querySelector("[data-admin-logs]").innerHTML=state.logs.length?state.logs.map(l=>`<article class="dashboard-list-item"><div><h3>${escapeHtml(l.action)}</h3><p>${escapeHtml(l.entity_type)} · ${escapeHtml(l.entity_id)} · ${formatDate(l.created_at,true)}</p></div></article>`).join(''):'<div class="empty-mini">Belum ada audit log.</div>';
  document.querySelector("[data-stat-users]").textContent=state.profiles.length;
  document.querySelector("[data-stat-teachers]").textContent=state.profiles.filter(x=>x.role==='teacher').length;
  document.querySelector("[data-stat-pending]").textContent=state.requests.filter(x=>x.status==='pending').length;
  document.querySelector("[data-stat-games]").textContent=state.games.filter(x=>x.status==='active').length;
}
async function init(){
  if(!await authManager.requireAuth({roles:["admin"]}))return;dashboardShellReady();
  document.addEventListener("click",async e=>{const btn=e.target.closest('[data-review]');if(!btn)return;try{await supabaseApi.rpc('admin_review_teacher_request',{p_request_id:btn.dataset.review,p_approve:btn.dataset.approve==='true'});setPageFeedback('Permintaan telah diproses.','success');await load();}catch(error){setPageFeedback(error.message,'error');}});
  document.addEventListener("change",async e=>{
    if(e.target.matches('[data-role-user]')){
      e.target.disabled=true;
      try{
        await supabaseApi.rpc('admin_set_user_role',{p_user_id:e.target.dataset.roleUser,p_role:e.target.value});
        setPageFeedback('Role pengguna diperbarui.','success');
      }catch(error){setPageFeedback(error.message,'error');}
      finally{await load();}
    }
    if(e.target.matches('[data-game-status]')){
      e.target.disabled=true;
      try{
        await supabaseApi.rpc('admin_set_game_status',{p_game_id:e.target.dataset.gameStatus,p_status:e.target.value});
        setPageFeedback('Status game diperbarui.','success');
      }catch(error){setPageFeedback(error.message,'error');}
      finally{await load();}
    }
  });
  await load();
}
document.addEventListener('DOMContentLoaded',()=>init().catch(error=>setPageFeedback(error.message,'error')));
