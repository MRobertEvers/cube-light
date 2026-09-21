import {mkdir,writeFile}from'node:fs/promises';
const revision='e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f',base=new URL('./models/florence/',import.meta.url);
await mkdir(new URL('onnx/',base),{recursive:true});
const files=['config.json','generation_config.json','preprocessor_config.json','tokenizer_config.json','tokenizer.json','special_tokens_map.json','onnx/embed_tokens_fp16.onnx','onnx/vision_encoder_fp16.onnx','onnx/encoder_model_q4.onnx','onnx/decoder_model_merged_q4.onnx'];
await Promise.all(files.map(async file=>{const response=await fetch(`https://huggingface.co/onnx-community/Florence-2-base-ft/resolve/${revision}/${file}`);if(!response.ok)throw Error(`${file}: ${response.status}`);await writeFile(new URL(file,base),new Uint8Array(await response.arrayBuffer()));console.log(file);}));
await writeFile(new URL('provenance.json',base),JSON.stringify({model:'onnx-community/Florence-2-base-ft',revision,license:'MIT',files},null,2));
