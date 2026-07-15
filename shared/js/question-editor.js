import { authManager } from "./auth.js";
import { supabaseApi } from "./supabase-api.js";
import { dashboardShellReady, escapeHtml, setPageFeedback } from "./dashboard-common.js";

const state={sets:[],activeSet:null,questions:[],editing:null};
function setIdFromUrl(){return new URLSearchParams(location.search).get('set')||'';}

async function loadSets(){
  const uid=authManager.user.id;
  state.sets=await supabaseApi.select('question_sets',`select=id,title,description,subject,status,is_public,updated_at&owner_id=eq.${uid}&order=updated_at.desc`);
  const select=document.querySelector('[data-set-picker]');
  select.innerHTML='<option value="">Pilih set soal</option>'+state.sets.map(s=>`<option value="${s.id}">${escapeHtml(s.title)} · ${escapeHtml(s.status)}</option>`).join('');
  const requested=setIdFromUrl();
  if(requested&&state.sets.some(s=>s.id===requested))select.value=requested;
  else if(state.sets[0])select.value=state.sets[0].id;
  await selectSet(select.value);
}

async function selectSet(id){
  state.activeSet=state.sets.find(s=>s.id===id)||null;
  state.questions=[];state.editing=null;
  if(!state.activeSet){renderMeta();renderQuestions();return;}
  state.questions=await supabaseApi.rpc('teacher_get_questions',{p_question_set_id:id});
  history.replaceState(null,'',`question-editor.html?set=${id}`);
  renderMeta();renderQuestions();resetForm();
}

function renderMeta(){
  const s=state.activeSet;
  document.querySelector('[data-set-title]').textContent=s?.title||'Pilih atau buat set soal';
  document.querySelector('[data-set-description]').textContent=s?.description||'Editor menyimpan kunci jawaban melalui RPC aman.';
  document.querySelector('[data-set-status]').textContent=s?`${s.status}${s.is_public?' · publik':''}`:'Belum dipilih';
  document.querySelector('[data-question-count]').textContent=state.questions.length;
  const publish=document.querySelector('[data-publish-set]');if(publish){publish.disabled=!s;publish.textContent=s?.status==='published'?'Jadikan Draft':'Terbitkan Set';}
  document.querySelector('[data-question-form] fieldset').disabled=!s||s.status!=='draft';
  const lockNote=document.querySelector('[data-editor-lock-note]');if(lockNote){lockNote.hidden=!s||s.status==='draft';lockNote.textContent=s?.status==='published'?'Set terbitan dikunci. Jadikan draft sebelum mengubah soal.':'Set arsip tidak dapat diubah.';}
}

function renderQuestions(){
  const list=document.querySelector('[data-question-list]');
  if(!state.activeSet){list.innerHTML='<div class="empty-mini">Pilih set soal terlebih dahulu.</div>';return;}
  const editable=state.activeSet.status==='draft';
  list.innerHTML=state.questions.length?state.questions.map((q,i)=>`<article class="question-item"><div class="question-item-head"><div><span class="badge-state">${escapeHtml(q.category)}</span><h3>${i+1}. ${escapeHtml(q.prompt)}</h3></div>${editable?`<div class="button-row"><button class="button secondary" type="button" data-edit-question="${q.id}">Edit</button><button class="button danger-ghost" type="button" data-delete-question="${q.id}">Hapus</button></div>`:'<span class="badge-state">Terkunci</span>'}</div><p>${q.choices.map((c,index)=>`${index===q.correct_index?'✓':'○'} ${escapeHtml(c)}`).join(' · ')}</p></article>`).join(''):'<div class="empty-mini">Belum ada soal. Tambahkan minimal 10 soal sebelum digunakan dalam game.</div>';
}

function resetForm(){
  const form=document.querySelector('[data-question-form]');form.reset();form.questionId.value='';form.orderIndex.value=state.questions.length;document.querySelector('[data-form-title]').textContent='Tambah soal';state.editing=null;
}
function fillForm(q){const f=document.querySelector('[data-question-form]');state.editing=q;f.questionId.value=q.id;f.category.value=q.category;f.prompt.value=q.prompt;f.orderIndex.value=q.order_index;f.explanation.value=q.explanation||'';['choice0','choice1','choice2','choice3'].forEach((name,i)=>f[name].value=q.choices[i]||'');f.correctIndex.value=String(q.correct_index);document.querySelector('[data-form-title]').textContent='Edit soal';f.scrollIntoView({behavior:'smooth',block:'start'});}

async function saveQuestion(event){
  event.preventDefault();if(!state.activeSet)return;
  const f=new FormData(event.currentTarget);const rawChoices=[0,1,2,3].map(i=>String(f.get(`choice${i}`)||'').trim());
  const chosenCorrect=Number(f.get('correctIndex'));
  if(!rawChoices[chosenCorrect]){setPageFeedback('Pilihan yang ditandai sebagai jawaban benar tidak boleh kosong.','error');return;}
  const choices=rawChoices.filter(Boolean);
  const correctIndex=rawChoices.slice(0,chosenCorrect).filter(Boolean).length;
  if(choices.length<2){setPageFeedback('Minimal dua pilihan harus diisi.','error');return;}
  try{
    await supabaseApi.rpc('teacher_upsert_question',{p_question_set_id:state.activeSet.id,p_question_id:f.get('questionId')||null,p_category:String(f.get('category')||'Campuran'),p_prompt:String(f.get('prompt')||'').trim(),p_choices:choices,p_correct_index:correctIndex,p_explanation:String(f.get('explanation')||'').trim(),p_order_index:Number(f.get('orderIndex')||0)});
    setPageFeedback('Soal berhasil disimpan.','success');state.questions=await supabaseApi.rpc('teacher_get_questions',{p_question_set_id:state.activeSet.id});renderQuestions();renderMeta();resetForm();
  }catch(error){setPageFeedback(error.message,'error');}
}

async function init(){
  if(!await authManager.requireAuth({roles:['teacher','admin']}))return;dashboardShellReady();
  document.querySelector('[data-set-picker]').addEventListener('change',e=>selectSet(e.target.value).catch(error=>setPageFeedback(error.message,'error')));
  document.querySelector('[data-question-form]').addEventListener('submit',saveQuestion);
  document.querySelector('[data-cancel-edit]').addEventListener('click',resetForm);
  document.querySelector('[data-create-set-inline]').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const rows=await supabaseApi.insert('question_sets',{owner_id:authManager.user.id,title:String(f.get('title')).trim(),description:'',subject:String(f.get('subject')||'Campuran'),status:'draft',is_public:false});e.currentTarget.reset();await loadSets();document.querySelector('[data-set-picker]').value=rows[0].id;await selectSet(rows[0].id);setPageFeedback('Set soal dibuat.','success');}catch(error){setPageFeedback(error.message,'error');}});
  document.querySelector('[data-publish-set]').addEventListener('click',async()=>{if(!state.activeSet)return;if(state.questions.length<10&&state.activeSet.status!=='published'){setPageFeedback('Minimal 10 soal diperlukan sebelum set diterbitkan.','error');return;}const next=state.activeSet.status==='published'?'draft':'published';try{await supabaseApi.update('question_sets',`id=eq.${state.activeSet.id}`,{status:next,is_public:false});state.activeSet.status=next;state.activeSet.is_public=false;renderMeta();setPageFeedback(next==='published'?'Set berhasil diterbitkan.':'Set kembali menjadi draft.','success');}catch(error){setPageFeedback(error.message,'error');}});
  document.addEventListener('click',async e=>{const edit=e.target.closest('[data-edit-question]');if(edit){const q=state.questions.find(x=>x.id===edit.dataset.editQuestion);if(q)fillForm(q);}const del=e.target.closest('[data-delete-question]');if(del){if(!confirm('Hapus soal ini?'))return;try{await supabaseApi.rpc('teacher_delete_question',{p_question_id:del.dataset.deleteQuestion});state.questions=state.questions.filter(x=>x.id!==del.dataset.deleteQuestion);renderQuestions();renderMeta();setPageFeedback('Soal dihapus.','success');}catch(error){setPageFeedback(error.message,'error');}}});
  await loadSets();
}
document.addEventListener('DOMContentLoaded',()=>init().catch(error=>setPageFeedback(error.message,'error')));
