importScripts('./pipeline.js');
self.onmessage=async e=>{try{const p=e.data;self.postMessage({ok:true,...await PhotoPipeline.processPhoto(p.file,p.logo,p.time,p.limit)});}catch(error){self.postMessage({ok:false,error:error.message||String(error)});}};
