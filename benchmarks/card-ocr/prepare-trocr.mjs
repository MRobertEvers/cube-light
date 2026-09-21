import {mkdir,writeFile}from'node:fs/promises';
const revision='56c1626ea0b4aab378f3228235be2e824d4256bd',base=new URL('./models/trocr/',import.meta.url);await mkdir(new URL('onnx/',base),{recursive:true});
const files=['config.json','generation_config.json','preprocessor_config.json','special_tokens_map.json','tokenizer.json','tokenizer_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'];
await Promise.all(files.map(async file=>{const response=await fetch(`https://huggingface.co/Xenova/trocr-small-printed/resolve/${revision}/${file}`);if(!response.ok)throw Error(`${file}: ${response.status}`);await writeFile(new URL(file,base),new Uint8Array(await response.arrayBuffer()));console.log(file);}));
await writeFile(new URL('provenance.json',base),JSON.stringify({model:'Xenova/trocr-small-printed',revision,files},null,2));
