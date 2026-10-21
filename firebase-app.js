import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,updateProfile} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,getDocs,query,orderBy,limit,writeBatch,increment,serverTimestamp,onSnapshot,runTransaction} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {defaultAvatar,choices,avSvg,avHtml} from './firebase-avatar.js';
const config={apiKey:'AIzaSyC5c1ZCjTLcNZeuSTcVdSulEuvgaRRecW4',authDomain:'estudamais-d319f.firebaseapp.com',projectId:'estudamais-d319f',storageBucket:'estudamais-d319f.firebasestorage.app',messagingSenderId:'534502111585',appId:'1:534502111585:web:7b90fe11254cc7fd81ed20'};
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const schoolYears=['Pré-Escolar',...Array.from({length:12},(_,i)=>(i+1)+'.º ano')];
const yearOptions=selected=>'<option value="">Escolhe o ano</option>'+schoolYears.map(y=>'<option value="'+esc(y)+'" '+(y===selected?'selected':'')+'>'+esc(y)+'</option>').join('');
const portugalDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const quizKey=()=>Array.from(new TextEncoder().encode(location.pathname)).map(b=>b.toString(16).padStart(2,'0')).join('');
let dailyLocked=false;
const isQuiz=!!document.getElementById('result') && !!document.querySelector('button[onclick*="correct"], #check, #finish, button[onclick*="corrig"]');
let user=null,profile=null,history=[],ranking=[],unsubscribe=null,started=0,clock=null,recorded=false,creatingAccount=false,editorDraft={...defaultAvatar};
const fmt=n=>{n=Math.max(0,Math.floor(n));return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':')};
const el=(tag,attrs={},text='')=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e};
const css=el('style');css.textContent=`#epboot{position:fixed;inset:0;z-index:2147483000;background:#edf4fc;display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,-apple-system,sans-serif;color:#19314f}#epboot>div{width:min(460px,100%);background:white;padding:28px;border-radius:20px;box-shadow:0 10px 40px #1234;text-align:center}#epboot h2{margin-top:0}#epboot p{line-height:1.5}#epboot a{color:#1769bd}#epbooterror{font-size:14px;color:#9b2c2c}#epboot button{background:#1b65b4;color:white;border:0;padding:11px 17px;border-radius:9px;cursor:pointer}#epboot button[hidden]{display:none}.epbook{position:relative;width:100px;height:76px;margin:8px auto 22px;perspective:500px;filter:drop-shadow(0 7px 6px #193e7033)}.epbook .epcover{position:absolute;inset:5px 3px 0;border-radius:4px 9px 9px 4px;background:#2366b1;transform:skewY(-3deg)}.epbook .epleft,.epbook .epright{position:absolute;top:10px;bottom:8px;width:47px;background:#fffef6;border:2px solid #c8d9e8}.epbook .epleft{left:5px;border-radius:8px 2px 2px 5px;transform:skewY(7deg)}.epbook .epright{right:5px;border-radius:2px 8px 5px 2px;transform:skewY(-7deg)}.epbook .eppage{position:absolute;top:11px;left:50%;width:44px;height:57px;border-radius:2px 7px 6px 2px;background:linear-gradient(90deg,#dce9f5,#fffdf5 18%,#fffdf5 90%,#e2ebf3);border:1px solid #cbdbe9;transform-origin:left center;animation:epflip 1.65s ease-in-out infinite}.epbook .eppage:nth-last-child(2){animation-delay:.36s}.epbook .eppage:last-child{animation-delay:.72s}@keyframes epflip{0%,13%{transform:rotateY(0deg)}60%,100%{transform:rotateY(-178deg)}}@media(prefers-reduced-motion:reduce){.epbook .eppage{animation:none}}#epbar{position:sticky;top:0;z-index:10000;background:#102f54;color:white;padding:10px 14px;display:flex;gap:9px;align-items:center;flex-wrap:wrap;font:600 14px system-ui}#epbar button,.epbtn{border:0;border-radius:9px;padding:10px 13px;background:#dbeafe;color:#163b63;font:600 14px system-ui;cursor:pointer}#epbar .epgrow{flex:1}#epbar .epclock{background:white;color:#102f54;padding:9px 12px;border-radius:9px;font-variant-numeric:tabular-nums}#epoverlay{position:fixed;inset:0;background:#071a32d9;z-index:100001;display:flex;align-items:center;justify-content:center;padding:12px;font:15px system-ui;color:#19314f}#epoverlay .epbox{background:#fff;width:min(660px,100%);max-height:95vh;overflow:auto;padding:22px;border-radius:18px;box-shadow:0 15px 45px #0004}#epoverlay input:not([type=checkbox]){box-sizing:border-box;width:100%;padding:12px;border:1px solid #adbed4;border-radius:9px;font:16px system-ui;margin:6px 0 12px}#epoverlay label{display:block;font-weight:650}#epoverlay .epbtn.primary{background:#2066b2;color:white}#epoverlay .epactions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#epmessage{min-height:25px;color:#a32929;font-weight:600}#epoverlay .ephelp{color:#61758e;font-size:13px}#epavatargrid{display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px;max-height:410px}#epavatarpreview{display:flex;align-items:center;justify-content:center;background:#e8f2ff;border-radius:14px;min-height:280px}#epavatarfields{overflow:auto;max-height:410px}#epavatarfields fieldset{border:1px solid #d7e2ee;border-radius:12px;margin:0 0 10px;padding:10px}#epavatarfields legend{font-weight:700}#epavatarfields button{border:2px solid #d6e1ed;border-radius:9px;padding:7px;background:white;cursor:pointer;margin:3px;font:13px system-ui}#epavatarfields button[aria-pressed=true]{border-color:#1668bd;background:#e6f1ff}#epavatarfields button.epcolor{width:33px;height:33px;border-radius:50%}#epranking,#ephistory{font:15px system-ui}#ephistory table,#epranking table{width:100%;border-collapse:collapse}#ephistory th,#ephistory td,#epranking th,#epranking td{padding:9px 5px;text-align:left;border-bottom:1px solid #e1e8f0}#ephistory{overflow:auto}#epbar svg{vertical-align:middle}@media(max-width:560px){#epavatargrid{grid-template-columns:1fr;grid-template-rows:190px minmax(0,1fr);max-height:55vh}#epavatarpreview{min-height:0}#epavatarpreview svg{height:185px;width:auto}#epavatarfields{max-height:100%}}`;
css.textContent+=`#epwelcome{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483001;width:min(92vw,540px);font:16px system-ui,-apple-system,sans-serif;color:#19314f;animation:epwelcome-in .35s ease-out}#epwelcome .epwelcome-card{position:relative;background:#fff;border:2px solid #d8e8fa;border-radius:18px;box-shadow:0 12px 35px #142e5266;padding:22px 44px 20px 18px;display:flex;gap:14px;align-items:center}#epwelcome .epwelcome-avatar svg{width:70px;height:86px}#epwelcome strong{font-size:19px}#epwelcome p{margin:8px 0 0;line-height:1.45}#epwelcome .epwelcome-close{position:absolute;right:10px;top:8px;background:transparent;border:0;font-size:27px;color:#19314f;cursor:pointer}@keyframes epwelcome-in{from{opacity:0;transform:translate(-50%,-15px)}to{opacity:1;transform:translate(-50%,0)}}@media(prefers-reduced-motion:reduce){#epwelcome{animation:none}}`;
css.textContent+=' .epstat{background:#eff5ff;border-radius:12px;padding:14px;text-align:center;display:flex;flex-direction:column;gap:5px}.epstat strong{font-size:25px;color:#164b88}.epstat span{font-size:12px;color:#506681}';
document.head.appendChild(css);
const bar=el('div',{id:'epbar'});bar.innerHTML='<strong>📚 Estuda+</strong><span id="epwho"></span><span class="epgrow"></span>'+(isQuiz?'<span class="epclock" id="eptimer">⏱ 00:00:00</span>':'')+'<button id="ephbtn" type="button">📋 Histórico</button><button id="epavbtn" type="button">🎨 Avatar</button><button id="eplogout" type="button">Sair</button>';
document.body.prepend(bar);
const overlay=el('div',{id:'epoverlay'});overlay.innerHTML='<div class="epbox" role="dialog" aria-modal="true"><h2 id="eptitle">🔐 Entrar no Estuda+</h2><div id="epcontent"></div><p id="epmessage" role="alert"></p></div>';document.body.appendChild(overlay);
const content=overlay.querySelector('#epcontent'),msg=overlay.querySelector('#epmessage');
const bootScreen=document.getElementById('epboot');if(bootScreen)bootScreen.remove();
function message(t,good=false){msg.style.color=good?'#087544':'#a32929';msg.textContent=t}
function show(html,title){overlay.style.display='flex';overlay.querySelector('#eptitle').textContent=title;content.innerHTML=html;message('')}
function hide(){overlay.style.display='none';message('')}
function authError(e){const codes={'auth/email-already-in-use':'Esse email já está registado.','auth/invalid-email':'O email não é válido.','auth/weak-password':'Escolhe uma password mais segura.','auth/invalid-credential':'Email ou password incorretos.','auth/too-many-requests':'Demasiadas tentativas. Experimenta mais tarde.','auth/operation-not-allowed':'Ativa Email/Password no Firebase Authentication.','auth/network-request-failed':'Falha de ligação. Verifica a internet.','permission-denied':'Acesso negado. Publica as regras do Firestore incluídas no ZIP.'};return codes[e.code]||e.message||'Não foi possível concluir a operação.'}
function authView(mode='login'){
 const reg=mode==='register',reset=mode==='reset';
 show('<form id="epform">'+(reg?'<label>Nome ou pseudónimo<input id="epname" maxlength="32" autocomplete="nickname" required></label>':'')+'<label>Email<input id="epemail" type="email" autocomplete="email" required></label>'+(reset?'':'<label>Password<input id="eppass" type="password" minlength="6" autocomplete="'+(reg?'new-password':'current-password')+'" required></label>')+(reg?'<label>Tipo de conta<select id="epaccounttype" style="box-sizing:border-box;width:100%;padding:12px;margin:6px 0 12px"><option value="student">Aluno</option><option value="guardian">Encarregado de educação</option></select></label><label id="epyearwrap">Ano de escolaridade<select id="epyear" required style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #adbed4;border-radius:9px;font:16px system-ui;margin:6px 0 12px">'+yearOptions('')+'</select></label>':'')+(reg?'<label style="font-weight:400"><input type="checkbox" id="epconsent" required> Confirmo que sou o encarregado de educação ou tenho autorização para criar esta conta.</label><p class="ephelp">Não uses o nome completo da criança. O ranking é opcional e vem desativado.</p>':'')+'<div class="epactions"><button class="epbtn primary" type="submit">'+(reg?'Criar conta':reset?'Enviar email de recuperação':'Entrar')+'</button><button class="epbtn" type="button" id="epswitchmode">'+(reg?'Já tenho conta':reset?'Voltar ao login':'Criar conta')+'</button>'+(reg||reset?'':'<button class="epbtn" type="button" id="epforgot">Esqueci-me da password</button>')+'</div></form>',reg?'📝 Criar conta no Estuda+':reset?'🔑 Recuperar password':'🔐 Entrar no Estuda+');
 const form=content.querySelector('#epform');
 if(reg){const type=content.querySelector('#epaccounttype'),year=content.querySelector('#epyear'),wrap=content.querySelector('#epyearwrap');type.onchange=()=>{const isParent=type.value==='guardian';wrap.style.display=isParent?'none':'';year.required=!isParent;if(isParent)year.value=''};}
 content.querySelector('#epswitchmode').onclick=()=>authView(reg||reset?'login':'register');
 if(!reg&&!reset)content.querySelector('#epforgot').onclick=()=>authView('reset');
 form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;message('Aguarda... ',true);
 try{const email=content.querySelector('#epemail').value.trim(),pass=content.querySelector('#eppass')?.value;
 if(reset){await sendPasswordResetEmail(auth,email);message('Se existir uma conta com este email, receberás instruções para recuperar a password.',true);return}
 if(reg){const name=document.getElementById('epname').value.trim(),role=document.getElementById('epaccounttype').value,schoolYear=role==='guardian'?'':document.getElementById('epyear').value;if(role!=='guardian'&&!schoolYears.includes(schoolYear))throw Error('Escolhe o ano escolar.');if(name.length<2)throw Error('O nome deve ter pelo menos dois caracteres.');if(!document.getElementById('epconsent').checked)throw Error('É necessária a confirmação do encarregado de educação.');creatingAccount=true;const cred=await createUserWithEmailAndPassword(auth,email,pass);await updateProfile(cred.user,{displayName:name});await setDoc(doc(db,'users',cred.user.uid),{name,schoolYear,role,avatar:defaultAvatar,rankingOptIn:false,completed:0,points:0,createdAt:serverTimestamp()});creatingAccount=false;await initSession(cred.user);}
 else await signInWithEmailAndPassword(auth,email,pass);
 }catch(err){creatingAccount=false;message(authError(err))}finally{btn.disabled=false}};
}
async function ensureProfile(u){const ref=doc(db,'users',u.uid);const snap=await getDoc(ref);if(snap.exists())return snap.data();const name=(u.displayName||'Aluno').slice(0,32);const obj={name,schoolYear:'',avatar:defaultAvatar,rankingOptIn:false,completed:0,points:0,createdAt:serverTimestamp()};await setDoc(ref,obj);return obj}
function updateBar(){bar.querySelector('#epwho').innerHTML=user&&profile?'<span style="display:inline-flex;align-items:center;gap:5px">'+avHtml(profile.avatar)+' '+esc(profile.name)+'</span>':''}
// Mensagem de boas-vindas: um único aviso por sessão autenticada.
// A última visita é guardada neste navegador, separadamente por UID.
function welcomeUser(){
 if(!user||!profile||isQuiz)return;
 const uid=user.uid,sessionKey='ep_welcomed_'+uid,visitKey='ep_last_visit_'+uid;
 try{
  if(sessionStorage.getItem(sessionKey)==='1')return;
  const previous=localStorage.getItem(visitKey);
  const parsed=previous?new Date(previous):null;
  const valid=parsed&&!Number.isNaN(parsed.getTime())&&parsed.getTime()<=Date.now();
  const date=valid?parsed.toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'}):null;
  const name=String(profile.name||'aluno');
  const toast=el('div',{id:'epwelcome',role:'status','aria-live':'polite'});
  toast.innerHTML='<div class="epwelcome-card"><button type="button" class="epwelcome-close" aria-label="Fechar mensagem">×</button><div class="epwelcome-avatar">'+avHtml(profile.avatar)+'</div><div><strong>'+esc(date?'👋 Bem-vindo de volta, '+name+'!':'🎉 Bem-vindo ao Estuda+, '+name+'!')+'</strong><p>'+esc(date?'Já não te víamos desde '+date+'. Vamos estudar?':'A tua aventura de aprendizagem começa agora. Vamos estudar?')+'</p></div></div>';
  document.body.appendChild(toast);
  const close=()=>toast.remove();toast.querySelector('button').onclick=close;
  setTimeout(close,6500);
  sessionStorage.setItem(sessionKey,'1');
  localStorage.setItem(visitKey,new Date().toISOString());
 }catch(e){console.warn('Não foi possível mostrar as boas-vindas.',e)}
}
function startClock(){if(!isQuiz||!user||started)return;started=Date.now();clock=setInterval(()=>{const t=document.getElementById('eptimer');if(t)t.textContent='⏱ '+fmt((Date.now()-started)/1000)},1000)}
function stopClock(){if(clock)clearInterval(clock);clock=null}
function editor(){editorDraft={...defaultAvatar,...(profile?.avatar||{})};show('<div id="epavatargrid"><div id="epavatarpreview"></div><div id="epavatarfields"></div></div><label style="margin-top:14px">Ano de escolaridade<select id="epyearprofile" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #adbed4;border-radius:9px;font:16px system-ui;margin:6px 0 12px">'+yearOptions(profile?.schoolYear||'')+'</select></label><label style="font-weight:400;margin-top:14px"><input id="eppublic" type="checkbox" '+(profile?.rankingOptIn?'checked':'')+'> Mostrar o meu pseudónimo e avatar no ranking público</label><p class="ephelp">Podes desativar esta opção a qualquer momento. O histórico e o email nunca são públicos.</p><div class="epactions"><button type="button" class="epbtn primary" id="epsaveav">Guardar alterações</button><button type="button" class="epbtn" id="epcancelav">Cancelar</button></div>','🎨 Personalizar avatar');
 const fields=document.getElementById('epavatarfields');fields.innerHTML=choices.map(([key,label,values])=>'<fieldset><legend>'+esc(label)+'</legend>'+values.map(([v,t])=>'<button type="button" data-key="'+esc(key)+'" data-value="'+esc(v)+'" aria-label="'+esc(t)+'" aria-pressed="'+(editorDraft[key]===v)+'" '+(['skin','hair','shirt','pants','shoes','background'].includes(key)?'class="epcolor" style="background:'+v+'" title="'+esc(t)+'"':'')+'>'+(['skin','hair','shirt','pants','shoes','background'].includes(key)?'':esc(t))+'</button>').join('')+'</fieldset>').join('');
 const preview=document.getElementById('epavatarpreview');preview.innerHTML=avHtml(editorDraft,true);
 fields.onclick=e=>{const b=e.target.closest('[data-key]');if(!b)return;editorDraft[b.dataset.key]=b.dataset.value;fields.querySelectorAll('[data-key="'+b.dataset.key+'"]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.value===b.dataset.value)));preview.innerHTML=avHtml(editorDraft,true)};
 document.getElementById('epcancelav').onclick=hide;
 document.getElementById('epsaveav').onclick=async()=>{const opt=document.getElementById('eppublic').checked,schoolYear=document.getElementById('epyearprofile').value;if(schoolYear&&!schoolYears.includes(schoolYear)){message('Ano escolar inválido.');return}try{const batch=writeBatch(db);batch.update(doc(db,'users',user.uid),{avatar:editorDraft,rankingOptIn:opt,schoolYear:schoolYear||''});const r=doc(db,'ranking',user.uid);if(opt)batch.set(r,{name:profile.name,avatar:editorDraft,completed:profile.completed||0,points:profile.points||0});else batch.delete(r);await batch.commit();profile={...profile,avatar:{...editorDraft},rankingOptIn:opt,schoolYear:schoolYear||''};updateBar();hide();await loadRanking()}catch(e){message(authError(e))}};
}
async function loadHistory(){if(!user)return;const snap=await getDocs(query(collection(db,'users',user.uid,'history'),orderBy('date','desc'),limit(500)));history=snap.docs.map(x=>({id:x.id,...x.data()}));}
async function loadRanking(){try{const snap=await getDocs(query(collection(db,'ranking'),orderBy('points','desc'),limit(100)));ranking=snap.docs.map(x=>x.data()).filter(x=>Number(x.completed||0)>0);renderRanking()}catch(e){const t=document.getElementById('eprankingtable');if(t)t.textContent='Não foi possível carregar o ranking: '+authError(e)}}
function renderRanking(){const t=document.getElementById('eprankingtable');if(!t)return;
 const rows=ranking.filter(x=>Number(x.completed||0)>0).sort((a,b)=>Number(b.points||0)-Number(a.points||0)||Number(b.completed||0)-Number(a.completed||0));
 let previous=null,rank=0;
 t.innerHTML=rows.length?'<table><thead><tr><th>Posição</th><th>Aluno</th><th>Pontos</th><th>Fichas</th></tr></thead><tbody>'+rows.map((x,i)=>{const points=Number(x.points||0);if(points!==previous){rank=i+1;previous=points}return '<tr><td>'+(rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'')+' '+rank+'.º</td><td>'+avHtml(x.avatar)+' '+esc(x.name)+'</td><td>'+points+'</td><td>'+Number(x.completed||0)+'</td></tr>'}).join('')+'</tbody></table>':'<p>Ainda não existem alunos classificados. Conclui uma ficha para começares! A participação é opcional.</p>';
}
function scoreInfo(text){
 const raw=String(text||'');
 // Formato habitual: "Resultado: 6 de 8" ou "Resultado: 6/8".
 let m=raw.match(/Resultado:\s*(\d+)\s*(?:de|\/)\s*(\d+)/i);
 // Fichas de Ciências do 5.º ano: "Resultado: 75%" e "6 respostas certas em 8".
 if(!m){
  const counts=raw.match(/(\d+)\s+respostas?\s+certas?\s+em\s+(\d+)/i);
  const pct=raw.match(/Resultado:\s*(\d+)\s*%/i);
  if(!counts||!pct)return null;
  const correct=Number(counts[1]),total=Number(counts[2]),reported=Number(pct[1]);
  if(!Number.isInteger(correct)||!Number.isInteger(total)||total<1||correct<0||correct>total||reported!==Math.round(100*correct/total))return null;
  m=counts;
 }
 const correct=Number(m[1]),total=Number(m[2]);
 if(!Number.isInteger(correct)||!Number.isInteger(total)||total<1||correct<0||correct>total)return null;
 const percent=Math.round(100*correct/total);
 const points=10+correct*5+(correct===total?30:percent>=80?20:0);
 return {correct,total,percent,points};
}
function historyView(){show('<p>O histórico pertence apenas à tua conta. São apresentados os 500 resultados mais recentes.</p><div id="ephistory"></div><div class="epactions"><button type="button" class="epbtn" id="epexport">Exportar CSV</button><button type="button" class="epbtn primary" id="epclose">Fechar</button></div>','📋 O meu histórico');const t=document.getElementById('ephistory');t.innerHTML=history.length?'<table><thead><tr><th>Data</th><th>Ano / Disciplina</th><th>Teste</th><th>Resultado</th><th>Tempo</th></tr></thead><tbody>'+history.map(x=>'<tr><td>'+esc(x.date?new Date(x.date).toLocaleString('pt-PT'):'—')+'</td><td>'+esc(x.year)+' / '+esc(x.subject)+'</td><td>'+esc(x.title)+'</td><td>'+esc(x.score)+'</td><td>'+esc(x.duration)+'</td></tr>').join('')+'</tbody></table>':'Ainda não existem testes concluídos.';document.getElementById('epclose').onclick=hide;document.getElementById('epexport').onclick=()=>{const rows=[['Data','Ano','Disciplina','Teste','Resultado','Segundos'],...history.map(x=>[x.date,x.year,x.subject,x.title,x.score,x.seconds])];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');const a=el('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='estudamais_historico.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}

function lockQuiz(){
 if(!isQuiz)return;
 stopClock();
 const buttons=[...document.querySelectorAll('button')].filter(b=>!b.closest('#epbar,#epoverlay')&&/corrig|verificar|terminar|concluir|check|repetir|reiniciar|reset/i.test((b.textContent||'')+' '+b.id+' '+(b.getAttribute('onclick')||'')));
 buttons.forEach(b=>{b.disabled=true;b.title='Ficha concluída hoje — disponível amanhã';b.style.opacity='.5'});
}
async function checkDailyLock(){
 if(!user||!isQuiz)return;
 const today=portugalDay(),ref=doc(db,'users',user.uid,'daily',today+'_'+quizKey());
 const snap=await getDoc(ref);dailyLocked=snap.exists();
 if(dailyLocked){lockQuiz();const note=el('div',{id:'epdailylock',role:'status'});note.style='background:#fff4df;border:2px solid #efc66d;border-radius:12px;padding:16px;margin:16px 0;color:#67460b;font-weight:700';note.textContent='🔒 Já concluíste esta ficha hoje. Podes voltar amanhã para ganhar novos pontos!';document.querySelector('main')?.prepend(note)||bar.insertAdjacentElement('afterend',note)}
}
function celebrate(score){
 const title=score.percent===100?'🏆 Perfeito!':score.percent>=80?'🌟 Parabéns!':score.percent>=50?'👏 Bom esforço!':'💪 Continua a praticar!';
 const desc=score.percent===100?'Acertaste em todas as perguntas!':score.percent>=80?'Excelente resultado! Continua assim!':score.percent>=50?'Estás no bom caminho.':'Cada tentativa ajuda-te a aprender.';
 const notice=el('div',{role:'status','aria-live':'polite'});notice.style='margin:15px 0;padding:20px;border-radius:16px;border:2px solid #b9d9f6;background:#f1f8ff;text-align:center;font:600 17px system-ui;color:#193e70';notice.innerHTML='<div style="font-size:26px">'+title+'</div><p>'+desc+'</p><strong>'+score.percent+'% de respostas certas</strong>';
 document.getElementById('epresultnotice')?.insertAdjacentElement('afterend',notice);
}

async function detectResult(){if(!user||!isQuiz||recorded||dailyLocked)return;
 const result=document.getElementById('result'),txt=result?.textContent?.trim()||'',score=scoreInfo(txt);if(!score){if(txt && /resultado/i.test(txt)){let warning=document.getElementById('epresultnotice');if(!warning){warning=el('p',{id:'epresultnotice'});result.insertAdjacentElement('afterend',warning)}warning.textContent='Não foi possível interpretar o resultado desta ficha. O resultado ainda não foi guardado.';warning.style.color='#a32929'}return;}
 const radios=[...document.querySelectorAll('input[type="radio"]')];if(!radios.some(r=>r.checked)){let warning=document.getElementById('epresultnotice');if(!warning){warning=el('p',{id:'epresultnotice'});result.insertAdjacentElement('afterend',warning)}warning.textContent='Seleciona pelo menos uma resposta para guardar a ficha.';warning.style.color='#a32929';return;}
 recorded=true;stopClock();const parts=location.pathname.split('/').filter(Boolean),folder=parts[parts.length-2]||'',year=/^\d+ano$/.test(folder)?folder.replace('ano','.º ano'):'—';const seconds=started?Math.round((Date.now()-started)/1000):0;
 const item={date:new Date().toISOString(),year,subject:(document.querySelector('header p')?.textContent||'').split('·')[0].trim().slice(0,80)||'—',title:(document.querySelector('h1')?.textContent||document.title).trim().slice(0,150),score:txt.slice(0,150),seconds,duration:fmt(seconds),file:location.pathname};
 const oldNotice=document.getElementById('epresultnotice');if(oldNotice)oldNotice.remove();const notice=el('p',{id:'epresultnotice'});notice.style='font-weight:700;color:#a32929';notice.textContent='A guardar o resultado...';result?.insertAdjacentElement('afterend',notice);
 try{
  const key=quizKey(),day=portugalDay();
  const userRef=doc(db,'users',user.uid),bestRef=doc(db,'users',user.uid,'best',key),rankingRef=doc(db,'ranking',user.uid),historyRef=doc(collection(db,'users',user.uid,'history'));
  const dayRef=doc(db,'users',user.uid,'daily',day+'_'+key);
  const change=await runTransaction(db,async tx=>{
   const [uSnap,dSnap]=await Promise.all([tx.get(userRef),tx.get(dayRef)]);
   if(!uSnap.exists())throw Error('Perfil não encontrado.');
   if(dSnap.exists())return {duplicate:true,newCompleted:Number(uSnap.data().completed||0),newPoints:Number(uSnap.data().points||0),gain:0};
   const u=uSnap.data(),gain=score.points;
   const newCompleted=Number(u.completed||0)+1,newPoints=Number(u.points||0)+gain;
   tx.set(dayRef,{file:location.pathname,day,points:gain,createdAt:serverTimestamp()});
   tx.update(userRef,{completed:newCompleted,points:newPoints});
   if(u.rankingOptIn)tx.set(rankingRef,{name:u.name,avatar:u.avatar,completed:newCompleted,points:newPoints});
   tx.set(historyRef,item);
   return {gain,newCompleted,newPoints,duplicate:false};
  });
  if(change.duplicate){dailyLocked=true;notice.style.color='#a32929';notice.textContent='Esta ficha já foi concluída hoje. Volta amanhã para ganhares novos pontos.';lockQuiz();return;}
  dailyLocked=true;lockQuiz();
  history.unshift(item);profile.completed=change.newCompleted;profile.points=change.newPoints;
  notice.style.color='#087544';notice.textContent='✓ Resultado guardado · '+score.points+' pontos nesta ficha · +'+change.gain+' pontos no ranking · Tempo: '+fmt(seconds);
  celebrate(score);
  await loadRanking();
 }catch(e){recorded=false;notice.textContent='O resultado ainda não foi guardado: '+authError(e)+' ';const retry=el('button',{type:'button',class:'epbtn'});retry.textContent='Tentar guardar novamente';retry.onclick=()=>{retry.disabled=true;notice.remove();detectResult()};notice.append(retry)}
}
// A correção de cada ficha escreve em #result. Observar o resultado é mais seguro
// do que depender do texto ou do onclick de um botão específico.
if(isQuiz){
 const resultNode=document.getElementById('result');
 if(resultNode){
  let pending=null;
  const observer=new MutationObserver(()=>{
   if(pending)clearTimeout(pending);
   pending=setTimeout(()=>{pending=null;detectResult()},60);
  });
  observer.observe(resultNode,{childList:true,characterData:true,subtree:true});
 }
}
if(isQuiz)document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const str=((b.textContent||'')+' '+(b.id||'')+' '+(b.getAttribute('onclick')||'')).toLowerCase();if(/corrig|verificar|terminar|concluir|check/.test(str))setTimeout(detectResult,180);if(/repetir|reiniciar|reset/.test(str)&&!dailyLocked){recorded=false;stopClock();started=0;setTimeout(startClock,50)}},true);
// V52 — painel de progresso calculado apenas a partir do histórico confirmado no Firestore.
function epLocalDay(value){
 const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function epScorePercent(value){
 const m=String(value||'').match(/(\d+)\s*(?:de|\/)\s*(\d+)/i);
 if(m&&Number(m[2])>0)return Math.round(Number(m[1])*100/Number(m[2]));
 const pct=String(value||'').match(/(\d{1,3})\s*%/);return pct?Math.min(100,Number(pct[1])):null;
}
function epProgressView(){
 const valid=history.filter(x=>x&&x.date&&!Number.isNaN(new Date(x.date).getTime()));
 const today=portugalDay(),todayItems=valid.filter(x=>epLocalDay(x.date)===today);
 const uniqueToday=new Set(todayItems.map(x=>x.file||x.title));
 const subjectsToday=new Set(todayItems.map(x=>x.subject).filter(Boolean));
 const days=[...new Set(valid.map(x=>epLocalDay(x.date)).filter(Boolean))].sort().reverse();
 let streak=0;let cursor=new Date();
 // A série mantém-se quando o aluno ainda não estudou hoje, mas estudou ontem.
 if(!days.includes(today))cursor.setDate(cursor.getDate()-1);
 for(let i=0;i<365;i++){
  const key=epLocalDay(cursor.toISOString());if(!days.includes(key))break;
  streak++;cursor.setDate(cursor.getDate()-1);
 }
 const percent=valid.map(x=>epScorePercent(x.score)).filter(x=>x!==null);
 const avg=percent.length?Math.round(percent.reduce((a,b)=>a+b,0)/percent.length):null;
 const newest=percent.slice(0,Math.min(5,percent.length));
 const older=percent.slice(5,10);
 const recentAvg=newest.length?Math.round(newest.reduce((a,b)=>a+b,0)/newest.length):null;
 const olderAvg=older.length?Math.round(older.reduce((a,b)=>a+b,0)/older.length):null;
 const perfect=percent.filter(n=>n===100).length;
 const awards=[
  ['🌱','Primeira ficha',valid.length>=1],['📚','10 fichas realizadas',valid.length>=10],
  ['🎯','50 fichas realizadas',valid.length>=50],['🏆','Resultado perfeito',perfect>=1],
  ['🔥','3 dias consecutivos',streak>=3],['⭐','7 dias consecutivos',streak>=7],
  ['🧠','5 fichas com 80% ou mais',percent.filter(n=>n>=80).length>=5]
 ];
 const tasks=[['Concluir 1 ficha',uniqueToday.size>=1,uniqueToday.size+'/1'],
 ['Concluir 3 fichas diferentes',uniqueToday.size>=3,Math.min(uniqueToday.size,3)+'/3'],
 ['Estudar 2 disciplinas',subjectsToday.size>=2,Math.min(subjectsToday.size,2)+'/2']];
 const cards=awards.map(([icon,name,done])=>'<div style="border:1px solid #d6e3f3;border-radius:12px;padding:12px;background:'+(done?'#ecf9ee':'#f5f7fa')+'"><div style="font-size:26px">'+icon+'</div><strong>'+esc(name)+'</strong><div style="font-size:13px">'+(done?'✓ Conquistada':'Por conquistar')+'</div></div>').join('');
 const tasksHtml=tasks.map(([name,done,progress])=>'<li style="margin:10px 0">'+(done?'✅':'⬜')+' '+esc(name)+' — '+progress+'</li>').join('');
 const change=olderAvg===null?'Completa mais fichas para comparar dois grupos de resultados.':
  (recentAvg>olderAvg?'📈 Melhoraste ':recentAvg<olderAvg?'📉 Diferença de ':'➡️ Mantiveste ') +
  (recentAvg===olderAvg?'a tua média.':Math.abs(recentAvg-olderAvg)+' pontos percentuais face às cinco fichas anteriores.');
 show('<p>As conquistas são simbólicas: não acrescentam pontos ao ranking. Os desafios reiniciam à meia-noite de Portugal.</p>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px;margin:14px 0">'+
 '<div class="epstat"><strong>'+valid.length+'</strong><span>Fichas no histórico</span></div>'+
 '<div class="epstat"><strong>'+(avg===null?'—':avg+'%')+'</strong><span>Média de acertos</span></div>'+
 '<div class="epstat"><strong>'+streak+'</strong><span>Dias seguidos</span></div></div>'+
 '<h3>🎯 Desafios de hoje</h3><ul style="padding-left:22px">'+tasksHtml+'</ul>'+
 '<h3>🏅 Medalhas e conquistas</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+cards+'</div>'+
 '<h3>📈 Evolução pessoal</h3><p>'+esc(change)+'</p>'+
 '<p class="ephelp">Os cálculos usam até 500 resultados recentes do histórico. A média só inclui fichas cujo resultado permite identificar a percentagem. As medalhas são recalculadas a partir do histórico.</p>'+
 '<div class="epactions"><button class="epbtn primary" id="epprogressclose">Fechar</button></div>', '🌟 As minhas conquistas');
 document.getElementById('epprogressclose').onclick=hide;
}
function rankingPanel(){if(!/\/(?:index\.html)?$/.test(location.pathname))return;const main=document.querySelector('main');if(!main)return;const panel=el('section',{id:'epranking',class:'panel'});panel.innerHTML='<h2>🏆 Ranking dos alunos</h2><p>Participação voluntária. Apenas pseudónimos e avatares são visíveis aos utilizadores autenticados. Pontos por acertos e esforço; cada ficha conta uma vez por dia e pode voltar a dar pontos no dia seguinte.</p><div id="eprankingtable">A carregar...</div>';main.prepend(panel)}
// V53 — recomendações locais baseadas apenas no histórico autenticado.
const epNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const epYearFolder=y=>y==='Pré-Escolar'?'pre-escolar':(/^\d+\.º ano$/.test(y||'')?y.split('.')[0]+'ano':'');
function epFileKey(p){const a=String(p||'').split('/').filter(Boolean);return a.slice(-2).join('/');}
async function epRecommendations(){
 const res=await fetch(new URL('./recommendations-catalog.json',import.meta.url),{cache:'no-cache'});
 if(!res.ok)throw Error('Não foi possível carregar a lista de fichas.');
 const all=await res.json(),year=epYearFolder(profile?.schoolYear);
 if(!year){show('<p>Escolhe primeiro o teu ano de escolaridade em 🎨 Avatar para receberes recomendações adequadas.</p><div class="epactions"><button class="epbtn primary" id="eprdone">Fechar</button></div>','🎯 Fichas recomendadas');document.getElementById('eprdone').onclick=hide;return;}
 const current=all.filter(x=>x.year===year),today=portugalDay();
 const completedToday=new Set(history.filter(x=>epLocalDay(x.date)===today).map(x=>epFileKey(x.file)));
 const previous=new Map();for(const h of history){const key=epFileKey(h.file);if(!previous.has(key))previous.set(key,h)}
 const weak=new Map();for(const h of history){if(epFileKey(h.file).split('/')[0]!==year)continue;const pct=epScorePercent(h.score);if(pct===null||pct>=80)continue;const norm=epNorm(h.subject);if(norm)weak.set(norm,(weak.get(norm)||0)+(80-pct));}
 const candidate=current.filter(x=>!completedToday.has(x.file));
 const ranked=candidate.map(x=>{
   const subject=epNorm(x.subject),score=[...weak].reduce((a,[k,v])=>(subject.includes(k)||k.includes(subject))?a+v:a,0);
   const done=previous.has(x.file),last=done?epScorePercent(previous.get(x.file).score):null;
   return {...x,priority:score+(done&&last!==null&&last<80?25:0)+(done?-10:10),weak:score>0,done};
 }).sort((a,b)=>b.priority-a.priority||a.title.localeCompare(b.title,'pt'));
 const picks=ranked.slice(0,6);
 const html=picks.length?picks.map(x=>'<article style="border:1px solid #d9e5f3;border-radius:13px;padding:14px;margin:10px 0"><strong>'+esc(x.title)+'</strong><p style="margin:7px 0;color:#506681">'+esc(x.subject)+' · '+(x.weak?'Reforçar esta disciplina':x.done?'Voltar a praticar':'Nova ficha para praticar')+'</p><a class="epbtn primary" style="display:inline-block;text-decoration:none" href="'+esc(new URL('./'+x.file,import.meta.url).href)+'">Abrir ficha →</a></article>').join(''):'<p>Já realizaste todas as fichas disponíveis deste ano hoje. Volta amanhã!</p>';
 show('<p>Recomendações para <strong>'+esc(profile.schoolYear)+'</strong>, baseadas nas tuas fichas e resultados. Não é uma análise automática de cada pergunta.</p>'+html+'<p class="ephelp">Não recomendamos fichas já concluídas hoje. Se ainda não houver resultados suficientes, sugerimos fichas por explorar.</p><div class="epactions"><button class="epbtn" id="eprdone">Fechar</button></div>','🎯 Fichas recomendadas');
 document.getElementById('eprdone').onclick=hide;
}
const epRecommendButton=el('button',{id:'eprecommendbtn',type:'button'},'🎯 Recomendações');
bar.querySelector('#ephbtn').before(epRecommendButton);
epRecommendButton.onclick=async()=>{if(!user)return;try{await loadHistory();await epRecommendations()}catch(e){show('<p>'+esc(e.message||'Erro ao carregar recomendações.')+'</p><button class="epbtn" id="eprdone">Fechar</button>','Erro nas recomendações');document.getElementById('eprdone').onclick=hide}};


// V54: Family dashboard. An individual student must grant access explicitly.
const epFamilyButton=el('button',{id:'epfamilybtn',type:'button'},'👨‍👩‍👧 Família');
bar.querySelector('#ephbtn').before(epFamilyButton);
const epUidOK=id=>/^[A-Za-z0-9]{20,128}$/.test(String(id||''));
// The account role comes from the authenticated Firestore profile, not a UI selection.
const epIsGuardian=()=>profile?.role==='guardian';
const epFamilySavedKey=()=> 'estudamais-family-students-v54-1-'+(user?.uid||'');
function epFamilySaved(){try{const ids=JSON.parse(localStorage.getItem(epFamilySavedKey())||'[]');return Array.isArray(ids)?ids.filter(epUidOK).slice(0,30):[]}catch{return []}}
function epFamilyRemember(id){const ids=[id,...epFamilySaved().filter(x=>x!==id)].slice(0,30);try{localStorage.setItem(epFamilySavedKey(),JSON.stringify(ids))}catch{}}
function epFamilyForget(id){try{localStorage.setItem(epFamilySavedKey(),JSON.stringify(epFamilySaved().filter(x=>x!==id)))}catch{}}
function epFamilyHome(){
 if(!user)return;
 const parent=epIsGuardian();
 const intro=parent?'Consulta os resultados dos alunos que autorizaram a tua conta. A autorização é sempre controlada pelo aluno.':'Autoriza um encarregado de educação a consultar os teus resultados. Podes revogar o acesso a qualquer momento.';
 const common='<p>'+intro+'</p><div style="background:#f0f6ff;padding:12px;border-radius:12px"><strong>O meu código de conta</strong><p style="overflow-wrap:anywhere;font-family:monospace">'+esc(user.uid)+'</p><button class="epbtn" id="epcopyuid">Copiar código</button></div>';
 const studentHtml='<h3>Autorizar um encarregado</h3><p class="ephelp">Introduz o código da conta do encarregado de educação.</p><label>Código do encarregado<input id="epguardianuid" placeholder="Código da conta do encarregado" autocomplete="off"></label><div class="epactions"><button class="epbtn primary" id="epgrant">Autorizar</button><button class="epbtn" id="epmanage">Gerir autorizações</button></div>';
 const saved=epFamilySaved();
 const savedHtml=saved.length?'<h3>Alunos consultados anteriormente</h3><p class="ephelp">Lista guardada apenas neste navegador. Cada consulta verifica novamente a autorização no Firebase.</p><div id="epfamilysaved"></div>':'';
 const parentHtml=savedHtml+'<h3>Consultar resultados de um aluno</h3><p class="ephelp">Introduz o código da conta de um aluno que te autorizou.</p><label>Código do aluno<input id="epchilduid" placeholder="Código da conta do aluno" autocomplete="off"></label><div class="epactions"><button class="epbtn primary" id="epviewchild">Consultar evolução</button></div>';
 show(common+(parent?parentHtml:studentHtml)+'<div class="epactions"><button class="epbtn" id="epfamilyclose">Fechar</button></div>','👨‍👩‍👧 Área da família');
 document.getElementById('epcopyuid').onclick=()=>navigator.clipboard?.writeText(user.uid).then(()=>message('Código copiado.',true)).catch(()=>message('Seleciona e copia o código acima.'));
 document.getElementById('epfamilyclose').onclick=hide;
 if(parent){
  document.getElementById('epviewchild').onclick=()=>epFamilyReport(document.getElementById('epchilduid').value.trim());
  const target=document.getElementById('epfamilysaved');
  if(target)for(const id of saved){const row=el('div');row.style='display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap';const view=el('button',{class:'epbtn',type:'button'},'Consultar '+id.slice(0,8)+'…');view.onclick=()=>epFamilyReport(id);const forget=el('button',{class:'epbtn',type:'button'},'Retirar da lista');forget.onclick=()=>{epFamilyForget(id);row.remove()};row.append(view,forget);target.append(row)}
 }else{
  document.getElementById('epgrant').onclick=async()=>{
   const id=document.getElementById('epguardianuid').value.trim();
   if(!epUidOK(id)||id===user.uid){message('Introduz um código de encarregado válido e diferente do teu.');return}
   if(!confirm('Confirmas que esta conta pertence ao encarregado de educação autorizado? Ele poderá consultar o teu perfil e histórico de fichas.'))return;
   try{await setDoc(doc(db,'users',user.uid,'guardians',id),{createdAt:serverTimestamp()});message('Acesso autorizado. O encarregado já pode consultar os resultados.',true)}catch(e){message(authError(e))}
  };
  document.getElementById('epmanage').onclick=epFamilyManage;
 }
}
async function epFamilyManage(){
 if(epIsGuardian()){epFamilyHome();return}
 try{
  const snap=await getDocs(collection(db,'users',user.uid,'guardians'));
  show('<p>Estas contas podem consultar os teus resultados. Revoga qualquer acesso que já não pretendas manter.</p><div id="epguardians"></div><div class="epactions"><button class="epbtn" id="epbackfamily">Voltar</button></div>','🔒 Autorizações da família');
  document.getElementById('epbackfamily').onclick=epFamilyHome;
  const target=document.getElementById('epguardians');
  if(snap.empty){target.textContent='Ainda não autorizaste nenhuma conta.';return}
  for(const d of snap.docs){const row=el('div');row.style='display:flex;align-items:center;gap:10px;margin:10px 0;overflow-wrap:anywhere';const code=el('span',{},d.id);code.style='flex:1;font-family:monospace;font-size:12px';const btn=el('button',{class:'epbtn',type:'button'},'Revogar');btn.onclick=async()=>{if(!confirm('Revogar o acesso desta conta?'))return;try{const {deleteDoc}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');await deleteDoc(doc(db,'users',user.uid,'guardians',d.id));row.remove();message('Acesso revogado.',true)}catch(e){message(authError(e))}};row.append(code,btn);target.append(row)}
 }catch(e){show('<p>'+esc(authError(e))+'</p><button class="epbtn" id="epbackfamily">Voltar</button>','Erro');document.getElementById('epbackfamily').onclick=epFamilyHome}
}
async function epFamilyReport(id){
 if(!epIsGuardian()){message('A consulta de alunos está disponível apenas para encarregados de educação.');return}
 if(!epUidOK(id)||id===user.uid){message('Introduz o código válido da conta do aluno.');return}
 try{
  // Firestore rules independently verify the student's authorization.
  const [pSnap,hSnap]=await Promise.all([getDoc(doc(db,'users',id)),getDocs(query(collection(db,'users',id,'history'),orderBy('date','desc'),limit(500)))]);
  if(!pSnap.exists())throw Error('Não foi possível encontrar o perfil autorizado.');
  epFamilyRemember(id);
  const student=pSnap.data(),items=hSnap.docs.map(x=>x.data());
  const percentages=items.map(x=>{const t=String(x.score||'');const m=t.match(/(\d+(?:[.,]\d+)?)\s*%/);if(m)return Number(m[1].replace(',','.'));const a=t.match(/(\d+)\s*\/\s*(\d+)/);return a&&Number(a[2])?100*Number(a[1])/Number(a[2]):null}).filter(x=>x!==null);
  const avg=percentages.length?Math.round(percentages.reduce((a,b)=>a+b,0)/percentages.length)+'%':'—';
  const recent=items.slice(0,100);
  const subjects={};for(const x of items){const k=String(x.subject||'Sem disciplina');subjects[k]=(subjects[k]||0)+1}
  const subjectHtml=Object.entries(subjects).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>'<li>'+esc(k)+': '+v+' fichas</li>').join('');
  const rows=recent.map(x=>'<tr><td>'+esc(x.date?new Date(x.date).toLocaleDateString('pt-PT'):'—')+'</td><td>'+esc(x.subject||'—')+'</td><td>'+esc(x.title||'—')+'</td><td>'+esc(x.score||'—')+'</td></tr>').join('');
  show('<p>Consulta apenas de leitura, autorizada pela conta do aluno.</p><h3>'+esc(student.name||'Aluno')+' · '+esc(student.schoolYear||'Ano não definido')+'</h3>'+
  '<div style="display:flex;flex-wrap:wrap;gap:10px">'+[['Fichas realizadas',items.length],['Média de resultados',avg],['Pontos acumulados',student.points||0]].map(([k,v])=>'<div style="flex:1;min-width:120px;background:#eef5ff;border-radius:12px;padding:12px"><small>'+esc(k)+'</small><h3>'+esc(v)+'</h3></div>').join('')+'</div>'+
  '<h3>Disciplinas estudadas</h3>'+(subjectHtml?'<ul>'+subjectHtml+'</ul>':'<p>Ainda não há resultados.</p>')+
  '<h3>Últimas fichas</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th>Data</th><th>Disciplina</th><th>Ficha</th><th>Resultado</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p class="ephelp">São apresentados até 500 resultados do histórico e até 100 linhas na tabela. O aluno pode revogar esta autorização na sua conta.</p><div class="epactions"><button class="epbtn" id="epbackfamily">Voltar</button></div>','📊 Acompanhamento escolar');
  document.getElementById('epbackfamily').onclick=epFamilyHome;
 }catch(e){show('<p>Não foi possível consultar os resultados. Confirma que o aluno autorizou o código da tua conta.</p><p class="ephelp">'+esc(authError(e))+'</p><button class="epbtn" id="epbackfamily">Voltar</button>','Acesso não autorizado');document.getElementById('epbackfamily').onclick=epFamilyHome}
}
epFamilyButton.onclick=epFamilyHome;

rankingPanel();
const epProgressButton=el('button',{id:'epprogressbtn',type:'button'},'🌟 Conquistas');bar.querySelector('#ephbtn').before(epProgressButton);epProgressButton.onclick=async()=>{if(!user)return;try{await loadHistory();epProgressView()}catch(e){show('<p>'+esc(authError(e))+'</p>','Erro nas conquistas')}};
bar.querySelector('#ephbtn').onclick=async()=>{if(!user)return;try{await loadHistory();historyView()}catch(e){show('<p>'+esc(authError(e))+'</p><button class="epbtn" id="epclose">Fechar</button>','Erro no histórico');document.getElementById('epclose').onclick=hide}};
bar.querySelector('#epavbtn').onclick=()=>{if(user)editor()};
bar.querySelector('#eplogout').onclick=async()=>{if(isQuiz&&started&&!recorded&&!confirm('O teste atual não será guardado. Queres sair?'))return;stopClock();if(user){try{sessionStorage.removeItem('ep_welcomed_'+user.uid)}catch(e){}}await signOut(auth);location.replace(new URL('./',import.meta.url).href)};
// Block all interaction until Firebase establishes an authenticated session.
show('<div class="epbook" aria-hidden="true"><span class="epcover"></span><span class="epleft"></span><span class="epright"></span><span class="eppage"></span><span class="eppage"></span><span class="eppage"></span></div><p style="text-align:center">'+(isQuiz?'A preparar a tua ficha…':'A entrar na tua conta…')+'</p>','📚 Estuda+');
async function initSession(u){if(u&&user&&u.uid!==user.uid){location.replace(new URL('./',import.meta.url).href);return}user=u;profile=null;history=[];stopClock();started=0;recorded=false;if(!u){updateBar();authView();return}try{profile=await ensureProfile(u);updateBar();await loadHistory();hide();if(isQuiz)await checkDailyLock();if(!dailyLocked)startClock();welcomeUser();loadRanking()}catch(e){show('<p>Não foi possível carregar o perfil: '+esc(authError(e))+'</p><div class="epactions"><button class="epbtn" id="epretry">Tentar novamente</button><button class="epbtn" id="epsignout">Sair</button></div>','Erro de ligação');document.getElementById('epretry').onclick=()=>location.reload();document.getElementById('epsignout').onclick=()=>signOut(auth)}}
onAuthStateChanged(auth,u=>{if(!creatingAccount)initSession(u)});
