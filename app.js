(function(){
var SB_URL="https://isuzndwtyeoopbyhggco.supabase.co",SB_KEY="sb_publishable_tdKYXEM5DWtdiMhMoADQOQ_-MfPuKBd";
var sb=null;try{sb=window.supabase.createClient(SB_URL,SB_KEY)}catch(e){}
var notes=[],mode="local";
var $=function(i){return document.getElementById(i)};
var listEl=$("list"),statusEl=$("status");

/* ---- storage ---- */
function localLoad(){try{return JSON.parse(localStorage.getItem("notes.v1")||"[]")}catch(e){return []}}
function localSave(){try{localStorage.setItem("notes.v1",JSON.stringify(notes))}catch(e){}}
function setStatus(){
  statusEl.textContent=mode==="sb"?"Saved to Supabase":"Saved on this device only";
}

/* ---- render ---- */
function copyText(text,btn){
  function done(){var o=btn.textContent;btn.textContent="Copied";btn.classList.add("done");setTimeout(function(){btn.textContent=o;btn.classList.remove("done")},1200)}
  function fb(){
    var t=document.createElement("textarea");t.value=text;t.style.cssText="position:fixed;opacity:0";
    document.body.appendChild(t);t.focus();t.select();
    try{document.execCommand("copy");done()}catch(e){}
    document.body.removeChild(t);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,fb)}else fb();
}
function row(label,val,secret){
  var r=document.createElement("div");r.className="row";
  var m=document.createElement("div");m.className="rm";
  var k=document.createElement("div");k.className="rl";k.textContent=label;
  var v=document.createElement("div");v.className="rv";
  var hid=secret;v.textContent=secret?"••••••••":val;
  if(secret)v.addEventListener("click",function(){hid=!hid;v.textContent=hid?"••••••••":val});
  m.appendChild(k);m.appendChild(v);
  var b=document.createElement("button");b.className="sm";b.textContent="Copy";
  b.addEventListener("click",function(){copyText(val,b)});
  r.appendChild(m);r.appendChild(b);return r;
}
function render(){
  listEl.textContent="";
  if(!notes.length){
    var e=document.createElement("div");e.className="empty";e.textContent="No notes yet. Tap + Add to write one.";listEl.appendChild(e);return;
  }
  notes.forEach(function(n){
    var box=document.createElement("div");box.className="note";
    if(n.label){var l=document.createElement("div");l.className="lab";l.textContent=n.label;box.appendChild(l)}
    if(n.user)box.appendChild(row("Username",n.user,false));if(n.pass)box.appendChild(row("Password",n.pass,true));if(n.text)box.appendChild(row("Note",n.text,false));
    var a=document.createElement("div");a.className="acts";
    var c=document.createElement("button");c.className="sm";c.textContent="Copy all";
    c.addEventListener("click",function(){copyText([n.label,n.user,n.pass,n.text].filter(Boolean).join("\n"),c)});
    var d=document.createElement("button");d.className="sm";d.textContent="Delete";
    d.addEventListener("click",function(){
      if(d.dataset.sure!=="1"){d.dataset.sure="1";d.textContent="Tap again";setTimeout(function(){d.dataset.sure="";d.textContent="Delete"},2200);return}
      remove(n.id);
    });
    a.appendChild(c);a.appendChild(d);box.appendChild(a);listEl.appendChild(box);
  });
}

/* ---- actions ---- */
async function addNote(){
  var text=$("text").value.trim(),label=$("label").value.trim(),user=$("user").value.trim(),pass=$("pass").value;
  if(!text&&!label&&!user&&!pass)return;
  var rec={label:label,user:user,pass:pass,text:text,t:Date.now()};
  ["label","user","pass","text"].forEach(function(i){$(i).value=""});screen("home");
  if(mode==="sb"){
    var r=await sb.from("notes").insert({label:rec.label,username:rec.user,password:rec.pass,note:rec.text});
    if(r.error)statusEl.textContent="Could not save. Try again.";else await loadNotes();
  }else{
    rec.id="n"+rec.t;notes.unshift(rec);localSave();render();
  }
}
async function remove(id){
  if(mode==="sb"){var r=await sb.from("notes").delete().eq("id",id);if(r.error)statusEl.textContent="Could not delete. Try again.";else await loadNotes()}
  else{notes=notes.filter(function(n){return n.id!==id});localSave();render()}
}
function screen(w){$("compose").hidden=w!=="write";$("list").hidden=w==="write";$("status").hidden=w==="write";$("top").hidden=w==="write";if(w==="write")$("text").focus()}
$("plus").addEventListener("click",function(){screen("write")});
$("cancel").addEventListener("click",function(){["label","user","pass","text"].forEach(function(i){$(i).value=""});screen("home")});
$("add").addEventListener("click",addNote);

/* ---- start ---- */
async function loadNotes(){
  var r=await sb.from("notes").select("*").order("created_at",{ascending:false});
  if(r.error){statusEl.textContent="Could not load notes.";return}
  notes=r.data.map(function(x){return{id:x.id,label:x.label,user:x.username,pass:x.password,text:x.note,t:Date.parse(x.created_at)}});
  mode="sb";setStatus();render();
}
function showLogin(on){$("login").hidden=!on;$("top").hidden=on;$("list").hidden=on;$("status").hidden=on}
async function auth(kind){
  var em=$("em").value.trim(),pw=$("pw").value,msg=$("lmsg");
  if(!em||!pw){msg.textContent="Enter email and password.";return}
  msg.textContent="Please wait…";
  var r=kind==="up"?await sb.auth.signUp({email:em,password:pw}):await sb.auth.signInWithPassword({email:em,password:pw});
  if(r.error){msg.textContent=r.error.message;return}
  if(!r.data.session){msg.textContent="Check your email to confirm, then sign in.";return}
  $("pw").value="";showLogin(false);await loadNotes();
}
$("signin").addEventListener("click",function(){auth("in")});
$("signup").addEventListener("click",function(){auth("up")});
$("out").addEventListener("click",async function(){await sb.auth.signOut();notes=[];render();showLogin(true)});
(async function init(){
  if(sb){
    var s=await sb.auth.getSession();
    if(s.data.session){await loadNotes()}else{showLogin(true)}
    return;
  }
  try{
    if(window.claude&&claude.use){
      var user=await claude.use("user");
      var db=await claude.use("db");
      if(user&&db&&user.id){
        var uid=await user.id();
        col=db.collection("data/users/"+uid+"/notes");
        mode="db";
        col.orderBy("t","desc").onSnapshot(function(snap){
          notes=snap.docs.map(function(d){var x=d.data();x.id=d.id;return x});
          setStatus();render();
        },function(){mode="local";notes=localLoad();setStatus();render()});
        return;
      }
    }
  }catch(e){}
  mode="local";notes=localLoad();setStatus();render();
})();
})();
