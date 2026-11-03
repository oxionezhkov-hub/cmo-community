// Страница /moderation — журнал модерации клубных чатов (данные: GET /api/mod/log).
// Внутри страницы нет шаблонных строк JS, чтобы её можно было держать в String.raw.
export const MOD_LOG_HTML = String.raw`<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Журнал модерации</title>
<style>
:root{--bg:#fff;--fg:#16161a;--mut:#6b6b74;--line:#e7e7ea;--soft:#f5f5f7;--acc:#2f6fed;--red:#d6453d;--green:#2f9e5b;--amber:#c98a14}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--fg:#ececef;--mut:#9a9aa3;--line:#2a2a2f;--soft:#1c1c20;--acc:#6b9bff;--red:#ff6b62;--green:#4cc47f;--amber:#e6b04a}}
[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1200px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:20px;margin:0 0 4px}.sub{color:var(--mut);margin:0 0 20px}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
input,select,button{font:inherit;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px 10px}
input[type=search]{min-width:220px;flex:1}button{cursor:pointer}button:hover{border-color:var(--mut)}
.q button.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 16px}
.chip{border:1px solid var(--line);border-radius:999px;padding:4px 10px;cursor:pointer;color:var(--mut);user-select:none}
.chip b{color:var(--fg);margin-left:4px}.chip.on{border-color:var(--fg);color:var(--fg)}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-weight:600;color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.03em;padding:8px;border-bottom:1px solid var(--line);cursor:pointer;white-space:nowrap;user-select:none}
.tbl th .ar{opacity:.5;margin-left:4px}
.tbl td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}
.tbl tr:hover td{background:var(--soft)}
.t{white-space:nowrap;color:var(--mut);font-variant-numeric:tabular-nums}
.who a{color:var(--acc);text-decoration:none}.who .id{color:var(--mut);font-size:12px}
.pl{cursor:pointer}.pl:hover{text-decoration:underline}
.ev{white-space:nowrap}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:1px;background:var(--mut)}
.d{color:var(--mut);max-width:360px;overflow-wrap:anywhere}
.empty{color:var(--mut);padding:40px 0;text-align:center}
.login{max-width:320px;margin:15vh auto;display:flex;flex-direction:column;gap:10px}
.err{color:var(--red);min-height:1.4em}
.foot{color:var(--mut);margin-top:12px;font-size:12px}
@media (max-width:720px){.tbl thead{display:none}.tbl tr{display:block;border-bottom:1px solid var(--line);padding:8px 0}.tbl td{display:block;border:0;padding:2px 0}}
</style></head><body>
<div id="login" class="login" hidden>
  <h1>Журнал модерации</h1>
  <input id="pwd" type="password" placeholder="Пароль админки" autocomplete="current-password">
  <button id="go">Войти</button><div id="lerr" class="err"></div>
</div>
<div id="app" class="wrap" hidden>
  <h1>Журнал модерации</h1>
  <p class="sub">Клубные чаты CMO: входы, заявки, удалённые сообщения, анкеты, доверенные</p>
  <div class="bar">
    <span class="q" id="quick"><button data-d="7">7 дней</button> <button data-d="30" class="on">30 дней</button> <button data-d="90">90 дней</button> <button data-d="365">Год</button></span>
    <input id="from" type="date"> — <input id="to" type="date">
  </div>
  <div class="bar">
    <input id="s" type="search" placeholder="Человек: имя, @username или id">
    <select id="club"><option value="">Все клубы</option></select>
    <select id="type"><option value="">Все события</option></select>
    <button id="csv">CSV</button>
  </div>
  <div class="chips" id="chips"></div>
  <table class="tbl"><thead><tr>
    <th data-k="ts">Дата<span class="ar"></span></th><th data-k="club">Клуб<span class="ar"></span></th>
    <th data-k="person">Человек<span class="ar"></span></th><th data-k="type">Событие<span class="ar"></span></th>
    <th data-k="detail">Детали<span class="ar"></span></th>
  </tr></thead><tbody id="rows"></tbody></table>
  <div id="empty" class="empty" hidden>Событий нет</div>
  <div class="foot" id="foot"></div>
</div>
<script>
var TOKEN_KEY='cmo_admin_token', token='';
try{token=localStorage.getItem(TOKEN_KEY)||'';}catch(e){}
var COLORS={join:'var(--acc)',join_request:'var(--acc)',join_request_failed:'var(--red)',msg_deleted:'var(--red)',anketa_start:'var(--amber)',anketa_done:'var(--green)',trust_add:'var(--green)',trust_remove:'var(--mut)',sheet_fail:'var(--red)'};
var data={events:[],clubs:{},types:{}}, sortK='ts', sortDir=-1, typeChip='';
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function day(ts){return new Date(ts+3*3600e3).toISOString().slice(0,10);}
function fmt(ts){var d=new Date(ts+3*3600e3).toISOString();return d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4)+' '+d.slice(11,16);}
function person(e){return e.name||(e.username?'@'+e.username:'')||e.userId||'';}
function showLogin(msg){$('app').hidden=true;$('login').hidden=false;$('lerr').textContent=msg||'';$('pwd').focus();}
$('go').onclick=function(){
  fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('pwd').value})})
  .then(function(r){return r.json();}).then(function(r){
    if(!r.ok){$('lerr').textContent=r.error||'Неверный пароль';return;}
    token=r.token;try{localStorage.setItem(TOKEN_KEY,token);}catch(e){}
    $('login').hidden=true;load();
  });
};
$('pwd').onkeydown=function(e){if(e.key==='Enter')$('go').click();};
function setRange(days){var t=Date.now();$('to').value=day(t);$('from').value=day(t-(days-1)*86400e3);}
function load(){
  fetch('/api/mod/log?from='+$('from').value+'&to='+$('to').value,{headers:{Authorization:'Bearer '+token}})
  .then(function(r){if(r.status===401){showLogin('Войдите ещё раз');throw 0;}return r.json();})
  .then(function(r){
    data=r;$('app').hidden=false;
    var cs=$('club'),cv=cs.value;cs.length=1;Object.keys(r.clubs).forEach(function(k){cs.add(new Option(r.clubs[k],k));});cs.value=cv;
    var ts=$('type'),tv=ts.value;ts.length=1;Object.keys(r.types).forEach(function(k){ts.add(new Option(r.types[k],k));});ts.value=tv;
    render();
  }).catch(function(){});
}
function filtered(){
  var q=$('s').value.trim().toLowerCase().replace(/^@/,''),club=$('club').value,type=$('type').value||typeChip;
  return data.events.filter(function(e){
    if(club&&e.club!==club)return false;
    if(type&&e.type!==type)return false;
    if(q){var h=(e.name+' '+e.username+' '+e.userId).toLowerCase();if(h.indexOf(q)<0)return false;}
    return true;
  });
}
function val(e,k){if(k==='ts')return e.ts;if(k==='club')return data.clubs[e.club]||'';if(k==='person')return person(e).toLowerCase();if(k==='type')return data.types[e.type]||e.type;return e.detail||'';}
function render(){
  var list=filtered();
  list.sort(function(a,b){var x=val(a,sortK),y=val(b,sortK);if(x<y)return -sortDir;if(x>y)return sortDir;return b.ts-a.ts;});
  var counts={};data.events.forEach(function(e){if(!$('club').value||e.club===$('club').value)counts[e.type]=(counts[e.type]||0)+1;});
  $('chips').innerHTML=Object.keys(data.types).filter(function(k){return counts[k];}).map(function(k){
    return '<span class="chip'+(typeChip===k?' on':'')+'" data-t="'+k+'"><span class="dot" style="background:'+COLORS[k]+'"></span>'+esc(data.types[k])+'<b>'+counts[k]+'</b></span>';
  }).join('');
  $('rows').innerHTML=list.slice(0,3000).map(function(e){
    var who=esc(person(e)||'—');
    var sameAsName=e.username&&(person(e)==='@'+e.username||!e.name);
    var un=e.username&&!sameAsName?' <a href="https://t.me/'+esc(e.username)+'" target="_blank">@'+esc(e.username)+'</a>':'';
    if(sameAsName)who='<a href="https://t.me/'+esc(e.username)+'" target="_blank">@'+esc(e.username)+'</a>';
    var by=e.by?' · '+esc(e.by):'';
    return '<tr><td class="t">'+fmt(e.ts)+'</td><td>'+esc(data.clubs[e.club]||(e.type.indexOf('trust')===0?'все клубы':'—'))+'</td>'+
      '<td class="who"><span class="pl" data-p="'+esc(e.userId||e.username||e.name)+'">'+who+'</span>'+un+(e.userId?' <span class="id">'+esc(e.userId)+'</span>':'')+'</td>'+
      '<td class="ev"><span class="dot" style="background:'+(COLORS[e.type]||'var(--mut)')+'"></span>'+esc(data.types[e.type]||e.type)+'</td>'+
      '<td class="d">'+esc(e.detail)+by+'</td></tr>';
  }).join('');
  $('empty').hidden=list.length>0;
  var people={};list.forEach(function(e){people[e.userId||e.username||e.name]=1;});
  $('foot').textContent='Показано событий: '+list.length+(list.length>3000?' (первые 3000)':'')+' · людей: '+Object.keys(people).length+' · период '+data.from+' — '+data.to;
  document.querySelectorAll('.tbl th').forEach(function(th){th.querySelector('.ar').textContent=th.dataset.k===sortK?(sortDir>0?'▲':'▼'):'';});
}
document.querySelectorAll('.tbl th').forEach(function(th){th.onclick=function(){var k=th.dataset.k;if(sortK===k)sortDir=-sortDir;else{sortK=k;sortDir=k==='ts'?-1:1;}render();};});
$('chips').onclick=function(e){var c=e.target.closest('.chip');if(!c)return;typeChip=typeChip===c.dataset.t?'':c.dataset.t;$('type').value='';render();};
$('rows').onclick=function(e){var p=e.target.closest('.pl');if(!p)return;$('s').value=p.dataset.p;render();};
['s','club','type'].forEach(function(id){$(id).addEventListener('input',function(){if(id==='type')typeChip='';render();});});
['from','to'].forEach(function(id){$(id).onchange=function(){document.querySelectorAll('#quick button').forEach(function(b){b.classList.remove('on');});load();};});
$('quick').onclick=function(e){var b=e.target.closest('button');if(!b)return;document.querySelectorAll('#quick button').forEach(function(x){x.classList.toggle('on',x===b);});setRange(+b.dataset.d);load();};
$('csv').onclick=function(){
  var rows=[['Дата (МСК)','Клуб','Имя','Username','TG ID','Событие','Детали','Кто']].concat(filtered().map(function(e){return [fmt(e.ts),data.clubs[e.club]||'',e.name,e.username?'@'+e.username:'',e.userId,data.types[e.type]||e.type,e.detail,e.by];}));
  var csv='﻿'+rows.map(function(r){return r.map(function(c){c=String(c==null?'':c);return /[",;\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(';');}).join('\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='moderation-'+$('from').value+'_'+$('to').value+'.csv';a.click();
};
setRange(30);
if(token)load();else showLogin();
</script></body></html>`;
