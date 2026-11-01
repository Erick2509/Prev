/* Procesamiento completamente local, sin dependencias externas. */
(function(scope){
'use strict';
function dimensions(w,h,max=2048){const s=Math.min(1,max/Math.max(w,h));return {width:Math.max(1,Math.round(w*s)),height:Math.max(1,Math.round(h*s))};}
function makeCanvas(w,h){const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):document.createElement('canvas');c.width=w;c.height=h;return c;}
async function decode(blob){
  if(typeof createImageBitmap==='function'){
    try{return await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){/* Android/WebView fallback */}
  }
  if(typeof document==='undefined')throw Error('Este dispositivo no admite la lectura de la foto en segundo plano.');
  const u=URL.createObjectURL(blob);
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo abrir la foto. Prueba JPG, PNG o una foto tomada con la cámara.'));img.src=u;});
    return img;
  }finally{URL.revokeObjectURL(u);}
}
function release(i){if(i&&typeof i.close==='function')i.close();}
function encode(c,q){return c.convertToBlob?c.convertToBlob({type:'image/jpeg',quality:q}):new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(Error('No se pudo guardar la fotografía.')),'image/jpeg',q));}
function stamp(c,photo,logo,time){
 const x=c.getContext('2d',{alpha:false}),w=c.width,h=c.height;if(!x)throw Error('No hay memoria suficiente para procesar la fotografía.');
 x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(photo,0,0,w,h);
 // La referencia usa las mismas dimensiones visuales en horizontal y vertical.
 // Se escala todo según el lado menor para conservar proporciones entre formatos.
 const unit=Math.min(w,h);
 const date=new Date(time);
 const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
 const pad=n=>String(n).padStart(2,'0');
 const dateLine=`${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
 const lines=[dateLine,'5193 Avenida Javier Prado Este','Camacho','La Molina','Provincia de Lima'];
 const size=Math.max(9,Math.round(unit*.0417));
 const lineHeight=size;
 const left=Math.round(unit*.01),bottom=h-Math.round(unit*.01);
 x.save();
 x.font=`400 ${size}px Roboto, Arial, sans-serif`;
 x.textBaseline='alphabetic';x.textAlign='left';
 x.fillStyle='#fff';x.shadowColor='rgba(0,0,0,.48)';x.shadowBlur=Math.max(1,size*.08);x.shadowOffsetX=0;x.shadowOffsetY=Math.max(1,size*.025);
 lines.forEach((line,i)=>{
  const y=bottom-(lines.length-1-i)*lineHeight;
  x.fillText(line,left,y);
 });
 x.restore();
 if(logo){
  const logoWidth=Math.round(unit*.4167),logoHeight=Math.round(unit*.15625);
  // La muestra presenta el parche negro pegado a los bordes superior y derecho.
  x.drawImage(logo,w-logoWidth,0,logoWidth,logoHeight);
 }
}
async function processPhoto(file,logoFile,time,limit){let photo,logo,canvas;
 try{
  photo=await decode(file);const w=photo.width||photo.naturalWidth,h=photo.height||photo.naturalHeight;
  if(!w||!h)throw Error('Imagen vacía o dañada.');
  if(w*h>120000000)throw Error('La imagen supera los 120 megapíxeles. Prueba una versión más pequeña.');
  logo=await decode(logoFile);
  let target=Math.min(2048,limit||2048),result;
  // Reintento a menor resolución si el dispositivo no tiene memoria suficiente.
  for(let attempt=0;attempt<3;attempt++){
   try{
    const d=dimensions(w,h,target);canvas=makeCanvas(d.width,d.height);stamp(canvas,photo,logo,time);
    let blob=await encode(canvas,.82);if(blob.size>700*1024)blob=await encode(canvas,.70);
    if(blob.size>1048576&&target>1400){target=1400;canvas.width=1;canvas.height=1;canvas=null;continue;}
    result={blob,width:d.width,height:d.height,originalWidth:w,originalHeight:h};break;
   }catch(e){if(target<=900)throw e;target=Math.max(900,Math.round(target*.7));}
   finally{if(canvas){canvas.width=1;canvas.height=1;canvas=null;}}
  }
  if(!result)throw Error('No se pudo procesar la foto en este dispositivo.');
  return result;
 }finally{release(photo);release(logo);}
}
scope.PhotoPipeline={dimensions,processPhoto};
})(globalThis);
