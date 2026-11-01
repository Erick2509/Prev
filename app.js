'use strict';
const $=id=>document.getElementById(id);
let busy=false,output=null,previewUrl=null,time=null,installEvent=null;
function status(message){$('status').textContent=message;$('status').hidden=!message;}
function setBusy(value){busy=value;for(const id of ['gallery','camera'])$(id).disabled=value;$('reset').disabled=value;$('download').disabled=value;$('share').disabled=value;}
function workerProcess(file,logo,stampTime,limit){return new Promise((resolve,reject)=>{
 let done=false,worker,timer;
 const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);worker?.terminate();error?reject(error):resolve(result);};
 try{
  worker=new Worker('./worker.js');timer=setTimeout(()=>finish(Error('Tiempo de procesamiento agotado.')),25000);
  worker.onmessage=e=>e.data.ok?finish(null,e.data):finish(Error(e.data.error||'Error al procesar.'));
  worker.onerror=e=>{e.preventDefault();finish(Error('Procesamiento secundario no disponible.'));};
  worker.postMessage({file,logo,time:stampTime,limit});
 }catch(e){finish(e);}
});}
async function processWithFallback(file,logo,stampTime){
 const lowMemory=navigator.deviceMemory&&navigator.deviceMemory<=2;
 const limit=lowMemory?1400:2048;
 if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'){
  try{return await workerProcess(file,logo,stampTime,limit);}catch(_){status('Reintentando con un método compatible con tu Android…');}
 }
 return PhotoPipeline.processPhoto(file,logo,stampTime,lowMemory?1200:limit);
}
async function load(file){
 if(busy||!file)return;
 const accepted=/\.(jpe?g|png|webp|heic|heif|avif|bmp)$/i.test(file.name||'') || (file.type||'').startsWith('image/');
 if(!accepted||!file.size||file.size>100*1048576){status('Elige una foto válida de hasta 100 MB.');return;}
 setBusy(true);status('Abriendo fotografía…');time=new Date();
 try{
  await new Promise(ok=>requestAnimationFrame(ok));
  const r=await fetch('./logo.jpg');if(!r.ok)throw Error('No se encuentra el logotipo. Abre la aplicación con Internet una vez para completar la instalación.');
  const result=await processWithFallback(file,await r.blob(),time.getTime());
  if(previewUrl)URL.revokeObjectURL(previewUrl);output=result.blob;previewUrl=URL.createObjectURL(output);
  $('preview').src=previewUrl;$('choose').hidden=true;$('result').hidden=false;
  $('share').hidden=!navigator.share;
  const saved=Math.round((1-output.size/file.size)*100);
  $('info').textContent=`${result.width} × ${result.height} px · ${(file.size/1048576).toFixed(2)} MB → ${Math.round(output.size/1024)} KB${saved>0?' · '+saved+'% menos peso':''}`;
  status('Foto lista. Puedes descargarla o compartirla.');
 }catch(e){status((e&&e.message)||'No se pudo leer esta foto. Prueba JPG o PNG.');}
 finally{setBusy(false);$('gallery').value='';$('camera').value='';}
}
for(const id of ['gallery','camera'])$(id).addEventListener('change',e=>load(e.target.files&&e.target.files[0]));
$('drop').addEventListener('dragover',e=>e.preventDefault());
$('drop').addEventListener('drop',e=>{e.preventDefault();load(e.dataTransfer.files&&e.dataTransfer.files[0]);});
function filename(){return 'PREVENCION_'+time.toISOString().replace(/[:.]/g,'-')+'.jpg';}
$('download').addEventListener('click',()=>{if(!output)return;const u=URL.createObjectURL(output);const a=document.createElement('a');a.href=u;a.download=filename();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);status('Si no se descargó, usa Compartir y elige Guardar en tu dispositivo.');});
$('share').addEventListener('click',async()=>{if(!output)return;try{const f=new File([output],filename(),{type:'image/jpeg'});if(navigator.canShare&&!navigator.canShare({files:[f]})){status('Tu navegador no permite compartir archivos. Usa Descargar JPG.');return;}await navigator.share({files:[f],title:'Registro fotográfico'});}catch(e){if(e.name!=='AbortError')status('No se pudo compartir. Usa Descargar JPG.');}});
$('reset').addEventListener('click',()=>{if(busy)return;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;output=null;$('preview').removeAttribute('src');$('result').hidden=true;$('choose').hidden=false;status('');});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('install').hidden=false;});
$('install').addEventListener('click',async()=>{if(installEvent){await installEvent.prompt();installEvent=null;$('install').hidden=true;}});
function onlineDisplay(){const cached=navigator.serviceWorker&&navigator.serviceWorker.controller;$('connectivity').textContent=navigator.onLine?(cached?'Disponible sin conexión tras instalar':'Conectado · preparando modo sin conexión'):'Sin Internet · fotos procesadas en el dispositivo';}
window.addEventListener('online',onlineDisplay);window.addEventListener('offline',onlineDisplay);onlineDisplay();
if('serviceWorker' in navigator&&window.isSecureContext){
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{onlineDisplay();}).catch(()=>status('No se pudo preparar el modo sin Internet. Revisa la instalación.'));
 navigator.serviceWorker.addEventListener('controllerchange',onlineDisplay);
}else{$('connectivity').textContent='Para instalar y utilizar sin conexión, abre la aplicación mediante HTTPS.';}
