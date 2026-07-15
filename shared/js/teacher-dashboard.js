import { authManager } from "./auth.js";
import { supabaseApi } from "./supabase-api.js";
import { dashboardShellReady, escapeHtml, formatDate, setPageFeedback } from "./dashboard-common.js";

const state={classes:[],members:[],sets:[],games:[],assignments:[],sessions:[]};
function code(){return Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n%32]).join("");}

async function loadData(){
  const uid=authManager.user.id;
  state.classes=await supabaseApi.select("classes",`select=id,name,class_code,school_name,academic_year,is_active,created_at&teacher_id=eq.${uid}&order=created_at.desc`);
  state.sets=await supabaseApi.select("question_sets",`select=id,title,description,subject,status,is_public,created_at,updated_at&owner_id=eq.${uid}&order=updated_at.desc`);
  state.games=await supabaseApi.rest("games",{query:"select=id,slug,title,icon,status,launch_path&status=eq.active&order=title",auth:false});
  const classIds=state.classes.map(x=>x.id);
  if(classIds.length){
    const filter=`(${classIds.join(',')})`;
    [state.members,state.assignments,state.sessions]=await Promise.all([
      supabaseApi.select("class_members",`select=class_id,student_id,joined_at,status,profiles!class_members_student_id_fkey(full_name,avatar,class_label)&class_id=in.${filter}&status=eq.active`),
      supabaseApi.select("assignments",`select=id,title,class_id,game_id,question_set_id,due_at,is_active,created_at,games(title,icon),question_sets(title)&class_id=in.${filter}&order=created_at.desc`),
      supabaseApi.select("game_sessions",`select=id,user_id,class_id,score,accuracy,result,verified,completed_at,games(title,icon),profiles!game_sessions_user_id_fkey(full_name,avatar)&class_id=in.${filter}&result=neq.abandoned&order=completed_at.desc&limit=100`)
    ]);
  }else{state.members=[];state.assignments=[];state.sessions=[];}
  render();
}

function render(){
  const classList=document.querySelector("[data-teacher-classes]");
  classList.innerHTML=state.classes.length?state.classes.map(c=>{const count=state.members.filter(m=>m.class_id===c.id).length;return `<article class="dashboard-list-item"><div><h3>${escapeHtml(c.name)}</h3><p>Kode <strong>${escapeHtml(c.class_code)}</strong> · ${count} siswa · ${escapeHtml(c.academic_year||"Tahun belum diisi")}</p></div><span class="badge-state">${c.is_active?"Aktif":"Nonaktif"}</span></article>`}).join(""):'<div class="empty-mini">Belum ada kelas. Buat kelas pertama Anda.</div>';

  const setList=document.querySelector("[data-teacher-sets]");
  setList.innerHTML=state.sets.length?state.sets.map(s=>`<article class="dashboard-list-item"><div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.subject)} · ${s.status} ${s.is_public?'· publik':''}</p></div><a class="button secondary" href="question-editor.html?set=${s.id}">Kelola</a></article>`).join(""):'<div class="empty-mini">Belum ada set soal.</div>';

  const assignmentList=document.querySelector("[data-teacher-assignments]");
  assignmentList.innerHTML=state.assignments.length?state.assignments.slice(0,8).map(a=>`<article class="dashboard-list-item"><div><h3>${escapeHtml(a.games?.icon||"🎮")} ${escapeHtml(a.title)}</h3><p>${escapeHtml(a.games?.title||"")} · ${a.due_at?formatDate(a.due_at):"Tanpa tenggat"}${a.question_sets?.title?` · ${escapeHtml(a.question_sets.title)}`:''}</p></div><div class="button-row"><span class="badge-state">${a.is_active?"Aktif":"Tutup"}</span><button class="button secondary" type="button" data-toggle-assignment="${a.id}" data-next-active="${a.is_active?'false':'true'}">${a.is_active?'Tutup':'Aktifkan'}</button></div></article>`).join(""):'<div class="empty-mini">Belum ada tugas.</div>';

  const resultBody=document.querySelector("[data-teacher-results]");
  resultBody.innerHTML=state.sessions.length?state.sessions.slice(0,20).map(s=>`<tr><td>${escapeHtml(s.profiles?.avatar||"👤")} ${escapeHtml(s.profiles?.full_name||"Siswa")}</td><td>${escapeHtml(s.games?.title||"Game")}</td><td>${Number(s.score).toLocaleString('id-ID')}</td><td>${Number(s.accuracy).toFixed(0)}%</td><td>${s.verified?'Ya':'Belum'}</td><td>${formatDate(s.completed_at,true)}</td></tr>`).join(""):'<tr><td colspan="6">Belum ada hasil siswa.</td></tr>';

  document.querySelector("[data-stat-classes]").textContent=state.classes.length;
  document.querySelector("[data-stat-students]").textContent=new Set(state.members.map(x=>x.student_id)).size;
  document.querySelector("[data-stat-sets]").textContent=state.sets.length;
  document.querySelector("[data-stat-sessions]").textContent=state.sessions.length;
  fillSelects();
}

function fillSelects(){
  document.querySelectorAll("[data-class-select]").forEach(select=>select.innerHTML='<option value="">Pilih kelas</option>'+state.classes.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} · ${escapeHtml(c.class_code)}</option>`).join(""));
  document.querySelectorAll("[data-game-select]").forEach(select=>select.innerHTML='<option value="">Pilih game</option>'+state.games.map(g=>`<option value="${g.id}">${escapeHtml(g.icon)} ${escapeHtml(g.title)}</option>`).join(""));
  document.querySelectorAll("[data-set-select]").forEach(select=>{select.innerHTML='<option value="">Pilih set terbitan</option>'+state.sets.filter(s=>s.status==="published").map(s=>`<option value="${s.id}">${escapeHtml(s.title)}</option>`).join("");select.disabled=true;});
  const note=document.querySelector('[data-set-support-note]');if(note)note.textContent='Pilih game terlebih dahulu. Set khusus digunakan oleh Jelajah Nusantara.';
}

function modal(name,show=true){const el=document.querySelector(`[data-modal="${name}"]`);if(el)el.hidden=!show;}

async function init(){
  if(!await authManager.requireAuth({roles:["teacher","admin"]}))return;
  dashboardShellReady();
  document.querySelectorAll("[data-open-modal]").forEach(btn=>btn.addEventListener("click",()=>modal(btn.dataset.openModal,true)));
  document.querySelectorAll("[data-close-modal]").forEach(btn=>btn.addEventListener("click",()=>modal(btn.closest('[data-modal]').dataset.modal,false)));
  document.querySelector("[data-create-class]")?.addEventListener("submit",async event=>{event.preventDefault();const f=new FormData(event.currentTarget);try{await supabaseApi.insert("classes",{teacher_id:authManager.user.id,name:String(f.get('name')).trim(),class_code:code(),school_name:String(f.get('schoolName')||authManager.profile.school_name||'').trim(),academic_year:String(f.get('academicYear')||'').trim(),is_active:true});modal('class',false);event.currentTarget.reset();setPageFeedback("Kelas berhasil dibuat.","success");await loadData();}catch(error){setPageFeedback(error.message,"error");}});
  document.querySelector("[data-create-set]")?.addEventListener("submit",async event=>{event.preventDefault();const f=new FormData(event.currentTarget);try{const rows=await supabaseApi.insert("question_sets",{owner_id:authManager.user.id,title:String(f.get('title')).trim(),description:String(f.get('description')||'').trim(),subject:String(f.get('subject')||'Campuran'),status:'draft',is_public:false});const id=rows?.[0]?.id;location.href=`question-editor.html?set=${id}`;}catch(error){setPageFeedback(error.message,"error");}});
  const assignmentForm=document.querySelector("[data-create-assignment]");
  assignmentForm?.querySelector('[data-game-select]')?.addEventListener('change',event=>{const game=state.games.find(item=>item.id===event.target.value);const setSelect=assignmentForm.querySelector('[data-set-select]');const supported=game?.slug==='jelajah-nusantara';setSelect.disabled=!supported;if(!supported)setSelect.value='';const note=assignmentForm.querySelector('[data-set-support-note]');if(note)note.textContent=supported?'Pilih set terbitan untuk tugas Jelajah Nusantara.':'Gobak Sodor memakai bank adaptif bawaan pada versi ini.';});
  assignmentForm?.addEventListener("submit",async event=>{event.preventDefault();const f=new FormData(event.currentTarget);try{const game=state.games.find(item=>item.id===f.get('gameId'));const setId=game?.slug==='jelajah-nusantara'?(f.get('questionSetId')||null):null;if(game?.slug==='jelajah-nusantara'&&!setId)throw new Error('Pilih set soal terbitan untuk tugas Jelajah Nusantara.');await supabaseApi.insert("assignments",{class_id:f.get('classId'),game_id:f.get('gameId'),question_set_id:setId,title:String(f.get('title')).trim(),instructions:String(f.get('instructions')||'').trim(),due_at:f.get('dueAt')?new Date(f.get('dueAt')).toISOString():null,is_active:true,created_by:authManager.user.id});modal('assignment',false);event.currentTarget.reset();setPageFeedback("Tugas berhasil diterbitkan.","success");await loadData();}catch(error){setPageFeedback(error.message,"error");}});
  document.addEventListener("click",async event=>{const button=event.target.closest("[data-toggle-assignment]");if(!button)return;button.disabled=true;try{await supabaseApi.update("assignments",`id=eq.${button.dataset.toggleAssignment}`,{is_active:button.dataset.nextActive==="true"});setPageFeedback(button.dataset.nextActive==="true"?"Tugas diaktifkan kembali.":"Tugas ditutup.","success");await loadData();}catch(error){setPageFeedback(error.message,"error");button.disabled=false;}});
  await loadData();
}

document.addEventListener("DOMContentLoaded",()=>init().catch(error=>setPageFeedback(error.message,"error")));
