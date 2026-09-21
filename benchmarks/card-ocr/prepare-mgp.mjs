import{mkdir,writeFile}from'node:fs/promises';
const revision='1a65ebef5879d64b25dffa8dc0cfe14e42ccbb36',base=new URL('./models/mgp/',import.meta.url);await mkdir(base,{recursive:true});
for(const file of ['preprocessor_config.json','vocab.json','onnx/model_quantized.onnx']){const r=await fetch(`https://huggingface.co/onnx-community/mgp-str-base/resolve/${revision}/${file}`);if(!r.ok)throw Error(r.status);await writeFile(new URL(file.replace('onnx/',''),base),new Uint8Array(await r.arrayBuffer()));console.log(file);}
