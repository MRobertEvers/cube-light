(function(){
/*!
* ONNX Runtime Web v1.30.0
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
var e=Object.defineProperty,t=Object.getOwnPropertyDescriptor,n=Object.getOwnPropertyNames,r=Object.prototype.hasOwnProperty,i=(e=>typeof require<`u`?require:typeof Proxy<`u`?new Proxy(e,{get:(e,t)=>(typeof require<`u`?require:e)[t]}):e)(function(e){if(typeof require<`u`)return require.apply(this,arguments);throw Error(`Dynamic require of "`+e+`" is not supported`)}),a=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},o=(t,n)=>{for(var r in n)e(t,r,{get:n[r],enumerable:!0})},s=(i,a,o,s)=>{if(a&&typeof a==`object`||typeof a==`function`)for(let c of n(a))!r.call(i,c)&&c!==o&&e(i,c,{get:()=>a[c],enumerable:!(s=t(a,c))||s.enumerable});return i},c=t=>s(e({},`__esModule`,{value:!0}),t),l,u,d,f,p,m=a(()=>{"use strict";l=/* @__PURE__ */ new Map,u=[],d=(e,t,n)=>{if(t&&typeof t.init==`function`&&typeof t.createInferenceSessionHandler==`function`){let r=l.get(e);if(r===void 0)l.set(e,{backend:t,priority:n});else{if(r.priority>n)return;if(r.priority===n&&r.backend!==t)throw Error(`cannot register backend "${e}" using priority ${n}`)}if(n>=0){let t=u.indexOf(e);t!==-1&&u.splice(t,1);for(let t=0;t<u.length;t++)if(l.get(u[t]).priority<=n){u.splice(t,0,e);return}u.push(e)}return}throw TypeError(`not a valid backend`)},f=async e=>{let t=l.get(e);if(!t)return`backend not found.`;if(t.initialized)return t.backend;if(t.aborted)return t.error;{let n=!!t.initPromise;try{return n||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(e){return n||(t.error=`${e}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},p=async e=>{let t=e.executionProviders||[],n=t.map(e=>typeof e==`string`?e:e.name),r=n.length===0?u:n,i,a=[],o=/* @__PURE__ */ new Set;for(let e of r){let t=await f(e);typeof t==`string`?a.push({name:e,err:t}):(i||=t,i===t&&o.add(e))}if(!i)throw Error(`no available backend found. ERR: ${a.map(e=>`[${e.name}] ${e.err}`).join(`, `)}`);for(let{name:e,err:t}of a)n.includes(e)&&console.warn(`removing requested execution provider "${e}" from session options because it is not available: ${t}`);let s=t.filter(e=>o.has(typeof e==`string`?e:e.name));return[i,new Proxy(e,{get:(e,t)=>t===`executionProviders`?s:Reflect.get(e,t)})]}}),h=a(()=>{"use strict";m()}),g,_=a(()=>{"use strict";g=`1.30.0`}),v,y,b=a(()=>{"use strict";_(),v=`warning`,y={wasm:{},webgl:{},webgpu:{},versions:{common:g},set logLevel(e){if(e!==void 0){if(typeof e!=`string`||[`verbose`,`info`,`warning`,`error`,`fatal`].indexOf(e)===-1)throw Error(`Unsupported logging level: ${e}`);v=e}},get logLevel(){return v}},Object.defineProperty(y,"logLevel",{enumerable:!0})}),x,S=a(()=>{"use strict";b(),x=y}),C,w,T=a(()=>{"use strict";C=(e,t)=>{let n=typeof document<`u`?document.createElement(`canvas`):new OffscreenCanvas(1,1);n.width=e.dims[3],n.height=e.dims[2];let r=n.getContext(`2d`);if(r!=null){let i,a;t?.tensorLayout!==void 0&&t.tensorLayout===`NHWC`?(i=e.dims[2],a=e.dims[3]):(i=e.dims[3],a=e.dims[2]);let o=t?.format===void 0?`RGB`:t.format,s=t?.norm,c,l;s===void 0||s.mean===void 0?c=[255,255,255,255]:typeof s.mean==`number`?c=[s.mean,s.mean,s.mean,s.mean]:(c=[s.mean[0],s.mean[1],s.mean[2],0],s.mean[3]!==void 0&&(c[3]=s.mean[3])),s===void 0||s.bias===void 0?l=[0,0,0,0]:typeof s.bias==`number`?l=[s.bias,s.bias,s.bias,s.bias]:(l=[s.bias[0],s.bias[1],s.bias[2],0],s.bias[3]!==void 0&&(l[3]=s.bias[3]));let u=a*i,d=0,f=u,p=u*2,m=-1;o===`RGBA`?(d=0,f=u,p=u*2,m=u*3):o===`RGB`?(d=0,f=u,p=u*2):o===`RBG`&&(d=0,p=u,f=u*2);for(let t=0;t<a;t++)for(let n=0;n<i;n++){let i=(e.data[d++]-l[0])*c[0],a=(e.data[f++]-l[1])*c[1],o=(e.data[p++]-l[2])*c[2],s=m===-1?255:(e.data[m++]-l[3])*c[3];r.fillStyle=`rgba(`+i+`,`+a+`,`+o+`,`+s+`)`,r.fillRect(n,t,1,1)}if(`toDataURL`in n)return n.toDataURL();throw Error(`toDataURL is not supported`)}throw Error(`Can not access image data`)},w=(e,t)=>{let n=typeof document<`u`?document.createElement(`canvas`).getContext(`2d`):new OffscreenCanvas(1,1).getContext(`2d`),r;if(n!=null){let i,a,o;t?.tensorLayout!==void 0&&t.tensorLayout===`NHWC`?(i=e.dims[2],a=e.dims[1],o=e.dims[3]):(i=e.dims[3],a=e.dims[2],o=e.dims[1]);let s=t!==void 0&&t.format!==void 0?t.format:`RGB`,c=t?.norm,l,u;c===void 0||c.mean===void 0?l=[255,255,255,255]:typeof c.mean==`number`?l=[c.mean,c.mean,c.mean,c.mean]:(l=[c.mean[0],c.mean[1],c.mean[2],255],c.mean[3]!==void 0&&(l[3]=c.mean[3])),c===void 0||c.bias===void 0?u=[0,0,0,0]:typeof c.bias==`number`?u=[c.bias,c.bias,c.bias,c.bias]:(u=[c.bias[0],c.bias[1],c.bias[2],0],c.bias[3]!==void 0&&(u[3]=c.bias[3]));let d=a*i;if(t!==void 0&&(t.format!==void 0&&o===4&&t.format!==`RGBA`||o===3&&t.format!==`RGB`&&t.format!==`BGR`))throw Error(`Tensor format doesn't match input tensor dims`);let f=0,p=1,m=2,h=3,g=0,_=d,v=d*2,y=-1;s===`RGBA`?(g=0,_=d,v=d*2,y=d*3):s===`RGB`?(g=0,_=d,v=d*2):s===`RBG`&&(g=0,v=d,_=d*2),r=n.createImageData(i,a);for(let t=0;t<a*i;f+=4,p+=4,m+=4,h+=4,t++)r.data[f]=(e.data[g++]-u[0])*l[0],r.data[p]=(e.data[_++]-u[1])*l[1],r.data[m]=(e.data[v++]-u[2])*l[2],r.data[h]=y===-1?255:(e.data[y++]-u[3])*l[3]}else throw Error(`Can not access image data`);return r}}),E,D,O,k,A,j,ee=a(()=>{"use strict";ce(),E=(e,t)=>{if(e===void 0)throw Error(`Image buffer must be defined`);if(t.height===void 0||t.width===void 0)throw Error(`Image height and width must be defined`);if(t.tensorLayout===`NHWC`)throw Error(`NHWC Tensor layout is not supported yet`);let{height:n,width:r}=t,i=t.norm??{mean:255,bias:0},a,o;a=typeof i.mean==`number`?[i.mean,i.mean,i.mean,i.mean]:[i.mean[0],i.mean[1],i.mean[2],i.mean[3]??255],o=typeof i.bias==`number`?[i.bias,i.bias,i.bias,i.bias]:[i.bias[0],i.bias[1],i.bias[2],i.bias[3]??0];let s=t.format===void 0?`RGBA`:t.format,c=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:`RGB`,l=n*r,u=c===`RGBA`?new Float32Array(l*4):new Float32Array(l*3),d=4,f=0,p=1,m=2,h=3,g=0,_=l,v=l*2,y=-1;s===`RGB`&&(d=3,f=0,p=1,m=2,h=-1),c===`RGBA`?y=l*3:c===`RBG`?(g=0,v=l,_=l*2):c===`BGR`&&(v=0,_=l,g=l*2);for(let t=0;t<l;t++,f+=d,m+=d,p+=d,h+=d)u[g++]=(e[f]+o[0])/a[0],u[_++]=(e[p]+o[1])/a[1],u[v++]=(e[m]+o[2])/a[2],y!==-1&&h!==-1&&(u[y++]=(e[h]+o[3])/a[3]);return c===`RGBA`?new se(`float32`,u,[1,4,n,r]):new se(`float32`,u,[1,3,n,r])},D=async(e,t)=>{let n=typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement,r=typeof ImageData<`u`&&e instanceof ImageData,i=typeof ImageBitmap<`u`&&e instanceof ImageBitmap,a=typeof e==`string`,o,s=t??{},c=()=>{if(typeof document<`u`)return document.createElement(`canvas`);if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(1,1);throw Error(`Canvas is not supported`)},l=e=>typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||e instanceof OffscreenCanvas?e.getContext(`2d`):null;if(n){let n=c();n.width=e.width,n.height=e.height;let r=l(n);if(r!=null){let n=e.height,i=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(n=t.resizedHeight,i=t.resizedWidth),t!==void 0){if(s=t,t.tensorFormat!==void 0)throw Error(`Image input config format must be RGBA for HTMLImageElement`);s.tensorFormat=`RGBA`,s.height=n,s.width=i}else s.tensorFormat=`RGBA`,s.height=n,s.width=i;r.drawImage(e,0,0),o=r.getImageData(0,0,i,n).data}else throw Error(`Can not access image data`)}else if(r){let n,r;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(n=t.resizedHeight,r=t.resizedWidth):(n=e.height,r=e.width),t!==void 0&&(s=t),s.format=`RGBA`,s.height=n,s.width=r,t!==void 0){let t=c();t.width=r,t.height=n;let i=l(t);if(i!=null)i.putImageData(e,0,0),o=i.getImageData(0,0,r,n).data;else throw Error(`Can not access image data`)}else o=e.data}else if(i){if(t===void 0)throw Error(`Please provide image config with format for Imagebitmap`);let n=c();n.width=e.width,n.height=e.height;let r=l(n);if(r!=null){let t=e.height,n=e.width;return r.drawImage(e,0,0,n,t),o=r.getImageData(0,0,n,t).data,s.height=t,s.width=n,E(o,s)}throw Error(`Can not access image data`)}else{if(a)return new Promise((t,n)=>{let r=c(),i=l(r);if(!e||!i)return n();let a=new Image;a.crossOrigin=`Anonymous`,a.src=e,a.onload=()=>{r.width=a.width,r.height=a.height,i.drawImage(a,0,0,r.width,r.height);let e=i.getImageData(0,0,r.width,r.height);s.height=r.height,s.width=r.width,t(E(e.data,s))}});throw Error(`Input data provided is not supported - aborted tensor creation`)}if(o!==void 0)return E(o,s);throw Error(`Input data provided is not supported - aborted tensor creation`)},O=(e,t)=>{let{width:n,height:r,download:i,dispose:a}=t;return new se({location:`texture`,type:`float32`,texture:e,dims:[1,r,n,4],download:i,dispose:a})},k=(e,t)=>{let{dataType:n,dims:r,download:i,dispose:a}=t;return new se({location:`gpu-buffer`,type:n??`float32`,gpuBuffer:e,dims:r,download:i,dispose:a})},A=(e,t)=>{let{dataType:n,dims:r,download:i,dispose:a}=t;return new se({location:`ml-tensor`,type:n??`float32`,mlTensor:e,dims:r,download:i,dispose:a})},j=(e,t,n)=>new se({location:`cpu-pinned`,type:e,data:t,dims:n??[t.length]})}),te,M,ne,re,ie=a(()=>{"use strict";te=/* @__PURE__ */ new Map([[`float32`,Float32Array],[`uint8`,Uint8Array],[`int8`,Int8Array],[`uint16`,Uint16Array],[`int16`,Int16Array],[`int32`,Int32Array],[`bool`,Uint8Array],[`float64`,Float64Array],[`uint32`,Uint32Array],[`int4`,Uint8Array],[`uint4`,Uint8Array]]),M=/* @__PURE__ */ new Map([[Float32Array,`float32`],[Uint8Array,`uint8`],[Int8Array,`int8`],[Uint16Array,`uint16`],[Int16Array,`int16`],[Int32Array,`int32`],[Float64Array,`float64`],[Uint32Array,`uint32`]]),ne=!1,re=()=>{if(!ne){ne=!0;let e=typeof BigInt64Array<`u`&&BigInt64Array.from,t=typeof BigUint64Array<`u`&&BigUint64Array.from,n=globalThis.Float16Array,r=typeof n<`u`&&n.from;e&&(te.set(`int64`,BigInt64Array),M.set(BigInt64Array,`int64`)),t&&(te.set(`uint64`,BigUint64Array),M.set(BigUint64Array,`uint64`)),r?(te.set(`float16`,n),M.set(n,`float16`)):te.set(`float16`,Uint16Array)}}}),ae,N,oe=a(()=>{"use strict";ce(),ae=e=>{let t=1;for(let n=0;n<e.length;n++){let r=e[n];if(typeof r!=`number`||!Number.isSafeInteger(r))throw TypeError(`dims[${n}] must be an integer, got: ${r}`);if(r<0)throw RangeError(`dims[${n}] must be a non-negative integer, got: ${r}`);t*=r}return t},N=(e,t)=>{switch(e.location){case`cpu`:return new se(e.type,e.data,t);case`cpu-pinned`:return new se({location:`cpu-pinned`,data:e.data,type:e.type,dims:t});case`texture`:return new se({location:`texture`,texture:e.texture,type:e.type,dims:t});case`gpu-buffer`:return new se({location:`gpu-buffer`,gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case`ml-tensor`:return new se({location:`ml-tensor`,mlTensor:e.mlTensor,type:e.type,dims:t});default:throw Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),se,ce=a(()=>{"use strict";T(),ee(),ie(),oe(),se=class{constructor(e,t,n){re();let r,i;if(typeof e==`object`&&`location`in e)switch(this.dataLocation=e.location,r=e.type,i=e.dims,e.location){case`cpu-pinned`:{let t=te.get(r);if(!t)throw TypeError(`unsupported type "${r}" to create tensor from pinned buffer`);if(!(e.data instanceof t))throw TypeError(`buffer should be of type ${t.name}`);this.cpuData=e.data;break}case`texture`:if(r!==`float32`)throw TypeError(`unsupported type "${r}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break;case`gpu-buffer`:if(r!==`float32`&&r!==`float16`&&r!==`int32`&&r!==`int64`&&r!==`uint32`&&r!==`uint8`&&r!==`bool`&&r!==`uint4`&&r!==`int4`)throw TypeError(`unsupported type "${r}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break;case`ml-tensor`:if(r!==`float32`&&r!==`float16`&&r!==`int32`&&r!==`int64`&&r!==`uint32`&&r!==`uint64`&&r!==`int8`&&r!==`uint8`&&r!==`bool`&&r!==`uint4`&&r!==`int4`)throw TypeError(`unsupported type "${r}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break;default:throw Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let a,o;if(typeof e==`string`){if(r=e,o=n,e===`string`){if(!Array.isArray(t))throw TypeError(`A string tensor's data must be a string array.`);a=t}else{let n=te.get(e);if(n===void 0)throw TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e===`float16`&&n===Uint16Array||e===`uint4`||e===`int4`)throw TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${n.name} as data.`);a=e===`uint64`||e===`int64`?n.from(t,BigInt):n.from(t)}else if(t instanceof n)a=t;else if(t instanceof Uint8ClampedArray){if(e===`uint8`)a=Uint8Array.from(t);else throw TypeError(`A Uint8ClampedArray tensor's data must be type of uint8`)}else if(e===`float16`&&t instanceof Uint16Array&&n!==Uint16Array)a=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw TypeError(`A ${r} tensor's data must be type of ${n}`)}}else if(o=t,Array.isArray(e)){if(e.length===0)throw TypeError(`Tensor type cannot be inferred from an empty array.`);let t=typeof e[0];if(t===`string`)r=`string`,a=e;else if(t===`boolean`)r=`bool`,a=Uint8Array.from(e);else throw TypeError(`Invalid element type of data array: ${t}.`)}else if(e instanceof Uint8ClampedArray)r=`uint8`,a=Uint8Array.from(e);else{let t=M.get(e.constructor);if(t===void 0)throw TypeError(`Unsupported type for tensor data: ${e.constructor}.`);r=t,a=e}if(o===void 0)o=[a.length];else if(!Array.isArray(o))throw TypeError(`A tensor's dims must be a number array`);i=o,this.cpuData=a,this.dataLocation=`cpu`}let a=ae(i);if(this.cpuData&&a!==this.cpuData.length&&(r!==`uint4`&&r!==`int4`||Math.ceil(a/2)!==this.cpuData.length))throw Error(`Tensor's size(${a}) does not match data length(${this.cpuData.length}).`);this.type=r,this.dims=i,this.size=a}static async fromImage(e,t){return D(e,t)}static fromTexture(e,t){return O(e,t)}static fromGpuBuffer(e,t){return k(e,t)}static fromMLTensor(e,t){return A(e,t)}static fromPinnedBuffer(e,t,n){return j(e,t,n)}toDataURL(e){return C(this,e)}toImageData(e){return w(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw Error(`The data is not stored as a WebGL texture.`);return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw Error(`The data is not stored as a WebGPU buffer.`);return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw Error(`The data is not stored as a WebNN MLTensor.`);return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case`cpu`:case`cpu-pinned`:return this.data;case`texture`:case`gpu-buffer`:case`ml-tensor`:if(!this.downloader)throw Error(`The current tensor is not created with a specified data downloader.`);if(this.isDownloading)throw Error(`The current tensor is being downloaded.`);try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation=`cpu`,this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}default:throw Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw Error(`The current tensor is being downloaded.`);this.disposer&&=(this.disposer(),void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation=`none`}ensureValid(){if(this.dataLocation===`none`)throw Error(`The tensor is disposed.`)}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw Error(`Cannot reshape a tensor that owns GPU resource.`);return N(this,e)}}}),le,ue=a(()=>{"use strict";ce(),le=se}),de,fe,pe,me,he,P,ge=a(()=>{"use strict";b(),de=(e,t)=>{(typeof y.trace>`u`?!y.wasm.trace:!y.trace)||console.timeStamp(`${e}::ORT::${t}`)},fe=(e,t)=>{let n=(/* @__PURE__ */ Error()).stack?.split(/\r\n|\r|\n/g)||[],r=!1;for(let i=0;i<n.length;i++){if(r&&!n[i].includes(`TRACE_FUNC`)){let r=`FUNC_${e}::${n[i].trim().split(` `)[1]}`;t&&(r+=`::${t}`),de(`CPU`,r);return}n[i].includes(`TRACE_FUNC`)&&(r=!0)}},pe=e=>{(typeof y.trace>`u`?!y.wasm.trace:!y.trace)||fe(`BEGIN`,e)},me=e=>{(typeof y.trace>`u`?!y.wasm.trace:!y.trace)||fe(`END`,e)},he=e=>{(typeof y.trace>`u`?!y.wasm.trace:!y.trace)||console.time(`ORT::${e}`)},P=e=>{(typeof y.trace>`u`?!y.wasm.trace:!y.trace)||console.timeEnd(`ORT::${e}`)}}),_e,ve=a(()=>{"use strict";m(),ue(),ge(),_e=class e{constructor(e){this.handler=e}async run(e,t,n){pe(),he(`InferenceSession.run`);let r={},i={};if(typeof e!=`object`||!e||e instanceof le||Array.isArray(e))throw TypeError(`'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.`);let a=!0;if(typeof t==`object`){if(t===null)throw TypeError(`Unexpected argument[1]: cannot be null.`);if(t instanceof le)throw TypeError(`'fetches' cannot be a Tensor`);if(Array.isArray(t)){if(t.length===0)throw TypeError(`'fetches' cannot be an empty array.`);a=!1;for(let e of t){if(typeof e!=`string`)throw TypeError(`'fetches' must be a string array or an object.`);if(this.outputNames.indexOf(e)===-1)throw RangeError(`'fetches' contains invalid output name: ${e}.`);r[e]=null}if(typeof n==`object`&&n)i=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else{let e=!1,o=Object.getOwnPropertyNames(t);for(let n of this.outputNames)if(o.indexOf(n)!==-1){let i=t[n];(i===null||i instanceof le)&&(e=!0,a=!1,r[n]=i)}if(e){if(typeof n==`object`&&n)i=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else i=t}}else if(typeof t<`u`)throw TypeError(`Unexpected argument[1]: must be 'fetches' or 'options'.`);for(let t of this.inputNames)if(typeof e[t]>`u`)throw Error(`input '${t}' is missing in 'feeds'.`);if(a)for(let e of this.outputNames)r[e]=null;let o=await this.handler.run(e,r,i),s={};for(let e in o)if(Object.hasOwnProperty.call(o,e)){let t=o[e];s[e]=t instanceof le?t:new le(t.type,t.data,t.dims)}return P(`InferenceSession.run`),me(),s}async release(){return this.handler.dispose()}static async create(t,n,r,i){pe(),he(`InferenceSession.create`);let a,o={};if(typeof t==`string`){if(a=t,typeof n==`object`&&n)o=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else if(t instanceof Uint8Array){if(a=t,typeof n==`object`&&n)o=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<`u`&&t instanceof SharedArrayBuffer){let e=t,s=0,c=t.byteLength;if(typeof n==`object`&&n)o=n;else if(typeof n==`number`){if(s=n,!Number.isSafeInteger(s))throw RangeError(`'byteOffset' must be an integer.`);if(s<0||s>=e.byteLength)throw RangeError(`'byteOffset' is out of range [0, ${e.byteLength}).`);if(c=t.byteLength-s,typeof r==`number`){if(c=r,!Number.isSafeInteger(c))throw RangeError(`'byteLength' must be an integer.`);if(c<=0||s+c>e.byteLength)throw RangeError(`'byteLength' is out of range (0, ${e.byteLength-s}].`);if(typeof i==`object`&&i)o=i;else if(typeof i<`u`)throw TypeError(`'options' must be an object.`)}else if(typeof r<`u`)throw TypeError(`'byteLength' must be a number.`)}else if(typeof n<`u`)throw TypeError(`'options' must be an object.`);a=new Uint8Array(e,s,c)}else throw TypeError(`Unexpected argument[0]: must be 'path' or 'buffer'.`);let[s,c]=await p(o),l=await s.createInferenceSessionHandler(a,c);return P(`InferenceSession.create`),me(),new e(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),ye,be=a(()=>{"use strict";ve(),ye=_e}),xe=a(()=>{"use strict";}),Se=a(()=>{"use strict";}),Ce=a(()=>{"use strict";}),we=a(()=>{"use strict";});o({},{InferenceSession:()=>ye,TRACE:()=>de,TRACE_EVENT_BEGIN:()=>he,TRACE_EVENT_END:()=>P,TRACE_FUNC_BEGIN:()=>pe,TRACE_FUNC_END:()=>me,Tensor:()=>le,env:()=>x,registerBackend:()=>d});var Te=a(()=>{"use strict";h(),S(),be(),ue(),xe(),Se(),ge(),Ce(),we()}),Ee=a(()=>{"use strict";}),De={};o(De,{default:()=>Ae});var Oe,ke,Ae,je=a(()=>{"use strict";sd(),at(),Xe(),Oe=`ort-wasm-proxy-worker`,ke=globalThis.self?.name===Oe,ke&&(self.onmessage=e=>{let{type:t,in:n}=e.data;try{switch(t){case`init-wasm`:it(n.wasm).then(()=>{Yu(n).then(()=>{postMessage({type:t})},e=>{postMessage({type:t,err:e})})},e=>{postMessage({type:t,err:e})});break;case`init-ep`:{let{epName:e,env:r}=n;Xu(r,e).then(()=>{postMessage({type:t})},e=>{postMessage({type:t,err:e})});break}case`copy-from`:{let{buffer:e}=n,r=ed(e);postMessage({type:t,out:r});break}case`create`:{let{model:e,options:r}=n;td(e,r).then(e=>{postMessage({type:t,out:e})},e=>{postMessage({type:t,err:e})});break}case`release`:nd(n),postMessage({type:t});break;case`run`:{let{sessionId:e,inputIndices:r,inputs:i,outputIndices:a,options:o}=n;id(e,r,i,a,Array(a.length).fill(null),o).then(e=>{e.some(e=>e[3]!==`cpu`)?postMessage({type:t,err:`Proxy does not support non-cpu tensor location.`}):postMessage({type:t,out:e},od([...i,...e]))},e=>{postMessage({type:t,err:e})});break}case`end-profiling`:ad(n),postMessage({type:t})}}catch(e){postMessage({type:t,err:e})}}),Ae=ke?null:e=>new Worker(e??Be,{type:`module`,name:Oe})}),Me={};o(Me,{default:()=>Pe});async function Ne(e={}){var t=e,n=!!globalThis.window,r=!!globalThis.WorkerGlobalScope,i=r&&self.name?.startsWith(`em-pthread`);t.mountExternalData=(e,n)=>{e.startsWith(`./`)&&(e=e.substring(2)),(t.ad||=/* @__PURE__ */ new Map).set(e,n)},t.unmountExternalData=()=>{delete t.ad,delete t.Yd,delete t.Xd,delete t.be},globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,shared:!0}).buffer.constructor;let a=e=>async(...n)=>{try{if(t.$c)throw Error(`Session already started`);let r=t.$c={Nd:n[0],errors:[]},i=await e(...n);if(t.$c!==r)throw Error(`Session mismatch`);t.hd?.flush();let a=r.errors;if(0<a.length){let e=await Promise.all(a);if(e=e.filter(e=>e),0<e.length)throw Error(e.join(`
`))}return i}finally{t.$c=null}};t.jsepInit=(e,n)=>{if(e===`webgpu`){[t.hd,t.Dd,t.Hd,t.jd,t.Gd,t.bc,t.Id,t.Kd,t.Ed,t.Fd,t.Jd]=n;let e=t.hd;t.jsepRegisterBuffer=(t,n,r,i)=>e.registerBuffer(t,n,r,i),t.jsepGetBuffer=t=>e.getBuffer(t),t.jsepCreateDownloader=(t,n,r)=>e.createDownloader(t,n,r),t.jsepOnCreateSession=t=>{e.onCreateSession(t)},t.jsepOnReleaseSession=t=>{e.onReleaseSession(t)},t.jsepOnRunStart=t=>e.onRunStart(t),t.Ld=(t,n)=>{e.upload(t,n)}}else if(e===`webnn`){let e=n[0];[t.Vd,t.vd,t.webnnEnsureTensor,t.wd,t.webnnDownloadTensor,t.Ud,t.webnnEnableTraceEvent]=n.slice(1),t.webnnReleaseTensorId=t.vd,t.webnnUploadTensor=t.wd,t.webnnRegisterMLContext=t.Ud,t.webnnOnRunStart=t=>e.onRunStart(t),t.webnnOnRunEnd=e.onRunEnd.bind(e),t.webnnOnReleaseSession=t=>{e.onReleaseSession(t)},t.webnnCreateMLTensorDownloader=(t,n)=>e.createMLTensorDownloader(t,n),t.webnnRegisterMLTensor=(t,n,r,i)=>e.registerMLTensor(t,n,r,i),t.webnnCreateMLContext=t=>e.createMLContext(t),t.webnnRegisterGraphInput=e.registerGraphInput.bind(e),t.webnnIsGraphInput=e.isGraphInput.bind(e),t.webnnRegisterGraphOutput=e.registerGraphOutput.bind(e),t.webnnIsGraphOutput=e.isGraphOutput.bind(e),t.webnnCreateTemporaryTensor=e.createTemporaryTensor.bind(e),t.webnnIsGraphInputOutputTypeSupported=e.isGraphInputOutputTypeSupported.bind(e)}};let o=()=>{let e=e=>(...t)=>{let n=Zt;return t=e(...t),Zt==n?t:new Promise((e,t)=>{an={resolve:e,reject:t}})};(()=>{for(let n of[`_OrtAppendExecutionProvider`,`_OrtCreateSession`,`_OrtRun`,`_OrtRunWithBinding`,`_OrtBindInput`])t[n]=e(t[n])})(),a!==void 0&&(t._OrtRun=a(t._OrtRun),t._OrtRunWithBinding=a(t._OrtRunWithBinding)),o=void 0};t.asyncInit=()=>{o?.()};var s,c,l=(e,t)=>{throw t},u=self.location.href,d=``;if(n||r){try{d=new URL(`.`,u).href}catch{}r&&(c=e=>{var t=new XMLHttpRequest;return t.open(`GET`,e,!1),t.responseType=`arraybuffer`,t.send(null),new Uint8Array(t.response)}),s=async e=>{if(C(e))return new Promise((t,n)=>{var r=new XMLHttpRequest;r.open(`GET`,e,!0),r.responseType=`arraybuffer`,r.onload=()=>{r.status==200||r.status==0&&r.response?t(r.response):n(r.status)},r.onerror=n,r.send(null)});var t=await fetch(e,{credentials:`same-origin`});if(t.ok)return t.arrayBuffer();throw Error(t.status+` : `+t.url)}}var f,p,m,h,g,_,v=console.log.bind(console),y=console.error.bind(console),b=v,x=y,S=!1,C=e=>e.startsWith(`file://`);function w(){De.buffer!=E.buffer&&ae()}if(i){let e=function(n){try{var r=n.data,i=r.Vc;if(i===`load`){let n=[];self.onmessage=e=>n.push(e),_=()=>{postMessage({Vc:`loaded`});for(let t of n)e(t);self.onmessage=e};for(let e of r.Ad)t[e]&&!t[e].proxy||(t[e]=(...t)=>{postMessage({Vc:`callHandler`,yd:e,args:t})},e==`print`&&(b=t[e]),e==`printErr`&&(x=t[e]));De=r.Rd,ae(),p=r.Sd,ce(),aa()}else if(i===`run`){(function(e){var t=(w(),j)[e+52>>>2>>>0];e=(w(),j)[e+56>>>2>>>0],Cr(t,t-e),Z(t)})(r.Uc),hr(r.Uc,0,0,1,0,0),we(),V(r.Uc),T||=(dr(),!0);try{Oe(r.Pd,r.ed)}catch(e){if(e!=`unwind`)throw e}}else r.target!==`setimmediate`&&(i===`checkMailbox`?T&&Vt():i&&(x(`worker: received unknown command ${i}`),x(r)))}catch(e){throw gr(),e}};var T=!1;self.onunhandledrejection=e=>{throw e.reason||e},self.onmessage=e}var E,D,O,k,A,j,ee,te,M,ne,re,ie=!1;function ae(){var e=De.buffer;t.HEAP8=E=new Int8Array(e),O=new Int16Array(e),t.HEAPU8=D=new Uint8Array(e),k=new Uint16Array(e),t.HEAP32=A=new Int32Array(e),t.HEAPU32=j=new Uint32Array(e),ee=new Float32Array(e),te=new Float64Array(e),M=new BigInt64Array(e),ne=new BigUint64Array(e)}function N(){ie=!0,i?_():gi.ub()}function oe(e){throw x(e=`Aborted(`+e+`)`),S=!0,e=new WebAssembly.RuntimeError(e+`. Build with -sASSERTIONS for more info.`),g?.(e),e}function se(){return{a:{ma:bi,hb:yi,g:je,J:Ne,f:Re,o:ze,i:Be,$:Ve,b:He,S:Ue,Ha:Ge,n:Ke,aa:Xe,Ya:Ze,Da:Qe,Fa:$e,Za:et,Wa:tt,Pa:nt,Va:rt,ka:it,Ea:I,Ba:at,Xa:ot,Ca:st,cb:L,fa:ht,wa:gt,ua:wt,ea:R,N:Et,H:Dt,va:At,_:B,xa:Lt,Sa:Rt,za:Ht,Ia:Wt,sa:Gt,ga:Kt,Ra:V,$a:qt,Q:cn,r:hn,c:yt,ib:gn,y:_n,M:H,D:U,l:vn,s:yn,jb:bn,I:xn,R:W,j:G,u:Sn,q:Cn,k:wn,Ma:K,Na:En,Oa:Dn,Ka:On,La:kn,ta:jn,eb:Mn,bb:Fn,v:Rn,ba:zn,ha:Bn,ab:Nn,V:Vn,_a:Hn,Aa:Un,F:An,U:Wn,la:Yn,ya:Xn,gb:Jn,fb:Zn,Ta:tr,Ua:nr,Ga:ve,T:rr,Ja:ir,ja:ar,Qa:or,ia:cr,lb:ra,na:Qi,mb:na,oa:Zi,G:Bi,e:wi,t:Si,w:xi,B:Pi,nb:Ji,Z:qi,x:Di,pa:Yi,X:$i,ca:Ki,ob:Gi,pb:Wi,O:Fi,qb:Hi,qa:Ui,rb:Vi,L:Ri,Y:Xi,d:Ci,A:Ei,m:Ti,kb:ia,p:ki,z:Ai,C:Oi,E:ji,K:Ii,ra:zi,P:ea,da:Li,W:ta,sb:Ni,tb:Mi,h:lr,a:De,db:ge}}}async function ce(){function e(e,n){var r=gi=e.exports;e={};for(let[t,n]of Object.entries(r))typeof n==`function`?(r=Yt(n),e[t]=r):e[t]=n;return gi=e,gi=(function(){var e=gi,t=e=>t=>e(t)>>>0,n=e=>()=>e()>>>0;return(e=Object.assign({},e)).vb=t(e.vb),e.Zb=n(e.Zb),e.$b=t(e.$b),e.nc=t(e.nc),e.oc=n(e.oc),e.sc=t(e.sc),e})(),xe.push(gi.ac),ur=(e=gi).vb,dr=e.wb,t._OrtInit=e.xb,t._OrtGetLastError=e.yb,t._OrtCreateSessionOptions=e.zb,t._OrtAppendExecutionProvider=e.Ab,t._OrtAddFreeDimensionOverride=e.Bb,t._OrtAddSessionConfigEntry=e.Cb,t._OrtReleaseSessionOptions=e.Db,t._OrtCreateSession=e.Eb,t._OrtReleaseSession=e.Fb,t._OrtGetInputOutputCount=e.Gb,t._OrtGetInputOutputMetadata=e.Hb,t._OrtFree=e.Ib,t._OrtCreateTensor=e.Jb,t._OrtGetTensorData=e.Kb,t._OrtReleaseTensor=e.Lb,t._OrtCreateRunOptions=e.Mb,t._OrtAddRunConfigEntry=e.Nb,t._OrtReleaseRunOptions=e.Ob,t._OrtCreateBinding=e.Pb,t._OrtBindInput=e.Qb,t._OrtBindOutput=e.Rb,t._OrtClearBoundOutputs=e.Sb,t._OrtReleaseBinding=e.Tb,t._OrtRunWithBinding=e.Ub,t._OrtRun=e.Vb,t._OrtEndProfiling=e.Wb,t._JsepOutput=e.Xb,t._JsepGetNodeName=e.Yb,fr=e.Zb,pr=t._free=e._b,mr=t._malloc=e.$b,hr=e.cc,gr=e.dc,_r=e.ec,vr=e.fc,yr=e.gc,br=e.hc,xr=e.ic,X=e.jc,Sr=e.kc,Cr=e.lc,Z=e.mc,wr=e.nc,Q=e.oc,Tr=e.pc,Er=e.qc,Dr=e.rc,Or=e.sc,kr=e.tc,Ar=e.uc,jr=e.vc,Mr=e.wc,Nr=e.xc,Pr=e.yc,Fr=e.zc,Ir=e.Ac,Lr=e.Bc,Rr=e.Cc,zr=e.Dc,Br=e.Ec,Vr=e.Fc,Hr=e.Gc,Ur=e.Hc,Wr=e.Ic,Gr=e.Jc,Kr=e.Kc,qr=e.Lc,Jr=e.Mc,Yr=e.Nc,Xr=e.Oc,Zr=e.Pc,Qr=e.Qc,$r=e.Sc,ei=e.Tc,ti=e.cd,$=e.dd,ni=e.id,ri=e.nd,ii=e.od,ai=e.pd,oi=e.qd,si=e.rd,ci=e.sd,li=e.td,ui=e.ud,di=e.zd,fi=e.Zd,pi=e._d,mi=e.$d,hi=e.ae,p=n,gi}var n,r=se();return t.instantiateWasm?new Promise(n=>{t.instantiateWasm(r,(t,r)=>{n(e(t,r))})}):i?e(new WebAssembly.Instance(p,se()),p):(re??=t.locateFile?t.locateFile?t.locateFile(`ort-wasm-simd-threaded.jsep.wasm`,d):d+`ort-wasm-simd-threaded.jsep.wasm`:new URL(`/assets/ort-wasm-simd-threaded.jsep-MDYUKy93.wasm`,``+self.location.href).href,n=await(async function(e){var t=re;if(!f&&!C(t))try{var n=fetch(t,{credentials:`same-origin`});return await WebAssembly.instantiateStreaming(n,e)}catch(e){x(`wasm streaming compile failed: ${e}`),x(`falling back to ArrayBuffer instantiation`)}return(async function(e,t){try{var n=await(async function(e){if(!f)try{var t=await s(e);return new Uint8Array(t)}catch{}if(e==re&&f)e=new Uint8Array(f);else{if(!c)throw`both async and sync fetching of the wasm failed`;e=c(e)}return e})(e);return await WebAssembly.instantiate(n,t)}catch(e){x(`failed to asynchronously prepare wasm: ${e}`),oe(e)}})(t,e)})(r),e(n.instance,n.module))}class le{name=`ExitStatus`;constructor(e){this.message=`Program terminated with exit(${e})`,this.status=e}}var ue=e=>{e.terminate(),e.onmessage=()=>{}},de=[],fe=0,pe=null,me=e=>{ye.length==0&&(Ee(),Te(ye[0]));var t=ye.pop();if(!t)return 6;be.push(t),Se[e.Uc]=t,t.Uc=e.Uc;var n={Vc:`run`,Pd:e.Od,ed:e.ed,Uc:e.Uc};return t.postMessage(n,e.md),0},he=0,P=(e,t,...n)=>{var r,i=16*n.length,a=Q(),o=wr(i),s=o>>>3;for(r of n)typeof r==`bigint`?((w(),M)[s++>>>0]=1n,(w(),M)[s++>>>0]=r):((w(),M)[s++>>>0]=0n,(w(),te)[s++>>>0]=r);return e=_r(e,0,i,o,t),Z(a),e};function ge(e){if(i)return P(0,1,e);if(m=e,!(0<he)){for(var t of be)ue(t);for(t of ye)ue(t);ye=[],be=[],Se={},S=!0}l(0,new le(e))}function _e(e){if(i)return P(1,0,e);ve(e)}var ve=e=>{if(m=e,i)throw _e(e),`unwind`;ge(e)},ye=[],be=[],xe=[],Se={},Ce=e=>{var t=e.Uc;delete Se[t],ye.push(e),be.splice(be.indexOf(e),1),e.Uc=0,vr(t)};function we(){xe.forEach(e=>e())}var Te=e=>new Promise(n=>{e.onmessage=r=>{var i=r.data;if(r=i.Vc,i.bd&&i.bd!=fr()){var a=Se[i.bd];a?a.postMessage(i,i.md):x(`Internal error! Worker sent a message "${r}" to target pthread ${i.bd}, but that thread no longer exists!`)}else r===`checkMailbox`?Vt():r===`spawnThread`?me(i):r===`cleanupThread`?zt(()=>{Ce(Se[i.Qd])}):r===`loaded`?(e.loaded=!0,n(e)):i.target===`setimmediate`?e.postMessage(i):r===`uncaughtException`?e.onerror(i.error):r===`callHandler`?t[i.yd](...i.args):r&&x(`worker sent an unknown command ${r}`)},e.onerror=e=>{throw x(`worker sent an error! ${e.filename}:${e.lineno}: ${e.message}`),e};var r,i=[];for(r of[])t.propertyIsEnumerable(r)&&i.push(r);e.postMessage({Vc:`load`,Ad:i,Rd:De,Sd:p})});function Ee(){var e=new Worker((()=>{let e=URL;return self.location.href>`file:`&&self.location.href<`file;`?new e(`ort.bundle.min.mjs`,self.location.href):new URL(self.location.href)})(),{type:`module`,workerData:`em-pthread`,name:`em-pthread`});ye.push(e)}var De,Oe=(e,t)=>{he=0,e=Ar(e,t),0<he?m=e:yr(e)},ke=[],Ae=0;function je(e){var t=new Ie(e>>>=0);return(w(),E)[t.Wc+12>>>0]==0&&(Pe(t,!0),Ae--),Fe(t,!1),ke.push(t),Or(e)}var Me=0,Ne=()=>{X(0,0);var e=ke.pop();Tr(e.gd),Me=0};function Pe(e,t){t=+!!t,(w(),E)[e.Wc+12>>>0]=t}function Fe(e,t){t=+!!t,(w(),E)[e.Wc+13>>>0]=t}class Ie{constructor(e){this.gd=e,this.Wc=e-24}}var Le=e=>{var t=Me;if(!t)return Sr(0),0;var n=new Ie(t);(w(),j)[n.Wc+16>>>2>>>0]=t;var r=(w(),j)[n.Wc+4>>>2>>>0];if(!r)return Sr(0),t;for(var i of e){if(i===0||i===r)break;if(Dr(i,r,n.Wc+16))return Sr(i),t}return Sr(r),t};function Re(){return Le([])}function ze(e){return Le([e>>>0])}function Be(e,t,n,r){return Le([e>>>0,t>>>0,n>>>0,r>>>0])}var Ve=()=>{var e=ke.pop();e||oe(`no exception to throw`);var t=e.gd;throw(w(),E)[e.Wc+13>>>0]==0&&(ke.push(e),Fe(e,!0),Pe(e,!1),Ae++),Er(t),Me=t};function He(e,t,n){var r=new Ie(e>>>=0);throw t>>>=0,n>>>=0,(w(),j)[r.Wc+16>>>2>>>0]=0,(w(),j)[r.Wc+4>>>2>>>0]=t,(w(),j)[r.Wc+8>>>2>>>0]=n,Er(e),Ae++,Me=e}var Ue=()=>Ae;function We(e,t,n,r){return i?P(2,1,e,t,n,r):Ge(e,t,n,r)}function Ge(e,t,n,r){if(e>>>=0,t>>>=0,n>>>=0,r>>>=0,!globalThis.SharedArrayBuffer)return 6;var a=[];return i&&a.length===0?We(e,t,n,r):(e={Od:n,Uc:e,ed:r,md:a},i?(e.Vc=`spawnThread`,postMessage(e,a),0):me(e))}function Ke(e){throw Me||=e>>>0,Me}var qe=globalThis.TextDecoder&&new TextDecoder,Je=(e,t,n,r)=>{if(n=t+n,r)return n;for(;e[t]&&!(t>=n);)++t;return t},Ye=(e,t=0,n,r)=>{if(16<(n=Je(e,t>>>=0,n,r))-t&&e.buffer&&qe)return qe.decode(e.buffer instanceof ArrayBuffer?e.subarray(t,n):e.slice(t,n));for(r=``;t<n;){var i=e[t++];if(128&i){var a=63&e[t++];if((224&i)==192)r+=String.fromCharCode((31&i)<<6|a);else{var o=63&e[t++];65536>(i=(240&i)==224?(15&i)<<12|a<<6|o:(7&i)<<18|a<<12|o<<6|63&e[t++])?r+=String.fromCharCode(i):(i-=65536,r+=String.fromCharCode(55296|i>>10,56320|1023&i))}}else r+=String.fromCharCode(i)}return r},F=(e,t,n)=>(e>>>=0)?Ye((w(),D),e,t,n):``;function Xe(e,t,n){return i?P(3,1,e,t,n):0}function Ze(e,t){if(i)return P(4,1,e,t)}function Qe(e,t){if(i)return P(5,1,e,t)}function $e(e,t,n){if(i)return P(6,1,e,t,n)}function et(e,t,n){return i?P(7,1,e,t,n):0}function tt(e,t){if(i)return P(8,1,e,t)}function nt(e,t,n){if(i)return P(9,1,e,t,n)}function rt(e,t,n,r){if(i)return P(10,1,e,t,n,r)}function it(e,t,n,r){if(i)return P(11,1,e,t,n,r)}function I(e,t,n,r){if(i)return P(12,1,e,t,n,r)}function at(e){if(i)return P(13,1,e)}function ot(e,t){if(i)return P(14,1,e,t)}function st(e,t,n){if(i)return P(15,1,e,t,n)}var L=()=>oe(``),ct=e=>{e>>>=0;for(var t=``;;){var n=(w(),D)[e++>>>0];if(!n)return t;t+=String.fromCharCode(n)}},lt={},ut={},dt={},ft=class extends Error{constructor(e){super(e),this.name=`BindingError`}};function pt(e,t,n={}){return(function(e,t,n={}){var r=t.name;if(!e)throw new ft(`type "${r}" must have a positive integer typeid pointer`);if(ut.hasOwnProperty(e)){if(n.Bd)return;throw new ft(`Cannot register type '${r}' twice`)}ut[e]=t,delete dt[e],lt.hasOwnProperty(e)&&(t=lt[e],delete lt[e],t.forEach(e=>e()))})(e,t,n)}var mt=(e,t,n)=>{switch(t){case 1:return n?e=>(w(),E)[e>>>0]:e=>(w(),D)[e>>>0];case 2:return n?e=>(w(),O)[e>>>1>>>0]:e=>(w(),k)[e>>>1>>>0];case 4:return n?e=>(w(),A)[e>>>2>>>0]:e=>(w(),j)[e>>>2>>>0];case 8:return n?e=>(w(),M)[e>>>3>>>0]:e=>(w(),ne)[e>>>3>>>0];default:throw TypeError(`invalid integer width (${t}): ${e}`)}};function ht(e,t,n,r,i){e>>>=0,n>>>=0,t=ct(t>>>0);let a=e=>e;if(r=r===0n){let e=8*n;a=t=>BigInt.asUintN(e,t),i=a(i)}pt(e,{name:t,Rc:a,Yc:(e,t)=>(typeof t==`number`&&(t=BigInt(t)),t),Xc:mt(t,n,!r),Zc:null})}function gt(e,t,n,r){pt(e>>>=0,{name:t=ct(t>>>0),Rc:function(e){return!!e},Yc:function(e,t){return t?n:r},Xc:function(e){return this.Rc((w(),D)[e>>>0])},Zc:null})}var _t=[],vt=[0,1,,1,null,1,!0,1,!1,1];function yt(e){9<(e>>>=0)&&--vt[e+1]===0&&(vt[e]=void 0,_t.push(e))}var bt=e=>{if(!e)throw new ft(`Cannot use deleted val. handle = ${e}`);return vt[e]},xt=e=>{switch(e){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let t=_t.pop()||vt.length;return vt[t]=e,vt[t+1]=1,t}};function St(e){return this.Rc((w(),j)[e>>>2>>>0])}var Ct={name:`emscripten::val`,Rc:e=>{var t=bt(e);return yt(e),t},Yc:(e,t)=>xt(t),Xc:St,Zc:null};function wt(e){return pt(e>>>0,Ct)}var Tt=(e,t)=>{switch(t){case 4:return function(e){return this.Rc((w(),ee)[e>>>2>>>0])};case 8:return function(e){return this.Rc((w(),te)[e>>>3>>>0])};default:throw TypeError(`invalid float width (${t}): ${e}`)}};function R(e,t,n){n>>>=0,pt(e>>>=0,{name:t=ct(t>>>0),Rc:e=>e,Yc:(e,t)=>t,Xc:Tt(t,n),Zc:null})}function Et(e,t,n,r,i){e>>>=0,n>>>=0,t=ct(t>>>0);let a=e=>e;if(r===0){var o=32-8*n;a=e=>e<<o>>>o,i=a(i)}pt(e,{name:t,Rc:a,Yc:(e,t)=>t,Xc:mt(t,n,r!==0),Zc:null})}function Dt(e,t,n){function r(e){var t=(w(),j)[e>>>2>>>0];return e=(w(),j)[e+4>>>2>>>0],new i((w(),E).buffer,e,t)}var i=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][t];pt(e>>>=0,{name:n=ct(n>>>0),Rc:r,Xc:r},{Bd:!0})}var Ot=(e,t,n)=>{var r=(w(),D);if(t>>>=0,0<n){var i=t;n=t+n-1;for(var a=0;a<e.length;++a){var o=e.codePointAt(a);if(127>=o){if(t>=n)break;r[t++>>>0]=o}else if(2047>=o){if(t+1>=n)break;r[t++>>>0]=192|o>>6,r[t++>>>0]=128|63&o}else if(65535>=o){if(t+2>=n)break;r[t++>>>0]=224|o>>12,r[t++>>>0]=128|o>>6&63,r[t++>>>0]=128|63&o}else{if(t+3>=n)break;r[t++>>>0]=240|o>>18,r[t++>>>0]=128|o>>12&63,r[t++>>>0]=128|o>>6&63,r[t++>>>0]=128|63&o,a++}}r[t>>>0]=0,e=t-i}else e=0;return e},kt=e=>{for(var t=0,n=0;n<e.length;++n){var r=e.charCodeAt(n);127>=r?t++:2047>=r?t+=2:55296<=r&&57343>=r?(t+=4,++n):t+=3}return t};function At(e,t){pt(e>>>=0,{name:t=ct(t>>>0),Rc(e){var t=(w(),j)[e>>>2>>>0];return t=F(e+4,t,!0),pr(e),t},Yc(e,t){t instanceof ArrayBuffer&&(t=new Uint8Array(t));var n=typeof t==`string`;if(!(n||ArrayBuffer.isView(t)&&t.BYTES_PER_ELEMENT==1))throw new ft(`Cannot pass non-string to std::string`);var r=n?kt(t):t.length,i=mr(4+r+1),a=i+4;return(w(),j)[i>>>2>>>0]=r,n?Ot(t,a,r+1):(w(),D).set(t,a>>>0),e!==null&&e.push(pr,i),i},Xc:St,Zc(e){pr(e)}})}var jt=globalThis.TextDecoder?new TextDecoder(`utf-16le`):void 0,Mt=(e,t,n)=>{if(e>>>=1,16<(t=Je((w(),k),e,t/2,n))-e&&jt)return jt.decode((w(),k).slice(e,t));for(n=``;e<t;++e){var r=(w(),k)[e>>>0];n+=String.fromCharCode(r)}return n},Nt=(e,t,n)=>{if(n??=2147483647,2>n)return 0;var r=t;n=(n-=2)<2*e.length?n/2:e.length;for(var i=0;i<n;++i){var a=e.charCodeAt(i);(w(),O)[t>>>1>>>0]=a,t+=2}return(w(),O)[t>>>1>>>0]=0,t-r},z=e=>2*e.length,Pt=(e,t,n)=>{var r=``;e>>>=2;for(var i=0;!(i>=t/4);i++){var a=(w(),j)[e+i>>>0];if(!a&&!n)break;r+=String.fromCodePoint(a)}return r},Ft=(e,t,n)=>{if(t>>>=0,n??=2147483647,4>n)return 0;var r=t;n=r+n-4;for(var i=0;i<e.length;++i){var a=e.codePointAt(i);if(65535<a&&i++,(w(),A)[t>>>2>>>0]=a,(t+=4)+4>n)break}return(w(),A)[t>>>2>>>0]=0,t-r},It=e=>{for(var t=0,n=0;n<e.length;++n)65535<e.codePointAt(n)&&n++,t+=4;return t};function B(e,t,n){if(e>>>=0,t>>>=0,n=ct(n>>>=0),t===2)var r=Mt,i=Nt,a=z;else r=Pt,i=Ft,a=It;pt(e,{name:n,Rc:e=>{var n=(w(),j)[e>>>2>>>0];return n=r(e+4,n*t,!0),pr(e),n},Yc:(e,r)=>{if(typeof r!=`string`)throw new ft(`Cannot pass non-string to C++ string type ${n}`);var o=a(r),s=mr(4+o+t);return(w(),j)[s>>>2>>>0]=o/t,i(r,s+4,o+t),e!==null&&e.push(pr,s),s},Xc:St,Zc(e){pr(e)}})}function Lt(e,t){pt(e>>>=0,{Cd:!0,name:t=ct(t>>>0),Rc:()=>{},Yc:()=>{}})}function Rt(e){hr(e>>>0,!r,1,!n,131072,!1),we()}var zt=e=>{if(!S)try{if(e(),!(0<he))try{i?fr()&&yr(m):ve(m)}catch(e){e instanceof le||e==`unwind`||l(0,e)}}catch(e){e instanceof le||e==`unwind`||l(0,e)}},Bt=!Atomics.waitAsync||globalThis.navigator?.userAgent&&91>Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)||[])[2]);function V(e){e>>>=0,Bt||(Atomics.waitAsync((w(),A),e>>>2,e).value.then(Vt),e+=128,Atomics.store((w(),A),e>>>2,1))}var Vt=()=>zt(()=>{var e=fr();e&&(V(e),xr())});function Ht(e,t){(e>>>=0)==t>>>0?setTimeout(Vt):i?postMessage({bd:e,Vc:`checkMailbox`}):(e=Se[e])&&e.postMessage({Vc:`checkMailbox`})}var Ut=[];function Wt(e,t,n,r,i){for(t>>>=0,i>>>=0,Ut.length=0,n=i>>>3,r=i+r>>>3;n<r;){var a=(w(),M)[n++>>>0]?(w(),M)[n++>>>0]:(w(),te)[n++>>>0];Ut.push(a)}return(t?vi[t]:_i[e])(...Ut)}var Gt=()=>{he=0};function Kt(e){e>>>=0,i?postMessage({Vc:`cleanupThread`,Qd:e}):Ce(Se[e])}function qt(e){}var Jt=e=>{try{e()}catch(e){oe(e)}};function Yt(e){var t=(...t)=>{$t.push(e);try{return e(...t)}finally{S||($t.pop(),Zt&&Xt===1&&$t.length===0&&(Xt=0,he+=1,Jt(pi),typeof Fibers<`u`&&Fibers.de()))}};return nn.set(e,t),t}var Xt=0,Zt=null,Qt=0,$t=[],en=/* @__PURE__ */ new Map,tn=/* @__PURE__ */ new Map,nn=/* @__PURE__ */ new Map,rn=0,an=null,on=[],sn=e=>(function(e){if(!S){if(Xt===0){var t=!1,n=!1;e((e=0)=>{if(!S&&(Qt=e,t=!0,n)){Xt=2,Jt(()=>mi(Zt)),typeof MainLoop<`u`&&MainLoop.xd&&MainLoop.resume(),e=!1;try{var r=(function(){var e=(w(),A)[Zt+8>>>2>>>0];return e=tn.get(e),e=nn.get(e),--he,e()})()}catch(t){r=t,e=!0}var i=!1;if(!Zt){var a=an;a&&(an=null,(e?a.reject:a.resolve)(r),i=!0)}if(e&&!i)throw r}}),n=!0,t||(Xt=1,Zt=(function(){var e=mr(65548),t=e+12;if((w(),j)[e>>>2>>>0]=t,(w(),j)[e+4>>>2>>>0]=t+65536,t=$t[0],!en.has(t)){var n=rn++;en.set(t,n),tn.set(n,t)}return t=en.get(t),(w(),A)[e+8>>>2>>>0]=t,e})(),typeof MainLoop<`u`&&MainLoop.xd&&MainLoop.pause(),Jt(()=>fi(Zt)))}else Xt===2?(Xt=0,Jt(hi),pr(Zt),Zt=null,on.forEach(zt)):oe(`invalid state: ${Xt}`);return Qt}})(t=>{e().then(t)});function cn(e){return e>>>=0,sn(async()=>xt(await bt(e)))}var ln=[],un=e=>{var t=ln.length;return ln.push(e),t},dn=(e,t)=>{for(var n=Array(e),r=0;r<e;++r){var i=r,a=(w(),j)[t+4*r>>>2>>>0],o=ut[a];if(o===void 0)throw e=`parameter ${r}`,a=ur(a),t=ct(a),pr(a),new ft(`${e} has unknown type ${t}`);n[i]=o}return n},fn=(e,t,n)=>{var r=[];return e=e(r,n),r.length&&((w(),j)[t>>>2>>>0]=xt(r)),e},pn={},mn=e=>{var t=pn[e];return t===void 0?ct(e):t};function hn(e,t,n){var[r,...i]=dn(e,t>>>0);t=r.Yc.bind(r);var a=i.map(e=>e.Xc.bind(e));e--;var o={toValue:bt};switch(e=a.map((e,t)=>{var n=`argFromPtr${t}`;return o[n]=e,`${n}(args${t?`+`+8*t:``})`}),n){case 0:var s=`toValue(handle)`;break;case 2:s=`new (toValue(handle))`;break;case 3:s=``;break;case 1:o.getStringOrSymbol=mn,s=`toValue(handle)[getStringOrSymbol(methodName)]`}return s+=`(${e})`,r.Cd||(o.toReturnWire=t,o.emval_returnValue=fn,s=`return emval_returnValue(toReturnWire, destructorsRef, ${s})`),s=`return function (handle, methodName, destructorsRef, args) {
  ${s}
  }`,n=Function(Object.keys(o),s)(...Object.values(o)),s=`methodCaller<(${i.map(e=>e.name)}) => ${r.name}>`,un(Object.defineProperty(n,"name",{value:s}))}function gn(e,t){return t>>>=0,(e=bt(e>>>0))==bt(t)}function _n(e){return(e>>>=0)?(e=mn(e),xt(globalThis[e])):xt(globalThis)}function H(e){return e=mn(e>>>0),xt(t[e])}function U(e,t){return t>>>=0,e=bt(e>>>0),t=bt(t),xt(e[t])}function vn(e){9<(e>>>=0)&&(vt[e+1]+=1)}function yn(e,t,n,r,i){return ln[e>>>0](t>>>0,n>>>0,r>>>0,i>>>0)}function bn(e,t,n,r,i){return yn(e>>>0,t>>>0,n>>>0,r>>>0,i>>>0)}function xn(){return xt([])}function W(e){e=bt(e>>>0);for(var t=Array(e.length),n=0;n<e.length;n++)t[n]=e[n];return xt(t)}function G(e){return xt(mn(e>>>0))}function Sn(){return xt({})}function Cn(e){for(var t=bt(e>>>=0);t.length;){var n=t.pop();t.pop()(n)}yt(e)}function wn(e,t,n){t>>>=0,n>>>=0,e=bt(e>>>0),t=bt(t),n=bt(n),e[t]=n}function K(e,t){e=-9007199254740992>e||9007199254740992<e?NaN:Number(e),t>>>=0,e=/* @__PURE__ */ new Date(1e3*e),(w(),A)[t>>>2>>>0]=e.getUTCSeconds(),(w(),A)[t+4>>>2>>>0]=e.getUTCMinutes(),(w(),A)[t+8>>>2>>>0]=e.getUTCHours(),(w(),A)[t+12>>>2>>>0]=e.getUTCDate(),(w(),A)[t+16>>>2>>>0]=e.getUTCMonth(),(w(),A)[t+20>>>2>>>0]=e.getUTCFullYear()-1900,(w(),A)[t+24>>>2>>>0]=e.getUTCDay(),e=(e.getTime()-Date.UTC(e.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,(w(),A)[t+28>>>2>>>0]=e}var Tn=e=>e%4==0&&(e%100!=0||e%400==0),q=[0,31,60,91,121,152,182,213,244,274,305,335],J=[0,31,59,90,120,151,181,212,243,273,304,334];function En(e,t){e=-9007199254740992>e||9007199254740992<e?NaN:Number(e),t>>>=0,e=/* @__PURE__ */ new Date(1e3*e),(w(),A)[t>>>2>>>0]=e.getSeconds(),(w(),A)[t+4>>>2>>>0]=e.getMinutes(),(w(),A)[t+8>>>2>>>0]=e.getHours(),(w(),A)[t+12>>>2>>>0]=e.getDate(),(w(),A)[t+16>>>2>>>0]=e.getMonth(),(w(),A)[t+20>>>2>>>0]=e.getFullYear()-1900,(w(),A)[t+24>>>2>>>0]=e.getDay();var n=(Tn(e.getFullYear())?q:J)[e.getMonth()]+e.getDate()-1|0;(w(),A)[t+28>>>2>>>0]=n,(w(),A)[t+36>>>2>>>0]=-60*e.getTimezoneOffset(),n=new Date(e.getFullYear(),6,1).getTimezoneOffset();var r=new Date(e.getFullYear(),0,1).getTimezoneOffset();e=0|(n!=r&&e.getTimezoneOffset()==Math.min(r,n)),(w(),A)[t+32>>>2>>>0]=e}function Dn(e){e>>>=0;var t=new Date((w(),A)[e+20>>>2>>>0]+1900,(w(),A)[e+16>>>2>>>0],(w(),A)[e+12>>>2>>>0],(w(),A)[e+8>>>2>>>0],(w(),A)[e+4>>>2>>>0],(w(),A)[e>>>2>>>0],0),n=(w(),A)[e+32>>>2>>>0],r=t.getTimezoneOffset(),i=new Date(t.getFullYear(),6,1).getTimezoneOffset(),a=new Date(t.getFullYear(),0,1).getTimezoneOffset(),o=Math.min(a,i);return 0>n?(w(),A)[e+32>>>2>>>0]=+(i!=a&&o==r):0<n!=(o==r)&&(i=Math.max(a,i),t.setTime(t.getTime()+6e4*((0<n?o:i)-r))),(w(),A)[e+24>>>2>>>0]=t.getDay(),n=(Tn(t.getFullYear())?q:J)[t.getMonth()]+t.getDate()-1|0,(w(),A)[e+28>>>2>>>0]=n,(w(),A)[e>>>2>>>0]=t.getSeconds(),(w(),A)[e+4>>>2>>>0]=t.getMinutes(),(w(),A)[e+8>>>2>>>0]=t.getHours(),(w(),A)[e+12>>>2>>>0]=t.getDate(),(w(),A)[e+16>>>2>>>0]=t.getMonth(),(w(),A)[e+20>>>2>>>0]=t.getYear(),e=t.getTime(),BigInt(isNaN(e)?-1:e/1e3)}function On(e,t,n,r,a,o,s){return i?P(16,1,e,t,n,r,a,o,s):-52}function kn(e,t,n,r,a,o){if(i)return P(17,1,e,t,n,r,a,o)}var Y={},An=()=>performance.timeOrigin+performance.now();function jn(e,t){return i?P(18,1,e,t):(Y[e]&&(clearTimeout(Y[e].id),delete Y[e]),t&&(Y[e]={id:setTimeout(()=>{delete Y[e],zt(()=>br(e,performance.timeOrigin+performance.now()))},t),ce:t}),0)}function Mn(e,t,n,r){e>>>=0,t>>>=0,n>>>=0,r>>>=0;var i=(/* @__PURE__ */ new Date()).getFullYear(),a=new Date(i,0,1).getTimezoneOffset();i=new Date(i,6,1).getTimezoneOffset();var o=Math.max(a,i);(w(),j)[e>>>2>>>0]=60*o,(w(),A)[t>>>2>>>0]=+(a!=i),e=(t=e=>{var t=Math.abs(e);return`UTC${0<=e?`-`:`+`}${String(Math.floor(t/60)).padStart(2,`0`)}${String(t%60).padStart(2,`0`)}`})(a),t=t(i),i<a?(Ot(e,n,17),Ot(t,r,17)):(Ot(e,r,17),Ot(t,n,17))}var Nn=()=>Date.now(),Pn=1;function Fn(e,t,n){if(n>>>=0,!(0<=e&&3>=e))return 28;if(e===0)e=Date.now();else{if(!Pn)return 52;e=performance.timeOrigin+performance.now()}return e=Math.round(1e6*e),(w(),M)[n>>>3>>>0]=BigInt(e),0}var In=[],Ln=(e,t)=>{In.length=0;for(var n;n=(w(),D)[e++>>>0];){var r=n!=105;t+=(r&=n!=112)&&t%8?4:0,In.push(n==112?(w(),j)[t>>>2>>>0]:n==106?(w(),M)[t>>>3>>>0]:n==105?(w(),A)[t>>>2>>>0]:(w(),te)[t>>>3>>>0]),t+=r?8:4}return In};function Rn(e,t,n){return e>>>=0,t=Ln(t>>>0,n>>>0),vi[e](...t)}function zn(e,t,n){return e>>>=0,t=Ln(t>>>0,n>>>0),vi[e](...t)}var Bn=()=>{};function Vn(e,t){return x(F(e>>>0,t>>>0))}var Hn=()=>{throw he+=1,`unwind`};function Un(){return 4294901760}var Wn=()=>navigator.hardwareConcurrency,Gn={},Kn=e=>{var t;return(t=/\bwasm-function\[\d+\]:(0x[0-9a-f]+)/.exec(e))?+t[1]:(t=/:(\d+):\d+(?:\)|$)/.exec(e))?2147483648|t[1]:0},qn=e=>{for(var t of e)(e=Kn(t))&&(Gn[e]=t)};function Jn(){var e=Error().stack.toString().split(`
`);return e[0]==`Error`&&e.shift(),qn(e),Gn.kd=Kn(e[3]),Gn.Md=e,Gn.kd}function Yn(e){if(!(e=Gn[e>>>0]))return 0;var t;if(t=/^\s+at .*\.wasm\.(.*) \(.*\)$/.exec(e))e=t[1];else if(t=/^\s+at (.*) \(.*\)$/.exec(e))e=t[1];else{if(!(t=/^(.+?)@/.exec(e)))return 0;e=t[1]}pr(Yn.ld??0),t=kt(e)+1;var n=mr(t);return n&&Ot(e,n,t),Yn.ld=n,Yn.ld}function Xn(e){e>>>=0;var t=(w(),D).length;if(e<=t||4294901760<e)return!1;for(var n=1;4>=n;n*=2){var r=t*(1+.2/n);r=Math.min(r,e+100663296);e:{r=(Math.min(4294901760,65536*Math.ceil(Math.max(e,r)/65536))-De.buffer.byteLength+65535)/65536|0;try{De.grow(r),ae();var i=1;break e}catch{}i=void 0}if(i)return!0}return!1}function Zn(e,t,n){if(e>>>=0,t>>>=0,Gn.kd==e)var r=Gn.Md;else(r=Error().stack.toString().split(`
`))[0]==`Error`&&r.shift(),qn(r);for(var i=3;r[i]&&Kn(r[i])!=e;)++i;for(e=0;e<n&&r[e+i];++e)(w(),A)[t+4*e>>>2>>>0]=Kn(r[e+i]);return e}var Qn,$n={},er=()=>{if(!Qn){var e,t={USER:`web_user`,LOGNAME:`web_user`,PATH:`/`,PWD:`/`,HOME:`/home/web_user`,LANG:(globalThis.navigator?.language??`C`).replace(`-`,`_`)+`.UTF-8`,_:`./this.program`};for(e in $n)$n[e]===void 0?delete t[e]:t[e]=$n[e];var n=[];for(e in t)n.push(`${e}=${t[e]}`);Qn=n}return Qn};function tr(e,t){if(i)return P(19,1,e,t);e>>>=0,t>>>=0;var n,r=0,a=0;for(n of er()){var o=t+r;(w(),j)[e+a>>>2>>>0]=o,r+=Ot(n,o,1/0)+1,a+=4}return 0}function nr(e,t){if(i)return P(20,1,e,t);e>>>=0,t>>>=0;var n=er();for(var r of((w(),j)[e>>>2>>>0]=n.length,e=0,n))e+=kt(r)+1;return(w(),j)[t>>>2>>>0]=e,0}function rr(e){return i?P(21,1,e):52}function ir(e,t,n,r,a){return i?P(22,1,e,t,n,r,a):52}function ar(e,t,n,r){return i?P(23,1,e,t,n,r):52}function or(e,t,n,r){return i?P(24,1,e,t,n,r):70}var sr=[null,[],[]];function cr(e,t,n,r){if(i)return P(25,1,e,t,n,r);t>>>=0,n>>>=0,r>>>=0;for(var a=0,o=0;o<n;o++){var s=(w(),j)[t>>>2>>>0],c=(w(),j)[t+4>>>2>>>0];t+=8;for(var l=0;l<c;l++){var u=e,d=(w(),D)[s+l>>>0],f=sr[u];d===0||d===10?((u===1?b:x)(Ye(f)),f.length=0):f.push(d)}a+=c}return(w(),j)[r>>>2>>>0]=a,0}function lr(e){return e>>>0}i||(function(){for(var e=t.numThreads-1;e--;)Ee();de.push(async()=>{var e=(async function(){if(!i)return Promise.all(ye.map(Te))})();fe++,await e,--fe==0&&pe&&(e=pe,pe=null,e())})})(),i||(De=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0}),ae()),t.wasmBinary&&(f=t.wasmBinary),t.stackSave=()=>Q(),t.stackRestore=e=>Z(e),t.stackAlloc=e=>wr(e),t.setValue=function(e,t,n=`i8`){switch(n.endsWith(`*`)&&(n=`*`),n){case`i1`:case`i8`:(w(),E)[e>>>0]=t;break;case`i16`:(w(),O)[e>>>1>>>0]=t;break;case`i32`:(w(),A)[e>>>2>>>0]=t;break;case`i64`:(w(),M)[e>>>3>>>0]=BigInt(t);break;case`float`:(w(),ee)[e>>>2>>>0]=t;break;case`double`:(w(),te)[e>>>3>>>0]=t;break;case`*`:(w(),j)[e>>>2>>>0]=t;break;default:oe(`invalid type for setValue: ${n}`)}},t.getValue=function(e,t=`i8`){switch(t.endsWith(`*`)&&(t=`*`),t){case`i1`:case`i8`:return(w(),E)[e>>>0];case`i16`:return(w(),O)[e>>>1>>>0];case`i32`:return(w(),A)[e>>>2>>>0];case`i64`:return(w(),M)[e>>>3>>>0];case`float`:return(w(),ee)[e>>>2>>>0];case`double`:return(w(),te)[e>>>3>>>0];case`*`:return(w(),j)[e>>>2>>>0];default:oe(`invalid type for getValue: ${t}`)}},t.UTF8ToString=F,t.stringToUTF8=Ot,t.lengthBytesUTF8=kt;var ur,dr,fr,pr,mr,hr,gr,_r,vr,yr,br,xr,X,Sr,Cr,Z,wr,Q,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,$,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i=[ge,_e,We,Xe,Ze,Qe,$e,et,tt,nt,rt,it,I,at,ot,st,On,kn,jn,tr,nr,rr,ir,ar,or,cr],vi={1086876:(e,n,r,i,a)=>{if(t===void 0||!t.ad)return 1;if((e=F(Number(e>>>0))).startsWith(`./`)&&(e=e.substring(2)),!(e=t.ad.get(e)))return 2;if(n=Number(n>>>0),r=Number(r>>>0),i=Number(i>>>0),n+r>e.byteLength)return 3;try{let o=e.subarray(n,n+r);switch(a){case 0:(w(),D).set(o,i>>>0);break;case 1:t.Td?t.Td(i,o):t.Ld(i,o);break;default:return 4}return 0}catch{return 4}},1087700:(e,n,r)=>{t.wd(e,(w(),D).subarray(n>>>0,n+r>>>0))},1087764:()=>t.Vd(),1087806:e=>{t.vd(e)},1087843:()=>{t.Ed()},1087874:()=>{t.Fd()},1087903:()=>{t.Jd()},1087928:e=>t.Dd(e),1087961:e=>t.Hd(e),1087993:(e,n,r)=>{t.jd(Number(e),Number(n),Number(r),!0)},1088056:(e,n,r)=>{t.jd(Number(e),Number(n),Number(r))},1088113:()=>typeof wasmOffsetConverter<`u`,1088170:e=>{t.bc(`Abs`,e,void 0)},1088221:e=>{t.bc(`Neg`,e,void 0)},1088272:e=>{t.bc(`Floor`,e,void 0)},1088325:e=>{t.bc(`Ceil`,e,void 0)},1088377:e=>{t.bc(`Reciprocal`,e,void 0)},1088435:e=>{t.bc(`Sqrt`,e,void 0)},1088487:e=>{t.bc(`Exp`,e,void 0)},1088538:e=>{t.bc(`Erf`,e,void 0)},1088589:e=>{t.bc(`Sigmoid`,e,void 0)},1088644:(e,n,r)=>{t.bc(`HardSigmoid`,e,{alpha:n,beta:r})},1088723:e=>{t.bc(`HardSwish`,e,void 0)},1088780:e=>{t.bc(`Log`,e,void 0)},1088831:e=>{t.bc(`Sin`,e,void 0)},1088882:e=>{t.bc(`Cos`,e,void 0)},1088933:e=>{t.bc(`Tan`,e,void 0)},1088984:e=>{t.bc(`Asin`,e,void 0)},1089036:e=>{t.bc(`Acos`,e,void 0)},1089088:e=>{t.bc(`Atan`,e,void 0)},1089140:e=>{t.bc(`Sinh`,e,void 0)},1089192:e=>{t.bc(`Cosh`,e,void 0)},1089244:e=>{t.bc(`Asinh`,e,void 0)},1089297:e=>{t.bc(`Acosh`,e,void 0)},1089350:e=>{t.bc(`Atanh`,e,void 0)},1089403:e=>{t.bc(`Tanh`,e,void 0)},1089455:e=>{t.bc(`Not`,e,void 0)},1089506:(e,n,r)=>{t.bc(`Clip`,e,{min:n,max:r})},1089575:e=>{t.bc(`Clip`,e,void 0)},1089627:(e,n)=>{t.bc(`Elu`,e,{alpha:n})},1089685:e=>{t.bc(`Gelu`,e,void 0)},1089737:e=>{t.bc(`Relu`,e,void 0)},1089789:(e,n)=>{t.bc(`LeakyRelu`,e,{alpha:n})},1089853:(e,n)=>{t.bc(`ThresholdedRelu`,e,{alpha:n})},1089923:(e,n)=>{t.bc(`Cast`,e,{to:n})},1089981:e=>{t.bc(`Add`,e,void 0)},1090032:e=>{t.bc(`Sub`,e,void 0)},1090083:e=>{t.bc(`Mul`,e,void 0)},1090134:e=>{t.bc(`Div`,e,void 0)},1090185:e=>{t.bc(`Pow`,e,void 0)},1090236:e=>{t.bc(`Equal`,e,void 0)},1090289:e=>{t.bc(`Greater`,e,void 0)},1090344:e=>{t.bc(`GreaterOrEqual`,e,void 0)},1090406:e=>{t.bc(`Less`,e,void 0)},1090458:e=>{t.bc(`LessOrEqual`,e,void 0)},1090517:(e,n,r,i,a)=>{t.bc(`ReduceMean`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1090692:(e,n,r,i,a)=>{t.bc(`ReduceMax`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1090866:(e,n,r,i,a)=>{t.bc(`ReduceMin`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1091040:(e,n,r,i,a)=>{t.bc(`ReduceProd`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1091215:(e,n,r,i,a)=>{t.bc(`ReduceSum`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1091389:(e,n,r,i,a)=>{t.bc(`ReduceL1`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1091562:(e,n,r,i,a)=>{t.bc(`ReduceL2`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1091735:(e,n,r,i,a)=>{t.bc(`ReduceLogSum`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1091912:(e,n,r,i,a)=>{t.bc(`ReduceSumSquare`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1092092:(e,n,r,i,a)=>{t.bc(`ReduceLogSumExp`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1092272:e=>{t.bc(`Where`,e,void 0)},1092325:(e,n,r)=>{t.bc(`Transpose`,e,{perm:n?Array.from((w(),A).subarray(Number(n)>>>0,Number(r)>>>0)):[]})},1092449:(e,n,r,i)=>{t.bc(`DepthToSpace`,e,{blocksize:n,mode:F(r),format:i?`NHWC`:`NCHW`})},1092582:(e,n,r,i)=>{t.bc(`DepthToSpace`,e,{blocksize:n,mode:F(r),format:i?`NHWC`:`NCHW`})},1092715:(e,n,r,i)=>{t.bc(`DFT`,e,{axis:n,inverse:r,onesided:i})},1092807:(e,n,r,i,a,o,s,c,l,u,d,f,p,m,h)=>{t.bc(`ConvTranspose`,e,{format:l?`NHWC`:`NCHW`,autoPad:n,dilations:[r],group:i,kernelShape:[a],pads:[o,s],strides:[c],wIsConst:()=>!!(w(),E)[u>>>0],outputPadding:d?Array.from((w(),A).subarray(Number(d)>>>0,Number(f)>>>0)):[],outputShape:p?Array.from((w(),A).subarray(Number(p)>>>0,Number(m)>>>0)):[],activation:F(h)})},1093240:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`ConvTranspose`,e,{format:c?`NHWC`:`NCHW`,autoPad:n,dilations:Array.from((w(),A).subarray(Number(r)>>>0,(Number(r)>>>0)+2>>>0)),group:i,kernelShape:Array.from((w(),A).subarray(Number(a)>>>0,(Number(a)>>>0)+2>>>0)),pads:Array.from((w(),A).subarray(Number(o)>>>0,(Number(o)>>>0)+4>>>0)),strides:Array.from((w(),A).subarray(Number(s)>>>0,(Number(s)>>>0)+2>>>0)),wIsConst:()=>!!(w(),E)[l>>>0],outputPadding:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],outputShape:f?Array.from((w(),A).subarray(Number(f)>>>0,Number(p)>>>0)):[],activation:F(m)})},1093901:(e,n,r,i,a,o,s,c,l,u,d,f,p,m,h)=>{t.bc(`ConvTranspose`,e,{format:l?`NHWC`:`NCHW`,autoPad:n,dilations:[r],group:i,kernelShape:[a],pads:[o,s],strides:[c],wIsConst:()=>!!(w(),E)[u>>>0],outputPadding:d?Array.from((w(),A).subarray(Number(d)>>>0,Number(f)>>>0)):[],outputShape:p?Array.from((w(),A).subarray(Number(p)>>>0,Number(m)>>>0)):[],activation:F(h)})},1094334:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`ConvTranspose`,e,{format:c?`NHWC`:`NCHW`,autoPad:n,dilations:Array.from((w(),A).subarray(Number(r)>>>0,(Number(r)>>>0)+2>>>0)),group:i,kernelShape:Array.from((w(),A).subarray(Number(a)>>>0,(Number(a)>>>0)+2>>>0)),pads:Array.from((w(),A).subarray(Number(o)>>>0,(Number(o)>>>0)+4>>>0)),strides:Array.from((w(),A).subarray(Number(s)>>>0,(Number(s)>>>0)+2>>>0)),wIsConst:()=>!!(w(),E)[l>>>0],outputPadding:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],outputShape:f?Array.from((w(),A).subarray(Number(f)>>>0,Number(p)>>>0)):[],activation:F(m)})},1094995:(e,n)=>{t.bc(`GlobalAveragePool`,e,{format:n?`NHWC`:`NCHW`})},1095086:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`AveragePool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),A).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),A).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),A).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1095565:(e,n)=>{t.bc(`GlobalAveragePool`,e,{format:n?`NHWC`:`NCHW`})},1095656:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`AveragePool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),A).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),A).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),A).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1096135:(e,n)=>{t.bc(`GlobalMaxPool`,e,{format:n?`NHWC`:`NCHW`})},1096222:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`MaxPool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),A).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),A).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),A).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1096697:(e,n)=>{t.bc(`GlobalMaxPool`,e,{format:n?`NHWC`:`NCHW`})},1096784:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`MaxPool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),A).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),A).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),A).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1097259:(e,n,r,i,a)=>{t.bc(`Gemm`,e,{alpha:n,beta:r,transA:i,transB:a})},1097363:e=>{t.bc(`MatMul`,e,void 0)},1097417:(e,n,r,i)=>{t.bc(`ArgMax`,e,{keepDims:!!n,selectLastIndex:!!r,axis:i})},1097525:(e,n,r,i)=>{t.bc(`ArgMin`,e,{keepDims:!!n,selectLastIndex:!!r,axis:i})},1097633:(e,n)=>{t.bc(`Softmax`,e,{axis:n})},1097696:(e,n)=>{t.bc(`Concat`,e,{axis:n})},1097756:(e,n,r,i,a)=>{t.bc(`Split`,e,{axis:n,numOutputs:r,splitSizes:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1097912:e=>{t.bc(`Expand`,e,void 0)},1097966:(e,n)=>{t.bc(`Gather`,e,{axis:Number(n)})},1098037:(e,n)=>{t.bc(`GatherElements`,e,{axis:Number(n)})},1098116:(e,n)=>{t.bc(`GatherND`,e,{batch_dims:Number(n)})},1098195:(e,n,r,i,a,o,s,c,l,u,d)=>{t.bc(`Resize`,e,{antialias:n,axes:r?Array.from((w(),A).subarray(Number(r)>>>0,Number(i)>>>0)):[],coordinateTransformMode:F(a),cubicCoeffA:o,excludeOutside:s,extrapolationValue:c,keepAspectRatioPolicy:F(l),mode:F(u),nearestMode:F(d)})},1098557:(e,n,r,i,a,o,s)=>{t.bc(`Slice`,e,{starts:n?Array.from((w(),A).subarray(Number(n)>>>0,Number(r)>>>0)):[],ends:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[],axes:o?Array.from((w(),A).subarray(Number(o)>>>0,Number(s)>>>0)):[]})},1098821:e=>{t.bc(`Tile`,e,void 0)},1098873:(e,n,r)=>{t.bc(`InstanceNormalization`,e,{epsilon:n,format:r?`NHWC`:`NCHW`})},1098987:(e,n,r)=>{t.bc(`InstanceNormalization`,e,{epsilon:n,format:r?`NHWC`:`NCHW`})},1099101:e=>{t.bc(`Range`,e,void 0)},1099154:(e,n)=>{t.bc(`Einsum`,e,{equation:F(n)})},1099235:(e,n,r,i,a)=>{t.bc(`Pad`,e,{mode:n,value:r,pads:i?Array.from((w(),A).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099378:(e,n,r,i,a,o)=>{t.bc(`BatchNormalization`,e,{epsilon:n,momentum:r,spatial:!!a,trainingMode:!!i,format:o?`NHWC`:`NCHW`})},1099547:(e,n,r,i,a,o)=>{t.bc(`BatchNormalization`,e,{epsilon:n,momentum:r,spatial:!!a,trainingMode:!!i,format:o?`NHWC`:`NCHW`})},1099716:(e,n,r)=>{t.bc(`CumSum`,e,{exclusive:Number(n),reverse:Number(r)})},1099813:(e,n,r)=>{t.bc(`DequantizeLinear`,e,{axis:n,blockSize:r})},1099903:(e,n,r,i,a)=>{t.bc(`GridSample`,e,{align_corners:n,mode:F(r),padding_mode:F(i),format:a?`NHWC`:`NCHW`})},1100073:(e,n,r,i,a)=>{t.bc(`GridSample`,e,{align_corners:n,mode:F(r),padding_mode:F(i),format:a?`NHWC`:`NCHW`})},1100243:(e,n)=>{t.bc(`ScatterND`,e,{reduction:F(n)})},1100328:(e,n,r,i,a,o,s,c,l)=>{t.bc(`Attention`,e,{numHeads:n,isUnidirectional:r,maskFilterValue:i,scale:a,doRotary:o,qkvHiddenSizes:s?Array.from((w(),A).subarray(Number(c)>>>0,Number(c)+s>>>0)):[],pastPresentShareBuffer:!!l})},1100600:e=>{t.bc(`BiasAdd`,e,void 0)},1100655:e=>{t.bc(`BiasSplitGelu`,e,void 0)},1100716:e=>{t.bc(`FastGelu`,e,void 0)},1100772:(e,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g)=>{t.bc(`Conv`,e,{format:f?`NHWC`:`NCHW`,auto_pad:n,dilations:r?Array.from((w(),A).subarray(Number(r)>>>0,Number(i)>>>0)):[],group:a,kernel_shape:o?Array.from((w(),A).subarray(Number(o)>>>0,Number(s)>>>0)):[],pads:c?Array.from((w(),A).subarray(Number(c)>>>0,Number(l)>>>0)):[],strides:u?Array.from((w(),A).subarray(Number(u)>>>0,Number(d)>>>0)):[],w_is_const:()=>!!(w(),E)[Number(p)>>>0],activation:F(m),activation_params:h?Array.from((w(),ee).subarray(Number(h)>>>0,Number(g)>>>0)):[]})},1101356:e=>{t.bc(`Gelu`,e,void 0)},1101408:(e,n,r,i,a,o,s,c,l)=>{t.bc(`GroupQueryAttention`,e,{numHeads:n,kvNumHeads:r,scale:i,softcap:a,doRotary:o,rotaryInterleaved:s,smoothSoftmax:c,localWindowSize:l})},1101625:(e,n,r,i)=>{t.bc(`LayerNormalization`,e,{axis:n,epsilon:r,simplified:!!i})},1101736:(e,n,r,i)=>{t.bc(`LayerNormalization`,e,{axis:n,epsilon:r,simplified:!!i})},1101847:(e,n,r,i,a,o)=>{t.bc(`MatMulNBits`,e,{k:n,n:r,accuracyLevel:i,bits:a,blockSize:o})},1101974:(e,n,r,i,a,o)=>{t.bc(`MultiHeadAttention`,e,{numHeads:n,isUnidirectional:r,maskFilterValue:i,scale:a,doRotary:o})},1102133:(e,n)=>{t.bc(`QuickGelu`,e,{alpha:n})},1102197:(e,n,r,i,a)=>{t.bc(`RotaryEmbedding`,e,{interleaved:!!n,numHeads:r,rotaryEmbeddingDim:i,scale:a})},1102336:(e,n,r)=>{t.bc(`SkipLayerNormalization`,e,{epsilon:n,simplified:!!r})},1102438:(e,n,r)=>{t.bc(`SkipLayerNormalization`,e,{epsilon:n,simplified:!!r})},1102540:(e,n,r,i)=>{t.bc(`GatherBlockQuantized`,e,{gatherAxis:n,quantizeAxis:r,blockSize:i})},1102661:e=>{t.Id(e)},1102695:(e,n)=>t.Kd(Number(e),Number(n),t.$c.Nd,t.$c.errors)};function yi(e,n,r){return sn(async()=>{await t.Gd(Number(e),Number(n),Number(r))})}function bi(){return typeof wasmOffsetConverter<`u`}function xi(e,t,n,r){var i=Q();try{return Rr(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function Si(e,t,n){var r=Q();try{return Pr(e,t,n)}catch(e){if(Z(r),e!==e+0)throw e;X(1,0)}}function Ci(e){var t=Q();try{jr(e)}catch(e){if(Z(t),e!==e+0)throw e;X(1,0)}}function wi(e,t){var n=Q();try{return Ar(e,t)}catch(e){if(Z(n),e!==e+0)throw e;X(1,0)}}function Ti(e,t,n){var r=Q();try{kr(e,t,n)}catch(e){if(Z(r),e!==e+0)throw e;X(1,0)}}function Ei(e,t){var n=Q();try{zr(e,t)}catch(e){if(Z(n),e!==e+0)throw e;X(1,0)}}function Di(e,t,n,r,i,a,o){var s=Q();try{return Ir(e,t,n,r,i,a,o)}catch(e){if(Z(s),e!==e+0)throw e;X(1,0)}}function Oi(e,t,n,r,i,a){var o=Q();try{Mr(e,t,n,r,i,a)}catch(e){if(Z(o),e!==e+0)throw e;X(1,0)}}function ki(e,t,n,r){var i=Q();try{Lr(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function Ai(e,t,n,r,i){var a=Q();try{Nr(e,t,n,r,i)}catch(e){if(Z(a),e!==e+0)throw e;X(1,0)}}function ji(e,t,n,r,i,a,o){var s=Q();try{Vr(e,t,n,r,i,a,o)}catch(e){if(Z(s),e!==e+0)throw e;X(1,0)}}function Mi(e,t,n,r,i,a,o){var s=Q();try{Hr(e,t,n,r,i,a,o)}catch(e){if(Z(s),e!==e+0)throw e;X(1,0)}}function Ni(e,t,n,r,i,a,o,s){var c=Q();try{Kr(e,t,n,r,i,a,o,s)}catch(e){if(Z(c),e!==e+0)throw e;X(1,0)}}function Pi(e,t,n,r,i){var a=Q();try{return Br(e,t,n,r,i)}catch(e){if(Z(a),e!==e+0)throw e;X(1,0)}}function Fi(e,t,n){var r=Q();try{return qr(e,t,n)}catch(e){if(Z(r),e!==e+0)throw e;X(1,0)}}function Ii(e,t,n,r,i,a,o,s){var c=Q();try{Jr(e,t,n,r,i,a,o,s)}catch(e){if(Z(c),e!==e+0)throw e;X(1,0)}}function Li(e,t,n,r,i,a,o,s,c,l,u,d){var f=Q();try{Ur(e,t,n,r,i,a,o,s,c,l,u,d)}catch(e){if(Z(f),e!==e+0)throw e;X(1,0)}}function Ri(e,t,n){var r=Q();try{return Yr(e,t,n)}catch(e){if(Z(r),e!==e+0)throw e;return X(1,0),0n}}function zi(e,t,n,r,i,a,o,s,c){var l=Q();try{Fr(e,t,n,r,i,a,o,s,c)}catch(e){if(Z(l),e!==e+0)throw e;X(1,0)}}function Bi(e){var t=Q();try{return Xr(e)}catch(e){if(Z(t),e!==e+0)throw e;X(1,0)}}function Vi(e,t){var n=Q();try{return di(e,t)}catch(e){if(Z(n),e!==e+0)throw e;return X(1,0),0n}}function Hi(e,t,n,r){var i=Q();try{return Zr(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function Ui(e){var t=Q();try{return Qr(e)}catch(e){if(Z(t),e!==e+0)throw e;return X(1,0),0n}}function Wi(e,t,n,r){var i=Q();try{return ri(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function Gi(e,t,n,r,i){var a=Q();try{return ii(e,t,n,r,i)}catch(e){if(Z(a),e!==e+0)throw e;X(1,0)}}function Ki(e,t,n,r,i,a){var o=Q();try{return ai(e,t,n,r,i,a)}catch(e){if(Z(o),e!==e+0)throw e;X(1,0)}}function qi(e,t,n,r,i,a){var o=Q();try{return Wr(e,t,n,r,i,a)}catch(e){if(Z(o),e!==e+0)throw e;X(1,0)}}function Ji(e,t,n,r,i,a){var o=Q();try{return oi(e,t,n,r,i,a)}catch(e){if(Z(o),e!==e+0)throw e;X(1,0)}}function Yi(e,t,n,r,i,a,o,s){var c=Q();try{return Gr(e,t,n,r,i,a,o,s)}catch(e){if(Z(c),e!==e+0)throw e;X(1,0)}}function Xi(e,t,n,r,i){var a=Q();try{return si(e,t,n,r,i)}catch(e){if(Z(a),e!==e+0)throw e;return X(1,0),0n}}function Zi(e,t,n,r){var i=Q();try{return ci(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function Qi(e,t,n,r){var i=Q();try{return li(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function $i(e,t,n,r,i,a,o,s,c,l,u,d){var f=Q();try{return ui(e,t,n,r,i,a,o,s,c,l,u,d)}catch(e){if(Z(f),e!==e+0)throw e;X(1,0)}}function ea(e,t,n,r,i,a,o,s,c,l,u){var d=Q();try{$(e,t,n,r,i,a,o,s,c,l,u)}catch(e){if(Z(d),e!==e+0)throw e;X(1,0)}}function ta(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){var g=Q();try{ni(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}catch(e){if(Z(g),e!==e+0)throw e;X(1,0)}}function na(e,t,n){var r=Q();try{return $r(e,t,n)}catch(e){if(Z(r),e!==e+0)throw e;X(1,0)}}function ra(e,t,n){var r=Q();try{return ei(e,t,n)}catch(e){if(Z(r),e!==e+0)throw e;X(1,0)}}function ia(e,t,n,r){var i=Q();try{ti(e,t,n,r)}catch(e){if(Z(i),e!==e+0)throw e;X(1,0)}}function aa(){if(0<fe)pe=aa;else if(i)h?.(t),N();else{for(var e=de;0<e.length;)e.shift()(t);0<fe?pe=aa:(t.calledRun=!0,S||(N(),h?.(t)))}}return i||(gi=await ce(),aa()),t.PTR_SIZE=4,ie?t:new Promise((e,t)=>{h=e,g=t})}var Pe,Fe,Ie=a(()=>{"use strict";Pe=Ne,Fe=globalThis.self?.name?.startsWith(`em-pthread`),Fe&&Ne()}),Le,Re,ze,Be,Ve,He,Ue,We,Ge,Ke,qe,Je,Ye,F,Xe=a(()=>{"use strict";Ee(),Le=typeof location>`u`?void 0:location.origin,Re=self.location.href>`file:`&&self.location.href<`file;`,ze=()=>Re?new URL(new URL(`ort.bundle.min.mjs`,self.location.href).href,Le).href:self.location.href,Be=ze(),Ve=()=>{if(Be&&!Be.startsWith(`blob:`))return Be.substring(0,Be.lastIndexOf(`/`)+1)},He=(e,t)=>{try{let n=t??Be;return(n?new URL(e,n):new URL(e)).origin===Le}catch{return!1}},Ue=(e,t)=>{let n=t??Be;try{return(n?new URL(e,n):new URL(e)).href}catch{return}},We=(e,t)=>`${t??`./`}${e}`,Ge=async e=>{let t=await(await fetch(e,{credentials:`same-origin`})).blob();return URL.createObjectURL(t)},Ke=async e=>(await import(
/*webpackIgnore:true*/
/*@vite-ignore*/
e)).default,qe=(je(),c(De)).default,Je=async()=>{if(!Be)throw Error(`Failed to load proxy worker: cannot determine the script source URL.`);if(He(Be))return[void 0,qe()];let e=await Ge(Be);return[e,qe(e)]},Ye=(Ie(),c(Me)).default,F=async(e,t,n,r)=>{let i=Ye&&!(e||t);if(i){if(Be)i=He(Be)||r&&!n;else if(r&&!n)i=!0;else throw Error(`cannot determine the script source URL.`)}if(i)return[void 0,Ye];{let r=`ort-wasm-simd-threaded.jsep.mjs`,i=e??Ue(r,t),a=n&&i&&!He(i,t),o=a?await Ge(i):i??We(r,t);return[a?o:void 0,await Ke(o)]}}}),Ze,Qe,$e,et,tt,nt,rt,it,I,at=a(()=>{"use strict";Xe(),Qe=!1,$e=!1,et=!1,tt=()=>{if(typeof SharedArrayBuffer>`u`)return!1;try{return typeof MessageChannel<`u`&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},nt=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},rt=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},it=async e=>{if(Qe)return Promise.resolve();if($e)throw Error(`multiple calls to 'initializeWebAssembly()' detected.`);if(et)throw Error(`previous call to 'initializeWebAssembly()' failed.`);$e=!0;let t=e.initTimeout,n=e.numThreads;if(e.simd!==!1){if(e.simd===`relaxed`){if(!rt())throw Error(`Relaxed WebAssembly SIMD is not supported in the current environment.`)}else if(!nt())throw Error(`WebAssembly SIMD is not supported in the current environment.`)}let r=tt();n>1&&!r&&(typeof self<`u`&&!self.crossOriginIsolated&&console.warn(`env.wasm.numThreads is set to `+n+`, but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info.`),console.warn(`WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading.`),e.numThreads=n=1);let i=e.wasmPaths,a=typeof i==`string`?i:void 0,o=i?.mjs,s=o?.href??o,c=i?.wasm,l=c?.href??c,u=e.wasmBinary,[d,f]=await F(s,a,n>1,!!u||!!l),p=!1,m=[];if(t>0&&m.push(new Promise(e=>{setTimeout(()=>{p=!0,e()},t)})),m.push(new Promise((e,t)=>{let r={numThreads:n};if(u)r.wasmBinary=u,r.locateFile=e=>e;else if(l||a)r.locateFile=e=>l??a+e;else if(s&&s.indexOf(`blob:`)!==0)r.locateFile=e=>new URL(e,s).href;else if(d){let e=Ve();e&&(r.locateFile=t=>e+t)}f(r).then(t=>{$e=!1,Qe=!0,Ze=t,e(),d&&URL.revokeObjectURL(d)},e=>{$e=!1,et=!0,t(e)})})),await Promise.race(m),p)throw Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},I=()=>{if(Qe&&Ze)return Ze;throw Error(`WebAssembly is not initialized yet.`)}}),ot,st,L,ct=a(()=>{"use strict";at(),ot=(e,t)=>{let n=I(),r=n.lengthBytesUTF8(e)+1,i=n._malloc(r);return n.stringToUTF8(e,i,r),t.push(i),i},st=(e,t,n,r)=>{if(typeof e==`object`&&e){if(n.has(e))throw Error(`Circular reference in options`);n.add(e)}Object.entries(e).forEach(([e,i])=>{let a=t?t+e:e;if(typeof i==`object`)st(i,a+`.`,n,r);else if(typeof i==`string`||typeof i==`number`)r(a,i.toString());else if(typeof i==`boolean`)r(a,i?`1`:`0`);else throw Error(`Can't handle extra config type: ${typeof i}`)})},L=e=>{let t=I(),n=t.stackSave();try{let n=t.PTR_SIZE,r=t.stackAlloc(2*n);t._OrtGetLastError(r,r+n);let i=Number(t.getValue(r,n===4?`i32`:`i64`)),a=t.getValue(r+n,`*`),o=a?t.UTF8ToString(a):``;throw Error(`${e} ERROR_CODE: ${i}, ERROR_MESSAGE: ${o}`)}finally{t.stackRestore(n)}}}),lt,ut=a(()=>{"use strict";at(),ct(),lt=e=>{let t=I(),n=0,r=[],i=e||{};try{if(e?.logSeverityLevel===void 0)i.logSeverityLevel=2;else if(typeof e.logSeverityLevel!=`number`||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw Error(`log severity level is not valid: ${e.logSeverityLevel}`);if(e?.logVerbosityLevel===void 0)i.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!=`number`||!Number.isInteger(e.logVerbosityLevel))throw Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);e?.terminate===void 0&&(i.terminate=!1);let a=0;return e?.tag!==void 0&&(a=ot(e.tag,r)),n=t._OrtCreateRunOptions(i.logSeverityLevel,i.logVerbosityLevel,!!i.terminate,a),n===0&&L(`Can't create run options.`),e?.extra!==void 0&&st(e.extra,``,/* @__PURE__ */ new WeakSet,(e,i)=>{let a=ot(e,r),o=ot(i,r);t._OrtAddRunConfigEntry(n,a,o)!==0&&L(`Can't set a run config entry: ${e} - ${i}.`)}),[n,r]}catch(e){throw n!==0&&t._OrtReleaseRunOptions(n),r.forEach(e=>t._free(e)),e}}}),dt,ft,pt,mt,ht,gt,_t=a(()=>{"use strict";at(),ct(),dt=e=>{switch(e){case`disabled`:return 0;case`basic`:return 1;case`extended`:return 2;case`layout`:return 3;case`all`:return 99;default:throw Error(`unsupported graph optimization level: ${e}`)}},ft=e=>{switch(e){case`sequential`:return 0;case`parallel`:return 1;default:throw Error(`unsupported execution mode: ${e}`)}},pt=e=>{e.extra||={},e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||=`1`,e.executionProviders&&e.executionProviders.some(e=>(typeof e==`string`?e:e.name)===`webgpu`)&&(e.enableMemPattern=!1)},mt=(e,t,n,r)=>{let i=ot(t,r),a=ot(n,r);I()._OrtAddSessionConfigEntry(e,i,a)!==0&&L(`Can't set a session config entry: ${t} - ${n}.`)},ht=async(e,t,n)=>{let r=t.executionProviders;for(let t of r){let r=typeof t==`string`?t:t.name,i=[];switch(r){case`webnn`:if(r=`WEBNN`,mt(e,`session.disable_quant_qdq`,`1`,n),mt(e,`session.disable_qdq_constant_folding`,`1`,n),typeof t!=`string`){let r=t?.deviceType;r&&mt(e,`deviceType`,r,n)}break;case`webgpu`:if(r=`JS`,typeof t!=`string`){let r=t;if(r?.preferredLayout){if(r.preferredLayout!==`NCHW`&&r.preferredLayout!==`NHWC`)throw Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${r.preferredLayout}`);mt(e,`preferredLayout`,r.preferredLayout,n)}}break;case`wasm`:case`cpu`:continue;default:throw Error(`not supported execution provider: ${r}`)}let a=ot(r,n),o=i.length,s=0,c=0;if(o>0){s=I()._malloc(o*I().PTR_SIZE),n.push(s),c=I()._malloc(o*I().PTR_SIZE),n.push(c);for(let e=0;e<o;e++)I().setValue(s+e*I().PTR_SIZE,i[e][0],`*`),I().setValue(c+e*I().PTR_SIZE,i[e][1],`*`)}await I()._OrtAppendExecutionProvider(e,a,s,c,o)!==0&&L(`Can't append execution provider: ${r}.`)}},gt=async e=>{let t=I(),n=0,r=[],i=e||{};pt(i);try{let e=dt(i.graphOptimizationLevel??`all`),a=ft(i.executionMode??`sequential`),o=typeof i.logId==`string`?ot(i.logId,r):0,s=i.logSeverityLevel??2;if(!Number.isInteger(s)||s<0||s>4)throw Error(`log severity level is not valid: ${s}`);let c=i.logVerbosityLevel??0;if(!Number.isInteger(c)||c<0||c>4)throw Error(`log verbosity level is not valid: ${c}`);let l=typeof i.optimizedModelFilePath==`string`?ot(i.optimizedModelFilePath,r):0;if(n=t._OrtCreateSessionOptions(e,!!i.enableCpuMemArena,!!i.enableMemPattern,a,!!i.enableProfiling,0,o,s,c,l),n===0&&L(`Can't create session options.`),i.executionProviders&&await ht(n,i,r),i.enableGraphCapture!==void 0){if(typeof i.enableGraphCapture!=`boolean`)throw Error(`enableGraphCapture must be a boolean value: ${i.enableGraphCapture}`);mt(n,`enableGraphCapture`,i.enableGraphCapture.toString(),r)}if(i.freeDimensionOverrides)for(let[e,a]of Object.entries(i.freeDimensionOverrides)){if(typeof e!=`string`)throw Error(`free dimension override name must be a string: ${e}`);if(typeof a!=`number`||!Number.isInteger(a)||a<0)throw Error(`free dimension override value must be a non-negative integer: ${a}`);let i=ot(e,r);t._OrtAddFreeDimensionOverride(n,i,a)!==0&&L(`Can't set a free dimension override: ${e} - ${a}.`)}return i.extra!==void 0&&st(i.extra,``,/* @__PURE__ */ new WeakSet,(e,t)=>{mt(n,e,t,r)}),[n,r]}catch(e){throw n!==0&&t._OrtReleaseSessionOptions(n)!==0&&L(`Can't release session options.`),r.forEach(e=>t._free(e)),e}}}),vt,yt,bt,xt,St,Ct,wt,Tt,R=a(()=>{"use strict";vt=e=>{switch(e){case`int8`:return 3;case`uint8`:return 2;case`bool`:return 9;case`int16`:return 5;case`uint16`:return 4;case`int32`:return 6;case`uint32`:return 12;case`float16`:return 10;case`float32`:return 1;case`float64`:return 11;case`string`:return 8;case`int64`:return 7;case`uint64`:return 13;case`int4`:return 22;case`uint4`:return 21;default:throw Error(`unsupported data type: ${e}`)}},yt=e=>{switch(e){case 3:return`int8`;case 2:return`uint8`;case 9:return`bool`;case 5:return`int16`;case 4:return`uint16`;case 6:return`int32`;case 12:return`uint32`;case 10:return`float16`;case 1:return`float32`;case 11:return`float64`;case 8:return`string`;case 7:return`int64`;case 13:return`uint64`;case 22:return`int4`;case 21:return`uint4`;default:throw Error(`unsupported data type: ${e}`)}},bt=(e,t)=>{let n=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],r=typeof t==`number`?t:t.reduce((e,t)=>e*t,1);return n>0?Math.ceil(r*n):void 0},xt=e=>{switch(e){case`float16`:return typeof Float16Array<`u`?Float16Array:Uint16Array;case`float32`:return Float32Array;case`uint8`:return Uint8Array;case`int8`:return Int8Array;case`uint16`:return Uint16Array;case`int16`:return Int16Array;case`int32`:return Int32Array;case`bool`:return Uint8Array;case`float64`:return Float64Array;case`uint32`:return Uint32Array;case`int64`:return BigInt64Array;case`uint64`:return BigUint64Array;default:throw Error(`unsupported type: ${e}`)}},St=e=>{switch(e){case`verbose`:return 0;case`info`:return 1;case`warning`:return 2;case`error`:return 3;case`fatal`:return 4;default:throw Error(`unsupported logging level: ${e}`)}},Ct=e=>e===`float32`||e===`float16`||e===`int32`||e===`int64`||e===`uint32`||e===`uint8`||e===`bool`||e===`uint4`||e===`int4`,wt=e=>e===`float32`||e===`float16`||e===`int32`||e===`int64`||e===`uint32`||e===`uint64`||e===`int8`||e===`uint8`||e===`bool`||e===`uint4`||e===`int4`,Tt=e=>{switch(e){case`none`:return 0;case`cpu`:return 1;case`cpu-pinned`:return 2;case`texture`:return 3;case`gpu-buffer`:return 4;case`ml-tensor`:return 5;default:throw Error(`unsupported data location: ${e}`)}}}),Et,Dt=a(()=>{"use strict";Ee(),Et=async e=>{if(typeof e==`string`){let t=await fetch(e);if(!t.ok)throw Error(`failed to load external data file: ${e}`);let n=t.headers.get(`Content-Length`),r=n?parseInt(n,10):0;if(r<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw Error(`failed to load external data file: ${e}, no response body.`);let n=t.body.getReader(),i;try{i=new ArrayBuffer(r)}catch(e){if(e instanceof RangeError){let e=Math.ceil(r/65536);i=new WebAssembly.Memory({initial:e,maximum:e}).buffer}else throw e}let a=0;for(;;){let{done:e,value:t}=await n.read();if(e)break;let r=t.byteLength;new Uint8Array(i,a,r).set(t),a+=r}return new Uint8Array(i,0,r)}}return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Ot,kt,At,jt,Mt,Nt,z,Pt=a(()=>{"use strict";R(),Ot=[`V`,`I`,`W`,`E`,`F`],kt=(e,t)=>{console.log(`[${Ot[e]},${(/* @__PURE__ */ new Date()).toISOString()}]${t}`)},Mt=(e,t)=>{At=e,jt=t},Nt=(e,t)=>{let n=St(e);n>=St(At)&&kt(n,typeof t==`function`?t():t)},z=(...e)=>{jt&&Nt(...e)}}),Ft,It,B,Lt,Rt,zt,Bt,V=a(()=>{"use strict";Ft=class{static calcMatMulShape(e,t){return e[1]===t[0]?[e[0],t[1]]:void 0}},It=class{static calcShape(e,t,n=!1){let r=e.length,i=t.length;if(r===0)return t;if(i===0)return e;let a=Math.max(e.length,t.length),o=Array(a);if(n){if(r<2||i<2)return;let n=Ft.calcMatMulShape([e[r-2],e[r-1]],[t[i-2],t[i-1]]);if(n===void 0)return;[o[a-2],o[a-1]]=n}for(let s=n?3:1;s<=a;s++){let n=r-s<0?1:e[r-s],c=i-s<0?1:t[i-s];if(n!==c&&n>1&&c>1)return;let l=Math.max(n,c);if(n&&c)o[a-s]=Math.max(n,c);else{if(l>1)return;o[a-s]=0}}return o}static isValidBroadcast(e,t){let n=e.length,r=t.length;if(n>r)return!1;for(let i=1;i<=n;i++)if(e[n-i]!==1&&e[n-i]!==t[r-i])return!1;return!0}},B=class e{static size(t){return e.getSizeFromDimensionRange(t,0,t.length)}static convertShape(e,t=4){let n=e.length;if(n===0)return[];let r=Array(n),i=n-1;for(;i>=0;){if(e[i]%t===0){r[i]=e[i]/t;break}if(t%e[i]!==0)throw Error(`cannot convert shape`);r[i]=1,t/=e[i],i--}for(i--;i>=0;i--)r[i]=e[i];return r}static sizeFromDimension(t,n){if(n<0||n>t.length)throw Error(`invalid dimension of ${n} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return e.getSizeFromDimensionRange(t,n,t.length)}static sizeToDimension(t,n){if(n<0||n>t.length)throw Error(`invalid dimension of ${n} for sizeToDimension as Tensor has ${t.length} dimensions.`);return e.getSizeFromDimensionRange(t,0,n)}static getSizeFromDimensionRange(e,t,n){let r=1;for(let i=t;i<n;i++){if(e[i]<0)throw Error(`cannot get valid size from specified dimension range. Most likely the range contains negative values in them.`);r*=Number(e[i])}return r}static computeStrides(e){let t=e.length;if(t===0)return[];if(t===1)return[1];let n=Array(t);n[t-1]=1,n[t-2]=e[t-1];for(let r=t-3;r>=0;--r)n[r]=n[r+1]*e[r+1];return n}static normalizeAxis(e,t){if(e<-t&&e>=t)throw Error(`unsupported axis for this operation.`);return e<0?e+t:e}static normalizeAxes(e,t){return e.map(n=>this.normalizeAxis(n,t??e.length))}static sortBasedOnPerm(e,t){return t?t.map(t=>e[t]):e.slice().reverse()}static padShape(e,t){let n=e.length;return e.map((e,r)=>e+t[r]+t[r+n])}static areEqual(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}},Lt=class e{static adjustPoolAttributes(e,t,n,r,i,a){if(!e&&n.length!==t.length-2)throw Error(`length of specified kernel shapes should be 2 less than length of input dimensions`);if(e)for(let e=0;e<t.length-2;e++)e>=n.length?n.push(t[e+2]):n[e]=t[e+2];for(let e=0;e<n.length;e++)if(e<r.length){if(r[e]<0)throw Error(`strides should be greater than or equal to 1`)}else r.push(1);for(let e=0;e<n.length;e++)if(e<i.length){if(i[e]<0)throw Error(`dilations should be greater than or equal to 1`)}else i.push(1);for(let e=0;e<n.length*2;e++)if(e<a.length){if(a[e]<0)throw Error(`pad should be greater than or equal to 1`)}else a.push(0);for(let e=0;e<n.length;e++){if(n[e]<=0)throw Error(`kernel shapes need to be greater than 0`);if(a[e]>=n[e]||a[e+n.length]>=n[e])throw Error(`pads should be smaller than kernel`)}}static adjustPadsBasedOnAutoPad(t,n,r,i,a,o,s){if(s){if(a.length!==2*(t.length-2))throw Error(`length of pads should be twice the length of data dimensions`);if(n.length!==t.length-2)throw Error(`length of strides should be the length of data dimensions`);if(i.length!==t.length-2)throw Error(`length of kernel shapes should be the length of data dimensions`);for(let c=0;c<t.length-2;c++)e.adjustPadAndReturnShape(t[c+(o?1:2)],n[c],r[c],i[c],a,c,c+t.length-2,s)}}static computePoolOutputShape(t,n,r,i,a,o,s,c=0){if(n.length<=0)throw Error(`input shape must be of size greater than 0`);let l=[n[0],n[1]];return e.computeShapeHelper(t,n,l,r,i,a,o,s,c),l}static computeConvOutputShape(t,n,r,i,a,o,s){if(t.length<=0||n.length<=0)throw Error(`invalid input tensor dims or invalid filter tensor dims`);let c=[t[0],n[0]];return e.computeShapeHelper(!1,t,c,r,i,a,o,s),c}static computeShapeHelper(t,n,r,i,a,o,s,c,l=0){if(t)for(let e=0;e<n.length-2;e++)r.push(1);else for(let t=0;t<n.length-2;t++)r.push(e.adjustPadAndReturnShape(n[t+2],i[t],a[t],o[t],s,t,t+n.length-2,c,l))}static computeOutputSize(e,t,n,r,i){let a=Math.floor(e/t)+1;return i===1&&(a=Math.ceil(e/t)+1,(a-1)*t>=n+r&&--a),a}static adjustPadAndReturnShape(t,n,r,i,a,o,s,c,l=0){let u=r*(i-1)+1;if(c&&c!==`NOTSET`)switch(c){case`VALID`:return a[o]=0,a[s]=0,e.computeOutputSize(t-u,n,t,0,l);case`SAME_LOWER`:case`SAME_UPPER`:if(r!==1)throw Error(`Dilation not supported for SAME_UPPER or SAME_LOWER`);{let r=(Math.floor((t+n-1)/n)-1)*n+i-t;return a[o]=Math.floor(c===`SAME_LOWER`?(r+1)/2:r/2),a[s]=r-a[o],e.computeOutputSize(t+a[o]+a[s]-u,n,t,a[o],l)}default:throw Error(`Unsupported AutoPad type`)}else return e.computeOutputSize(t+a[o]+a[s]-u,n,t,a[o],l)}},Rt=class{static getShapeOfGemmResult(e,t,n,r,i){if(e.length!==2||n.length!==2)throw Error(`shape need to be of size 2`);let a,o,s;t?(a=e[1],o=e[0]):(a=e[0],o=e[1]);let c=-1;if(r?(s=n[0],c=1):(s=n[1],c=0),n[c]!==o)throw Error(`dimension mismatch`);if(a<=0||s<=0||o<=0)throw Error(`invalid shape specified`);if(i&&!It.isValidBroadcast(i,[a,s]))throw Error(`gemm: invalid bias shape for broadcast`);return[a,s,o]}},zt=-34028234663852886e22,Bt=34028234663852886e22}),Vt,Ht=a(()=>{"use strict";R(),Vt=(e,t)=>new(xt(t))(e)}),Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en=a(()=>{"use strict";R(),Pt(),Ut=/* @__PURE__ */ new Map([[`float32`,32],[`float16`,16],[`int32`,32],[`uint32`,32],[`int64`,64],[`uint64`,64],[`int8`,8],[`uint8`,8],[`int4`,4],[`uint4`,4]]),Wt=(e,t)=>{if(t===`int32`)return e;let n=Ut.get(t);if(!n)throw Error(`WebNN backend does not support data type: ${t}`);let r=n/8;if(e.byteLength%r!==0)throw Error(`Invalid Uint8Array length - must be a multiple of ${r}.`);let i=e.byteLength/r,a=new(xt(t))(e.buffer,e.byteOffset,i);switch(t){case`int64`:case`uint64`:{let e=new Int32Array(i);for(let t=0;t<i;t++){let n=a[t];if(n>2147483647n||n<-2147483648n)throw Error(`Can not convert int64 data to int32 - value out of range.`);e[t]=Number(n)}return new Uint8Array(e.buffer)}case`int8`:case`uint8`:case`uint32`:{if(t===`uint32`&&a.some(e=>e>2147483647))throw Error(`Can not convert uint32 data to int32 - value out of range.`);let e=Int32Array.from(a,Number);return new Uint8Array(e.buffer)}default:throw Error(`Unsupported data conversion from ${t} to 'int32'`)}},Gt=(e,t)=>{if(t===`int32`)return e;if(e.byteLength%4!=0)throw Error(`Invalid Uint8Array length - must be a multiple of 4 (int32).`);let n=e.byteLength/4,r=new Int32Array(e.buffer,e.byteOffset,n);switch(t){case`int64`:{let e=BigInt64Array.from(r,BigInt);return new Uint8Array(e.buffer)}case`uint64`:{if(r.some(e=>e<0))throw Error(`Can not convert int32 data to uin64 - negative value found.`);let e=BigUint64Array.from(r,BigInt);return new Uint8Array(e.buffer)}case`int8`:{if(r.some(e=>e<-128||e>127))throw Error(`Can not convert int32 data to int8 - value out of range.`);let e=Int8Array.from(r,Number);return new Uint8Array(e.buffer)}case`uint8`:if(r.some(e=>e<0||e>255))throw Error(`Can not convert int32 data to uint8 - value out of range.`);return Uint8Array.from(r,Number);case`uint32`:{if(r.some(e=>e<0))throw Error(`Can not convert int32 data to uint32 - negative value found.`);let e=Uint32Array.from(r,Number);return new Uint8Array(e.buffer)}default:throw Error(`Unsupported data conversion from 'int32' to ${t}`)}},Kt=1,qt=()=>Kt++,Jt=/* @__PURE__ */ new Map([[`int8`,`int32`],[`uint8`,`int32`],[`uint32`,`int32`],[`int64`,`int32`]]),Yt=(e,t)=>{let n=Ut.get(e);if(!n)throw Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((e,t)=>e*t)*n/8):0},Xt=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:n,tensor:r,dataType:i,shape:a,fallbackDataType:o}=e;this.sessionId=t,this.mlContext=n,this.mlTensor=r,this.dataType=i,this.tensorShape=a,this.fallbackDataType=o}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return Yt(this.dataType,this.tensorShape)}destroy(){z(`verbose`,()=>`[WebNN] TensorWrapper.destroy`),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),n=Gt(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(n);return}return new Uint8Array(n).buffer}return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,n){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===n.length&&this.tensorShape.every((e,t)=>e===n[t])}setIsDataConverted(e){this.isDataConverted=e}},Zt=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,n,r){let i=this.tensorManager.getMLContext(e),a=this.tensorManager.getMLOpSupportLimits(e),o;if(!a?.input.dataTypes.includes(t)){if(o=Jt.get(t),!o||!a?.input.dataTypes.includes(o))throw Error(`WebNN backend does not support data type: ${t}`);z(`verbose`,()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${o}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(i,t,n))return this.wrapper.tensor;if(r){if(this.wrapper.byteLength!==Yt(t,n))throw Error(`Unable to copy data to tensor with different size.`);this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let s=typeof MLTensorUsage>`u`?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,n,s,!0,!0,o),r&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType){if(this.wrapper.fallbackType===`int32`)t=Wt(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`)}if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}z(`verbose`,()=>`Data size does not match tensor size. Releasing tensor.`),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){if(this.activeUpload){let t=this.wrapper?.isDataConverted?Gt(this.activeUpload,this.wrapper?.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(t):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(t);return}return t.buffer}if(!this.wrapper)throw Error(`Tensor has not been created.`);return e?this.wrapper.read(e):this.wrapper.read()}},Qt=class{constructor(e){this.backend=e,this.tensorTrackersById=/* @__PURE__ */ new Map,this.freeTensors=[],this.externalTensors=/* @__PURE__ */ new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw Error(`MLContext not found for session.`);return t}getMLOpSupportLimits(e){return this.backend.getMLOpSupportLimits(e)}reserveTensorId(){let e=qt();return this.tensorTrackersById.set(e,new Zt(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,n,r,i){z(`verbose`,()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${n}, shape: ${r}, copyOld: ${i}}`);let a=this.tensorTrackersById.get(t);if(!a)throw Error(`Tensor not found.`);return a.ensureTensor(e,n,r,i)}upload(e,t){let n=this.tensorTrackersById.get(e);if(!n)throw Error(`Tensor not found.`);n.upload(t)}async download(e,t){z(`verbose`,()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t?.byteLength}}`);let n=this.tensorTrackersById.get(e);if(!n)throw Error(`Tensor not found.`);return n.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,n,r){let i=this.getMLContext(e),a=qt(),o=new Xt({sessionId:e,context:i,tensor:t,dataType:n,shape:r});return this.tensorTrackersById.set(a,new Zt(this,o)),this.externalTensors.add(o),a}async getCachedTensor(e,t,n,r,i,a,o){let s=this.getMLContext(e);for(let[r,i]of this.freeTensors.entries())if(i.canReuseTensor(s,t,n)){z(`verbose`,()=>`[WebNN] Reusing tensor {dataType: ${t}, ${o?`fallbackDataType: ${o},`:``} shape: ${n}`);let i=this.freeTensors.splice(r,1)[0];return i.sessionId=e,i}z(`verbose`,()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${o?`fallbackDataType: ${o},`:``} shape: ${n}}`);let c=await s.createTensor({dataType:o??t,shape:n,dimensions:n,usage:r,writable:i,readable:a});return new Xt({sessionId:e,context:s,tensor:c,dataType:t,shape:n,fallbackDataType:o})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},$t=(...e)=>new Qt(...e)}),tn,nn,rn,an=a(()=>{"use strict";R(),at(),Ht(),en(),Pt(),tn=/* @__PURE__ */ new Map([[1,`float32`],[10,`float16`],[6,`int32`],[12,`uint32`],[7,`int64`],[13,`uint64`],[22,`int4`],[21,`uint4`],[3,`int8`],[2,`uint8`],[9,`uint8`]]),nn=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let n=Object.keys(e).sort(),r=Object.keys(t).sort();return n.length===r.length&&n.every((n,i)=>n===r[i]&&e[n]===t[n])},rn=class{constructor(e){this.tensorManager=$t(this),this.mlContextBySessionId=/* @__PURE__ */ new Map,this.sessionIdsByMLContext=/* @__PURE__ */ new Map,this.mlContextCache=[],this.sessionGraphInputs=/* @__PURE__ */ new Map,this.sessionGraphOutputs=/* @__PURE__ */ new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=/* @__PURE__ */ new Map,this.mlOpSupportLimitsBySessionId=/* @__PURE__ */ new Map,Mt(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw Error(`No active session`);return this.activeSessionId}onRunStart(e){z(`verbose`,()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){z(`verbose`,()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let e of t)z(`verbose`,()=>`[WebNN] releasing temporary tensor {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let t=this.mlContextCache.findIndex(t=>t.gpuDevice===e);if(t!==-1)return this.mlContextCache[t].mlContext;{let t=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:t}),t}}if(e===void 0){let e=this.mlContextCache.findIndex(e=>e.options===void 0&&e.gpuDevice===void 0);if(e!==-1)return this.mlContextCache[e].mlContext;{let e=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:e}),e}}let t=this.mlContextCache.findIndex(t=>nn(t.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let t=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:t}),t}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let n=this.sessionIdsByMLContext.get(t);n||(n=/* @__PURE__ */ new Set,this.sessionIdsByMLContext.set(t,n)),n.add(e),this.mlOpSupportLimitsBySessionId.has(e)||this.mlOpSupportLimitsBySessionId.set(e,t.opSupportLimits()),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e),this.mlOpSupportLimitsBySessionId.delete(e);let n=this.sessionIdsByMLContext.get(t);if(n.delete(e),n.size===0){this.sessionIdsByMLContext.delete(t);let e=this.mlContextCache.findIndex(e=>e.mlContext===t);e!==-1&&this.mlContextCache.splice(e,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}getMLOpSupportLimits(e){return this.mlOpSupportLimitsBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){z(`verbose`,()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,n,r,i){let a=tn.get(n);if(!a)throw Error(`Unsupported ONNX data type: ${n}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,a,r,i)}async createTemporaryTensor(e,t,n){z(`verbose`,()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${n}}`);let r=tn.get(t);if(!r)throw Error(`Unsupported ONNX data type: ${t}`);let i=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,i,r,n,!1);let a=this.temporarySessionTensorIds.get(e);return a?a.push(i):this.temporarySessionTensorIds.set(e,[i]),i}uploadTensor(e,t){if(!I().shouldTransferToMLTensor)throw Error(`Trying to upload to a MLTensor while shouldTransferToMLTensor is false`);z(`verbose`,()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let n=await this.tensorManager.download(e);return Vt(n,t)}}registerMLTensor(e,t,n,r){let i=tn.get(n);if(!i)throw Error(`Unsupported ONNX data type: ${n}`);let a=this.tensorManager.registerTensor(e,t,i,r);return z(`verbose`,()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${i}, dimensions: ${r}} -> {tensorId: ${a}}`),a}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let n=this.sessionGraphInputs.get(e);return n?n.includes(t):!1}isGraphOutput(e,t){let n=this.sessionGraphOutputs.get(e);return n?n.includes(t):!1}isGraphInputOutputTypeSupported(e,t,n=!0){let r=tn.get(vt(t)),i=this.mlOpSupportLimitsBySessionId.get(e);return typeof r>`u`?!1:n?!!i?.input.dataTypes.includes(r):!!i?.output.dataTypes.includes(r)}flush(){}}}),on=a(()=>{"use strict";}),sn,cn,ln,un,dn,fn,pn,mn,hn,gn=a(()=>{"use strict";Pt(),on(),sn=/* @__PURE__ */ new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),cn=[],ln=e=>Math.ceil(Number(e)/16)*16,un=e=>{for(let t=0;t<cn.length;t++){let n=cn[t];if(e<=n)return n}return Math.ceil(e/16)*16},dn=1,fn=()=>dn++,pn=async(e,t,n,r)=>{let i=ln(n),a=e.device.createBuffer({size:i,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let o=e.getCommandEncoder();e.endComputePass(),o.copyBufferToBuffer(t,0,a,0,i),e.flush(),await a.mapAsync(GPUMapMode.READ);let s=a.getMappedRange();if(r){let e=r();return e.set(new Uint8Array(s,0,n)),e}return new Uint8Array(s.slice(0,n))}finally{a.destroy()}},mn=class{constructor(e){this.backend=e,this.storageCache=/* @__PURE__ */ new Map,this.freeBuffers=/* @__PURE__ */ new Map,this.freeUniformBuffers=/* @__PURE__ */ new Map,this.buffersPending=[],this.capturedPendingBuffers=/* @__PURE__ */ new Map;for(let[e]of sn)cn.push(e),this.freeBuffers.set(e,[]),this.freeUniformBuffers.set(e,[]);this.sessionCount=0}upload(e,t){let n=t.buffer,r=t.byteOffset,i=t.byteLength,a=ln(i),o=this.storageCache.get(e);if(!o)throw Error(`gpu data for uploading does not exist`);if(Number(o.originalSize)!==i)throw Error(`inconsistent data size. gpu data size=${o.originalSize}, data size=${i}`);if(a===i&&r%4==0)this.backend.device.queue.writeBuffer(o.gpuData.buffer,0,n,r,i);else{let e=new Uint8Array(a);e.set(t),this.backend.device.queue.writeBuffer(o.gpuData.buffer,0,e,0,a)}z(`verbose`,()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let n=this.storageCache.get(e);if(!n)throw Error(`source gpu data for memcpy does not exist`);let r=this.storageCache.get(t);if(!r)throw Error(`destination gpu data for memcpy does not exist`);if(n.originalSize!==r.originalSize)throw Error(`inconsistent source and destination gpu data size`);let i=ln(n.originalSize),a=this.backend.getCommandEncoder();this.backend.endComputePass(),a.copyBufferToBuffer(n.gpuData.buffer,0,r.gpuData.buffer,0,i)}registerExternalBuffer(e,t,n){let r;if(n){if(r=n[0],e===n[1])return z(`verbose`,()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${r}, buffer is the same, skip.`),r;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else r=fn();return this.storageCache.set(r,{gpuData:{id:r,type:0,buffer:e},originalSize:t}),z(`verbose`,()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${r}, registered.`),r}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),z(`verbose`,()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let n=un(e),r,i=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,a=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(i||a){let e=(i?this.freeBuffers:this.freeUniformBuffers).get(n);r=e&&e.length>0?e.pop():this.backend.device.createBuffer({size:n,usage:t})}else r=this.backend.device.createBuffer({size:n,usage:t});let o={id:fn(),type:0,buffer:r};return this.storageCache.set(o.id,{gpuData:o,originalSize:Number(e)}),z(`verbose`,()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${o.id}`),o}get(e){return this.storageCache.get(e)?.gpuData}release(e){let t=typeof e==`bigint`?Number(e):e,n=this.storageCache.get(t);if(!n){if(this.storageCache.size===0)return 0;throw Error(`releasing data does not exist`)}return z(`verbose`,()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${n.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(n.gpuData.buffer),n.originalSize}async download(e,t){let n=this.storageCache.get(Number(e));if(!n)throw Error(`data does not exist`);await pn(this.backend,n.gpuData.buffer,n.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0){if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=sn.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let n=this.freeBuffers.get(e.size)||[];t===void 0||n.length>=t?e.destroy():n.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let n=this.freeUniformBuffers.get(e.size)||[];t===void 0||n.length>=t?e.destroy():n.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(e=>{e.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(e=>{e.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(e=>{e.destroy()})}),this.storageCache=/* @__PURE__ */ new Map,this.freeBuffers=/* @__PURE__ */ new Map,this.freeUniformBuffers=/* @__PURE__ */ new Map,this.capturedPendingBuffers=/* @__PURE__ */ new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(e=>{e.destroy()}),this.capturedPendingBuffers.delete(e)),--this.sessionCount,this.sessionCount===0&&(z(`warning`,()=>`[WebGPU] Clearing webgpu buffer cache`),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.storageCache=/* @__PURE__ */ new Map)}},hn=(...e)=>new mn(...e)}),_n,H,U=a(()=>{"use strict";_n=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(`;`),this.key}},H=e=>new _n(e)}),vn,yn,bn,xn,W,G,Sn,Cn,wn,K,Tn,q,J,En,Dn,On,kn,Y=a(()=>{"use strict";R(),V(),vn=64,yn=(e,t)=>{if(t===3)throw Error(`vec3 has same alignment as vec4, use vec4 instead`);switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:`f16`;case 1:return t>1?`vec${t}<f32>`:`f32`;case 6:return t>1?`vec${t}<i32>`:`i32`;case 12:return t>1?`vec${t}<u32>`:`u32`;case 7:if(t>1)throw Error(`currently not supported vecX of uint64 yet`);return[`vec2<u32>`,`i32`];case 13:if(t>1)throw Error(`currently not supported vecX of uint64 yet`);return[`vec2<u32>`,`u32`];case 9:if(t!==4)throw Error(`bool must be vec4`);return[`u32`,`vec4<bool>`];case 22:return`i32`;case 21:return`u32`;default:throw Error(`Unknown data type: ${e}`)}},bn=(e,t=1)=>{let n=yn(e,t);return typeof n==`string`?n:n[0]},xn=(e,t=1)=>{let n=yn(e,t);return typeof n==`string`?n:n[1]},W=(...e)=>{let t=[];return e.forEach(e=>{e.length!==0&&t.push({type:12,data:e},{type:12,data:B.computeStrides(e)})}),t},G=e=>e%4==0?4:e%2==0?2:1,Sn=(e=`f32`,t,n=`0`)=>!t||t===1?`${e}(${n})`:`vec${t}<${e}>(${n})`,Cn=(e,t,n)=>e===`f32`?n:t===1?`f32(${n})`:`vec${t}<f32>(${n})`,wn=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,K=(e,t,n,r)=>e.startsWith(`uniforms.`)&&n>4?typeof t==`string`?r===`f16`?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:r===`f16`?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:n>1?`${e}[${t}]`:e,Tn=(e,t,n,r,i)=>{let a=typeof n==`number`,o=a?n:n.length,s=[...Array(o).keys()],c=o<2?`u32`:o<=4?`vec${o}<u32>`:`array<u32, ${o}>`,l=yn(t,i),u=typeof l==`string`?l:l[1],d={indices:c,value:u,storage:typeof l==`string`?l:l[0],tensor:t},f=e=>typeof e==`string`?e:`${e}u`,p={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},m=a?`uniforms.`:``,h=`${m}${e}_shape`,g=`${m}${e}_strides`,_=``;for(let e=0;e<o-1;e++)_+=`
    let dim${e} = current / ${K(g,e,o)};
    let rest${e} = current % ${K(g,e,o)};
    indices[${e}] = dim${e};
    current = rest${e};
    `;_+=`indices[${o-1}] = current;`;let v=o<2?``:`
  fn o2i_${e}(offset: u32) -> ${d.indices} {
    var indices: ${d.indices};
    var current = offset;
    ${_}
    return indices;
  }`,y=t=>(p.offsetToIndices=!0,o<2?t:`o2i_${e}(${t})`),b=[];if(o>=2)for(let e=o-1;e>=0;e--)b.push(`${K(g,e,o)} * (indices[${e}])`);let x=o<2?``:`
  fn i2o_${e}(indices: ${d.indices}) -> u32 {
    return ${b.join(`+`)};
  }`,S=t=>(p.indicesToOffset=!0,o<2?t:`i2o_${e}(${t})`),C=(...e)=>o===0?`0u`:`${d.indices}(${e.map(f).join(`,`)})`,w=(e,t)=>o<2?`${e}`:`${K(e,t,o)}`,T=(e,t,n)=>o<2?`${e}=${n};`:`${K(e,t,o)}=${n};`,E={},D=(t,n)=>{p.broadcastedIndicesToOffset=!0;let r=`${n.name}broadcastedIndicesTo${e}Offset`;if(r in E)return`${r}(${t})`;let i=[];for(let e=o-1;e>=0;e--){let t=n.indicesGet(`outputIndices`,e+n.rank-o);i.push(`${w(g,e)} * (${t} % ${w(h,e)})`)}return E[r]=`fn ${r}(outputIndices: ${n.type.indices}) -> u32 {
             return ${i.length>0?i.join(`+`):`0u`};
           }`,`${r}(${t})`},O=(t,n)=>(()=>{if(d.storage===d.value)return`${e}[${t}]=${n};`;if(d.storage===`vec2<u32>`&&d.value===`i32`)return`${e}[${t}]=vec2<u32>(u32(${n}), select(0u, 0xFFFFFFFFu, ${n} < 0));`;if(d.storage===`vec2<u32>`&&d.value===`u32`)return`${e}[${t}]=vec2<u32>(u32(${n}), 0u);`;if(d.storage===`u32`&&d.value===`vec4<bool>`)return`${e}[${t}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${n}));`;throw Error(`not supported combination of storage type ${d.storage} and value type ${d.value} yet`)})(),k=t=>(()=>{if(d.storage===d.value)return`${e}[${t}]`;if(d.storage===`vec2<u32>`&&d.value===`i32`)return`i32(${e}[${t}].x)`;if(d.storage===`vec2<u32>`&&d.value===`u32`)return`u32(${e}[${t}].x)`;if(d.storage===`u32`&&d.value===`vec4<bool>`)return`vec4<bool>(bool(${e}[${t}] & 0xFFu), bool(${e}[${t}] & 0xFF00u), bool(${e}[${t}] & 0xFF0000u), bool(${e}[${t}] & 0xFF000000u))`;throw Error(`not supported combination of storage type ${d.storage} and value type ${d.value} yet`)})(),A=o<2?``:`
  fn get_${e}ByIndices(indices: ${d.indices}) -> ${u} {
    return ${k(`i2o_${e}(indices)`)};
  }`,j=o<2?``:(()=>{let t=s.map(e=>`d${e}: u32`).join(`, `),n=s.map(e=>`d${e}`).join(`, `);return`
  fn get_${e}(${t}) -> ${u} {
    return get_${e}ByIndices(${C(n)});
  }`})(),ee=(...t)=>{if(t.length!==o)throw Error(`indices length must be ${o}`);let n=t.map(f).join(`,`);return o===0?k(`0u`):o===1?k(n[0]):(p.get=!0,p.getByIndices=!0,p.indicesToOffset=!0,`get_${e}(${n})`)},te=t=>o<2?k(t):(p.getByIndices=!0,p.indicesToOffset=!0,`get_${e}ByIndices(${t})`),M=o<2?``:`
  fn set_${e}ByIndices(indices: ${d.indices}, value: ${u}) {
    ${O(`i2o_${e}(indices)`,`value`)}
  }`,ne=o<2?``:(()=>{let t=s.map(e=>`d${e}: u32`).join(`, `),n=s.map(e=>`d${e}`).join(`, `);return`
  fn set_${e}(${t}, value: ${u}) {
    set_${e}ByIndices(${C(n)}, value);
  }`})();return{impl:()=>{let e=[],t=!1;return p.offsetToIndices&&(e.push(v),t=!0),p.indicesToOffset&&(e.push(x),t=!0),p.broadcastedIndicesToOffset&&(Object.values(E).forEach(t=>e.push(t)),t=!0),p.set&&(e.push(ne),t=!0),p.setByIndices&&(e.push(M),t=!0),p.get&&(e.push(j),t=!0),p.getByIndices&&(e.push(A),t=!0),!a&&t&&e.unshift(`const ${h} = ${d.indices}(${n.join(`,`)});`,`const ${g} = ${d.indices}(${B.computeStrides(n).join(`,`)});`),e.join(`
`)},type:d,offsetToIndices:y,indicesToOffset:S,broadcastedIndicesToOffset:D,indices:C,indicesGet:w,indicesSet:T,set:(...t)=>{if(t.length!==o+1)throw Error(`indices length must be ${o}`);let n=t[o];if(typeof n!=`string`)throw Error(`value must be string`);let r=t.slice(0,o).map(f).join(`,`);return o===0?O(`0u`,n):o===1?O(r[0],n):(p.set=!0,p.setByIndices=!0,p.indicesToOffset=!0,`set_${e}(${r}, ${n})`)},setByOffset:O,setByIndices:(t,n)=>o<2?O(t,n):(p.setByIndices=!0,p.indicesToOffset=!0,`set_${e}ByIndices(${t}, ${n});`),get:ee,getByOffset:k,getByIndices:te,usage:r,name:e,strides:g,shape:h,rank:o}},q=(e,t,n,r=1)=>Tn(e,t,n,`input`,r),J=(e,t,n,r=1)=>Tn(e,t,n,`output`,r),En=(e,t,n)=>Tn(e,t,n,`atomicOutput`,1),Dn=(e,t,n,r=1)=>Tn(e,t,n,`internal`,r),On=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e==`number`?`${e}u`:e}) { return; }`}mainStart(e=vn){let t=typeof e==`number`?e:e[0],n=typeof e==`number`?1:e[1],r=typeof e==`number`?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||n>this.limits.maxComputeWorkgroupSizeY||r>this.limits.maxComputeWorkgroupSizeZ)throw Error(`workgroup size [${t}, ${n}, ${r}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*n*r>this.limits.maxComputeInvocationsPerWorkgroup)throw Error(`workgroup size [${t}, ${n}, ${r}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let i=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1;return`@compute @workgroup_size(${t}, ${n}, ${r})
  fn main(${i?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`}) {
    ${i?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*n*r}u + local_idx;`}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith(`uniforms.`)&&this.uniforms.push({name:e.shape.replace(`uniforms.`,``),type:`u32`,length:e.rank}),e.strides.startsWith(`uniforms.`)&&this.uniforms.push({name:e.strides.replace(`uniforms.`,``),type:`u32`,length:e.rank}))}declareVariable(e,t){if(e.usage===`internal`)throw Error(`cannot use internal variable with declareVariable(). use registerInternalVariables() instead.`);this.variables.push(e),this.appendVariableUniforms(e);let n=e.usage===`input`?`read`:`read_write`,r=e.usage===`atomicOutput`?`atomic<i32>`:e.type.storage;return`@group(0) @binding(${t}) var<storage, ${n}> ${e.name}: array<${r}>;`}declareVariables(...e){return e.map(e=>this.declareVariable(e,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!==`internal`)throw Error(`cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.`);this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(e=>this.registerInternalVariable(e)),this}registerUniform(e,t,n=1){return this.uniforms.push({name:e,type:t,length:n}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return``;let e=[];for(let{name:t,type:n,length:r}of this.uniforms)if(r&&r>4)n===`f16`?e.push(`@align(16) ${t}:array<mat2x4<${n}>, ${Math.ceil(r/8)}>`):e.push(`${t}:array<vec4<${n}>, ${Math.ceil(r/4)}>`);else{let i=r==null||r===1?n:`vec${r}<${n}>`;e.push(`${t}:${i}`)}return`
      struct Uniforms { ${e.join(`, `)} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=e=>[12,10,1,6][[`u32`,`f16`,`f32`,`i32`].indexOf(e)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},kn=(e,t)=>new On(e,t)}),An,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,zn=a(()=>{"use strict";R(),V(),U(),Y(),An=(e,t)=>{if(!e||e.length!==1)throw Error(`Transpose requires 1 input.`);if(t.length!==0&&t.length!==e[0].dims.length)throw Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},jn=(e,t)=>t.length===0?[...Array(e).keys()].reverse():t,Mn=(e,t)=>B.sortBasedOnPerm(e,jn(e.length,t)),Nn=(e,t,n,r)=>{let i=`fn perm(i: ${r.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`;for(let n=0;n<t;++n)i+=`a[${e[n]}]=i[${n}];`;return i+=`return a;}`},Pn=(e,t)=>{let n=[],r=[];for(let i=0;i<e.length;++i)e[i]!==1&&n.push(e[i]),e[t[i]]!==1&&r.push(t[i]);return{newShape:n,newPerm:r}},Fn=(e,t)=>{let n=0;for(let r=0;r<e.length;++r)if(t[e[r]]!==1){if(e[r]<n)return!1;n=e[r]}return!0},In=(e,t)=>{let n=e.dataType,r=e.dims.length,i=jn(r,t),a=Mn(e.dims,i),o=e.dims,s=a,c=r<2||Fn(i,e.dims),l;if(c)return l=e=>{let t=q(`input`,n,o,4),r=J(`output`,n,s,4);return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(t,r)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    output[global_idx] = input[global_idx];
  }`},{name:`TransposeCopy`,shaderCache:{inputDependencies:[`type`]},getRunData:()=>{let t=B.size(a);return{outputs:[{dims:a,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(t/64/4)},programUniforms:[{type:12,data:Math.ceil(t/4)}]}},getShaderSource:l};let{newShape:u,newPerm:d}=Pn(e.dims,i),f=B.areEqual(d,[2,3,1]),p=B.areEqual(d,[3,1,2]);return u.length===2||f||p?(o=f?[u[0],u[1]*u[2]]:p?[u[0]*u[1],u[2]]:u,s=[o[1],o[0]],l=e=>{let t=q(`a`,n,o.length),r=J(`output`,n,s.length);return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(t,r)}
  var<workgroup> tile : array<array<${r.type.value}, 17>, 16>;
  ${e.mainStart([16,16,1])}
    let stride = (uniforms.output_shape[1] - 1) / 16 + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * 16u + local_id.x;
    let input_row = workgroup_id_x * 16u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${t.getByIndices(`${t.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * 16u + local_id.x;
    let output_row = workgroup_id_y * 16u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${r.setByIndices(`${r.type.indices}(output_row, output_col)`,`tile[local_id.x][local_id.y]`)}
    }
  }`},{name:`TransposeShared`,shaderCache:{inputDependencies:[`type`]},getRunData:()=>{let t=B.size(a);return{outputs:[{dims:a,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(s[1]/16),y:Math.ceil(s[0]/16)},programUniforms:[{type:12,data:t},...W(o,s)]}},getShaderSource:l}):(l=e=>{let t=q(`a`,n,o.length),a=J(`output`,n,s.length);return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(t,a)}

  ${Nn(i,r,t,a)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

    let indices = ${a.offsetToIndices(`global_idx`)};
    let aIndices = perm(indices);

    ${a.setByOffset(`global_idx`,t.getByIndices(`aIndices`))}
  }`},{name:`Transpose`,shaderCache:{hint:`${t}`,inputDependencies:[`rank`]},getRunData:()=>{let t=B.size(a);return{outputs:[{dims:a,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(t/64)},programUniforms:[{type:12,data:t},...W(o,s)]}},getShaderSource:l})},Ln=(e,t)=>{An(e.inputs,t.perm),e.compute(In(e.inputs[0],t.perm))},Rn=e=>H({perm:e.perm})}),Bn,Vn,Hn,Un,Wn,Gn,Kn,qn,Jn,Yn,Xn,Zn,Qn,$n,er,tr,nr,rr,ir,ar,or,sr=a(()=>{"use strict";R(),V(),Y(),jr(),zn(),Bn={max:`select(bestValue, candidate, candidate > bestValue)`,min:`select(bestValue, candidate, candidate < bestValue)`,mean:`bestValue + candidate`,sum:`bestValue + candidate`,prod:`bestValue * candidate`,sumSquare:`bestValue + candidate * candidate`,logSumExp:`bestValue + exp(candidate)`,l1:`bestValue + abs(candidate)`,l2:`bestValue + candidate * candidate`,logSum:`bestValue + candidate`},Vn={max:`select(bestValue, candidate, candidate > bestValue)`,min:`select(bestValue, candidate, candidate < bestValue)`,mean:`bestValue + candidate`,sum:`bestValue + candidate`,prod:`bestValue * candidate`,sumSquare:`bestValue + candidate`,logSumExp:`bestValue + candidate`,l1:`bestValue + candidate`,l2:`bestValue + candidate`,logSum:`bestValue + candidate`},Hn={max:`_A[offset]`,min:`_A[offset]`,mean:`0`,sum:`0`,prod:`1`,sumSquare:`0`,logSumExp:`0`,l1:`0`,l2:`0`,logSum:`0`},Un={max:`bestValue`,min:`bestValue`,sum:`bestValue`,prod:`bestValue`,sumSquare:`bestValue`,logSumExp:`log(bestValue)`,l1:`bestValue`,l2:`sqrt(bestValue)`,logSum:`log(bestValue)`},Wn=(e,t)=>{let n=[];for(let r=t-e;r<t;++r)n.push(r);return n},Gn=(e,t)=>{let n=[],r=e.length;for(let i=0;i<r;i++)t.indexOf(i)===-1&&n.push(e[i]);return[n,t.map(t=>e[t])]},Kn=(e,t)=>{let n=e.length+t.length,r=[],i=0;for(let a=0;a<n;a++)t.indexOf(a)===-1?r.push(e[i++]):r.push(1);return r},qn=(e,t)=>{for(let n=0;n<e.length;++n)if(e[e.length-n-1]!==t-1-n)return!1;return!0},Jn=(e,t)=>{let n=[];if(!qn(e,t)){for(let r=0;r<t;++r)e.indexOf(r)===-1&&n.push(r);e.forEach(e=>n.push(e))}return n},Yn=(e,t,n,r,i,a,o)=>{let s=n[0].dims,c=B.size(a),l=B.size(o),u=q(`_A`,n[0].dataType,s),d=J(`output`,i,a),f=64;c===1&&(f=256);let p=`
          var<workgroup> aBestValues : array<f32, ${f}>;
       `;return{name:e,shaderCache:{hint:`${t};${f}`,inputDependencies:[`type`]},getShaderSource:e=>`
        ${e.registerUniform(`reduceSize`,`u32`).declareVariables(u,d)}
        ${p}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${e.mainStart(f)}

          let outputIndex = global_idx / ${f};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${Hn[r]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${f}) {
           let candidate = f32(${u.getByOffset(`offset + k`)});
           bestValue = ${Bn[r]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${f}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${Vn[r]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${d.setByOffset(`outputIndex`,`${r===`mean`?`${d.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${d.type.storage}(${Un[r]})`}`)};
         }
        }`,getRunData:()=>({outputs:[{dims:a,dataType:i}],dispatchGroup:{x:c},programUniforms:[{type:12,data:l}]})}},Xn=(e,t,n,r)=>{let i=e.inputs.length===1?n:dr(e.inputs,n),a=i.axes;a.length===0&&!i.noopWithEmptyAxes&&(a=e.inputs[0].dims.map((e,t)=>t));let o=B.normalizeAxes(a,e.inputs[0].dims.length),s=o,c=e.inputs[0],l=Jn(s,e.inputs[0].dims.length);l.length>0&&(c=e.compute(In(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],s=Wn(s.length,c.dims.length));let[u,d]=Gn(c.dims,s),f=u;i.keepDims&&(f=Kn(u,o)),e.compute(Yn(t,i.cacheKey,[c],r,e.inputs[0].dataType,f,d),{inputs:[c]})},Zn=(e,t)=>{Xn(e,`ReduceMeanShared`,t,`mean`)},Qn=(e,t)=>{Xn(e,`ReduceL1Shared`,t,`l1`)},$n=(e,t)=>{Xn(e,`ReduceL2Shared`,t,`l2`)},er=(e,t)=>{Xn(e,`ReduceLogSumExpShared`,t,`logSumExp`)},tr=(e,t)=>{Xn(e,`ReduceMaxShared`,t,`max`)},nr=(e,t)=>{Xn(e,`ReduceMinShared`,t,`min`)},rr=(e,t)=>{Xn(e,`ReduceProdShared`,t,`prod`)},ir=(e,t)=>{Xn(e,`ReduceSumShared`,t,`sum`)},ar=(e,t)=>{Xn(e,`ReduceSumSquareShared`,t,`sumSquare`)},or=(e,t)=>{Xn(e,`ReduceLogSumShared`,t,`logSum`)}}),cr,lr,ur,dr,fr,pr,mr,hr,gr,_r,vr,yr,br,xr,X,Sr,Cr,Z,wr,Q,Tr,Er,Dr,Or,kr,Ar,jr=a(()=>{"use strict";R(),V(),U(),Y(),sr(),cr=e=>{if(!e||e.length===0||e.length>2)throw Error(`Reduce op requires 1 or 2 inputs.`);if(e.length===2&&e[1].dims.length!==1)throw Error(`Invalid axes input dims.`)},lr=e=>[``,``,`var value = ${e.getByIndices(`input_indices`)};`,``],ur=(e,t,n,r,i,a,o=!1,s=!1)=>{let c=[],l=n[0].dims,u=l.length,d=B.normalizeAxes(i,u),f=!s&&d.length===0;l.forEach((e,t)=>{f||d.indexOf(t)>=0?o&&c.push(1):c.push(e)});let p=c.length,m=B.size(c);return{name:e,shaderCache:t,getShaderSource:e=>{let t=[],i=q(`_A`,n[0].dataType,u),s=J(`output`,a,p),c=r(i,s,d),m=c[2];for(let e=0,n=0;e<u;e++)f||d.indexOf(e)>=0?(o&&n++,m=`for(var j${e}: u32 = 0; j${e} < ${l[e]}; j${e}++) {
                  ${c[2].includes(`last_index`)?`let last_index = j${e};`:``}
                  ${i.indicesSet(`input_indices`,e,`j${e}`)}
                  ${m}
                }`):(t.push(`${i.indicesSet(`input_indices`,e,s.indicesGet(`output_indices`,n))};`),n++);return`

        ${e.registerUniform(`output_size`,`u32`).declareVariables(i,s)}

        ${e.mainStart()}
          ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
          var input_indices: ${i.type.indices};
          let output_indices = ${s.offsetToIndices(`global_idx`)};

          ${t.join(`
`)}
          ${c[0]}       // init ops for reduce max/min
          ${c[1]}
          ${m}
          ${c[3]}
          ${c.length===4?s.setByOffset(`global_idx`,`value`):c.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:c,dataType:a}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...W(l,c)]})}},dr=(e,t)=>{let n=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(e=>n.push(Number(e))),H({axes:n,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},fr=(e,t,n,r)=>{let i=e.inputs,a=i.length===1?n:dr(i,n);e.compute(ur(t,{hint:a.cacheKey,inputDependencies:[`rank`]},[i[0]],a.noopWithEmptyAxes&&a.axes.length===0?lr:r,a.axes,i[0].dataType,a.keepDims,a.noopWithEmptyAxes),{inputs:[0]})},pr=(e,t)=>{cr(e.inputs),fr(e,`ReduceLogSum`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += ${e.getByIndices(`input_indices`)};`,`value = log(value);`])},mr=(e,t)=>{cr(e.inputs),fr(e,`ReduceL1`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += abs(${e.getByIndices(`input_indices`)});`,``])},hr=(e,t)=>{cr(e.inputs),fr(e,`ReduceL2`,t,(e,t)=>[`var t = ${t.type.value}(0); var value = ${t.type.value}(0);`,``,`t = ${e.getByIndices(`input_indices`)}; value += (t * t);`,`value = sqrt(value);`])},gr=(e,t)=>{cr(e.inputs),fr(e,`ReduceLogSumExp`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += exp(${e.getByIndices(`input_indices`)});`,`value = log(value);`])},_r=(e,t)=>{cr(e.inputs),fr(e,`ReduceMax`,t,(e,t,n)=>{let r=[];for(let t=0;t<e.rank;t++)(n.indexOf(t)>=0||n.length===0)&&r.push(e.indicesSet(`input_indices`,t,0));return[`${r.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};`,`value = max(value, ${e.getByIndices(`input_indices`)});`,``]})},vr=(e,t)=>{cr(e.inputs),fr(e,`ReduceMean`,t,(t,n,r)=>{let i=1;for(let n=0;n<t.rank;n++)(r.indexOf(n)>=0||r.length===0)&&(i*=e.inputs[0].dims[n]);return[`var sum = f32(0);`,``,`sum += f32(${t.getByIndices(`input_indices`)});`,`let value = ${n.type.value}(sum / ${i});`]})},yr=(e,t)=>{cr(e.inputs),fr(e,`ReduceMin`,t,(e,t,n)=>{let r=[];for(let t=0;t<e.rank;t++)(n.indexOf(t)>=0||n.length===0)&&r.push(`input_indices[${t}] = 0;`);return[`${r.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};`,`value = min(value, ${e.getByIndices(`input_indices`)});`,``]})},br=(e,t)=>{cr(e.inputs),fr(e,`ReduceProd`,t,(e,t)=>[`var value = ${t.type.storage}(1);`,``,`value *= ${e.getByIndices(`input_indices`)};`,``])},xr=(e,t)=>{cr(e.inputs),fr(e,`ReduceSum`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += ${e.getByIndices(`input_indices`)};`,``])},X=(e,t)=>{cr(e.inputs),fr(e,`ReduceSumSquare`,t,(e,t)=>[`var t = ${t.type.value}(0); var value = ${t.type.value}(0);`,``,`t = ${e.getByIndices(`input_indices`)}; value += t * t;`,``])},Sr=(e,t,n)=>{if(t.length===0)return n;let r=1,i=1;for(let n=0;n<t.length;n++)t.indexOf(n)===-1?r*=e[n]:i*=e[n];return i<32&&r>1024},Cr=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?vr(e,t):Zn(e,t)},Z=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?mr(e,t):Qn(e,t)},wr=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?hr(e,t):$n(e,t)},Q=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?gr(e,t):er(e,t)},Tr=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?_r(e,t):tr(e,t)},Er=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?yr(e,t):nr(e,t)},Dr=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?br(e,t):rr(e,t)},Or=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?xr(e,t):ir(e,t)},kr=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?X(e,t):ar(e,t)},Ar=(e,t)=>{Sr(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?pr(e,t):or(e,t)}}),Mr,Nr,Pr,Fr,Ir=a(()=>{"use strict";R(),U(),jr(),Mr=e=>{if(!e||e.length===0||e.length>2)throw Error(`ArgMinMaxOp op requires 1 or 2 inputs.`);if(e[0].dataType!==1)throw Error(`Invalid input type.`)},Nr=(e,t)=>{Mr(e.inputs),e.compute(ur(`ArgMin`,{hint:t.cacheKey,inputDependencies:[`rank`]},[e.inputs[0]],(e,n,r)=>{let i=[];for(let t=0;t<e.rank;t++)(r.indexOf(t)>=0||r.length===0)&&i.push(`input_indices[${t}] = 0;`);return[`${i.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};
var best_index : i32 = 0;`,`if (${e.getByIndices(`input_indices`)} ${t.selectLastIndex>0?`<=`:`<`} value) {
         value = ${e.getByIndices(`input_indices`)};
         best_index = i32(last_index);
       }`,``,n.setByOffset(`global_idx`,`best_index`)]},[t.axis],7,t.keepDims),{inputs:[0]})},Pr=(e,t)=>{Mr(e.inputs),e.compute(ur(`argMax`,{hint:t.cacheKey,inputDependencies:[`rank`]},[e.inputs[0]],(e,n,r)=>{let i=[];for(let t=0;t<e.rank;t++)(r.indexOf(t)>=0||r.length===0)&&i.push(`input_indices[${t}] = 0;`);return[`${i.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};
var best_index : i32 = 0;`,`if (${e.getByIndices(`input_indices`)} ${t.selectLastIndex>0?`>=`:`>`} value) {
         value = ${e.getByIndices(`input_indices`)};
         best_index = i32(last_index);
       }`,``,n.setByOffset(`global_idx`,`best_index`)]},[t.axis],7,t.keepDims),{inputs:[0]})},Fr=e=>H(e)}),Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr=a(()=>{"use strict";R(),V(),on(),Y(),Lr=(e,t)=>{let n=e[0],r=e[1],i=e[2],a=e[3],o=e[4],s=e[5];if(o&&s)throw Error(`Attention cannot have both past and attention_bias`);if(n.dims.length!==3)throw Error(`Input "input" must have 3 dimensions`);let c=n.dims[0],l=n.dims[1],u=n.dims[2];if(i.dims.length!==1)throw Error(`Input "bias" is expected to have 1 dimensions`);if(r.dims.length!==2)throw Error(`Input "weights" is expected to have 2 dimensions`);if(r.dims[0]!==u)throw Error(`Input 1 dimension 0 should have same length as dimension 2 of input 0`);if(i.dims[0]!==r.dims[1])throw Error(`Input "bias" dimension 0 should have same length as dimension 1 of input "weights"`);let d=i.dims[0]/3,f=d,p=f;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw Error(`qkv_hidden_sizes attribute should have 3 elements`);for(let e of t.qkvHiddenSizes)if(e%t.numHeads!==0)throw Error(`qkv_hidden_sizes should be divisible by num_heads`);d=t.qkvHiddenSizes[0],f=t.qkvHiddenSizes[1],p=t.qkvHiddenSizes[2]}let m=l;if(d!==f)throw Error(`qkv_hidden_sizes first element should be same as the second`);if(i.dims[0]!==d+f+p)throw Error(`Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes`);let h=0;if(o){if(f!==p)throw Error(`Input "past" expect k_hidden_size == v_hidden_size`);if(o.dims.length!==5)throw Error(`Input "past" must have 5 dimensions`);if(o.dims[0]!==2)throw Error(`Input "past" first dimension must be 2`);if(o.dims[1]!==c)throw Error(`Input "past" second dimension must be batch_size`);if(o.dims[2]!==t.numHeads)throw Error(`Input "past" third dimension must be num_heads`);if(o.dims[4]!==f/t.numHeads)throw Error(`Input "past" fifth dimension must be k_hidden_size / num_heads`);t.pastPresentShareBuffer||(h=o.dims[3])}let g=m+h;if(a)throw Error(`Mask not supported`);if(o)throw Error(`past is not supported`);if(s){if(s.dims.length!==4)throw Error(`Input "attention_bias" must have 4 dimensions`);if(s.dims[0]!==c||s.dims[1]!==t.numHeads||s.dims[2]!==l||s.dims[3]!==g)throw Error(`Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)`)}return{batchSize:c,sequenceLength:l,pastSequenceLength:h,kvSequenceLength:m,totalSequenceLength:g,maxSequenceLength:-1,inputHiddenSize:u,hiddenSize:d,vHiddenSize:p,headSize:Math.floor(d/t.numHeads),vHeadSize:Math.floor(p/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:0,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Rr=(e,t,n)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset(`0`)});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e?.getByOffset(`batchIdx`)}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${n?`let past_sequence_length = uniforms.past_sequence_length`:``};
    let present_sequence_length = total_sequence_length;
    `,zr=(e,t,n,r,i,a,o,s)=>{let c=G(o?1:a),l=64,u=a/c;u<l&&(l=32);let d=Math.ceil(a/c/l),f=[{type:12,data:t},{type:12,data:n},{type:12,data:r},{type:12,data:i},{type:12,data:u},{type:12,data:d}],p=bn(e.dataType,c),m=xn(1,c),h=[`type`];return o&&h.push(`type`),s&&h.push(`type`),{name:`AttentionProbsSoftmax`,shaderCache:{hint:`${l};${p};${c}`,inputDependencies:h},getShaderSource:t=>{let n=J(`x`,e.dataType,e.dims,c),r=[n],i=o?q(`seq_lens`,o.dataType,o.dims):void 0;i&&r.push(i);let a=s?q(`total_sequence_length_input`,s.dataType,s.dims):void 0;a&&r.push(a);let u=xn(e.dataType);return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${t.registerUniforms([{name:`batch_size`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`past_sequence_length`,type:`u32`},{name:`sequence_length`,type:`u32`},{name:`total_sequence_length`,type:`u32`},{name:`elements_per_thread`,type:`u32`}]).declareVariables(...r)}
  ${t.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${Rr(i,a,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${l}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${o?`u32(past_sequence_length + workgroup_id.y + 1)`:`total_sequence_length`};
    var thread_max_vector = ${m}(-3.4028234663852886e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${m}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(c){case 1:return`thread_max_vector`;case 2:return`max(thread_max_vector.x, thread_max_vector.y)`;case 4:return`max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))`;default:throw Error(`Unsupported components: ${c}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.4028234663852886e+38f);
    for (var i = 0u; i < ${l}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${m}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${m}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(c){case 1:return`sum_vector`;case 2:return`sum_vector.x + sum_vector.y`;case 4:return`sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w`;default:throw Error(`Unsupported components: ${c}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${l}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${n.type.value}(${u}(1.0) / ${u}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${m}(x[offset + i]);
        x[offset + i] = ${n.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${o?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${n.type.value}(${u}(0));
        }`:``};
  }`},getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:i,z:t*n},programUniforms:f})}},Br=(e,t,n,r,i,a,o,s,c)=>{let l=o+a.kvSequenceLength,u=[a.batchSize,a.numHeads,a.sequenceLength,l],d=e>1&&r,f=a.kvNumHeads?a.kvNumHeads:a.numHeads,p=d?[a.batchSize,f,l,a.headSize]:void 0,m=a.nReps?a.nReps:1,h=a.scale===0?1/Math.sqrt(a.headSize):a.scale,g=G(a.headSize),_=a.headSize/g,v={x:Math.ceil(l/12),y:Math.ceil(a.sequenceLength/12),z:a.batchSize*a.numHeads},y=[{type:12,data:a.sequenceLength},{type:12,data:_},{type:12,data:l},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:1,data:h},{type:12,data:o},{type:12,data:a.kvSequenceLength},{type:12,data:m}],b=d&&r&&B.size(r.dims)>0,x=[`type`,`type`];b&&x.push(`type`),i&&x.push(`type`),s&&x.push(`type`),c&&x.push(`type`);let S=[{dims:u,dataType:t.dataType,gpuDataType:0}];return d&&S.push({dims:p,dataType:t.dataType,gpuDataType:0}),{name:`AttentionProbs`,shaderCache:{hint:`${g};${i!==void 0};${r!==void 0};${e}`,inputDependencies:x},getRunData:()=>({outputs:S,dispatchGroup:v,programUniforms:y}),getShaderSource:e=>{let a=q(`q`,t.dataType,t.dims,g),o=[a,q(`key`,n.dataType,n.dims,g)];if(b){let e=q(`past_key`,r.dataType,r.dims,g);o.push(e)}i&&o.push(q(`attention_bias`,i.dataType,i.dims));let l=s?q(`seq_lens`,s.dataType,s.dims):void 0;l&&o.push(l);let f=c?q(`total_sequence_length_input`,c.dataType,c.dims):void 0;f&&o.push(f);let h=J(`output`,t.dataType,u),_=[h];d&&_.push(J(`present_key`,t.dataType,p,g));let v=xn(1,g);return`
  const TILE_SIZE = 12u;

  var<workgroup> tileQ: array<${a.type.storage}, 144>;
  var<workgroup> tileK: array<${a.type.storage}, 144>;
  ${e.registerUniforms([{name:`M`,type:`u32`},{name:`K`,type:`u32`},{name:`N`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`head_size`,type:`u32`},{name:`alpha`,type:`f32`},{name:`past_sequence_length`,type:`u32`},{name:`kv_sequence_length`,type:`u32`},{name:`n_reps`,type:`u32`}]).declareVariables(...o,..._)}
  ${e.mainStart([12,12,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${m===1?`headIdx`:`headIdx / uniforms.n_reps`};
    let kv_num_heads = ${m===1?`uniforms.num_heads`:`uniforms.num_heads / uniforms.n_reps`};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Rr(l,f,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${b&&d?`let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;`:``};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${d?`let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;`:``}
    var value = ${v}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${b&&d?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${d?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:``}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${v}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(g){case 1:return`value`;case 2:return`value.x + value.y`;case 4:return`value.x + value.y + value.z + value.w`;default:throw Error(`Unsupported components: ${g}`)}})()};
        output[outputIdx] = ${h.type.value} (sum * uniforms.alpha) + ${i?`attention_bias[outputIdx]`:`0.0`};
    }
  }`}}},Vr=(e,t,n,r,i,a,o=void 0,s=void 0)=>{let c=a+i.kvSequenceLength,l=i.nReps?i.nReps:1,u=i.vHiddenSize*l,d=e>1&&r,f=i.kvNumHeads?i.kvNumHeads:i.numHeads,p=d?[i.batchSize,f,c,i.headSize]:void 0,m=[i.batchSize,i.sequenceLength,u],h={x:Math.ceil(i.vHeadSize/12),y:Math.ceil(i.sequenceLength/12),z:i.batchSize*i.numHeads},g=[{type:12,data:i.sequenceLength},{type:12,data:c},{type:12,data:i.vHeadSize},{type:12,data:i.numHeads},{type:12,data:i.headSize},{type:12,data:u},{type:12,data:a},{type:12,data:i.kvSequenceLength},{type:12,data:l}],_=d&&r&&B.size(r.dims)>0,v=[`type`,`type`];_&&v.push(`type`),o&&v.push(`type`),s&&v.push(`type`);let y=[{dims:m,dataType:t.dataType,gpuDataType:0}];return d&&y.push({dims:p,dataType:t.dataType,gpuDataType:0}),{name:`AttentionScore`,shaderCache:{hint:`${r!==void 0};${e}`,inputDependencies:v},getRunData:()=>({outputs:y,dispatchGroup:h,programUniforms:g}),getShaderSource:e=>{let i=q(`probs`,t.dataType,t.dims),a=[i,q(`v`,n.dataType,n.dims)];_&&a.push(q(`past_value`,r.dataType,r.dims));let c=o?q(`seq_lens`,o.dataType,o.dims):void 0;o&&a.push(c);let u=s?q(`total_sequence_length_input`,s.dataType,s.dims):void 0;s&&a.push(u);let f=[J(`output`,t.dataType,m)];return d&&f.push(J(`present_value`,t.dataType,p)),`
  const TILE_SIZE = 12u;
  var<workgroup> tileQ: array<${i.type.value}, 144>;
  var<workgroup> tileV: array<${i.type.value}, 144>;
  ${e.registerUniforms([{name:`M`,type:`u32`},{name:`K`,type:`u32`},{name:`N`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`head_size`,type:`u32`},{name:`v_hidden_size`,type:`u32`},{name:`past_sequence_length`,type:`u32`},{name:`kv_sequence_length`,type:`u32`},{name:`n_reps`,type:`u32`}]).declareVariables(...a,...f)}
  ${e.mainStart([12,12,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?`headIdx`:`headIdx / uniforms.n_reps`};
   let kv_num_heads = ${l===1?`uniforms.num_heads`:`uniforms.num_heads / uniforms.n_reps`};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Rr(c,u,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${_&&d?`let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;`:``};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${d?`let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;`:``}
   var value = ${i.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${_&&d?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${d?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:``}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`}}},Hr=(e,t,n,r,i,a,o,s,c,l,u=void 0,d=void 0)=>{let f=Math.min(e.outputCount,1+ +!!o+ +!!s),p=f>1?o:void 0,m=f>1?s:void 0,h=f>1?l.pastSequenceLength:0,g=h+l.kvSequenceLength,_=c&&B.size(c.dims)>0?c:void 0,v=[t,n];p&&B.size(p.dims)>0&&v.push(p),_&&v.push(_),u&&v.push(u),d&&v.push(d);let y=e.compute(Br(f,t,n,p,_,l,h,u,d),{inputs:v,outputs:f>1?[-1,1]:[-1]})[0];e.compute(zr(y,l.batchSize,l.numHeads,h,l.sequenceLength,g,u,d),{inputs:u&&d?[y,u,d]:[y],outputs:[]});let b=[y,r];m&&B.size(m.dims)>0&&b.push(m),u&&b.push(u),d&&b.push(d),e.compute(Vr(f,y,r,m,l,h,u,d),{inputs:b,outputs:f>1?[0,2]:[0]})},Ur=(e,t)=>{let n=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],r=t.sequenceLength,i=t.inputHiddenSize,a=t.headSize,o={x:Math.ceil(t.headSize/12),y:Math.ceil(t.sequenceLength/12),z:t.batchSize*t.numHeads},s=[e.inputs[0],e.inputs[1],e.inputs[2]],c=[{type:12,data:r},{type:12,data:i},{type:12,data:a},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}];return e.compute({name:`AttentionPrepare`,shaderCache:{inputDependencies:[`type`,`type`,`type`]},getRunData:()=>({outputs:[{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:o,programUniforms:c}),getShaderSource:e=>{let t=J(`output_q`,s[0].dataType,n),r=J(`output_k`,s[0].dataType,n),i=J(`output_v`,s[0].dataType,n),a=q(`input`,s[0].dataType,s[0].dims),o=q(`weight`,s[1].dataType,s[1].dims),c=q(`bias`,s[2].dataType,s[2].dims),l=a.type.storage;return`
  const TILE_SIZE = 12u;
  var<workgroup> tileInput: array<${l}, 144>;
  var<workgroup> tileWeightQ: array<${l}, 144>;
  var<workgroup> tileWeightK: array<${l}, 144>;
  var<workgroup> tileWeightV: array<${l}, 144>;
  ${e.registerUniforms([{name:`M`,type:`u32`},{name:`K`,type:`u32`},{name:`N`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`head_size`,type:`u32`},{name:`hidden_size`,type:`u32`},{name:`ldb`,type:`u32`}]).declareVariables(a,o,c,t,r,i)}
  ${e.mainStart([12,12,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${l}(0);
    var valueK = ${l}(0);
    var valueV = ${l}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`}},{inputs:s,outputs:[-1,-1,-1]})},Wr=(e,t)=>{let n=Lr(e.inputs,t),[r,i,a]=Ur(e,n);return Hr(e,r,i,a,e.inputs[4],void 0,void 0,void 0,e.inputs[5],n)}}),Kr,qr,Jr,Yr,Xr=a(()=>{"use strict";Te(),R(),V(),U(),Y(),Kr=(e,t)=>{if(!e||e.length!==5)throw Error(`BatchNormalization requires 5 inputs`);let n=(e,t,n)=>{let r=t.length;if(r!==e.length)throw Error(`${n}: num dimensions != ${r}`);t.forEach((t,r)=>{if(t!==e[r])throw Error(`${n}: dim[${r}] do not match`)})};if(e[0].dims.length>1){let r=t.format===`NHWC`?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);n(e[1].dims,r,`Invalid input scale`),n(e[2].dims,r,`Invalid input B`),n(e[3].dims,r,`Invalid input mean`),n(e[4].dims,r,`Invalid input var`)}else n(e[1].dims,[1],`Invalid input scale`),n(e[2].dims,[1],`Invalid input B`),n(e[3].dims,[1],`Invalid input mean`),n(e[4].dims,[1],`Invalid input var`)},qr=(e,t)=>{let{epsilon:n,spatial:r,format:i}=t,a=e[0].dims,o=r?G(a[a.length-1]):1,s=i===`NHWC`&&a.length>1?o:1,c=B.size(a)/o,l=r,u=l?a.length:a,d=q(`x`,e[0].dataType,e[0].dims,o),f=q(`scale`,e[1].dataType,e[1].dims,s),p=q(`bias`,e[2].dataType,e[2].dims,s),m=q(`inputMean`,e[3].dataType,e[3].dims,s),h=q(`inputVar`,e[4].dataType,e[4].dims,s),g=J(`y`,e[0].dataType,u,o),_=()=>{let e=``;if(r)e=`let cOffset = ${a.length===1?`0u`:i===`NHWC`?`outputIndices[${a.length-1}] / ${o}`:`outputIndices[1]`};`;else if(i===`NCHW`)e=`
            ${g.indicesSet(`outputIndices`,`0`,`0`)}
            let cOffset = ${g.indicesToOffset(`outputIndices`)};`;else{e=`var cIndices = ${f.type.indices}(0);
                       cIndices[0] = outputIndices[${a.length-1}];`;for(let t=1;t<f.rank;t++)e+=`cIndices[${t}] = outputIndices[${t}];`;e+=`let cOffset = ${f.indicesToOffset(`cIndices`)};`}return e};return{name:`BatchNormalization`,shaderCache:{hint:`${t.epsilon}_${t.format}_${r}_${o}`,inputDependencies:l?[`rank`,`type`,`type`,`type`,`type`]:void 0},getShaderSource:e=>`
  const epsilon = ${n};
  ${e.registerUniform(`outputSize`,`u32`).declareVariables(d,f,p,m,h,g)}
  ${e.mainStart()}
  ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
    var outputIndices = ${g.offsetToIndices(`global_idx * ${o}`)};
    ${_()}
    let scale = ${f.getByOffset(`cOffset`)};
    let bias = ${p.getByOffset(`cOffset`)};
    let inputMean = ${m.getByOffset(`cOffset`)};
    let inputVar = ${h.getByOffset(`cOffset`)};
    let x = ${d.getByOffset(`global_idx`)};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${g.setByOffset(`global_idx`,`value`)}
  }`,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:l?[{type:12,data:c},...W(a)]:[{type:12,data:c}]})}},Jr=e=>H(e),Yr=(e,t)=>{let{inputs:n,outputCount:r}=e,i=Jr({...t,outputCount:r});if(x.webgpu.validateInputContent&&Kr(n,i),t.trainingMode)throw Error(`BatchNormalization trainingMode is not supported yet.`);e.compute(qr(n,i))}}),Zr,Qr,$r,ei=a(()=>{"use strict";V(),Y(),Zr=e=>{if(e[0].dims.length!==3)throw Error(`input should have 3 dimensions`);if(![320,640,1280].includes(e[0].dims[2]))throw Error(`number of channels should be 320, 640 or 1280`);if(e[1].dims.length!==1)throw Error(`bias is expected to have 1 dimensions`);if(e[0].dims[2]!==e[1].dims[0])throw Error(`last dimension of input and bias are not the same`)},Qr=e=>{let t=e[0].dims,n=e[0].dims[2],r=B.size(t)/4,i=e[0].dataType,a=q(`input`,i,t,4),o=q(`bias`,i,[n],4),s=q(`residual`,i,t,4),c=J(`output`,i,t,4);return{name:`BiasAdd`,getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(r/64)}}),getShaderSource:e=>`
  const channels = ${n}u / 4;
  ${e.declareVariables(a,o,s,c)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(r)}
    let value = ${a.getByOffset(`global_idx`)}
      + ${o.getByOffset(`global_idx % channels`)} + ${s.getByOffset(`global_idx`)};
    ${c.setByOffset(`global_idx`,`value`)}
  }`}},$r=e=>{Zr(e.inputs),e.compute(Qr(e.inputs))}}),ti,$,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi,yi,bi,xi,Si,Ci,wi,Ti,Ei,Di,Oi,ki,Ai,ji,Mi,Ni,Pi,Fi,Ii,Li,Ri,zi,Bi,Vi,Hi,Ui,Wi,Gi,Ki=a(()=>{"use strict";R(),V(),U(),Y(),ti=(e,t,n,r,i,a,o)=>{let s=Math.ceil(t/4),c=``;c=typeof i==`string`?`${i}(a)`:i(`a`);let l=q(`inputData`,n,[s],4),u=J(`outputData`,r,[s],4),d=[{name:`vec_size`,type:`u32`}];return o&&d.push(...o),`
      ${e.registerUniforms(d).declareVariables(l,u)}

  ${a??``}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}

    let a = ${l.getByOffset(`global_idx`)};
    ${u.setByOffset(`global_idx`,c)}
  }`},$=(e,t,n,r,i,a=e.dataType,o,s)=>{let c=[{type:12,data:Math.ceil(B.size(e.dims)/4)}];return o&&c.push(...o),{name:t,shaderCache:{hint:i,inputDependencies:[`type`]},getShaderSource:t=>ti(t,B.size(e.dims),e.dataType,a,n,r,s),getRunData:t=>({outputs:[{dims:e.dims,dataType:a}],dispatchGroup:{x:Math.ceil(B.size(t[0].dims)/64/4)},programUniforms:c})}},ni=e=>{e.compute($(e.inputs[0],`Abs`,`abs`))},ri=e=>{e.compute($(e.inputs[0],`Acos`,`acos`))},ii=e=>{e.compute($(e.inputs[0],`Acosh`,`acosh`))},ai=e=>{e.compute($(e.inputs[0],`Asin`,`asin`))},oi=e=>{e.compute($(e.inputs[0],`Asinh`,`asinh`))},si=e=>{e.compute($(e.inputs[0],`Atan`,`atan`))},ci=e=>{e.compute($(e.inputs[0],`Atanh`,`atanh`))},li=e=>H(e),ui=(e,t)=>{let n;switch(t.to){case 10:n=`vec4<f16>`;break;case 1:n=`vec4<f32>`;break;case 12:n=`vec4<u32>`;break;case 6:n=`vec4<i32>`;break;case 9:n=`vec4<bool>`;break;default:throw RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute($(e.inputs[0],`Cast`,n,void 0,t.cacheKey,t.to))},di=e=>{let t,n,r=e.length>=2&&e[1].data!==0,i=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=r?e[1].getFloat32Array()[0]:-34028234663852886e22,n=i?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=r?e[1].getUint16Array()[0]:64511,n=i?e[2].getUint16Array()[0]:31743;break;default:throw Error(`Unsupport data type`)}return H({min:t,max:n})},fi=(e,t)=>{let n=t||di(e.inputs),r=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`Clip`,e=>`clamp(${e}, vec4<${r}>(uniforms.min), vec4<${r}>(uniforms.max))`,void 0,n.cacheKey,void 0,[{type:e.inputs[0].dataType,data:n.min},{type:e.inputs[0].dataType,data:n.max}],[{name:`min`,type:r},{name:`max`,type:r}]),{inputs:[0]})},pi=e=>{e.compute($(e.inputs[0],`Ceil`,`ceil`))},mi=e=>{e.compute($(e.inputs[0],`Cos`,`cos`))},hi=e=>{e.compute($(e.inputs[0],`Cosh`,`cosh`))},gi=e=>H(e),_i=(e,t)=>{let n=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`Elu`,e=>`elu_vf32(${e})`,`
  const elu_alpha_ = ${n}(${t.alpha});

  fn elu_f32(a: ${n}) -> ${n} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${n}>) -> vec4<${n}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},vi=(e=`f32`)=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,yi=e=>{let t=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`Erf`,e=>`erf_vf32(${e})`,vi(t)))},bi=e=>{e.compute($(e.inputs[0],`Exp`,`exp`))},xi=e=>{e.compute($(e.inputs[0],`Floor`,`floor`))},Si=e=>{let t=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`Gelu`,e=>`0.5 * ${e} * (1.0 + erf_vf32(${e} * 0.7071067811865475))`,vi(t)))},Ci=(e,t)=>{let n=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`LeakyRelu`,e=>`select(leaky_relu_alpha_ * ${e}, ${e}, ${e} >= vec4<${n}>(0.0))`,`const leaky_relu_alpha_ = ${n}(${t.alpha});`,t.cacheKey))},wi=e=>{e.compute($(e.inputs[0],`Not`,e=>`!${e}`))},Ti=e=>{e.compute($(e.inputs[0],`Neg`,e=>`-${e}`))},Ei=e=>{e.compute($(e.inputs[0],`Reciprocal`,e=>`1.0/${e}`))},Di=e=>{let t=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`Relu`,e=>`select(vec4<${t}>(0.0), ${e}, ${e} > vec4<${t}>(0.0))`))},Oi=e=>{e.compute($(e.inputs[0],`Sigmoid`,e=>`(1.0 / (1.0 + exp(-${e})))`))},ki=e=>H(e),Ai=(e,t)=>{let n=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`HardSigmoid`,e=>`max(vec4<${n}>(0.0), min(vec4<${n}>(1.0), ${t.alpha} * ${e} + vec4<${n}>(${t.beta})))`,void 0,t.cacheKey))},ji=e=>{let t=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`HardSwish`,e=>`${e} * max(vec4<${t}>(0.0), min(vec4<${t}>(1.0), vec4<${t}>(${t}(1.0 / 6.0)) * ${e} + vec4<${t}>(0.5)))`))},Mi=e=>{e.compute($(e.inputs[0],`Sin`,`sin`))},Ni=e=>{e.compute($(e.inputs[0],`Sinh`,`sinh`))},Pi=e=>{e.compute($(e.inputs[0],`Sqrt`,`sqrt`))},Fi=e=>{e.compute($(e.inputs[0],`Tan`,`tan`))},Ii=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Li=e=>{e.compute($(e.inputs[0],`Tanh`,Ii))},Ri=(e=`f32`)=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${Ii(`v`)};
}
`,zi=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Bi=e=>{let t=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`FastGelu`,zi,Ri(t),void 0,e.inputs[0].dataType))},Vi=(e,t)=>{let n=xn(e.inputs[0].dataType);return e.compute($(e.inputs[0],`ThresholdedRelu`,e=>`select(vec4<${n}>(0.0), ${e}, ${e} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${n}>(${t.alpha});`,t.cacheKey)),0},Hi=e=>{e.compute($(e.inputs[0],`Log`,`log`))},Ui=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,Wi=e=>`quick_gelu_impl(${e})`,Gi=(e,t)=>{let n=xn(e.inputs[0].dataType);e.compute($(e.inputs[0],`QuickGelu`,Wi,Ui(n,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),qi,Ji,Yi,Xi=a(()=>{"use strict";V(),Y(),Ki(),qi=e=>{if(e[0].dims.length!==3)throw Error(`input should have 3 dimensions`);if(![2560,5120,10240].includes(e[0].dims[2]))throw Error(`hidden state should be 2560, 5120 or 10240`);if(e[1].dims.length!==1)throw Error(`bias is expected to have 1 dimensions`);if(e[0].dims[2]!==e[1].dims[0])throw Error(`last dimension of input and bias are not the same`)},Ji=e=>{let t=e[0].dims.slice();t[2]/=2;let n=q(`input`,e[0].dataType,e[0].dims,4),r=q(`bias`,e[0].dataType,[e[0].dims[2]],4),i=J(`output`,e[0].dataType,t,4),a=B.size(t)/4,o=bn(e[0].dataType);return{name:`BiasSplitGelu`,getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)}}),getShaderSource:t=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${t.declareVariables(n,r,i)}

  ${vi(o)}

  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes(a)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${i.setByOffset(`global_idx`,`valueLeft * geluRight`)}
  }`}},Yi=e=>{qi(e.inputs),e.compute(Ji(e.inputs))}}),Zi,Qi,$i,ea,ta,na,ra,ia,aa,oa,sa,ca,la,ua=a(()=>{"use strict";R(),V(),Y(),Zi=(e,t,n,r,i,a,o,s,c,l,u,d)=>{let f,p;typeof s==`string`?f=p=(e,t)=>`${s}((${e}),(${t}))`:typeof s==`function`?f=p=s:(f=s.scalar,p=s.vector);let m=J(`outputData`,u,r.length,4),h=q(`aData`,c,t.length,4),g=q(`bData`,l,n.length,4),_;if(i){if(a){let e=B.size(t)===1,r=B.size(n)===1,i=t.length>0&&t[t.length-1]%4==0,a=n.length>0&&n[n.length-1]%4==0;_=e||r?m.setByOffset(`global_idx`,p(e?`${h.type.value}(${h.getByOffset(`0`)}.x)`:h.getByOffset(`global_idx`),r?`${g.type.value}(${g.getByOffset(`0`)}.x)`:g.getByOffset(`global_idx`))):`
            let outputIndices = ${m.offsetToIndices(`global_idx * 4u`)};
            let offsetA = ${h.broadcastedIndicesToOffset(`outputIndices`,m)};
            let offsetB = ${g.broadcastedIndicesToOffset(`outputIndices`,m)};
            ${m.setByOffset(`global_idx`,p(o||i?h.getByOffset(`offsetA / 4u`):`${h.type.value}(${h.getByOffset(`offsetA / 4u`)}[offsetA % 4u])`,o||a?g.getByOffset(`offsetB / 4u`):`${g.type.value}(${g.getByOffset(`offsetB / 4u`)}[offsetB % 4u])`))}
          `}else _=m.setByOffset(`global_idx`,p(h.getByOffset(`global_idx`),g.getByOffset(`global_idx`)))}else{if(!a)throw Error(`no necessary to use scalar implementation for element-wise binary op implementation.`);let e=(e,t,n=``)=>{let r=`aData[indexA${t}][componentA${t}]`,i=`bData[indexB${t}][componentB${t}]`;return`
            let outputIndices${t} = ${m.offsetToIndices(`global_idx * 4u + ${t}u`)};
            let offsetA${t} = ${h.broadcastedIndicesToOffset(`outputIndices${t}`,m)};
            let offsetB${t} = ${g.broadcastedIndicesToOffset(`outputIndices${t}`,m)};
            let indexA${t} = offsetA${t} / 4u;
            let indexB${t} = offsetB${t} / 4u;
            let componentA${t} = offsetA${t} % 4u;
            let componentB${t} = offsetB${t} % 4u;
            ${e}[${t}] = ${n}(${f(r,i)});
          `};_=u===9?`
            var data = vec4<u32>(0);
            ${e(`data`,0,`u32`)}
            ${e(`data`,1,`u32`)}
            ${e(`data`,2,`u32`)}
            ${e(`data`,3,`u32`)}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:`
            ${e(`outputData[global_idx]`,0)}
            ${e(`outputData[global_idx]`,1)}
            ${e(`outputData[global_idx]`,2)}
            ${e(`outputData[global_idx]`,3)}
          `}return`
        ${e.registerUniform(`vec_size`,`u32`).declareVariables(h,g,m)}

        ${d??``}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}
        ${_}
      }`},Qi=(e,t,n,r,i,a,o=n.dataType)=>{let s=n.dims.map(Number),c=r.dims.map(Number),l=!B.areEqual(s,c),u=s,d=B.size(s),f=!1,p=!1,m=[l];if(l){let e=It.calcShape(s,c,!1);if(!e)throw Error(`Can't perform binary op on the given tensors`);u=e.slice(),d=B.size(u);let t=B.size(s)===1,n=B.size(c)===1,r=s.length>0&&s[s.length-1]%4==0,i=c.length>0&&c[c.length-1]%4==0;m.push(t),m.push(n),m.push(r),m.push(i);let a=1;for(let e=1;e<u.length;e++){let t=s[s.length-e];if(t===c[c.length-e])a*=t;else break}a%4==0?(p=!0,f=!0):(t||n||r||i)&&(f=!0)}else f=!0;return m.push(f),{name:e,shaderCache:{hint:t+m.map(e=>e.toString()).join(`_`),inputDependencies:[`rank`,`rank`]},getShaderSource:e=>Zi(e,s,c,u,f,l,p,i,n.dataType,r.dataType,o,a),getRunData:()=>({outputs:[{dims:u,dataType:o}],dispatchGroup:{x:Math.ceil(d/64/4)},programUniforms:[{type:12,data:Math.ceil(B.size(u)/4)},...W(s,c,u)]})}},$i=(e,t,n,r,i,a)=>{e.compute(Qi(t,i??``,e.inputs[0],e.inputs[1],n,r,a))},ea=e=>{$i(e,`Add`,(e,t)=>`${e}+${t}`)},ta=e=>{$i(e,`Div`,(e,t)=>`${e}/${t}`)},na=e=>{$i(e,`Equal`,{scalar:(e,t)=>`u32(${e}==${t})`,vector:(e,t)=>`vec4<u32>(${e}==${t})`},void 0,void 0,9)},ra=e=>{$i(e,`Mul`,(e,t)=>`${e}*${t}`)},ia=e=>{let t=q(`input`,e.inputs[0].dataType,e.inputs[0].dims).type.value;$i(e,`Pow`,{scalar:(e,t)=>`pow_custom(${e},${t})`,vector:(e,t)=>`pow_vector_custom(${e},${t})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t===`i32`?`round`:``}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},aa=e=>{$i(e,`Sub`,(e,t)=>`${e}-${t}`)},oa=e=>{$i(e,`Greater`,{scalar:(e,t)=>`u32(${e}>${t})`,vector:(e,t)=>`vec4<u32>(${e}>${t})`},void 0,void 0,9)},sa=e=>{$i(e,`Less`,{scalar:(e,t)=>`u32(${e}<${t})`,vector:(e,t)=>`vec4<u32>(${e}<${t})`},void 0,void 0,9)},ca=e=>{$i(e,`GreaterOrEqual`,{scalar:(e,t)=>`u32(${e}>=${t})`,vector:(e,t)=>`vec4<u32>(${e}>=${t})`},void 0,void 0,9)},la=e=>{$i(e,`LessOrEqual`,{scalar:(e,t)=>`u32(${e}<=${t})`,vector:(e,t)=>`vec4<u32>(${e}<=${t})`},void 0,void 0,9)}}),da,fa,pa,ma,ha,ga,_a=a(()=>{"use strict";R(),V(),U(),Y(),da=(e,t)=>{if(!e||e.length<1)throw Error(`too few inputs`);let n=e[0],r=n.dataType,i=n.dims.length;e.forEach((e,a)=>{if(a!==0){if(e.dataType!==r)throw Error(`input tensors should be one type`);if(e.dims.length!==i)throw Error(`input tensors should have the same shape`);e.dims.forEach((e,r)=>{if(r!==t&&e!==n.dims[r])throw Error(`non concat dimensions must match`)})}})},fa=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,pa=(e,t)=>{let n=e.length,r=[];for(let i=0;i<n;++i){let a=t.setByOffset(`global_idx`,e[i].getByIndices(`indices`));n===1?r.push(a):i===0?r.push(`if (inputIndex == ${i}u) { ${a} }`):i===n-1?r.push(`else { ${a} }`):r.push(`else if (inputIndex == ${i}) { ${a} }`)}return r.join(`
`)},ma=(e,t,n,r)=>{let i=B.size(n),a=Array(e.length),o=Array(e.length),s=0,c=[],l=[],u=[{type:12,data:i}];for(let n=0;n<e.length;++n)s+=e[n].dims[t],a[n]=s,l.push(e[n].dims.length),o[n]=q(`input${n}`,r,l[n]),c.push(`rank`),u.push({type:12,data:a[n]});for(let t=0;t<e.length;++t)u.push(...W(e[t].dims));u.push(...W(n));let d=J(`output`,r,n.length),f=d.indicesGet(`indices`,t),p=Array.from(Array(a.length).keys()).map(e=>`uniforms.sizeInConcatAxis${e}`).join(`,`);return{name:`Concat`,shaderCache:{hint:`${t}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:n,dataType:r}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:u}),getShaderSource:t=>`

  ${(()=>{t.registerUniform(`outputSize`,`u32`);for(let n=0;n<e.length;n++)t.registerUniform(`sizeInConcatAxis${n}`,`u32`);return t.declareVariables(...o,d)})()}

  ${fa(a.length,p)}

  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}

    var indices = ${d.offsetToIndices(`global_idx`)};

    let inputIndex = calculateInputIndex(${f});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${a.length}u>(${p});
      ${f} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${pa(o,d)}
  }`}},ha=(e,t)=>{let n=e.inputs,r=n[0].dims,i=B.normalizeAxis(t.axis,r.length);da(n,i);let a=r.slice();a[i]=n.reduce((e,t)=>e+(t.dims.length>i?t.dims[i]:0),0);let o=n.filter(e=>B.size(e.dims)>0);e.compute(ma(o,i,a,n[0].dataType),{inputs:o})},ga=e=>H({axis:e.axis})}),va,ya,ba,xa,Sa=a(()=>{"use strict";R(),V(),va=(e,t,n=`f32`)=>{switch(e.activation){case`Relu`:return`value = max(value, ${t}(0.0));`;case`Sigmoid`:return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case`Clip`:return`value = clamp(value, ${t}(${n}(uniforms.clip_min)), ${t}(${n}(uniforms.clip_max)));`;case`HardSigmoid`:return`value = max(${t}(0.0), min(${t}(1.0), ${n}(uniforms.alpha) * value + ${n}(uniforms.beta)));`;case`LeakyRelu`:return`value = select(${n}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case`Tanh`:return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case``:return``;default:throw Error(`Unsupported activation ${e.activation}`)}},ya=(e,t)=>{e.activation===`Clip`?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation===`HardSigmoid`?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation===`LeakyRelu`&&t.push({type:1,data:e.alpha})},ba=(e,t)=>{e.activation===`Clip`?t.push({name:`clip_max`,type:`f32`},{name:`clip_min`,type:`f32`}):e.activation===`HardSigmoid`?t.push({name:`alpha`,type:`f32`},{name:`beta`,type:`f32`}):e.activation===`LeakyRelu`&&t.push({name:`alpha`,type:`f32`})},xa=e=>{let t=e?.activation||``;if(t===`HardSigmoid`){let[n,r]=e?.activation_params||[.2,.5];return{activation:t,alpha:n,beta:r}}if(t===`Clip`){let[n,r]=e?.activation_params||[zt,Bt];return{activation:t,clipMax:r,clipMin:n}}if(t===`LeakyRelu`){let[n]=e?.activation_params||[.01];return{activation:t,alpha:n}}return{activation:t}}}),Ca,wa,Ta=a(()=>{"use strict";Ca=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw Error(`${e}-component is not supported.`)}},wa=e=>`
      ${e?`value = value + getBiasByOutputCoords(coords);`:``}
      `}),Ea,Da=a(()=>{"use strict";Ea=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),Oa,ka,Aa=a(()=>{"use strict";R(),V(),Y(),Sa(),Oa=(e,t,n,r,i)=>{let a=r-n;return`
      ${Array.from({length:n}).map((n,o)=>`
      if (${K(t.shape,o,t.rank)} != 1) {
        ${t.indicesSet(e,o,K(i,o+a,r))}
      } else {
        ${t.indicesSet(e,o,0)}
      }`).join(``)}
`},ka=(e,t,n,r,i=!1,a)=>{let o=e[0].dims,s=e[1].dims,c=o[o.length-2],l=s[s.length-1],u=o[o.length-1],d=G(l),f=G(u),p=G(c),m=B.size(n)/d/p,h=e.length>2,g=r?r.slice(0,-2):n.slice(0,-2),_=[B.size(g),c,l],v=[{type:12,data:m},{type:12,data:c},{type:12,data:l},{type:12,data:u}];return ya(t,v),v.push(...W(g,o,s)),h&&v.push(...W(e[2].dims)),v.push(...W(_)),{name:`MatMulNaive`,shaderCache:{hint:`${t.activation};${d};${f};${p};${i}`,inputDependencies:h?[`rank`,`rank`,`rank`]:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:a?a(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:v}),getShaderSource:r=>{let a=Dn(`batch_dims`,e[0].dataType,g.length),c=q(`a`,e[0].dataType,o.length,f),l=q(`b`,e[1].dataType,s.length,d),u=J(`output`,e[0].dataType,_.length,d),m=bn(u.type.tensor),v=va(t,u.type.value,m),y=[c,l],b=``;if(h){let t=i?d:1;y.push(q(`bias`,e[2].dataType,e[2].dims.length,t)),b=`${i?`value += bias[col / ${t}];`:`value += ${u.type.value}(bias[row + i]);`}`}let x=[{name:`output_size`,type:`u32`},{name:`M`,type:`u32`},{name:`N`,type:`u32`},{name:`K`,type:`u32`}];ba(t,x);let S=()=>{let e=`var a_data: ${c.type.value};`;for(let t=0;t<f;t++)e+=`
              let b_data${t} = b[(b_offset + (k + ${t}) * uniforms.N + col) / ${d}];`;for(let t=0;t<p;t++){e+=`a_data = a[(a_offset + (row + ${t}) * uniforms.K + k) / ${f}];`;for(let n=0;n<f;n++)e+=`
            values[${t}] = fma(${l.type.value}(a_data${f===1?``:`[${n}]`}), b_data${n}, values[${t}]);
`}return e};return`
  ${r.registerUniforms(x).registerInternalVariables(a).declareVariables(...y,u)}
  ${r.mainStart()}
    ${r.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let col = (global_idx % (uniforms.N / ${d})) * ${d};
    var index1 = global_idx / (uniforms.N / ${d});
    let stride1 = uniforms.M / ${p};
    let row = (index1 % stride1) * ${p};
    let batch = index1 / stride1;

    ${n.length===2?``:`let batch_indices = ${a.offsetToIndices(`batch`)};`}

    var a_indices: ${c.type.indices};
    ${Oa(`a_indices`,c,c.rank-2,a.rank,`batch_indices`)}
    ${c.indicesSet(`a_indices`,c.rank-2,0)}
    ${c.indicesSet(`a_indices`,c.rank-1,0)}
    let a_offset = ${c.indicesToOffset(`a_indices`)};

    var b_indices: ${l.type.indices};
    ${Oa(`b_indices`,l,l.rank-2,a.rank,`batch_indices`)}
    ${l.indicesSet(`b_indices`,l.rank-2,0)}
    ${l.indicesSet(`b_indices`,l.rank-1,0)}
    let b_offset = ${l.indicesToOffset(`b_indices`)};
    var values: array<${u.type.value}, ${p}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${f}) {
      ${S()}
    }
    for (var i = 0u; i < ${p}u; i++) {
      var value = values[i];
      ${b}
      ${v}
      let cur_indices = ${u.type.indices}(batch, row + i, col);
      let offset = ${u.indicesToOffset(`cur_indices`)};
      ${u.setByOffset(`offset / ${d}`,`value`)};
    }
  }
  `}}}}),ja,Ma,Na,Pa,Fa,Ia,La,Ra,za=a(()=>{"use strict";R(),V(),Y(),Sa(),Aa(),Ta(),ja=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?`, batchIndices`:``});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?`, batchIndices`:``});
        `,Ma=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?``:`let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];`}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?``:`acc[i] = BCached3 * ACached3[i] + acc[i];`}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?``:`acc[i] = BCached3 * ACached.w + acc[i];`}
        }`,Na=(e,t,n=`f32`,r,i=!1,a=32,o=!1,s=32)=>{let c=t[1]*e[1],l=t[0]*e[0],u=i?c:a,d=i?a:c,f=u/t[0],p=a/t[1];if((!i||f!==4||e[1]!==4)&&(i||f!==3&&f!==4)||u%t[0]!==0||a%t[1]!==0||e[0]!==4)throw Error(`If transposeA ${i} is true, innerElementSize ${f} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${f} must be 3 or 4.
  tileAWidth ${u} must be divisible by workgroupSize[0]${t[0]}. tileInner ${a} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${f}<${n}>, ${u/f}>, ${d}>;
var<workgroup> mm_Bsub: array<array<vec4<${n}>, ${l/e[0]}>, ${a}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${f};
const tileInner = ${a};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${o?`0`:`i32(globalId.z)`};
  ${r?`let batchIndices = ${r.offsetToIndices(`u32(batch)`)};`:``}
  let globalRowStart = i32(workgroupId.y) * ${c};

  let num_tiles = ${o?`${Math.ceil(s/a)}`:`(uniforms.dim_inner - 1) / tileInner + 1`};
  var kStart = ${o?`i32(globalId.z) * ${s}`:`0`};

  var acc: array<vec4<${n}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${p};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${ja(i,r)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${p}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${r?`, batchIndices`:``});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${f===3?``:`let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];`}

          ${Ma(i,f)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Pa=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?`, batchIndices`:``});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?`, batchIndices`:``});
            `,Fa=e=>e?`let ACached = mm_Asub[k][tileRow + innerRow];`:`let ACached = mm_Asub[tileRow + innerRow][k];`,Ia=(e,t,n=`f32`,r,i=!1,a=32,o=!1,s=32,c=!1)=>{let l=e[1]*t[1],u=e[0]*t[0],d=i?l:a,f=i?a:l;if(f%t[1]!==0||d%t[0]!==0||a%t[1]!==0)throw Error(`tileAHight ${f} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${d} must be divisible by workgroupSize[0]${t[0]}, tileInner ${a} must be divisible by workgroupSize[1]${t[1]}`);let p=f/t[1],m=d/t[0],h=a/t[1],g=c?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${u};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${f}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${d}; inputCol = inputCol + ${t[0]}) {
          ${Pa(i,r)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${a}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${u}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${r?`, batchIndices`:``});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${n}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${i?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${l};

let tileRowA = i32(localId.y) * ${p};
let tileColA = i32(localId.x) * ${m};
let tileRowB = i32(localId.y) * ${h};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${p}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${m}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Pa(i,r)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${h}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${r?`, batchIndices`:``});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${n}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${Fa(i)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${n}, ${d}>, ${f}>;
  var<workgroup> mm_Bsub : array<array<${n}, ${u}>, ${a}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${a};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${o?`0`:`i32(globalId.z)`};
    ${r?`let batchIndices = ${r.offsetToIndices(`u32(batch)`)};`:``}
    let num_tiles = ${o?`${Math.ceil(s/a)}`:`(uniforms.dim_inner - 1) / tileInner + 1`};
    var kStart = ${o?`i32(globalId.z) * ${s}`:`0`};

    var acc : array<array<${n}, colPerThread>, rowPerThread>;
    ${g}
  }
`},La=(e,t,n,r,i=!1)=>{let[a,o,s,c]=r,l=bn(r[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${a.type.indices}) -> ${Ca(e,l)} {
      var value = ${Ca(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${o.type.indices};
        ${Oa(`aIndices`,o,o.rank-2,a.rank,`batchIndices`)}
        ${o.indicesSet(`aIndices`,o.rank-2,`u32(row)`)}
        ${o.indicesSet(`aIndices`,o.rank-1,`u32(colIn)`)}
        value = ${o.getByIndices(`aIndices`)};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${a.type.indices}) -> ${Ca(e,l)} {
      var value = ${Ca(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${s.type.indices};
        ${Oa(`bIndices`,s,s.rank-2,a.rank,`batchIndices`)}
        ${s.indicesSet(`bIndices`,s.rank-2,`u32(row)`)}
        ${s.indicesSet(`bIndices`,s.rank-1,`u32(colIn)`)}
        value = ${s.getByIndices(`bIndices`)};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Ca(e,l)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${i?`bias[colIn]`:`${Ca(e,l)}(bias[row])`};`:``}
        ${n}
        ${c.setByIndices(`vec3<u32>(coords)`,`value`)}
      }
    }
    `},Ra=(e,t,n,r,i=!1,a)=>{let o=e[0].dims,s=e[1].dims,c=o.slice(0,-2),l=s.slice(0,-2),u=r?r.slice(0,-2):n.slice(0,-2),d=B.size(u),f=o[o.length-2],p=o[o.length-1],m=s[s.length-1],h=p%4==0&&m%4==0,g=f<=8?[4,1,1]:[4,4,1],_=[8,8,1],v=[Math.ceil(m/_[0]/g[0]),Math.ceil(f/_[1]/g[1]),Math.ceil(d/_[2]/g[2])],y=h?4:1,b=[...c,f,p/y],x=b.length,S=[...l,p,m/y],C=S.length,w=[d,f,m/y],T=[{type:6,data:f},{type:6,data:m},{type:6,data:p}];ya(t,T),T.push(...W(u,b,S));let E=[`rank`,`rank`],D=e.length>2;return D&&(T.push(...W(e[2].dims)),E.push(`rank`)),T.push(...W(w)),{name:`MatMul`,shaderCache:{hint:`${g};${t.activation};${h};${i}`,inputDependencies:E},getRunData:()=>({outputs:[{dims:a?a(n):n,dataType:e[0].dataType}],dispatchGroup:{x:v[0],y:v[1],z:v[2]},programUniforms:T}),getShaderSource:n=>{let r=u.length,a=Dn(`batchDims`,e[0].dataType,r,1),o=bn(e[0].dataType),s=q(`a`,e[0].dataType,x,y),c=q(`b`,e[1].dataType,C,y),l=J(`result`,e[0].dataType,w.length,y),d=[s,c];if(D){let t=i?y:1;d.push(q(`bias`,e[2].dataType,e[2].dims.length,t))}let f=[{name:`dim_a_outer`,type:`i32`},{name:`dim_b_outer`,type:`i32`},{name:`dim_inner`,type:`i32`}];ba(t,f);let p=bn(l.type.tensor),m=va(t,l.type.value,p),v=La(y,D,m,[a,s,c,l],i);return`
  ${n.registerUniforms(f).registerInternalVariables(a).declareVariables(...d,l)}
  ${v}
  ${h?Na(g,_,o,a):Ia(g,_,o,a)}
                   `}}}}),Ba,Va,Ha=a(()=>{"use strict";R(),Pt(),Y(),Sa(),Ta(),Da(),za(),Ba=(e,t,n,r,i=!1,a,o=4,s=4,c=4,l=`f32`)=>{let u=e=>{switch(e){case 1:return`resData = x[xIndex];`;case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return`resData = x[xIndex / 4];`;default:throw Error(`innerElementSize ${e} is not supported.`)}},d=e=>{switch(e){case 1:return`return w[row * i32(uniforms.w_shape[3]) + colIn];`;case 4:return`return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];`;default:throw Error(`innerElementSize ${e} is not supported.`)}},f=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,p=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,m=e?`i32(uniforms.x_shape[1])`:`i32(uniforms.x_shape[2])`,h=e?`i32(uniforms.x_shape[2])`:`i32(uniforms.x_shape[3])`,g=e?`row`:`col`,_=e?`col`:`row`,v=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?`i32(uniforms.result_shape[2])`:`i32(uniforms.result_shape[3])`};
    let outRow = ${g} / outWidth;
    let outCol = ${g} % outWidth;

    let WRow = ${_} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${_} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${_} % inChannels;
    var resData = ${Ca(o,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${m} && xCol >= 0 && xCol < ${h}) {
      ${f}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${u(o)}
    }
    return resData;`,y=e?t&&r?`
    let col = colIn * ${o};
    ${v}`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${v}
    }
    return ${Ca(o,l)}(0.0);`:r&&n?`
    let col = colIn * ${o};
    ${v}`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${v}
    }
    return ${Ca(o,l)}(0.0);`,b=e?r&&n?d(s):`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${d(s)}
    }
    return ${Ca(s,l)}(0.0);`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${d(s)}
    }
    return ${Ca(s,l)}(0.0);`,x=Ca(c,l),S=Ca(e?o:s,l),C=Ca(e?s:o,l),w=va(a,x,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${S} {
      ${e?y:b}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${C} {
      ${e?b:y}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${x}) {
      let col = colIn * ${c};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?`i32(uniforms.result_shape[2])`:`i32(uniforms.result_shape[3])`};
      ${p}
      ${wa(i)}
      ${w}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},Va=(e,t,n,r,i,a,o,s,c)=>{let l=t.format===`NHWC`,u=l?e[0].dims[3]:e[0].dims[1],d=n[0],f=l?n[2]:n[3],p=l?n[1]:n[2],m=l?n[3]:n[1],h=l&&(u%4==0||u%3==0)&&m%4==0,g=l?m:f*p,_=l?f*p:m,v=[8,8,1],y=r<=8?[4,1,1]:[4,4,1],b=[Math.ceil(g/v[0]/y[0]),Math.ceil(_/v[1]/y[1]),Math.ceil(d/v[2]/y[2])];z(`verbose`,()=>`[conv2d_mm_webgpu] dispatch = ${b}`);let x=h?l&&u%4!=0?3:4:1,S=v[1]*y[1],C=v[0]*y[0],w=Math.max(v[0]*x,v[1]),T=r%S===0,E=i%C===0,D=a%w===0,O=h?[x,4,4]:[1,1,1],k=[{type:6,data:r},{type:6,data:i},{type:6,data:a},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];ya(t,k),k.push(...W(e[0].dims,e[1].dims));let A=[`rank`,`rank`];return o&&(k.push(...W(e[2].dims)),A.push(`rank`)),k.push(...W(n)),{name:`Conv2DMatMul`,shaderCache:{hint:`${t.cacheKey};${x};${h};${T};${E};${D};${S};${C};${w}`,inputDependencies:A},getRunData:()=>({outputs:[{dims:c?c(n):n,dataType:e[0].dataType}],dispatchGroup:{x:b[0],y:b[1],z:b[2]},programUniforms:k}),getShaderSource:r=>{let i=[{name:`dim_a_outer`,type:`i32`},{name:`dim_b_outer`,type:`i32`},{name:`dim_inner`,type:`i32`},{name:`pad`,type:`i32`,length:2},{name:`stride`,type:`i32`,length:2},{name:`dilation`,type:`i32`,length:2}];ba(t,i);let a=h?4:1,c=bn(e[0].dataType),u=`
      fn setOutputAtIndex(flatIndex : i32, value : ${h?`vec4<${c}>`:c}) {
        result[flatIndex] = ${h?`vec4<${c}>`:c}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${h?`vec4<${c}>`:c}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${h?`/ 4`:``}, value);
      }`,d=[q(`x`,e[0].dataType,e[0].dims.length,x===3?1:x),q(`w`,e[1].dataType,e[1].dims.length,a)],f=J(`result`,e[0].dataType,n.length,a);if(o){let t=q(`bias`,e[2].dataType,e[2].dims.length,a);d.push(t),u+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${h?`vec4<${c}>`:c} {
          return bias[coords.${l?`w`:`y`}${h?`/ 4`:``}];
        }`}return`
        ${Ea(`uniforms.result_strides`)}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${r.registerUniforms(i).declareVariables(...d,f)}
        ${u}
        ${Ba(l,T,E,D,o,t,O[0],O[1],O[2],c)}
        ${h?Na(y,v,c,void 0,!l,w):Ia(y,v,c,void 0,!l,w,!1,void 0,s)}`}}}}),Ua,Wa,Ga,Ka,qa,Ja,Ya,Xa,Za=a(()=>{"use strict";R(),Pt(),V(),Y(),Sa(),Ta(),Ua=e=>{let t=1;for(let n=0;n<e.length;n++)t*=e[n];return t},Wa=e=>typeof e==`number`?[e,e,e]:e,Ga=(e,t)=>t<=1?e:e+(e-1)*(t-1),Ka=(e,t,n,r=1)=>{let i=Ga(t,r);return Math.floor((e[0]*(n-1)-n+i)/2)},qa=(e,t,n,r,i)=>{i??=Ka(e,t[0],r[0]);let a=[0,0,0,n];for(let n=0;n<3;n++)e[n]+2*i>=t[n]&&(a[n]=Math.trunc((e[n]-t[n]+2*i)/r[n]+1));return a},Ja=(e,t,n,r,i,a,o,s,c,l)=>{let u,d,f,p;if(e===`VALID`&&(e=0),typeof e==`number`){u={top:e,bottom:e,left:e,right:e,front:e,back:e};let m=qa([t,n,r,1],[s,c,l],1,[i,a,o],e);d=m[0],f=m[1],p=m[2]}else if(Array.isArray(e)){if(!e.every((e,t,n)=>e===n[0]))throw Error(`Unsupported padding parameter: ${e}`);u={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let m=qa([t,n,r,1],[s,c,l],1,[i,a,o],e[0]);d=m[0],f=m[1],p=m[2]}else if(e===`SAME_UPPER`){d=Math.ceil(t/i),f=Math.ceil(n/a),p=Math.ceil(r/o);let e=(d-1)*i+s-t,m=(f-1)*a+c-n,h=(p-1)*o+l-r,g=Math.floor(e/2),_=e-g,v=Math.floor(m/2),y=m-v,b=Math.floor(h/2);u={top:v,bottom:y,left:b,right:h-b,front:g,back:_}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:u,outDepth:d,outHeight:f,outWidth:p}},Ya=(e,t,n,r,i,a=!1,o=`channelsLast`)=>{let s,c,l,u,d;if(o===`channelsLast`)[s,c,l,u,d]=e;else if(o===`channelsFirst`)[s,d,c,l,u]=e;else throw Error(`Unknown dataFormat ${o}`);let[f,,p,m,h]=t,[g,_,v]=Wa(n),[y,b,x]=Wa(r),S=Ga(p,y),C=Ga(m,b),w=Ga(h,x),{padInfo:T,outDepth:E,outHeight:D,outWidth:O}=Ja(i,c,l,u,g,_,v,S,C,w),k=a?f*d:f,A=[0,0,0,0,0];return o===`channelsFirst`?A=[s,k,E,D,O]:o===`channelsLast`&&(A=[s,E,D,O,k]),{batchSize:s,dataFormat:o,inDepth:c,inHeight:l,inWidth:u,inChannels:d,outDepth:E,outHeight:D,outWidth:O,outChannels:k,padInfo:T,strideDepth:g,strideHeight:_,strideWidth:v,filterDepth:p,filterHeight:m,filterWidth:h,effectiveFilterDepth:S,effectiveFilterHeight:C,effectiveFilterWidth:w,dilationDepth:y,dilationHeight:b,dilationWidth:x,inShape:e,outShape:A,filterShape:t}},Xa=(e,t,n,r,i,a)=>{let o=a===`channelsLast`;o?e[0].dims[3]:e[0].dims[1];let s=[64,1,1],c={x:n.map((e,t)=>t)},l=[Math.ceil(Ua(c.x.map(e=>n[e]))/s[0]),1,1];z(`verbose`,()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let u=[{type:12,data:B.size(n)},{type:12,data:r},{type:12,data:i},{type:12,data:t.strides},{type:12,data:t.dilations}];ya(t,u),u.push(...W(e[0].dims,e[1].dims));let d=[`rank`,`rank`],f=e.length===3;return f&&(u.push(...W(e[2].dims)),d.push(`rank`)),u.push(...W(n)),{name:`Conv3DNaive`,shaderCache:{hint:`${t.cacheKey};${o};1;${f}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:u}),getShaderSource:a=>{let s=[{name:`output_size`,type:`u32`},{name:`filter_dims`,type:`u32`,length:r.length},{name:`pads`,type:`u32`,length:i.length},{name:`strides`,type:`u32`,length:t.strides.length},{name:`dilations`,type:`u32`,length:t.dilations.length}];ba(t,s);let c=bn(e[0].dataType),l=q(`x`,e[0].dataType,e[0].dims.length,1),u=q(`W`,e[1].dataType,e[1].dims.length,1),d=[l,u],p=J(`result`,e[0].dataType,n.length,1),m=``;if(f){let t=q(`bias`,e[2].dataType,e[2].dims.length,1);d.push(t),m+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${c} {
          return bias[${o?K(`coords`,4,5):K(`coords`,1,5)}];
        }`}let h=Ca(1,c),g=va(t,h,c);return`
            ${m}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${c} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${l.getByIndices(`aIndices`)};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${c} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${u.getByIndices(`aIndices`)};
            }
          ${a.registerUniforms(s).declareVariables(...d,p)}
          ${a.mainStart()}
          ${a.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
              let coords = ${p.offsetToIndices(`global_idx`)};
              let batch = ${K(`coords`,0,l.rank)};
              let d2 = ${o?K(`coords`,l.rank-1,l.rank):K(`coords`,1,l.rank)};
              let xFRCCorner = vec3<u32>(${o?K(`coords`,1,l.rank):K(`coords`,2,l.rank)},
              ${o?K(`coords`,2,l.rank):K(`coords`,3,l.rank)},
              ${o?K(`coords`,3,l.rank):K(`coords`,4,l.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${o?K(`uniforms.x_shape`,1,l.rank):K(`uniforms.x_shape`,2,l.rank)};
              let xShapeZ = ${o?K(`uniforms.x_shape`,2,l.rank):K(`uniforms.x_shape`,3,l.rank)};
              let xShapeW = ${o?K(`uniforms.x_shape`,3,l.rank):K(`uniforms.x_shape`,4,l.rank)};
              let xShapeU = ${o?K(`uniforms.x_shape`,4,l.rank):K(`uniforms.x_shape`,1,l.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = ${c}(0);
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${o?`let xValues = vec4<${c}>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<${c}>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<${c}>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${o?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${o?`let xValues = vec2<${c}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<${c}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<${c}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${o?`let xValues = vec3<${c}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<${c}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<${c}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${f?`value = value + getBiasByOutputCoords(coords)`:``};
              ${g}
              result[global_idx] = ${c}(value);
          }`}}}}),Qa,$a,eo=a(()=>{"use strict";R(),V(),Y(),Sa(),Qa=(e,t,n,r)=>{let i=e.length>2,a=i?`value += b[output_channel];`:``,o=e[0].dims,s=e[1].dims,c=t.format===`NHWC`,l=c?n[3]:n[1],u=l/t.group,d=c&&u>=4?G(l):1,f=B.size(n)/d,p=[{type:12,data:f},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:u}];ya(t,p),p.push(...W(o,[s[0],s[1],s[2],s[3]/d]));let m=i?[`rank`,`rank`,`rank`]:[`rank`,`rank`];return p.push(...W([n[0],n[1],n[2],n[3]/d])),{name:`GroupedConv`,shaderCache:{hint:`${t.cacheKey}_${d}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:r?r(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:p}),getShaderSource:r=>{let l=J(`output`,e[0].dataType,n.length,d),u=bn(l.type.tensor),f=va(t,l.type.value,u),p=q(`x`,e[0].dataType,o.length),m=q(`w`,e[1].dataType,s.length,d),h=[p,m];i&&h.push(q(`b`,e[2].dataType,e[2].dims,d));let g=[{name:`output_size`,type:`u32`},{name:`dilations`,type:`u32`,length:t.dilations.length},{name:`strides`,type:`u32`,length:2},{name:`pads`,type:`u32`,length:2},{name:`output_channels_per_group`,type:`u32`}];ba(t,g);let _=c?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${p.get(`batch`,`xHeight`,`xWidth`,`input_channel`)};
            let wVal = ${m.get(`wHeight`,`wWidth`,`wInChannel`,`output_channel`)};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${p.get(`batch`,`input_channel`,`xHeight`,`xWidth`)};
            let wVal = ${m.get(`output_channel`,`wInChannel`,`wHeight`,`wWidth`)};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${r.registerUniforms(g).declareVariables(...h,l)}

  ${r.mainStart()}
    ${r.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

    let outputIndices = ${l.offsetToIndices(`global_idx`)};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${c?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${c?1:2}], outputIndices[${c?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${d} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${c?2:1}];

    var value: ${l.type.value} = ${l.type.value}(0);
    ${_}
    ${a}
    ${f}
    ${l.setByOffset(`global_idx`,`value`)}
  }`}}},$a=(e,t,n,r)=>{let i=e.length>2,a=G(n[3]),o=G(n[2]),s=B.size(n)/a/o,c=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/a],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/a],u=[n[0],n[1],n[2],n[3]/a],d=[{type:12,data:s},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];ya(t,d),d.push(...W(c,l,u));let f=(o-1)*t.strides[1]+l[1];return{name:`GroupedConv-Vectorize`,shaderCache:{hint:`${t.cacheKey};${a};${o};${f};${l[0]};${l[1]}`,inputDependencies:i?[`rank`,`rank`,`type`]:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:r?r(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}),getShaderSource:n=>{let r=J(`output`,e[0].dataType,u.length,a),s=bn(r.type.tensor),d=va(t,r.type.value,s),p=q(`x`,e[0].dataType,c.length,a),m=q(`w`,e[1].dataType,l.length,a),h=[p,m];i&&h.push(q(`b`,e[2].dataType,e[2].dims,a));let g=i?`value += b[output_channel];`:``,_=[{name:`output_size`,type:`u32`},{name:`strides`,type:`i32`,length:2},{name:`pads`,type:`i32`,length:2}];return ba(t,_),`
  ${n.registerUniforms(_).declareVariables(...h,r)}
  ${n.mainStart()}
    ${n.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${o}u;
    let col = (index1 % width1) * ${o}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${p.type.value}, ${f}>;
    var values: array<${r.type.value}, ${o}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${l[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${f}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${p.get(`batch`,`u32(x_height)`,`u32(x_width)`,`input_channel`)};
          } else {
            x_vals[i] = ${p.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${l[1]}; w_width++) {
          let w_val = ${m.get(`w_height`,`w_width`,`0`,`output_channel`)};
          for (var i = 0u; i < ${o}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${o}u; i++) {
      var value = values[i];
      ${g}
      ${d}
      ${r.set(`batch`,`row`,`col + i`,`output_channel`,`value`)};
    }
  }`}}}}),to,no,ro,io,ao,oo,so,co,lo,uo=a(()=>{"use strict";V(),Ha(),Za(),za(),eo(),Sa(),Aa(),zn(),to=(e,t,n,r,i,a)=>{let o=e[0],s=e.slice(a?1:2,a?3:4),c=s.length,l=t[0],u=t.slice(2).map((e,t)=>e+(e-1)*(n[t]-1)),d=s.map((e,t)=>e+r[t]+r[t+c]).map((e,t)=>Math.floor((e-u[t]+i[t])/i[t]));return d.splice(0,0,o),d.splice(a?3:1,0,l),d},no=[2,3,1,0],ro=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw Error(`Conv requires 2 or 3 inputs`);if(e[0].dims.length>5)throw Error(`greater than 5D is not supported`);if(e[0].dims.length!==e[1].dims.length)throw Error(`filter does not have same dimension as input`);if(e[0].dims[t.format===`NHWC`?e[0].dims.length-1:1]!==e[1].dims[1]*t.group)throw Error(`FILTER_IN_CHANNEL should be equal to DATA_CHANNEL`);if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw Error(`invalid bias`);let n=e[0].dims.length-2;if(t.dilations.length!==n)throw Error(`dilations should be ${n}D`);if(t.strides.length!==n)throw Error(`strides should be ${n}D`);if(t.pads.length!==n*2)throw Error(`pads should be ${n*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw Error(`invalid kernel shape`)},io=(e,t)=>{let n=e.kernelShape.slice();n.length<t[1].dims.length-2&&n.push(...Array(t[1].dims.length-2-n.length).fill(0));for(let e=2;e<t[1].dims.length;++e)n[e-2]===0&&(n[e-2]=t[1].dims[e]);let r=e.pads.slice();Lt.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,n,r,e.format===`NHWC`,e.autoPad);let i=Object.assign({},e);return Object.assign(i,{kernelShape:n,pads:r}),i},ao=e=>{let t=xa(e),n=e.format;return{autoPad:[`NOTSET`,`VALID`,`SAME_UPPER`,`SAME_LOWER`][e.auto_pad],format:n,dilations:e.dilations,group:e.group,kernelShape:e.kernel_shape,pads:e.pads,strides:e.strides,wIsConst:e.w_is_const(),...t,cacheKey:`${e.format};${t.activation};`}},oo=(e,t,n,r)=>{let i=n.format===`NHWC`,a=to(t[0].dims,t[1].dims,n.dilations,n.pads,n.strides,i);if(n.group!==1){let o=[t[0]];if(i){let r=e.kernelCustomData.wT??e.compute(In(t[1],no),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=r),o.push(r)}else o.push(t[1]);t.length===3&&o.push(t[2]),!e.adapterInfo.isArchitecture(`ampere`)&&i&&t[1].dims[0]===n.group&&t[1].dims[1]===1&&n.dilations[0]===1&&n.dilations[1]===1?e.compute($a(o,n,a,r),{inputs:o}):e.compute(Qa(o,n,a,r),{inputs:o});return}let o=t.length===3,s=t[0].dims[i?1:2],c=t[0].dims[i?2:3],l=t[0].dims[i?3:1],u=t[1].dims[2],d=t[1].dims[3],f=a[i?1:2],p=a[i?2:3],m=a[i?3:1],h=i&&u===s&&d===c&&n.pads[0]===0&&n.pads[1]===0;if(h||u===1&&d===1&&n.dilations[0]===1&&n.dilations[1]===1&&n.strides[0]===1&&n.strides[1]===1&&n.pads[0]===0&&n.pads[1]===0){let u=a[0],d,g,_,v=[];if(i){let r=e.kernelCustomData.wT??e.compute(In(t[1],no),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];if(n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=r),h){let e=s*c*l;d=t[0].reshape([1,u,e]),g=r.reshape([1,e,m]),_=[1,u,m]}else d=t[0].reshape([u,s*c,l]),g=r.reshape([1,l,m]),_=[u,f*p,m];v.push(d),v.push(g)}else d=t[0].reshape([u,l,s*c]),g=t[1].reshape([1,m,l]),_=[u,m,f*p],v.push(g),v.push(d);o&&v.push(t[2]);let y=_[2],b=v[0].dims[v[0].dims.length-1];y<8&&b<8?e.compute(ka(v,n,a,_,i,r),{inputs:v}):e.compute(Ra(v,n,a,_,i,r),{inputs:v});return}let g=e.kernelCustomData.wT??e.compute(In(t[1],no),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=g);let _=[t[0],g];o&&_.push(t[2]);let v=i?f*p:m,y=i?m:f*p,b=u*d*l;e.compute(Va(_,n,a,v,y,b,o,!0,r),{inputs:_})},so=(e,t)=>{let n=t.format===`NHWC`,r=[e.inputs[0].reshape(n?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let i=[0,t.pads[0],0,t.pads[1]],a=[1].concat(t.strides),o=[1].concat(t.dilations),s=[1].concat(t.kernelShape),c=io({...t,pads:i,strides:a,dilations:o,kernelShape:s},r);oo(e,r,c,e=>n?[e[0],e[2],e[3]]:[e[0],e[1],e[3]])},co=(e,t,n)=>{let r=n.format===`NHWC`?`channelsLast`:`channelsFirst`,i=io(n,t),a=n.autoPad===`NOTSET`?n.pads:n.autoPad,o=Ya(t[0].dims,t[1].dims,n.strides,n.dilations,a,!1,r);e.compute(Xa(t,i,o.outShape,[o.filterDepth,o.filterHeight,o.filterWidth],[o.padInfo.front,o.padInfo.top,o.padInfo.left],r))},lo=(e,t)=>{if(ro(e.inputs,t),e.inputs[0].dims.length===3)so(e,t);else if(e.inputs[0].dims.length===5)co(e,e.inputs,t);else{let n=io(t,e.inputs);oo(e,e.inputs,n)}}}),fo,po=a(()=>{"use strict";R(),Pt(),V(),Y(),fo=(e,t,n)=>{let r=e.length>2,i=t.outputShape,a=t.format===`NHWC`,o=t.group,s=e[1].dims,c=s[2]/o,l=s[3],u=a?G(c):1,d=a&&l===1&&c>=4,f=d?Math.floor(c/4)*4:Math.floor(c/u)*u,p=c-f,m=a?G(l):1,h=a?l===1?u:m:1,g=B.size(i)/m,_=[Math.ceil(g/64),1,1];z(`verbose`,()=>`[conv2d_backprop_webgpu] dispatch = ${_}`);let v=[`rank`,`rank`],y=[t.strides[0],t.strides[1]],b=[t.kernelShape[a?1:2],t.kernelShape[a?2:3]],x=[t.dilations[0],t.dilations[1]],S=[b[0]+(t.dilations[0]<=1?0:(t.kernelShape[a?1:2]-1)*(t.dilations[0]-1)),b[1]+(t.dilations[1]<=1?0:(t.kernelShape[a?2:3]-1)*(t.dilations[1]-1))],C=[S[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),S[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],w=[{type:12,data:g},{type:12,data:y},{type:12,data:b},{type:12,data:x},{type:12,data:S},{type:6,data:C},{type:12,data:f},{type:12,data:c},{type:12,data:l},...W(e[0].dims,e[1].dims)];return r&&(w.push(...W(e[2].dims)),v.push(`rank`)),w.push(...W(i)),{name:`ConvTranspose2D`,shaderCache:{hint:`${t.cacheKey};${u}${h}${m}${d}${p}`,inputDependencies:v},getRunData:()=>({dispatchGroup:{x:_[0],y:_[1],z:_[2]},outputs:[{dims:n?n(i):i,dataType:e[0].dataType}],programUniforms:w}),getShaderSource:t=>{let n=[{name:`output_size`,type:`u32`},{name:`strides`,type:`u32`,length:y.length},{name:`filter_dims`,type:`u32`,length:b.length},{name:`dilations`,type:`u32`,length:b.length},{name:`effective_filter_dims`,type:`u32`,length:S.length},{name:`pads`,type:`i32`,length:C.length},{name:`input_channels_per_group_int`,type:`u32`},{name:`input_channels_per_group`,type:`u32`},{name:`output_channels_per_group`,type:`u32`}],o=bn(e[0].dataType),s=a?1:2,c=a?2:3,l=a?3:1,f=q(`W`,e[1].dataType,e[1].dims.length,h),g=q(`Dy`,e[0].dataType,e[0].dims.length,u),_=[g,f];r&&_.push(q(`bias`,e[2].dataType,[i[l]].length,m));let v=J(`result`,e[0].dataType,i.length,m),x=`
            let outputIndices = ${v.offsetToIndices(`global_idx * ${m}`)};
            let batch = ${v.indicesGet(`outputIndices`,0)};
            let d1 = ${v.indicesGet(`outputIndices`,l)};
            let r = ${v.indicesGet(`outputIndices`,s)};
            let c = ${v.indicesGet(`outputIndices`,c)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${v.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${o}(dyRCorner) + ${o}(wR)) / ${o}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${o}(uniforms.Dy_shape[${s}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${o}(dyCCorner) + ${o}(wC)) / ${o}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${o}(uniforms.Dy_shape[${c}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${d?`
                var x_offset = ${g.indicesToOffset(`${g.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${u};
                var w_offset = ${f.indicesToOffset(`${f.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${h};
                  `:``}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${d?4:u}) {
                  ${(()=>{let e=``;if(d)u===4?e+=`
        let xValue = ${g.getByOffset(`x_offset`)};
        let wValue = ${f.getByOffset(`w_offset`)};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:u===2?e+=`
          dotProd = dotProd + dot(vec4<${o}>(${g.getByOffset(`x_offset`)}, ${g.getByOffset(`x_offset + 1u`)}), vec4<${o}>(${f.getByOffset(`w_offset`)}, ${f.getByOffset(`w_offset + 1u`)}));
          x_offset += 2u;
          w_offset += 2u;`:u===1&&(e+=`
          dotProd = dotProd + dot(vec4<${o}>(${g.getByOffset(`x_offset`)}, ${g.getByOffset(`x_offset + 1u`)}, ${g.getByOffset(`x_offset + 2u`)}, ${g.getByOffset(`x_offset + 3u`)}), vec4<${o}>(${f.getByOffset(`w_offset`)}, ${f.getByOffset(`w_offset + 1u`)}, ${f.getByOffset(`w_offset + 2u`)}, ${f.getByOffset(`w_offset + 3u`)}));
          x_offset += 4u;
          w_offset += 4u;`);else if(e+=`
                  let xValue = ${a?g.getByOffset(`${g.indicesToOffset(`${g.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${u}`):g.get(`batch`,`inputChannel`,`idyR`,`idyC`)};
        `,u===1)e+=`
          let w_offset = ${f.indicesToOffset(`${f.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${f.getByOffset(`w_offset / ${h}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let t=0;t<u;t++)e+=`
            let wValue${t} = ${f.getByOffset(`${f.indicesToOffset(`${f.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${t}, wOutChannel)`)} / ${h}`)};
            dotProd = dotProd + xValue[${t}] * wValue${t};`;return e})()}
                  inputChannel = inputChannel + ${d?4:u};
                }
                ${(()=>{if(p===0)return``;if(!d)throw Error(`packInputAs4 ${d} is not true.`);let e=``;if(u===1){e+=`dotProd = dotProd`;for(let t=0;t<p;t++)e+=`
            + ${g.getByOffset(`x_offset + ${t}`)} * ${f.getByOffset(`w_offset + ${t}`)}`;e+=`;`}else if(u===2){if(p!==2)throw Error(`Invalid inputChannelsRemainder ${p}.`);e+=`
          let xValue = ${g.getByOffset(`x_offset`)};
          let wValue = ${f.getByOffset(`w_offset`)};
          dotProd = dotProd + dot(xValue, wValue);`}return e})()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${r?` + bias[d1 / ${m}]`:``};
            ${v.setByOffset(`global_idx`,`value`)};
          `;return`
    ${t.registerUniforms(n).declareVariables(..._,v)}
      ${t.mainStart()}
      ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)};
    ${x}}`}}}}),mo,ho,go,_o,vo,yo,bo,xo,So,Co=a(()=>{"use strict";po(),Sa(),zn(),mo=(e,t,n,r,i,a)=>(e-1)*t+n+(r-1)*i+1-a,ho=(e,t,n,r,i)=>{let a=Math.floor(e/2);t===`SAME_UPPER`?(n[r]=a,n[i]=e-a):t===`SAME_LOWER`&&(n[r]=e-a,n[i]=a)},go=(e,t,n,r,i,a,o,s,c,l)=>{let u=e.length-2,d=l.length===0;c.length<u&&c.push(...Array(u-c.length).fill(0));let f=e[0],p=t[s?3:1]*i;for(let i=0,f=e.length-u-+!!s;i<u;++i,++f){let s=e[f],p=d?s*o[i]:l[i],m=mo(s,o[i],a[i],t[f],n[i],p);ho(m,r,a,i,i+u),d&&l.push(o[i]*(s-1)+c[i]+(t[f]-1)*n[i]+1-a[i]-a[i+u])}l.splice(0,0,f),l.splice(s?3:1,0,p)},_o=(e,t)=>{let n=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((e,t)=>e*t,1)===0){n.length=0;for(let e=2;e<t[1].dims.length;++e)n.push(t[1].dims[e])}let r=e.format===`NHWC`;n.splice(0,0,t[1].dims[0]),n.splice(r?3:1,0,t[1].dims[1]);let i=e.pads.slice(),a=e.outputShape.slice(),o=e.outputPadding.slice(),s=t[0].dims,c=e.dilations.slice();if(c.reduce((e,t)=>e+t,0)===0){let e=t[0].dims.length-2;c=Array(e).fill(1)}let l=e.strides.slice();if(l.reduce((e,t)=>e+t,0)===0){let e=t[0].dims.length-2;l=Array(e).fill(1)}go(s,n,c,e.autoPad,e.group,i,l,r,o,a);let u=Object.assign({},e);return Object.assign(u,{kernelShape:n,pads:i,outputPadding:o,outputShape:a,dilations:c,strides:l}),u},vo=e=>{let t=xa(e),n=e.format,r=[`NOTSET`,`VALID`,`SAME_UPPER`,`SAME_LOWER`][typeof e.autoPad>`u`?0:e.autoPad],i=e.dilations,a=e.group??1,o=e.kernelShape,s=e.pads,c=e.strides,l=e.wIsConst();return{autoPad:r,format:n,dilations:i,group:a,kernelShape:o,outputPadding:e.outputPadding,outputShape:e.outputShape,pads:s,strides:c,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},yo=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw Error(`Conv requires 2 or 3 inputs`);if(e[0].dims.length!==4&&e[0].dims.length!==3)throw Error(`currently only support 2-dimensional conv`);if(e[0].dims.length!==e[1].dims.length)throw Error(`filter does not have same dimension as input`);if(e[0].dims[t.format===`NHWC`?e[0].dims.length-1:1]!==e[1].dims[0])throw Error(`FILTER_IN_CHANNEL should be equal to DATA_CHANNEL`);let n=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==n))throw Error(`invalid bias`);let r=e[0].dims.length-2;if(t.dilations.reduce((e,t)=>e+t,0)>0&&t.dilations.length!==r)throw Error(`dilations should be ${r}D`);if(t.strides.reduce((e,t)=>e+t,0)>0&&t.strides.length!==r)throw Error(`strides should be ${r}D`);if(t.pads.reduce((e,t)=>e+t,0)>0&&t.pads.length!==r*2)throw Error(`pads should be ${r*2}D`);if(t.outputPadding.length!==r&&t.outputPadding.length!==0)throw Error(`output_padding should be ${r}D`);if(t.kernelShape.reduce((e,t)=>e+t,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw Error(`invalid kernel shape`);if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw Error(`invalid output shape`)},bo=(e,t,n,r)=>{let i=e.kernelCustomData.wT??e.compute(In(t[1],[2,3,0,1]),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=i);let a=[t[0],i];t.length===3&&a.push(t[2]),e.compute(fo(a,n,r),{inputs:a})},xo=(e,t)=>{let n=t.format===`NHWC`,r=[e.inputs[0].reshape(n?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let i=t.kernelShape;(i.length===0||i[0]===0)&&(i=[e.inputs[1].dims[2]]);let a=t.dilations;(a.length===0||a[0]===0)&&(a=[1]);let o=t.strides;(o.length===0||o[0]===0)&&(o=[1]);let s=t.pads;s.length===0&&(s=[0,0]),s=[0,s[0],0,s[1]],o=[1].concat(o),a=[1].concat(a),i=[1].concat(i);let c=t.outputPadding;c=[0].concat(c);let l=_o({...t,pads:s,strides:o,dilations:a,kernelShape:i,outputPadding:c},r);bo(e,r,l,e=>n?[e[0],e[2],e[3]]:[e[0],e[1],e[3]])},So=(e,t)=>{if(yo(e.inputs,t),e.inputs[0].dims.length===3)xo(e,t);else{let n=_o(t,e.inputs);bo(e,e.inputs,n)}}}),wo,To,Eo,Do=a(()=>{"use strict";R(),V(),U(),Y(),wo=(e,t,n,r)=>{let i=B.size(t),a=t.length,o=q(`input`,e,a),s=J(`output`,e,a),c=n.dataType===6?n.getInt32Array()[0]:Number(n.getBigInt64Array()[0]),l=B.normalizeAxis(c,a);return{name:`CumSum`,shaderCache:{hint:r.cacheKey,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:[{type:12,data:i},{type:12,data:l},...W(t,t)]}),getShaderSource:e=>{let t=` i32(${o.indicesGet(`inputIndices`,`uniforms.axis`)}) `,n=K(`uniforms.input_shape`,`uniforms.axis`,a),i=r.reverse?t+(r.exclusive?` + 1`:``):`0`,c=r.reverse?n:t+(r.exclusive?``:` + 1`);return`
                ${e.registerUniform(`outputSize`,`u32`).registerUniform(`axis`,`u32`).declareVariables(o,s)}
                ${e.mainStart()}
                  ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
                  var inputIndices = ${s.offsetToIndices(`global_idx`)};
                  var sum = ${s.type.value}(0);
                  let first : i32 = ${i};
                  let last : i32 = ${c};
                  for (var i : i32 = first; i < last; i++) {
                    ${o.indicesSet(`inputIndices`,`uniforms.axis`,`u32(i)`)};
                    sum = sum + ${o.getByIndices(`inputIndices`)};
                  }
                  ${s.setByOffset(`global_idx`,`sum`)};
                }`}}},To=(e,t)=>{let n=e.inputs[0].dims,r=e.inputs[0].dataType,i=e.inputs[1];e.compute(wo(r,n,i,t),{inputs:[0]})},Eo=e=>{let t=e.exclusive===1,n=e.reverse===1;return H({exclusive:t,reverse:n})}}),Oo,ko,Ao,jo,Mo,No=a(()=>{"use strict";R(),V(),U(),Y(),Oo=e=>{if(!e||e.length!==1)throw Error(`DepthToSpace requires 1 input.`);if(e[0].dims.length!==4)throw Error(`DepthToSpace requires 4D input.`)},ko=(e,t,n,r)=>{let i=[];i.push(`fn perm(i: ${r.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`);for(let r=0;r<t;++r)i.push(n.indicesSet(`a`,e[r],`i[${r}]`));return i.push(`return a;}`),i.join(`
`)},Ao=(e,t)=>{let n,r,i,a,o,s,c=t.format===`NHWC`,l=t.blocksize,u=t.mode===`DCR`;c?([n,r,i,a]=e.dims,o=u?[n,r,i,l,l,a/l**2]:[n,r,i,a/l**2,l,l],s=u?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([n,r,i,a]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],o=u?[n,l,l,a/l**2,r,i]:[n,a/l**2,l,l,r,i],s=u?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let d=e.reshape(o),f=d.dims.length,p=e.dataType,m=q(`a`,p,f),h=J(`output`,p,f);return{name:`DepthToSpace`,shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:[`rank`]},getRunData:e=>{let t=c?[n,r*l,i*l,a/l**2]:[n,a/l**2,r*l,i*l],o=B.size(t),u=d.dims,f=B.sortBasedOnPerm(u,s);return{outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:[{type:12,data:o},...W(u,f)]}},getShaderSource:e=>`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(m,h)}

  ${ko(s,f,m,h)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

    let indices = ${h.offsetToIndices(`global_idx`)};
    let aIndices = perm(indices);

    ${h.setByOffset(`global_idx`,m.getByIndices(`aIndices`))}
  }`}},jo=(e,t)=>{Oo(e.inputs),e.compute(Ao(e.inputs[0],t))},Mo=e=>H({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Po,Fo,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo=a(()=>{"use strict";R(),V(),U(),Y(),Po=256,Fo=512,Io=2*Math.PI,Lo=e=>{let t=[],n=e;for(let e of[4,2,3,5])for(;n%e===0;)t.push(e),n/=e;return n===1?t:void 0},Ro=e=>{let t=e.toPrecision(9);return/[.eE]/.test(t)?t:`${t}.0`},zo=(e,t,n,r,i)=>{let a=n/e,o=Fo-r,s=e=>`smem[${o}u + base + ${e*t}u]`,c=`  for (var t = local_idx; t < ${a}u; t += ${Po}u) {
`;c+=`    let twiddleIndex = t % ${t}u;
    let angleUnit = f32(twiddleIndex);
`,c+=`    var leg: array<vec2<f32>, 5>;
`;for(let n=0;n<e;n++){let o=`${r}u + t + ${n*a}u`;if(n===0)c+=`    leg[0] = smem[${o}];
`;else{let r=i*Io*n/(e*t);c+=`    { let a = ${Ro(r)} * angleUnit; leg[${n}] = cmul(smem[${o}], vec2<f32>(cos(a), sin(a))); }
`}}if(c+=`    let base = (t / ${t}u) * ${t*e}u + twiddleIndex;
`,e===2)c+=`    ${s(0)} = leg[0] + leg[1];
    ${s(1)} = leg[0] - leg[1];
`;else if(e===4){let e=i<0?`vec2<f32>(oddDiff.y, -oddDiff.x)`:`vec2<f32>(-oddDiff.y, oddDiff.x)`;c+=`    let evenSum = leg[0] + leg[2]; let evenDiff = leg[0] - leg[2];
`,c+=`    let oddSum = leg[1] + leg[3]; let oddDiff = leg[1] - leg[3];
`,c+=`    let oddRot = ${e};
`,c+=`    ${s(0)} = evenSum + oddSum;
    ${s(1)} = evenDiff + oddRot;
`,c+=`    ${s(2)} = evenSum - oddSum;
    ${s(3)} = evenDiff - oddRot;
`}else for(let t=0;t<e;t++){let n=[`leg[0]`];for(let r=1;r<e;r++){let a=i*Io*(r*t)/e,o=Ro(Math.cos(a)),s=Ro(Math.sin(a));n.push(`vec2<f32>(leg[${r}].x*${o} - leg[${r}].y*${s}, leg[${r}].x*${s} + leg[${r}].y*${o})`)}c+=`    ${s(t)} = ${n.join(` + `)};
`}return`${c}  }
  workgroupBarrier();
`},Bo=(e,t,n)=>{let r=``,i=1,a=0;for(let o of e)r+=zo(o,i,t,a,n),i*=o,a=Fo-a;return{code:r,resultOffset:a}},Vo=(e,t,n,r,i)=>{let a=e.dims,o=a.length,s=a[o-1],c=a[t],l=n&&r?(c-1)*2:c;i!==void 0&&(l=i);let u=n&&r?1:2,d=r&&!n?Math.floor(l/2)+1:l,f=a.slice();f[t]=d,f[o-1]=u;let p=1;for(let e=t+1;e<o-1;e++)p*=a[e];let m=B.size(a)/s/c;return{dataType:e.dataType,outputDims:f,length:l,signalLength:c,inner:p,batch:m,inputComponents:s,outputComponents:u,outputLength:d,inverse:n,onesided:r}},Ho=(e,t)=>[t,e.length,e.inputComponents,e.outputComponents,e.inverse,e.onesided].join(`;`),Uo=e=>[{type:12,data:e.batch},{type:12,data:e.signalLength},{type:12,data:e.inner},{type:12,data:e.outputLength}],Wo=(e,t,n)=>e.registerUniform(`batch`,`u32`).registerUniform(`signalLength`,`u32`).registerUniform(`inner`,`u32`).registerUniform(`outputLength`,`u32`).declareVariables(t,n),Go=e=>{let{dataType:t,length:n,inputComponents:r,outputComponents:i,inverse:a,onesided:o}=e,s=xn(t),c=a?1:-1,l=a?1/n:1,u=Lo(n);return{name:`DFT`,shaderCache:{hint:Ho(e,`fft`),inputDependencies:[`type`]},getShaderSource:e=>{let d=q(`x`,t,[1]),f=J(`y`,t,[1]),p=e=>{let t=`inBase + (${e}) * uniforms.inner * ${r}u`;return`vec2<f32>(${`f32(${d.getByOffset(t)})`}, ${r===2?`f32(${d.getByOffset(`${t} + 1u`)})`:`0.0`})`},m;if(a&&o){let e=Math.floor(n/2)+1,t=n%2==0?`select(provided, provided - 1u, provided == ${e}u)`:`provided`;m=`
    let provided = min(uniforms.signalLength, ${e}u);
    for (var i = local_idx; i < ${n}u; i += ${Po}u) {
      if (i < provided) { smem[i] = ${p(`i`)}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();
    for (var k = local_idx + 1u; k < ${t}; k += ${Po}u) {
      let h = smem[k];
      smem[${n}u - k] = vec2<f32>(h.x, -h.y);
    }
    workgroupBarrier();`}else m=`
    let loadCount = min(uniforms.signalLength, ${n}u);
    for (var i = local_idx; i < ${n}u; i += ${Po}u) {
      if (i < loadCount) { smem[i] = ${p(`i`)}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();`;let{code:h,resultOffset:g}=Bo(u,n,c),_=l===1?`smem[${g}u + i]`:`smem[${g}u + i] * ${Ro(l)}`,v=i===2?f.setByOffset(`off + 1u`,`${s}(v.y)`):``;return`
  ${Wo(e,d,f)}
  var<workgroup> smem: array<vec2<f32>, ${2*Fo}>;
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${e.mainStart(Po)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${r}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${i}u;
    ${m}
${h}    for (var i = local_idx; i < uniforms.outputLength; i += ${Po}u) {
      let v = ${_};
      let off = outBase + i * uniforms.inner * ${i}u;
      ${f.setByOffset(`off`,`${s}(v.x)`)}
      ${v}
    }
  }`},getRunData:()=>({outputs:[{dims:e.outputDims,dataType:t}],programUniforms:Uo(e),dispatchGroup:{x:e.batch}})}},Ko=e=>{let{dataType:t,length:n,inputComponents:r,outputComponents:i,inverse:a,onesided:o}=e,s=xn(t),c=a?1:-1,l=a?1/n:1;return{name:`DFT`,shaderCache:{hint:Ho(e,`direct`),inputDependencies:[`type`]},getShaderSource:e=>{let u=q(`x`,t,[1]),d=J(`y`,t,[1]),f=e=>{let t=`inBase + (${e}) * uniforms.inner * ${r}u`;return`vec2<f32>(${`f32(${u.getByOffset(t)})`}, ${r===2?`f32(${u.getByOffset(`${t} + 1u`)})`:`0.0`})`},p=a&&o?`fn spectrum(inBase: u32, k: u32) -> vec2<f32> {
    let provided = min(uniforms.signalLength, ${Math.floor(n/2)+1}u);
    if (k < provided) { return ${f(`k`)}; }
    let m = ${n}u - k;
    if (m < provided) {
      let h = ${f(`m`)};
      return vec2<f32>(h.x, -h.y);
    }
    return vec2<f32>(0.0, 0.0);
  }`:`fn spectrum(inBase: u32, n: u32) -> vec2<f32> {
    if (n < uniforms.signalLength) { return ${f(`n`)}; }
    return vec2<f32>(0.0, 0.0);
  }`,m=`
      let angle = ${Ro(c*Io)} * f32(knMod) / ${Ro(n)};
      acc += cmul(spectrum(inBase, n), vec2<f32>(cos(angle), sin(angle)));
      knMod += k;
      if (knMod >= ${n}u) { knMod -= ${n}u; }`,h=i===2?d.setByOffset(`off + 1u`,`${s}(v.y)`):``,g=l===1?`acc`:`acc * ${Ro(l)}`;return`
  ${Wo(e,u,d)}
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${p}
  ${e.mainStart(Po)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${r}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${i}u;
    for (var k = local_idx; k < uniforms.outputLength; k += ${Po}u) {
      var acc = vec2<f32>(0.0, 0.0);
      var knMod = 0u;
      for (var n = 0u; n < ${n}u; n++) {${m}
      }
      let v = ${g};
      let off = outBase + k * uniforms.inner * ${i}u;
      ${d.setByOffset(`off`,`${s}(v.x)`)}
      ${h}
    }
  }`},getRunData:()=>({outputs:[{dims:e.outputDims,dataType:t}],programUniforms:Uo(e),dispatchGroup:{x:e.batch}})}},qo=e=>{if(!e||e.dataType===0)return;if(B.size(e.dims)!==1)throw Error(`DFT optional scalar inputs must have exactly 1 element.`);if(e.dataType===6)return e.getInt32Array()[0];let t=Number(e.getBigInt64Array()[0]);if(!Number.isSafeInteger(t))throw Error(`DFT optional scalar inputs are out of JavaScript safe integer range.`);return t},Jo=e=>{if(!e||e.length<1)throw Error(`DFT requires at least 1 input.`);let t=e[0].dims;if(t.length<2)throw Error(`DFT input must have at least 2 dimensions.`);let n=t[t.length-1];if(n!==1&&n!==2)throw Error(`DFT input's innermost dimension must be 1 (real) or 2 (complex).`)},Yo=(e,t)=>{Jo(e.inputs);let n=e.inputs[0],r=n.dims.length,i=t.inverse!==0,a=t.onesided!==0,o=qo(e.inputs[1]);if(o!==void 0&&o<=0)throw Error(`dft_length must be greater than zero.`);let s=B.normalizeAxis(qo(e.inputs[2])??t.axis,r);if(s===r-1)throw Error(`DFT axis must refer to a signal dimension, not the innermost (real/imaginary) dimension.`);if(i&&a&&n.dims[r-1]!==2)throw Error(`Inverse one-sided DFT (IRFFT) requires complex-valued input (innermost dimension 2).`);let c=Vo(n,s,i,a,o);if(c.length<=0)throw Error(`Invalid DFT length: ${c.length}`);let l=c.length<=Fo&&Lo(c.length)!==void 0?Go(c):Ko(c);e.compute(l,{inputs:[0]})},Xo=e=>H({axis:e.axis??1,inverse:e.inverse??0,onesided:e.onesided??0})}),Qo,$o,es,ts,ns,rs,is,as,os,ss,cs,ls=a(()=>{"use strict";R(),V(),U(),Y(),Qo=`[a-zA-Z]|\\.\\.\\.`,$o=`(`+Qo+`)+`,es=`^`+$o+`$`,ts=`(`+$o+`,)*`+$o,ns=`^`+ts+`$`,rs=class{constructor(e=-1){this.symbolToIndices=/* @__PURE__ */ new Map,this.inputIndex=e}addSymbol(e,t){let n=this.symbolToIndices.get(e);n===void 0?n=[t]:n.push(t),this.symbolToIndices.set(e,n)}},is=class{constructor(e,t){this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=/* @__PURE__ */ new Map,this.lhs=[],this.outputDims=[];let[n,r]=t.includes(`->`)?t.split(`->`,2):[t,``];if(!n.match(RegExp(ns)))throw Error(`Invalid LHS term`);if(n.split(`,`).forEach((t,n)=>{let r=e[n].dims.slice();if(!t.match(RegExp(es)))throw Error(`Invalid LHS term`);let i=this.processTerm(t,!0,r,n);this.lhs.push(i)}),r===``)r+=[...this.symbolToInfo.entries()].filter(([e,t])=>t.count===1||e===`...`).map(([e])=>e).join(``);else if(!r.match(RegExp($o)))throw Error(`Invalid RHS`);r.match(RegExp(Qo,`g`))?.forEach(e=>{if(e===`...`)this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let t=this.symbolToInfo.get(e);if(t===void 0)throw Error(`Invalid RHS symbol`);this.outputDims.push(t.dimValue)}}),this.rhs=this.processTerm(r,!1,this.outputDims)}addSymbol(e,t,n){let r=this.symbolToInfo.get(e);if(r!==void 0){if(r.dimValue!==t&&r.count!==1)throw Error(`Dimension mismatch`);r.count++,r.inputIndices.push(n)}else r={count:1,dimValue:t,inputIndices:[n]};this.symbolToInfo.set(e,r)}processTerm(e,t,n,r=-1){let i=n.length,a=!1,o=[],s=0;if(!e.match(RegExp(es))&&!t&&e!==``)throw Error(`Invalid LHS term`);let c=e.match(RegExp(Qo,`g`)),l=new rs(r);return c?.forEach((e,u)=>{if(e===`...`){if(a)throw Error(`Only one ellipsis is allowed per input term`);a=!0;let e=i-c.length+1;if(e<0)throw Error(`Ellipsis out of bounds`);if(o=n.slice(s,s+e),this.hasEllipsis){if(this.ellipsisDims.length!==o.length||this.ellipsisDims.toString()!==o.toString())throw Error(`Ellipsis dimensions mismatch`)}else if(t)this.hasEllipsis=!0,this.ellipsisDims=o;else throw Error(`Ellipsis must be specified in the LHS`);for(let e=0;e<o.length;e++){let t=String.fromCharCode(48+e);l.addSymbol(t,u+e),this.addSymbol(t,n[s++],r)}}else l.addSymbol(e,u+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(e,n[s++],r)}),l}},as=e=>e+`_max`,os=(e,t,n,r)=>{let i=e.map(e=>e.length).map((e,n)=>q(`input${n}`,t,e)),a=B.size(r),o=J(`output`,t,r.length),s=[...n.symbolToInfo.keys()].filter(e=>!n.rhs.symbolToIndices.has(e));return{name:`Einsum`,shaderCache:{hint:n.equation,inputDependencies:e.map(()=>`rank`)},getRunData:()=>{let i=s.filter(e=>n.symbolToInfo.has(e)).map(e=>({type:12,data:n.symbolToInfo.get(e)?.dimValue||0}));i.push({type:12,data:a});let o=e.map((e,t)=>[...W(e)]).reduce((e,t)=>e.concat(t),i);return o.push(...W(r)),{outputs:[{dims:r,dataType:t}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:o}},getShaderSource:e=>{let t=[],r=[],a=[],c=[],l=[],u=n.symbolToInfo.size===n.rhs.symbolToIndices.size;n.symbolToInfo.forEach((e,s)=>{if(n.rhs.symbolToIndices.has(s)){let r=n.rhs.symbolToIndices.get(s)?.[0];r!==void 0&&n.lhs.forEach((n,a)=>{if(e.inputIndices.includes(a)){let e=n.symbolToIndices.get(s);if(e===void 0)throw Error(`Invalid symbol error`);e.forEach(e=>{t.push(`${i[a].indicesSet(`input${a}Indices`,e,o.indicesGet(`outputIndices`,r))}`)})}})}else n.lhs.forEach((t,n)=>{if(e.inputIndices.includes(n)){let e=t.symbolToIndices.get(s);if(e===void 0)throw Error(`Invalid symbol error`);e.forEach(e=>{r.push(`${i[n].indicesSet(`input${n}Indices`,e,`${s}`)}`)}),l.push(`prod *= ${i[n].getByIndices(`input${n}Indices`)};`)}}),a.push(`for(var ${s}: u32 = 0; ${s} < uniforms.${as(s)}; ${s}++) {`),c.push(`}`)});let d=u?[...t,`let sum = ${i.map((e,t)=>e.getByIndices(`input${t}Indices`)).join(` * `)};`]:[...t,`var sum = 0.0;`,...a,...r,`var prod = 1.0;`,...l,`sum += prod;`,...c];return`
            ${e.registerUniforms(s.map(e=>({name:`${as(e)}`,type:`u32`}))).registerUniform(`outputSize`,`u32`).declareVariables(...i,o)}

            ${e.mainStart()}
            ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
            var outputIndices = ${o.offsetToIndices(`global_idx`)};
            ${i.map((e,t)=>`var input${t}Indices: ${i[t].type.indices};`).join(`
`)}
            ${d.join(`
`)};
            ${o.setByOffset(`global_idx`,`sum`)};
          }`}}},ss=(e,t)=>{let n=new is(e.inputs,t.equation),r=n.outputDims,i=e.inputs.map((e,t)=>e.dims);e.compute(os(i,e.inputs[0].dataType,n,r))},cs=e=>{let t=e.equation.replace(/\s+/g,``);return H({equation:t})}}),us,ds,fs,ps,ms,hs=a(()=>{"use strict";R(),V(),Y(),us=e=>{if(!e||e.length!==2)throw Error(`Expand requires 2 input.`);let t=e[0].dims,n=Array.from(e[1].getBigInt64Array(),Number),r=n.length<t.length?0:n.length-t.length,i=t.length<n.length?0:t.length-n.length;for(;r<n.length&&i<t.length;++r,++i)if(n[r]!==t[i]&&n[r]!==1&&t[i]!==1)throw Error(`Expand requires shape to be broadcastable to input`)},ds=(e,t)=>{let n=e.length-t.length,r=[];for(let t=0;t<n;++t)r.push(e[t]);for(let i=0;i<t.length;++i)r.push(t[i]===1?e[i+n]:t[i]);return r},fs=(e,t)=>e.length>t.length?ds(e,t):ds(t,e),ps=e=>{let t=e[0].dims,n=Array.from(e[1].getBigInt64Array(),Number),r=fs(t,n),i=e[0].dataType,a=i===9||B.size(t)===1,o=i===9||t.length>0&&t[t.length-1]%4==0?4:1,s=a||r.length>0&&r[r.length-1]%4==0?4:1,c=Math.ceil(B.size(r)/s),l=e=>{let n=q(`input`,i,t.length,o),a=J(`output`,i,r.length,s),c;if(i===9){let e=(e,t,r=``)=>`
          let outputIndices${t} = ${a.offsetToIndices(`outputOffset + ${t}u`)};
          let offset${t} = ${n.broadcastedIndicesToOffset(`outputIndices${t}`,a)};
          let index${t} = offset${t} / 4u;
          let component${t} = offset${t} % 4u;
          ${e}[${t}] = ${r}(${n.getByOffset(`index${t}`)}[component${t}]);
        `;c=`
        let outputOffset = global_idx * ${s};
        var data = vec4<u32>(0);
        ${e(`data`,0,`u32`)}
        ${e(`data`,1,`u32`)}
        ${e(`data`,2,`u32`)}
        ${e(`data`,3,`u32`)}
        ${a.setByOffset(`global_idx`,`data`)}
      }`}else c=`
        let outputIndices = ${a.offsetToIndices(`global_idx * ${s}`)};
        let inputOffset = ${n.broadcastedIndicesToOffset(`outputIndices`,a)};
        let data = ${a.type.value}(${n.getByOffset(`inputOffset / ${o}`)});
        ${a.setByOffset(`global_idx`,`data`)}
      }`;return`
    ${e.registerUniform(`vec_size`,`u32`).declareVariables(n,a)}
    ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}
    ${c}`},u=[{type:12,data:c},...W(t,r)];return{name:`Expand`,shaderCache:{hint:`${r.length};${o}${s}`,inputDependencies:[`rank`]},getShaderSource:l,getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:u})}},ms=e=>{us(e.inputs),e.compute(ps(e.inputs),{inputs:[0]})}}),gs,_s,vs=a(()=>{"use strict";R(),V(),Y(),Ki(),gs=e=>{let t=e[0].dataType,n=B.size(e[0].dims),r=B.size(e[1].dims),i=r%4==0;return{name:`FastGeluWithBias`,shaderCache:{hint:`${i}`,inputDependencies:[`type`,`type`]},getShaderSource:e=>{let n=q(`x`,t,[1],4),r=q(`bias`,t,[1],4),a=J(`y`,t,[1],4),o=[{name:`output_vec_size`,type:`u32`},{name:`bias_size`,type:`u32`}],s=e=>`
      let bias${e}_offset: u32 = (global_idx * 4 + ${e}) % uniforms.bias_size;
      let bias${e} = ${r.getByOffset(`bias${e}_offset / 4`)}[bias${e}_offset % 4];`,c=i?`
      let bias = ${r.getByOffset(`global_idx % (uniforms.bias_size / 4)`)};`:`${s(0)}${s(1)}${s(2)}${s(3)}
      let bias = ${n.type.value}(bias0, bias1, bias2, bias3);`;return`${e.registerUniforms(o).declareVariables(n,r,a)}

    ${Ri(xn(t))}

    ${e.mainStart(vn)}
      ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_vec_size`)}

      let x = ${n.getByOffset(`global_idx`)};
      ${c}
      let x_in = x + bias;
      ${a.setByOffset(`global_idx`,zi(`x_in`))}
    }`},getRunData:e=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],programUniforms:[{type:12,data:Math.ceil(n/4)},{type:12,data:r}],dispatchGroup:{x:Math.ceil(n/vn/4)}})}},_s=e=>{e.inputs.length<2||B.size(e.inputs[1].dims)===0?Bi(e):e.compute(gs(e.inputs))}}),ys,bs,xs,Ss,Cs=a(()=>{"use strict";R(),V(),U(),Y(),ys=e=>{if(!e||e.length!==2)throw Error(`Gather requires 2 inputs.`)},bs=(e,t)=>{let n=e[0].dims,r=e[1].dims,i=n.length,a=B.normalizeAxis(t.axis,i),o=n.slice(0);o.splice(a,1,...r);let s=n[a],c=e[0].dataType===9?4:1,l=Math.ceil(B.size(o)/c),u=[{type:12,data:l},{type:6,data:s},{type:12,data:a},...W(e[0].dims,e[1].dims,o)];return{name:`Gather`,shaderCache:{hint:t.cacheKey,inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:u}),getShaderSource:t=>{let n=q(`data`,e[0].dataType,e[0].dims.length,c),s=q(`inputIndices`,e[1].dataType,e[1].dims.length),l=J(`output`,e[0].dataType,o.length,c),u=e=>{let t=r.length,c=`var indicesIndices${e}  = ${s.type.indices}(0);`;for(let n=0;n<t;n++)c+=`${t>1?`indicesIndices${e}[${n}]`:`indicesIndices${e}`} = ${o.length>1?`outputIndices${e}[uniforms.axis + ${n}]`:`outputIndices${e}`};`;c+=`
          var idx${e} = ${s.getByIndices(`indicesIndices${e}`)};
          if (idx${e} < 0) {
            idx${e} = idx${e} + uniforms.axisDimLimit;
          }
          var dataIndices${e} : ${n.type.indices};
        `;for(let n=0,r=0;n<i;n++)n===a?(c+=`${i>1?`dataIndices${e}[${n}]`:`dataIndices${e}`} = u32(idx${e});`,r+=t):(c+=`${i>1?`dataIndices${e}[${n}]`:`dataIndices${e}`} = ${o.length>1?`outputIndices${e}[${r}]`:`outputIndices${e}`};`,r++);return c},d;if(e[0].dataType===9){let e=(e,t,r=``)=>`
          let outputIndices${t} = ${l.offsetToIndices(`outputOffset + ${t}u`)};
          ${u(t)};
          let offset${t} = ${n.indicesToOffset(`dataIndices${t}`)};
          let index${t} = offset${t} / 4u;
          let component${t} = offset${t} % 4u;
          ${e}[${t}] = ${r}(${n.getByOffset(`index${t}`)}[component${t}]);
        `;d=`
        let outputOffset = global_idx * ${c};
        var value = vec4<u32>(0);
        ${e(`value`,0,`u32`)}
        ${e(`value`,1,`u32`)}
        ${e(`value`,2,`u32`)}
        ${e(`value`,3,`u32`)}
        ${l.setByOffset(`global_idx`,`value`)}
      `}else d=`
      let outputIndices = ${l.offsetToIndices(`global_idx`)};
      ${u(``)};
      let value = ${n.getByIndices(`dataIndices`)};
      ${l.setByOffset(`global_idx`,`value`)};
      `;return`
      ${t.registerUniform(`outputSize`,`u32`).registerUniform(`axisDimLimit`,`i32`).registerUniform(`axis`,`u32`).declareVariables(n,s,l)}
      ${t.mainStart()}
        ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
        ${d}
      }`}}},xs=e=>H({axis:e.axis}),Ss=(e,t)=>{let n=e.inputs;ys(n),e.compute(bs(e.inputs,t))}}),ws,Ts,Es,Ds=a(()=>{"use strict";R(),V(),Y(),ws=(e,t,n,r,i,a,o,s,c)=>{let l=[{type:12,data:a},{type:12,data:r},{type:12,data:i},{type:12,data:n},{type:12,data:o},{type:12,data:s},{type:12,data:c}],u=[a];return l.push(...W(t.dims,u)),e.compute({name:`computeSliceOffsets`,shaderCache:{hint:`${i.length}_${n.length}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:u,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:l}),getShaderSource:e=>{let r=[q(`indices_data`,t.dataType,t.dims.length),J(`input_slice_offsets_data`,12,1,1)],a=[{name:`output_size`,type:`u32`},{name:`batch_dims`,type:`u32`},{name:`input_dims`,type:`u32`,length:i.length},{name:`sizes_from_slice_dims_data`,type:`u32`,length:n.length},{name:`num_slices_per_batch`,type:`u32`},{name:`input_batch_stride`,type:`u32`},{name:`num_slice_dims`,type:`u32`}];return`
  ${e.registerUniforms(a).declareVariables(...r)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${i.length===1?`index += i32(uniforms.input_dims);`:`index += i32(uniforms.input_dims[input_dim_idx]);`}
      }
      ${n.length===1?`relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);`:`relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);`}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`}},{inputs:[t],outputs:[-1]})[0]},Ts=(e,t)=>{let n=e.inputs,r=n[0].dims,i=n[0].dataType,a=n[1].dims,o=a[a.length-1],s=B.sizeToDimension(a,a.length-1),c=B.sizeFromDimension(r,t.batchDims+o),l=B.sizeToDimension(r,t.batchDims),u=B.sizeFromDimension(r,t.batchDims),d=s/l,f=Array(o),p=c;for(let e=0;e<o;++e)f[o-1-e]=p,p*=r[t.batchDims+o-1-e];let m=ws(e,n[1],f,t.batchDims,r,s,d,u,o),h=t.batchDims+o;if(h>r.length)throw Error(`last dimension of indices must not be larger than rank of input tensor`);let g=a.slice(0,-1).concat(r.slice(h)),_=B.size(g),v=[{type:12,data:_},{type:12,data:c},...W(n[0].dims,m.dims,g)];e.compute({name:`GatherND`,shaderCache:{hint:t.cacheKey,inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:g,dataType:i}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:v}),getShaderSource:e=>{let t=q(`data`,n[0].dataType,n[0].dims.length),r=q(`slice_offsets`,12,m.dims.length),i=J(`output`,n[0].dataType,g.length);return`
          ${e.registerUniform(`output_size`,`u32`).registerUniform(`slice_size`,`u32`).declareVariables(t,r,i)}
            ${e.mainStart()}
            ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`}},{inputs:[n[0],m]})},Es=e=>({batchDims:e.batch_dims,cacheKey:``})}),Os,ks,As,js,Ms=a(()=>{"use strict";R(),V(),U(),Y(),Os=(e,t)=>{if(e.length<3||e.length>4)throw Error(`GatherBlockQuantized requires 3 or 4 inputs.`);let n=B.normalizeAxis(t.quantizeAxis,e[0].dims.length),r=t.blockSize,i=e[0],a=e[2],o=e.length===4?e[3]:void 0;if(a.dims.length!==i.dims.length||!i.dims.map((e,t)=>t===n?Math.ceil(e/r)===a.dims[t]:e===a.dims[t]).reduce((e,t)=>e&&t,!0))throw Error(`Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.`);if(o){if(o.dataType!==i.dataType)throw Error(`Zero point must have the same data type as the input tensor.`);if(o.dims.length!==a.dims.length||!o.dims.map((e,t)=>e===a.dims[t]).reduce((e,t)=>e&&t,!0))throw Error(`Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.`)}},ks=(e,t)=>{let n=e[0].dims,r=e[1].dims,i=n.length,a=B.normalizeAxis(t.gatherAxis,i),o=B.normalizeAxis(t.quantizeAxis,i),s=n.slice(0);s.splice(a,1,...r);let c=B.size(s),l=e[2].dataType,u=e[0].dataType===22,d=[{type:12,data:c},{type:12,data:o},{type:12,data:a},{type:12,data:t.blockSize},...W(...e.map((e,t)=>e.dims),s)];return{name:`GatherBlockQuantized`,shaderCache:{hint:`${t.cacheKey};${e.filter((e,t)=>t!==1).map(e=>e.dims.join(`_`)).join(`;`)}`,inputDependencies:Array.from({length:e.length},(e,t)=>`rank`)},getRunData:()=>({outputs:[{dims:s,dataType:l}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:d}),getShaderSource:t=>{let i=q(`data`,e[0].dataType,e[0].dims.length),o=q(`inputIndices`,e[1].dataType,e[1].dims.length),c=q(`scales`,e[2].dataType,e[2].dims.length),d=e.length>3?q(`zeroPoint`,e[3].dataType,e[3].dims.length):void 0,f=J(`output`,l,s.length),p=[i,o,c];return d&&p.push(d),`
        ${t.registerUniforms([{name:`output_size`,type:`u32`},{name:`quantize_axis`,type:`u32`},{name:`gather_axis`,type:`u32`},{name:`block_size`,type:`u32`}]).declareVariables(...p,f)}
        ${t.mainStart()}
        let output_indices = ${f.offsetToIndices(`global_idx`)};
        var indices_indices = ${o.type.indices}(0);
        ${r.length>1?`
          for (var i: u32 = 0; i < ${r.length}; i++) {
            let index = ${f.indicesGet(`output_indices`,`uniforms.gather_axis + i`)};
            ${o.indicesSet(`indices_indices`,`i`,`index`)};
          }`:`indices_indices = ${f.indicesGet(`output_indices`,`uniforms.gather_axis`)};`};
        var data_indices = ${i.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${f.indicesGet(`output_indices`,`i`)};
          ${i.indicesSet(`data_indices`,`i`,`index`)};
        }
        var index_from_indices = ${o.getByIndices(`indices_indices`)};
        if (index_from_indices < 0) {
          index_from_indices += ${n[a]};
        }
        ${i.indicesSet(`data_indices`,`uniforms.gather_axis`,`u32(index_from_indices)`)};
        for (var i = uniforms.gather_axis + 1; i < ${s.length}; i++) {
          let index = ${f.indicesGet(`output_indices`,`i + ${r.length} - 1`)};
          ${i.indicesSet(`data_indices`,`i`,`index`)};
        }
        let data_offset = ${i.indicesToOffset(`data_indices`)};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${i.getByOffset(`data_offset / 8`)};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${u?`unpack4xI8`:`unpack4xU8`}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${c.indicesGet(`data_indices`,`uniforms.quantize_axis`)} / uniforms.block_size;
        ${c.indicesSet(`scale_indices`,`uniforms.quantize_axis`,`quantize_axis_index`)};
        var scale = ${c.getByIndices(`scale_indices`)};
        ${d?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${d.indicesToOffset(`zero_point_indices`)};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${d.getByOffset(`zero_point_offset / 8`)};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${u?`unpack4xI8`:`unpack4xU8`}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:`var zero_point = 0`};
        let dequantized_data = ${xn(l)}(quantized_data - zero_point) * scale;
        ${f.setByOffset(`global_idx`,`dequantized_data`)};
    }`}}},As=(e,t)=>{let n=e.inputs;Os(n,t),e.compute(ks(e.inputs,t))},js=e=>H({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),Ns,Ps,Fs,Is,Ls=a(()=>{"use strict";R(),V(),U(),Y(),Ns=e=>{if(!e||e.length!==2)throw Error(`GatherElements requires 2 inputs.`);if(e[0].dims.length<1)throw Error(`GatherElements requires that the data input be rank >= 1.`);if(e[0].dims.length!==e[1].dims.length)throw Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},Ps=(e,t)=>{let n=e[0].dims,r=e[0].dataType,i=n.length,a=e[1].dims,o=e[1].dataType,s=B.normalizeAxis(t.axis,i),c=n[s],l=a.slice(0),u=B.size(l),d=q(`input`,r,i),f=q(`indicesInput`,o,a.length),p=J(`output`,r,l.length),m=[{type:12,data:u},{type:6,data:c},{type:12,data:s}];return m.push(...W(n,a,l)),{name:`GatherElements`,shaderCache:{inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:m}),getShaderSource:e=>`
      ${e.registerUniform(`outputSize`,`u32`).registerUniform(`axisDimLimit`,`i32`).registerUniform(`axis`,`u32`).declareVariables(d,f,p)}
      ${e.mainStart()}
      ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}

      let outputIndices = ${p.offsetToIndices(`global_idx`)};

      var idx = ${f.getByOffset(`global_idx`)};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${d.type.indices}(outputIndices);
      ${d.indicesSet(`inputIndices`,`uniforms.axis`,`u32(idx)`)};
      let value = ${d.getByIndices(`inputIndices`)};

      ${p.setByOffset(`global_idx`,`value`)};
  }`}},Fs=e=>H({axis:e.axis}),Is=(e,t)=>{let n=e.inputs;Ns(n),e.compute(Ps(e.inputs,t))}}),Rs,zs,Bs,Vs,Hs=a(()=>{"use strict";R(),V(),Y(),Rs=e=>{if(!e)throw Error(`Input is missing`);if(e.length<2||e.length>3)throw Error(`Invaid input number.`);if(e.length===3&&e[2].dims.length>2)throw Error(`Invalid input shape of C`);if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw Error(`Input types are mismatched`)},zs=(e,t)=>{let n=e[0].dims.slice(),r=e[1].dims.slice(),[i,a,o]=Rt.getShapeOfGemmResult(n,t.transA,r,t.transB,e.length===3?e[2].dims:void 0),s=[i,a];if(!s)throw Error(`Can't use gemm on the given tensors`);let c=Math.ceil(a/16),l=Math.ceil(i/16);B.size(s);let u=[{type:12,data:c},{type:12,data:i},{type:12,data:a},{type:12,data:o},{type:1,data:t.alpha},{type:1,data:t.beta}],d=[`type`,`type`];return e.length===3&&(u.push(...W(e[2].dims)),d.push(`rank`)),u.push(...W(s)),{name:`GemmShared`,shaderCache:{hint:`${t.cacheKey}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:c*l},programUniforms:u}),getShaderSource:n=>{let r=q(`a`,e[0].dataType,e[0].dims),i=q(`b`,e[1].dataType,e[1].dims),a=null,o=[r,i];e.length===3&&(a=q(`c`,e[2].dataType,e[2].dims.length),o.push(a));let c=J(`output`,e[0].dataType,s.length);o.push(c);let l=[{name:`num_tile_n`,type:`u32`},{name:`M`,type:`u32`},{name:`N`,type:`u32`},{name:`K`,type:`u32`},{name:`alpha`,type:`f32`},{name:`beta`,type:`f32`}],u=``,d=``;t.transA&&t.transB?(d=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[k][local_id.y] * tile_b[local_id.x][k];`):t.transA&&!t.transB?(d=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[k][local_id.y] * tile_b[k][local_id.x];`):!t.transA&&t.transB?(d=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[local_id.y][k] * tile_b[local_id.x][k];`):!t.transA&&!t.transB&&(d=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[local_id.y][k] * tile_b[k][local_id.x];`);let f=t.alpha===1?``:`value *= uniforms.alpha;`;return`
  ${n.registerUniforms(l).declareVariables(...o)}
  var<workgroup> tile_a: array<array<${r.type.storage}, 16>, 16>;
  var<workgroup> tile_b: array<array<${i.type.storage}, 16>, 16>;
  ${n.mainStart([16,16,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * 16;
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * 16;
    let num_tiles = (uniforms.K - 1) / 16 + 1;
    var k_start = 0u;
    var value = ${c.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${d}
      k_start = k_start + 16;
      workgroupBarrier();

      for (var k: u32 = 0u; k < 16; k++) {
        ${u}
      }
      workgroupBarrier();
    }

    ${f}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${a==null?``:`let cOffset = ${a.broadcastedIndicesToOffset(`vec2(m, n)`,c)}; value += ${c.type.value}(uniforms.beta) * ${a.getByOffset(`cOffset`)};`}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`}}},Bs=e=>({transA:e.transA,transB:e.transB,alpha:e.alpha,beta:e.beta,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}),Vs=(e,t)=>{Rs(e.inputs),e.compute(zs(e.inputs,t))}}),Us,Ws,Gs,Ks,qs,Js,Ys,Xs,Zs,Qs,$s,ec,tc,nc,rc=a(()=>{"use strict";R(),V(),U(),Y(),[Us,Ws,Gs,Ks]=[0,1,2,3],qs=e=>{if(e[0].dims.length!==4)throw Error(`only 4-D tensor is supported.`);if(e[0].dims.length!==e[1].dims.length)throw Error(`input dimensions must be equal to grid dimensions`);if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw Error(`grid batch size must match input batch size`)},Js=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Ys=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,Xs=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Zs=e=>`
  ${e.paddingMode===`reflection`?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:``}
`,Qs=(e,t,n)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${Us}] = batch;
     indices[${Ws}] = channel;`+(()=>{switch(n.paddingMode){case`zeros`:return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${Gs}] = u32(r);
            indices[${Ks}] = u32(c);
          } else {
            return ${t}(0);
          }
        `;case`border`:return`
          indices[${Gs}] = u32(clamp(r, 0, H - 1));
          indices[${Ks}] = u32(clamp(c, 0, W - 1));
        `;case`reflection`:return`
          indices[${Gs}] = gs_reflect(r, border[1], border[3]);
          indices[${Ks}] = gs_reflect(c, border[0], border[2]);
        `;default:throw Error(`padding mode ${n.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices(`indices`)};
  }
`,$s=(e,t,n)=>(()=>{switch(n.mode){case`nearest`:return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${Us}], indices[${Ws}], border);
        `;case`bilinear`:return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${Us}], indices[${Ws}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${Us}], indices[${Ws}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${Us}], indices[${Ws}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${Us}], indices[${Ws}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case`bicubic`:return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${Us}], indices[${Ws}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw Error(`mode ${n.mode} is not supported`)}})()+`${e.setByOffset(`global_idx`,`result`)}`,ec=(e,t)=>{let n=q(`x`,e[0].dataType,e[0].dims.length),r=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],i=q(`grid`,e[1].dataType,r.length,2),a=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format===`NHWC`&&(a=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[Us,Ws,Gs,Ks]=[0,3,1,2]);let o=J(`output`,e[0].dataType,a.length),s=n.type.value,c=[{type:12,data:B.size(a)},...W(e[0].dims,r,a)];return{name:`GridSample`,shaderCache:{hint:`${t.cacheKey}`,inputDependencies:[`type`,`type`]},getRunData:e=>{let t=B.size(a);return{outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(t/64)},programUniforms:c}},getShaderSource:e=>`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(n,i,o)}
  ${Js}
  ${Ys(s)}
  ${Xs(t)}
  ${Zs(t)}
  ${Qs(n,s,t)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
      let H_in = i32(uniforms.x_shape[${Gs}]);
      let W_in = i32(uniforms.x_shape[${Ks}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${o.offsetToIndices(`global_idx`)};
      var grid_indices = vec3<u32>(indices[${Us}], indices[${Gs}], indices[${Ks}]);
      let nxy = ${i.getByIndices(`grid_indices`)};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${$s(o,s,t)}
  }`}},tc=(e,t)=>{qs(e.inputs),e.compute(ec(e.inputs,t))},nc=e=>H({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),ic,ac,oc,sc,cc,lc,uc,dc=a(()=>{"use strict";R(),V(),U(),on(),Gr(),Y(),zn(),ic=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,ac=(e,t)=>{let n=e[0],r=ic(e,1),i=ic(e,2),a=ic(e,3),o=ic(e,4),s=ic(e,5),c=ic(e,6),l=ic(e,7);if(n.dims.length!==3&&n.dims.length!==5)throw Error(`Input query is expected to have 3 or 5 dimensions`);let u=n.dims[0],d=n.dims[1],f=n.dims.length===3?n.dims[2]:t.numHeads*n.dims[4],p=d,m=0,h=0,g=Math.floor(f/t.numHeads);if(c&&l&&B.size(c.dims)&&B.size(l.dims)){if(c.dims.length!==4)throw Error(`Input "past_key" is expected to have 4 dimensions`);if(c.dims[0]!==u||c.dims[1]!==t.numHeads||c.dims[3]!==g)throw Error(`Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)`);if(l.dims[0]!==u||l.dims[1]!==t.numHeads||l.dims[3]!==g)throw Error(`Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)`);if(c.dims[2]!==l.dims[2])throw Error(`Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)`);if(l.dims.length!==4)throw Error(`Input "past_value" is expected to have 4 dimensions`);m=c.dims[2],h=c.dims[2]}else if(c&&B.size(c.dims)||l&&B.size(l.dims))throw Error(`Input "past_key" and "past_value" shall be both present or both absent`);let _;if(r&&B.size(r.dims)>0){if(n.dims.length!==3)throw Error(`Input "query" is expected to have 3 dimensions when key is given`);if(r.dims.length<3||r.dims.length>5)throw Error(`Input "key" is expected to have 3, 4, or 5 dimensions`);if(n.dims[0]!==r.dims[0])throw Error(`Input "query" and "key" shall have same dim 0 (batch size)`);if(r.dims.length===3){if(r.dims[2]!==n.dims[2])throw Error(`Input "query" and "key" shall have same dim 2 (hidden_size)`);_=2,p=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==g)throw Error(`Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv`);if(i)throw Error(`Expect "value" be none when "key" has packed kv format.`);_=5,p=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==g)throw Error(`Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key`);_=0,p=r.dims[2]}}else{if(n.dims.length!==5)throw Error(`Input "query" is expected to have 5 dimensions when key is empty`);if(n.dims[2]!==t.numHeads||n.dims[3]!==3)throw Error(`Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv`);_=3}if(a&&B.size(a.dims)>0){if(a.dims.length!==1)throw Error(`Input "bias" is expected to have 1 dimension`);if(r&&r.dims.length===5&&r.dims[3]===2)throw Error(`bias is not allowed for packed kv.`)}let v=m+p,y=0;if(o&&B.size(o.dims)>0){y=8;let e=o.dims;throw e.length===1?e[0]===u?y=1:e[0]===3*u+2&&(y=3):e.length===2&&e[0]===u&&e[1]===v&&(y=5),Error(y===8?`Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)`:`Mask not supported`)}let b=!1,x=f;if(i&&B.size(i.dims)>0){if(i.dims.length!==3&&i.dims.length!==4)throw Error(`Input "value" is expected to have 3 or 4 dimensions`);if(n.dims[0]!==i.dims[0])throw Error(`Input "query" and "value" shall have same dim 0 (batch_size)`);if(i.dims.length===3){if(p!==i.dims[1])throw Error(`Input "key" and "value" shall have the same dim 1 (kv_sequence_length)`);x=i.dims[2]}else{if(p!==i.dims[2])throw Error(`Input "key" and "value" shall have the same dim 2 (kv_sequence_length)`);x=i.dims[1]*i.dims[3],b=!0}}if(o&&B.size(o.dims)>0)throw Error(`Key padding mask is not supported`);if(s&&B.size(s.dims)>0){if(s.dims.length!==4)throw Error(`Input "attention_bias" is expected to have 4 dimensions`);if(s.dims[0]!==u||s.dims[1]!==t.numHeads||s.dims[2]!==d||s.dims[3]!==v)throw Error(`Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)`)}return{batchSize:u,sequenceLength:d,pastSequenceLength:m,kvSequenceLength:p,totalSequenceLength:v,maxSequenceLength:h,inputHiddenSize:0,hiddenSize:f,vHiddenSize:x,headSize:g,vHeadSize:Math.floor(x/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:y,scale:t.scale,broadcastResPosBias:!1,passPastInKv:b,qkvFormat:_}},oc=e=>H({...e}),sc=H({perm:[0,2,1,3]}),cc=(e,t,n,r,i,a,o)=>{let s=[r,i,a],c=B.size(s),l=[{type:12,data:c},{type:12,data:o},{type:12,data:a}];return e.compute({name:`MultiHeadAttentionAddBias`,shaderCache:{inputDependencies:[`type`,`type`]},getRunData:()=>({outputs:[{dims:s,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:l}),getShaderSource:e=>{let r=J(`qkv_with_bias`,t.dataType,s),i=q(`qkv`,t.dataType,s),a=q(`bias`,n.dataType,s);return`
  ${e.registerUniforms([{name:`output_size`,type:`u32`},{name:`bias_offset`,type:`u32`},{name:`hidden_size`,type:`u32`}]).declareVariables(i,a,r)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`}},{inputs:[t,n],outputs:[-1]})[0]},lc=(e,t,n,r,i,a,o,s)=>{let c=a;if(o&&B.size(o.dims)>0){if(r===1)throw Error(`AddBiasReshape is not implemented. Please export your model with packed QKV or KV`);return c=cc(e,a,o,t,r,n*i,s),c=c.reshape([t,r,n,i]),n===1||r===1?c:e.compute(In(c,sc.perm),{inputs:[c],outputs:[-1]})[0]}return a.dims.length===3&&(c=a.reshape([t,r,n,i])),n===1||r===1?c:e.compute(In(c,sc.perm),{inputs:[c],outputs:[-1]})[0]},uc=(e,t)=>{let n=ac(e.inputs,t),r=e.inputs[0],i=ic(e.inputs,1),a=ic(e.inputs,2),o=ic(e.inputs,3),s=ic(e.inputs,4),c=ic(e.inputs,5),l=ic(e.inputs,6),u=ic(e.inputs,7);if(r.dims.length===5)throw Error(`Packed QKV is not implemented`);if(i?.dims.length===5)throw Error(`Packed KV is not implemented`);let d=i&&a&&i.dims.length===4&&a.dims.length===4,f=lc(e,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,r,o,0);if(d)return Hr(e,f,i,a,s,void 0,l,u,c,n);if(!i||!a)throw Error(`key and value must be provided`);let p=lc(e,n.batchSize,n.numHeads,n.kvSequenceLength,n.headSize,i,o,n.hiddenSize),m=lc(e,n.batchSize,n.numHeads,n.kvSequenceLength,n.vHeadSize,a,o,2*n.hiddenSize);Hr(e,f,p,m,s,void 0,l,u,c,n)}}),fc,pc,mc,hc,gc,_c,vc,yc=a(()=>{"use strict";R(),V(),U(),Y(),fc=e=>{if(!e||e.length<1)throw Error(`too few inputs`)},pc=(e,t)=>{let n=[],r=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(e=>n.push(Number(e))),r=n.length),H({numOutputs:r,axis:t.axis,splitSizes:n})},mc=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${K(`uniforms.size_in_split_axis`,`i`,e)}) {
        return i;
    }
    }
    return ${e}u;
}`,hc=e=>{let t=e.length,n=[];for(let r=0;r<t;++r){let i=e[r].setByIndices(`indices`,`input[global_idx]`);t===1?n.push(i):r===0?n.push(`if (output_number == ${r}u) { ${i} }`):r===t-1?n.push(`else { ${i} }`):n.push(`else if (output_number == ${r}) { ${i} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${n.join(`
`)}
      }`},gc=(e,t)=>{let n=e[0].dims,r=B.size(n),i=e[0].dataType,a=B.normalizeAxis(t.axis,n.length),o=Array(t.numOutputs),s=q(`input`,i,n.length),c=Array(t.numOutputs),l=[],u=[],d=0,f=[{type:12,data:r}];for(let r=0;r<t.numOutputs;r++){d+=t.splitSizes[r],c[r]=d;let s=n.slice();s[a]=t.splitSizes[r],u.push(s),o[r]=J(`output${r}`,i,s.length),l.push({dims:u[r],dataType:e[0].dataType})}return f.push({type:12,data:c},...W(n,...u)),{name:`Split`,shaderCache:{hint:t.cacheKey,inputDependencies:[`rank`]},getShaderSource:e=>`
  ${e.registerUniform(`input_size`,`u32`).registerUniform(`size_in_split_axis`,`u32`,c.length).declareVariables(s,...o)}
  ${mc(c.length)}
  ${hc(o)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.input_size`)}

    var indices = ${s.offsetToIndices(`global_idx`)};
    var index = ${s.indicesGet(`indices`,a)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${K(`uniforms.size_in_split_axis`,`output_number - 1u`,c.length)};
      ${s.indicesSet(`indices`,a,`index`)};
    }
    writeBufferData(output_number, indices, global_idx);
  }`,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(r/64)},programUniforms:f})}},_c=(e,t)=>{fc(e.inputs);let n=e.inputs.length===1?t:pc(e.inputs,t);e.compute(gc(e.inputs,n),{inputs:[0]})},vc=e=>{let t=e.axis,n=e.splitSizes,r=e.numOutputs<0?n.length:e.numOutputs;if(r!==n.length)throw Error(`numOutputs and splitSizes length must be equal`);return H({axis:t,numOutputs:r,splitSizes:n})}}),bc,xc,Sc,Cc=a(()=>{"use strict";R(),V(),U(),Y(),bc=(e,t)=>{let[n,r,i,a]=e,{numHeads:o,rotaryEmbeddingDim:s}=t;if(n.dims.length!==3&&n.dims.length!==4)throw Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${n.dims.length}`);if(!B.areEqual(r.dims,[])&&!B.areEqual(r.dims,[1])&&r.dims.length!==2)throw Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${r.dims.length}`);if(i.dims.length!==2)throw Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(!B.areEqual(i.dims,a.dims))throw Error(`Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape`);if(s>0&&o===0)throw Error(`num_heads must be provided if rotary_embedding_dim is specified`);let c=n.dims[0],l=n.dims[n.dims.length-2],u=i.dims[0],d=B.sizeFromDimension(n.dims,1)/l,f=s===0?i.dims[1]*2:d/o;if(s>f)throw Error(`rotary_embedding_dim must be less than or equal to head_size`);if(r.dims.length===2){if(c!==r.dims[0])throw Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${r.dims[0]}`);if(l!==r.dims[1])throw Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${r.dims[1]}`)}if(l>u)throw Error(`Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported`);if(f/2!==i.dims[1]&&s/2!==i.dims[1])throw Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${i.dims[1]}`)},xc=(e,t)=>{let{interleaved:n,numHeads:r,rotaryEmbeddingDim:i,scale:a}=t,o=e[0].dims[0],s=B.sizeFromDimension(e[0].dims,1),c=e[0].dims[e[0].dims.length-2],l=s/c,u=e[2].dims[1],d=i===0?u*2:l/r,f=[o,c,l/d,d-u],p=B.computeStrides(f),m=[{type:1,data:a},{type:12,data:f},{type:12,data:p},...e[0].dims.length===3?Array({type:12,data:[s,l,d,1]}):[],...e[0].dims.length===4?Array({type:12,data:[s,d,c*d,1]}):[],...W(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)];return{name:`RotaryEmbedding`,shaderCache:{hint:H({interleaved:n}).cacheKey,inputDependencies:[`rank`,`rank`,`rank`,`rank`]},getShaderSource:t=>{let r=q(`input`,e[0].dataType,e[0].dims.length),i=q(`position_ids`,e[1].dataType,e[1].dims.length),a=q(`cos_cache`,e[2].dataType,e[2].dims.length),o=q(`sin_cache`,e[3].dataType,e[3].dims.length),s=J(`output`,e[0].dataType,e[0].dims.length);return t.registerUniforms([{name:`scale`,type:`f32`},{name:`global_shape`,type:`u32`,length:f.length},{name:`global_strides`,type:`u32`,length:p.length},{name:`input_output_strides`,type:`u32`,length:p.length}]),`
        ${t.declareVariables(r,i,a,o,s)}

        ${t.mainStart(vn)}
          let half_rotary_emb_dim = uniforms.${a.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${t.guardAgainstOutOfBoundsWorkgroupSizes(`size`)}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${i.broadcastedIndicesToOffset(`bsnh.xy`,J(``,i.type.tensor,2))};
            let position_id =
                u32(${i.getByOffset(`position_ids_idx`)}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${n});
            let j = i + select(half_rotary_emb_dim, 1, ${n});
            let re = ${r.getByOffset(`i`)} * ${a.get(`position_id`,`bsnh[3]`)} -
                ${r.getByOffset(`j`)} * ${o.get(`position_id`,`bsnh[3]`)};
            ${s.setByOffset(`i`,`re`)}
            let im = ${r.getByOffset(`i`)} * ${o.get(`position_id`,`bsnh[3]`)} +
                ${r.getByOffset(`j`)} * ${a.get(`position_id`,`bsnh[3]`)};
            ${s.setByOffset(`j`,`im`)}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${s.setByOffset(`k`,r.getByOffset(`k`))}
          }
        }`},getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(B.size(f)/vn)},programUniforms:m})}},Sc=(e,t)=>{bc(e.inputs,t),e.compute(xc(e.inputs,t))}}),wc,Tc,Ec,Dc,Oc,kc=a(()=>{"use strict";U(),R(),Gr(),dc(),yc(),zn(),Cc(),Y(),wc=(e,t)=>{if(t.doRotary&&e.length<=7)throw Error(`cos_cache and sin_cache inputs are required if do_rotary is specified`);let n=e[0],r=e[1],i=e[2],a=e[3],o=e[4];if(t.doRotary!==0&&e.length<=7)throw Error(`cos_cast and sin_cache are expected if do_rotary attribute is non-zero`);if(t.localWindowSize!==-1)throw Error(`Local attention is not supported`);if(t.softcap!==0)throw Error(`Softcap is not supported`);if(t.rotaryInterleaved!==0)throw Error(`Rotary interleaved is not supported`);if(t.smoothSoftmax)throw Error(`Smooth softmax is not supported`);if(n.dims.length!==3&&n.dims.length!==5)throw Error(`Input query is expected to have 3 or 5 dimensions`);let s=n.dims[0],c=n.dims[1],l=n.dims.length===3?n.dims[2]:t.numHeads*n.dims[4],u=c,d=0,f=!r||r.dims.length===0,p=Math.floor(f?l/(t.numHeads+2*t.kvNumHeads):l/t.numHeads);f&&(l=p*t.numHeads);let m=a&&a.dims.length!==0,h=o&&o.dims.length!==0;if(m&&a.dims.length===4&&a.dims[0]===s&&a.dims[1]!==t.kvNumHeads&&a.dims[2]===t.kvNumHeads&&a.dims[3]===p)throw Error(`BSNH pastKey/pastValue is not supported`);if(m&&h){if(a.dims.length!==4)throw Error(`Input "past_key" is expected to have 4 dimensions`);if(o.dims.length!==4)throw Error(`Input "past_value" is expected to have 4 dimensions`);d=a.dims[2]}else if(m||h)throw Error(`Input "past_key" and "past_value" shall be both present or both absent`);let g=1;if(r&&r.dims.length>0){if(n.dims.length!==3)throw Error(`Input "query" is expected to have 3 dimensions when key is given`);if(r.dims.length<3||r.dims.length>5)throw Error(`Input "key" is expected to have 3, 4, or 5 dimensions`);if(n.dims[0]!==r.dims[0])throw Error(`Input "query" and "key" shall have same dim 0 (batch size)`);if(r.dims.length===3){if(n.dims[2]%r.dims[2]!==0)throw Error(`Dimension 2 of "query" should be a multiple of "key"`);u=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==p)throw Error(`Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv`);if(i)throw Error(`Expect "value" be none when "key" has packed kv format.`);u=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==p)throw Error(`Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key`);u=r.dims[2]}}else{if(n.dims.length!==3&&n.dims.length!==5)throw Error(`Input "query" is expected to have 3 or 5 dimensions when key is empty`);if(n.dims.length===5&&(n.dims[2]!==t.numHeads||n.dims[3]!==3))throw Error(`Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv`);g=3}let _=!1,v=t.kvNumHeads?p*t.kvNumHeads:l;if(i&&i.dims.length>0){if(i.dims.length!==3&&i.dims.length!==4)throw Error(`Input "value" is expected to have 3 or 4 dimensions`);if(n.dims[0]!==i.dims[0])throw Error(`Input "query" and "value" shall have same dim 0 (batch_size)`);if(i.dims.length===3){if(u!==i.dims[1])throw Error(`Input "key" and "value" shall have the same dim 1 (kv_sequence_length)`);v=i.dims[2]}else{if(u!==i.dims[2])throw Error(`Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)`);v=i.dims[1]*i.dims[3],_=!0}}let y=e.length>4?e[5]:void 0;if(y){if(y.dims.length===0)throw Error(`seqlens_k must be at least 1D, got scalar.`);let e=y.dims.reduce((e,t)=>e*t,1);if(e!==s)throw Error(`seqlens_k must have batch_size (${s}) elements, got ${e}.`);for(let e=0;e<y.dims.length;e++)if(y.dims[e]!==1&&y.dims[e]!==s)throw Error(`seqlens_k has unexpected shape. Each dimension must be 1 or batch_size (${s}), got dims[${e}] = ${y.dims[e]}.`)}return{batchSize:s,sequenceLength:c,pastSequenceLength:d,kvSequenceLength:u,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:l,vHiddenSize:v,headSize:p,vHeadSize:Math.floor(v/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:0,scale:t.scale,broadcastResPosBias:!1,passPastInKv:_,qkvFormat:g}},Tc=H({perm:[0,2,1,3]}),Ec=(e,t,n)=>{let r=t,i=n.kvNumHeads;return t.dims.length===3&&n.kvSequenceLength!==0&&(r=t.reshape([n.batchSize,n.kvSequenceLength,i,n.headSize]),r=e.compute(In(r,Tc.perm),{inputs:[r],outputs:[-1]})[0]),r},Dc=(e,t,n,r)=>{let i=[`type`,`type`],a=[e*t],o=e*t,s=[{type:12,data:o},{type:12,data:t},{type:12,data:e}];return{name:`GeneratePositionIds`,shaderCache:{hint:`${e};${t}`,inputDependencies:i},getRunData:()=>({outputs:[{dims:a,dataType:7}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:s}),getShaderSource:e=>{let t=q(`seq_lens`,n.dataType,n.dims),i=q(`total_seq_lens`,r.dataType,r.dims),o=J(`pos_ids`,7,a);return`
  ${e.registerUniforms([{name:`output_size`,type:`u32`},{name:`sequence_length`,type:`u32`},{name:`batch_size`,type:`u32`}]).declareVariables(t,i,o)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let total_sequence_length = u32(${i.getByOffset(`0`)});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${t.getByOffset(`batch_idx`)};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${o.setByOffset(`global_idx`,`pos_id`)}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${o.setByOffset(`global_idx`,`pos_id`)}
    } else if (global_idx < uniforms.batch_size) {
      ${o.setByOffset(`global_idx`,`seqlen`)}
    };
  }
  `}}},Oc=(e,t)=>{if(e.inputs.length>14&&e.inputs[14]||e.inputs.length>15&&e.inputs[15])throw Error(`GroupQueryAttention (JSEP): q_norm_weight / k_norm_weight inputs are not supported. The per-head Q/K RMS normalization prologue is implemented only on the CUDA and native WebGPU EPs.`);let n=wc(e.inputs,t);if(e.inputs[0].dims.length===5)throw Error(`Packed QKV is not implemented`);if(e.inputs[1]?.dims.length===5)throw Error(`Packed KV is not implemented`);let r=e.inputs[0],i=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,a=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,o=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,s=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,c=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,u=n.kvNumHeads?n.kvNumHeads:n.numHeads,d=H({axis:2,numOutputs:3,splitSizes:[n.numHeads*n.headSize,u*n.headSize,u*n.headSize]}),[f,p,m]=!i&&!a?e.compute(gc([r],d),{inputs:[r],outputs:[-1,-1,-1]}):[r,i,a],h,g;if(t.doRotary){let r=e.compute(Dc(n.batchSize,n.sequenceLength,c,l),{inputs:[c,l],outputs:[-1]})[0],i=e.inputs[7],a=e.inputs[8],o=H({interleaved:t.rotaryInterleaved!==0,numHeads:n.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),s=[f,r,i,a],u=[-1];h=e.compute(xc(s,o),{inputs:s,outputs:u})[0],s.splice(0,1,p);let d=H({interleaved:t.rotaryInterleaved!==0,numHeads:n.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});g=e.compute(xc(s,d),{inputs:s,outputs:u})[0]}let _=lc(e,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,t.doRotary?h:f,void 0,0),v=Ec(e,t.doRotary?g:p,n),y=Ec(e,m,n);Hr(e,_,v,y,void 0,void 0,o,s,void 0,n,c,l)}}),Ac,jc,Mc,Nc,Pc=a(()=>{"use strict";R(),V(),zn(),Y(),Ac=(e,t,n,r,i,a,o,s)=>{let c=G(a),l=c===1?`f32`:`vec${c}f`,u=c===1?`vec2f`:`mat2x${c}f`,d=i*o,f=64;d===1&&(f=256);let p=[i,o,a/c],m=[i,o,2],h=[`rank`,`type`,`type`],g=[];return g.push(...W(p,m)),e.compute({name:`InstanceNormComputeChannelScaleShift`,shaderCache:{hint:`${c};${s};${f}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:m,dataType:1}],dispatchGroup:{x:d},programUniforms:g}),getShaderSource:e=>{let i=q(`x`,t.dataType,3,c),a=[i,q(`scale`,n.dataType,n.dims),q(`bias`,r.dataType,r.dims),J(`output`,1,3,2)];return`
  var<workgroup> workgroup_shared : array<${u}, ${f}>;
  const workgroup_size = ${f}u;
  ${e.declareVariables(...a)}
  ${e.mainStart(f)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${i.get(`batch`,`channel`,`h`)});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${u}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${wn(`workgroup_shared[0][0]`,c)} / f32(hight * ${c});
      let squared_sum_final = ${wn(`workgroup_shared[0][1]`,c)} / f32(hight * ${c});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${s}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`}},{inputs:[t,n,r],outputs:[-1]})[0]},jc=(e,t,n)=>{let r=t[0].dims,i=r,a=r[0],o=r[1],s=B.sizeFromDimension(r,2),c=G(s),l=B.size(i)/c,u=Ac(e,t[0],t[1],t[2],a,s,o,n.epsilon),d=[a,o,s/c],f=[a,o];e.compute({name:`InstanceNormalization`,shaderCache:{hint:`${c}`,inputDependencies:[`type`,`none`]},getRunData:()=>({outputs:[{dims:i,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:[{type:12,data:l},...W(d,f,d)]}),getShaderSource:e=>{let n=q(`x`,t[0].dataType,d.length,c),r=q(`scale_shift`,1,f.length,2),i=J(`output`,t[0].dataType,d.length,c),a=[n,r,i];return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(...a)}
  ${e.mainStart()}
  ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
      let outputIndices = ${i.offsetToIndices(`global_idx`)};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${r.getByIndices(`vec2<u32>(batch, channel)`)};
      let value = ${n.getByOffset(`global_idx`)} * ${i.type.value}(scale_shift.x) + ${i.type.value}(scale_shift.y);
      ${i.setByOffset(`global_idx`,`value`)};
  }`}},{inputs:[t[0],u]})},Mc=(e,t,n)=>{let r=t[0].dims,i=r,a=r[0],o=r[r.length-1],s=B.sizeFromDimension(r,1)/o,c=G(o),l=B.size(i)/c,u=[{type:12,data:s},{type:12,data:Math.floor(o/c)}],d=[`type`,`type`],f=!1,p=[0,r.length-1];for(let e=0;e<r.length-2;e++)f||=r[e+1]!==1,p.push(e+1);f&&=r[r.length-1]!==1;let m=f?e.compute(In(e.inputs[0],p),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:r.length},(e,t)=>r[p[t]])),h=Ac(e,m,t[1],t[2],a,s,o,n.epsilon);e.compute({name:`InstanceNormalizationNHWC`,shaderCache:{hint:`${c}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:i,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:u}),getShaderSource:e=>{let n=bn(t[0].dataType),r=c===1?`vec2f`:`mat${c}x2f`,a=e=>{let t=e===0?`x`:`y`,r=c===1?`f32`:`vec${c}f`;switch(c){case 1:return`${n}(${r}(scale.${t}))`;case 2:return`vec2<${n}>(${r}(scale[0].${t}, scale[1].${t}))`;case 4:return`vec4<${n}>(${r}(scale[0].${t}, scale[1].${t}, scale[2].${t}, scale[3].${t}))`;default:throw Error(`Not supported compoents ${c}`)}},o=q(`input`,t[0].dataType,t[0].dims,c),s=J(`output`,t[0].dataType,i,c);return`
  @group(0) @binding(0) var<storage, read> input : array<${o.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${r}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${s.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${e.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${a(0)}, ${a(1)});
  }`}},{inputs:[t[0],h]})},Nc=(e,t)=>{t.format===`NHWC`?Mc(e,e.inputs,t):jc(e,e.inputs,t)}}),Fc,Ic,Lc,Rc=a(()=>{"use strict";R(),V(),Y(),Fc=e=>{if(!e||e.length<2)throw Error(`layerNorm requires at least 2 inputs.`)},Ic=(e,t,n)=>{let r=t.simplified,i=e[0].dims,a=e[1],o=!r&&e[2],s=i,c=B.normalizeAxis(t.axis,i.length),l=B.sizeToDimension(i,c),u=B.sizeFromDimension(i,c),d=B.size(a.dims),f=o?B.size(o.dims):0;if(d!==u||o&&f!==u)throw Error(`Size of X.shape()[axis:] == ${u}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${d} and bias size of ${f}`);let p=[];for(let e=0;e<i.length;++e)e<c?p.push(i[e]):p.push(1);let m=G(u),h=[`type`,`type`],g=[{type:12,data:l},{type:1,data:u},{type:12,data:Math.floor(u/m)},{type:1,data:t.epsilon}];o&&h.push(`type`);let _=n>1,v=n>2,y=t=>{let n=bn(e[0].dataType),i=[q(`x`,e[0].dataType,e[0].dims,m),q(`scale`,a.dataType,a.dims,m)];return o&&i.push(q(`bias`,o.dataType,o.dims,m)),i.push(J(`output`,e[0].dataType,s,m)),_&&i.push(J(`mean_data_output`,1,p)),v&&i.push(J(`inv_std_output`,1,p)),`
  ${t.registerUniforms([{name:`norm_count`,type:`u32`},{name:`norm_size`,type:`f32`},{name:`norm_size_vectorized`,type:`u32`},{name:`epsilon`,type:`f32`}]).declareVariables(...i)}
  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.norm_count`)}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${Sn(`f32`,m)};
    var mean_square_vector = ${Sn(`f32`,m)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${Cn(n,m,`x[h + offset]`)};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${wn(`mean_vector`,m)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${wn(`mean_square_vector`,m)} / uniforms.norm_size ${r?``:`- mean * mean`} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${Cn(n,m,`x[j + offset]`)};
      let f32scale = ${Cn(n,m,`scale[j]`)};
      output[j + offset] = ${i[0].type.value}((f32input ${r?``:`- mean`}) * inv_std_dev * f32scale
        ${o?`+ ${Cn(n,m,`bias[j]`)}`:``}
      );
    }

    ${_?`mean_data_output[global_idx] = mean`:``};
    ${v?`inv_std_output[global_idx] = inv_std_dev`:``};
  }`},b=[{dims:s,dataType:e[0].dataType}];return _&&b.push({dims:p,dataType:1}),v&&b.push({dims:p,dataType:1}),{name:`LayerNormalization`,shaderCache:{hint:`${m};${n};${r}`,inputDependencies:h},getRunData:()=>({outputs:b,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:g}),getShaderSource:y}},Lc=(e,t)=>{Fc(e.inputs),e.compute(Ic(e.inputs,t,e.outputCount))}}),zc,Bc,Vc=a(()=>{"use strict";V(),Aa(),za(),zc=e=>{if(!e||e.length!==2)throw Error(`MatMul requires 2 inputs.`);if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw Error(`shared dimension does not match.`)},Bc=e=>{zc(e.inputs);let t=It.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw Error(`Can't use matmul on the given tensors`);let n=t[t.length-1],r=e.inputs[0].dims[e.inputs[0].dims.length-1];if(n<8&&r<8)e.compute(ka(e.inputs,{activation:``},t));else{let i=t[t.length-2],a=B.size(e.inputs[0].dims.slice(0,-2)),o=B.size(e.inputs[1].dims.slice(0,-2));if(a!==1&&i===1&&o===1){let i=e.inputs[0].reshape([1,a,r]),o=e.inputs[1].reshape([1,r,n]),s=[1,a,n],c=[i,o];e.compute(Ra(c,{activation:``},t,s),{inputs:c})}else e.compute(Ra(e.inputs,{activation:``},t))}}}),Hc,Uc,Wc,Gc,Kc,qc=a(()=>{"use strict";R(),V(),U(),Y(),Hc=(e,t)=>{if(e.length<3||e.length>4)throw Error(`MatMulNBits requires 3 or 4 inputs`);let n=e[0],r=n.dims.length;if(n.dims[r-1]!==t.k)throw Error(`The last dim of input shape does not match the k value`);let i=Math.floor((t.k+t.blockSize-1)/t.blockSize),a=t.blockSize/8*t.bits,o=e[1];if(!B.areEqual(o.dims,[t.n,i,a]))throw Error(`The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize`);let s=e[2].dims;if(B.size(s)!==t.n*i)throw Error(`scales input size error.`);if(e.length===4){let n=e[3].dims,r=t.n*(t.bits===8?i:Math.floor((i*t.bits+7)/8));if(B.size(n)!==r)throw Error(`zeroPoints input size error.`)}},Uc=(e,t)=>{let n=e[0].dims,r=n.length,i=n[r-2],a=t.k,o=t.n,s=n.slice(0,r-2),c=B.size(s),l=e[1].dims[2]/4,u=e[0].dataType,d=G(t.k),f=G(l),p=G(o),m=s.concat([i,o]),h=i>1&&o/p%2==0?2:1,g=B.size(m)/p/h,_=[],v=[c,i,a/d],y=B.convertShape(e[1].dims).slice();y.splice(-1,1,l/f),_.push(...W(v)),_.push(...W(y)),_.push(...W(e[2].dims)),e.length===4&&_.push(...W(B.convertShape(e[3].dims)));let b=[c,i,o/p];return _.push(...W(b)),{name:`MatMulNBits`,shaderCache:{hint:`${t.blockSize};${t.bits};${d};${f};${p};${h};64`,inputDependencies:Array(e.length).fill(`rank`)},getRunData:()=>({outputs:[{dims:m,dataType:u}],dispatchGroup:{x:g},programUniforms:_}),getShaderSource:n=>{let r=v.length,i=q(`a`,e[0].dataType,r,d),a=q(`b`,12,y.length,f),o=q(`scales`,e[2].dataType,e[2].dims.length),s=[i,a,o],c=e.length===4?q(`zero_points`,12,e[3].dims.length):void 0;c&&s.push(c);let u=b.length,m=J(`output`,e[0].dataType,u,p),g=bn(e[0].dataType),_=(()=>{switch(d){case 1:return`array<${g}, 8>`;case 2:return`mat4x2<${g}>`;case 4:return`mat2x4<${g}>`;default:throw Error(`${d}-component is not supported.`)}})(),x=Math.floor(32/t.bits),S=Math.floor(x/8),C=()=>{let e=``;for(let n=0;n<S;n++){let r=n*t.bits*4,a=r+t.bits;e+=`
          // reuse a data (pass ${n})
            var input_offset${n>0?n:``} = ${n===0?i.indicesToOffset(`${i.type.indices}(batch, row, word_offset)`):`input_offset`};
            var a_data${n>0?n:``}: ${_};
            for (var j${n>0?n:``}: u32 = 0; j${n>0?n:``} < ${8/d}; j${n>0?n:``}++) {
              a_data${n>0?n:``}[j${n>0?n:``}] = ${i.getByOffset(`input_offset${n>0?n:``}`)};
              input_offset${n>0?n:``}++;
            }
          `;for(let i=0;i<p*h;i++)e+=`
            b_value = ${f===1?`b${i}_data`:`b${i}_data[i]`};
            ${t.bits===2?`{
              let half_word = b_value >> ${n*16}u;
              let byte_lo = half_word & 0xFFu;
              let byte_hi = (half_word >> 8u) & 0xFFu;
              let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
              b_value_lower = unpack4xU8(spread_word & b_mask);
              b_value_upper = unpack4xU8((spread_word >> 2u) & b_mask);
            }`:`b_value_lower = unpack4xU8((b_value >> ${r}u) & b_mask);
            b_value_upper = unpack4xU8((b_value >> ${a}u) & b_mask);`}
            b_quantized_values = ${_}(${Array.from({length:4},(e,t)=>`${g}(b_value_lower[${t}]), ${g}(b_value_upper[${t}])`).join(`, `)});
            b_dequantized_values = ${d===1?`${_}(${Array.from({length:8},(e,t)=>`(b_quantized_values[${t}] - ${c?`zero_point${i}`:`zero_point`}) * scale${i}`).join(`, `)});`:`(b_quantized_values - ${_}(${Array(8).fill(`${c?`zero_point${i}`:`zero_point`}`).join(`,`)})) * scale${i};`};
            workgroup_shared[local_id.x * ${h} + ${Math.floor(i/p)}]${p>1?`[${i%p}]`:``} += ${Array.from({length:8/d},(e,t)=>`${d===1?`a_data${n>0?n:``}[${t}] * b_dequantized_values[${t}]`:`dot(a_data${n>0?n:``}[${t}], b_dequantized_values[${t}])`}`).join(` + `)};
          `}return e},w=()=>{let e=`
            var col_index = col * ${p};
            ${c?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/t.bits)}u;
            let zero_point_bytes_per_col = (nBlocksPerCol + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is ${2**(t.bits-1)} for unsigned ${t.bits}-bit quantization.
            let zero_point = ${g}(${(2**(t.bits-1)).toFixed(1)});`}
            `;for(let n=0;n<p*h;n++)e+=`
            let scale${n} = ${o.getByOffset(`col_index * nBlocksPerCol + block`)};
            ${c?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${t.bits}u);
            zero_point_word = ${c.getByOffset(`zero_point_word_index`)} >> zero_point_bits_offset;
            let zero_point${n} = ${g}((zero_point_word) & ${t.bits===2?`0x3u`:`0xFu`});`:``}
            col_index += 1;`;return e},T=()=>{let e=`col_index = col * ${p};`;for(let t=0;t<p*h;t++)e+=`
            let b${t}_data = ${a.getByIndices(`${a.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return e+=`
            var b_value: u32;
            let b_mask: u32 = ${t.bits===2?`0x03030303u`:`0x0F0F0F0Fu`};
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${_};
            var b_dequantized_values: ${_};`,e};return`
        var<workgroup> workgroup_shared: array<${m.type.value}, ${h*64}>;
        ${n.declareVariables(...s,m)}
        ${n.mainStart([64,1,1])}
          let output_indices = ${m.offsetToIndices(`(global_idx / 64) * ${h}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += 64) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/d};
            ${w()}
            for (var word: u32 = 0; word < ${l}; word += ${f}) {
              ${T()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${C()}
                word_offset += ${x/d};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${h}) {
            var output_value: ${m.type.value} = ${m.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < 64u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${h};
            }
            ${m.setByIndices(`${m.type.indices}(batch, row, col + local_id.x)`,`output_value`)};
          }
        }`}}},Wc=(e,t)=>{let n=e[0].dims,r=n.length,i=n[r-2],a=t.k,o=t.n,s=n.slice(0,r-2),c=B.size(s),l=e[1].dims[2]/4,u=e[0].dataType,d=G(t.k),f=G(l),p=s.concat([i,o]),m=o%8==0?8:o%4==0?4:1,h=128/m,g=Math.floor(32/t.bits),_=h*f*g,v=_/d,y=_/t.blockSize,b=B.size(p)/m,x=[],S=[c,i,a/d],C=B.convertShape(e[1].dims).slice();C.splice(-1,1,l/f),x.push(...W(S)),x.push(...W(C)),x.push(...W(e[2].dims)),e.length===4&&x.push(...W(B.convertShape(e[3].dims)));let w=[c,i,o];return x.push(...W(w)),{name:`BlockwiseMatMulNBits32`,shaderCache:{hint:`${t.blockSize};${d};${f};${h};${m}`,inputDependencies:Array(e.length).fill(`rank`)},getRunData:()=>({outputs:[{dims:p,dataType:u}],dispatchGroup:{x:b},programUniforms:x}),getShaderSource:n=>{let r=S.length,i=q(`a`,e[0].dataType,r,d),a=q(`b`,12,C.length,f),o=q(`scales`,e[2].dataType,e[2].dims.length),s=[i,a,o],c=e.length===4?q(`zero_points`,12,e[3].dims.length):void 0;c&&s.push(c);let l=w.length,u=J(`output`,e[0].dataType,l),p=bn(e[0].dataType),_=()=>{switch(d){case 1:return`
          let a_data0 = vec4<${p}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${p}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${p}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${p}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw Error(`${d}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${i.type.value}, ${v}>;
        var<workgroup> inter_results: array<array<${u.type.value}, ${h}>, ${m}>;
        ${n.declareVariables(...s,u)}
        ${n.mainStart([h,m,1])}
          let output_indices = ${u.offsetToIndices(`workgroup_index * ${m}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${y} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${v};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${v}; a_offset += 128)
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${i.getByIndices(`${i.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${i.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${y} + local_id.x;
            ${c?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/t.bits)}u;
            let zero_point_bytes_per_col = (n_blocks_per_col + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${t.bits}u);
            let zero_point_word = ${c.getByOffset(`zero_point_word_index`)} >> zero_point_bits_offset;
            let zero_point = ${p}((zero_point_word) & ${t.bits===2?`0x3u`:`0xFu`});`:`
            // The default zero point is ${2**(t.bits-1)} for unsigned ${t.bits}-bit quantization.
            let zero_point = ${p}(${(2**(t.bits-1)).toFixed(1)});`}
            let scale = ${o.getByOffset(`b_row * n_blocks_per_col + block`)};
            let b_data = ${a.getByIndices(`${a.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/d};
            for (var i: u32 = 0; i < ${f}; i++) {
              let b_value = ${f===1?`b_data`:`b_data[i]`};
              ${(()=>{let e=Math.floor(g/8),n=``;for(let r=0;r<e;r++){let e=r*t.bits*4,i=e+t.bits;n+=`
              ${_()}
              {${t.bits===2?`
                let half_word = b_value >> ${r*16}u;
                let byte_lo = half_word & 0xFFu;
                let byte_hi = (half_word >> 8u) & 0xFFu;
                let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
                let b_value_lower = unpack4xU8(spread_word & 0x03030303u);
                let b_value_upper = unpack4xU8((spread_word >> 2u) & 0x03030303u);`:`
                let b_value_lower = unpack4xU8((b_value >> ${e}u) & 0x0F0F0F0Fu);
                let b_value_upper = unpack4xU8((b_value >> ${i}u) & 0x0F0F0F0Fu);`}
                let b_quantized_values = mat2x4<${p}>(${Array.from({length:4},(e,t)=>`${p}(b_value_lower[${t}]), ${p}(b_value_upper[${t}])`).join(`, `)});
                let b_dequantized_values = (b_quantized_values - mat2x4<${p}>(${Array(8).fill(`zero_point`).join(`,`)})) * scale;
                inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(e,t)=>`${`dot(a_data${t}, b_dequantized_values[${t}])`}`).join(` + `)};
              }
              word_offset += ${8/d};`}return n})()}
            }
            workgroupBarrier();
          }

          if (local_idx < ${m}) {
            var output_value: ${u.type.value} = ${u.type.value}(0);
            for (var b = 0u; b < ${h}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${u.setByIndices(`${u.type.indices}(batch, row, col + local_idx)`,`output_value`)}
            }
          }
        }`}}},Gc=(e,t)=>{Hc(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor(`intel`)&&e.adapterInfo.isArchitecture(`gen-12lp`)?e.compute(Wc(e.inputs,t)):e.compute(Uc(e.inputs,t))},Kc=e=>H(e)}),Jc,Yc,Xc,Zc,Qc,$c,el,tl,nl,rl=a(()=>{"use strict";R(),V(),Y(),Jc=e=>{if(!e||e.length<1)throw Error(`Too few inputs`);if(e[0].dataType!==1&&e[0].dataType!==10)throw Error(`Input type must be float or float16.`);if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw Error(`The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].`)}},Yc=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
            k = i32(${e.indicesGet(`indices`,i)}) - ${K(`uniforms.pads`,i,n)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${K(`uniforms.x_shape`,i,t)})) {
              break;
            }
            offset += k * i32(${K(`uniforms.x_strides`,i,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${r}
            value = x[offset];
          }
      `},Xc=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
                k = i32(${e.indicesGet(`indices`,i)}) - ${K(`uniforms.pads`,i,n)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${K(`uniforms.x_shape`,i,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${K(`uniforms.x_shape`,i,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${K(`uniforms.x_strides`,i,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},Zc=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
                k = i32(${e.indicesGet(`indices`,i)}) - ${K(`uniforms.pads`,i,n)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${K(`uniforms.x_shape`,i,t)})) {
                  k = i32(${K(`uniforms.x_shape`,i,t)}) - 1;
                }
                offset += k * i32(${K(`uniforms.x_strides`,i,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},Qc=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
                k = i32(${e.indicesGet(`indices`,i)}) - ${K(`uniforms.pads`,i,n)};
                if (k < 0)  {
                  k += i32(${K(`uniforms.x_shape`,i,t)}]);
                }
                if (k >= i32(${K(`uniforms.x_shape`,i,t)})) {
                  k -= i32(${K(`uniforms.x_shape`,i,t)});
                }
                offset += k * i32(${K(`uniforms.x_strides`,i,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},$c=(e,t,n)=>{switch(n.mode){case 0:return Yc(e,t,n.pads.length);case 1:return Xc(e,t,n.pads.length);case 2:return Zc(e,t,n.pads.length);case 3:return Qc(e,t,n.pads.length);default:throw Error(`Invalid mode`)}},el=(e,t)=>{let n=B.padShape(e[0].dims.slice(),t.pads),r=e[0].dims,i=[{type:12,data:B.size(n)},{type:6,data:t.pads}],a=e.length>=3&&e[2].data;return t.mode===0&&i.push({type:a?e[2].dataType:1,data:t.value}),i.push(...W(e[0].dims,n)),{name:`Pad`,shaderCache:{hint:`${t.mode}${a}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(B.size(n)/64)},programUniforms:i}),getShaderSource:i=>{let o=J(`output`,e[0].dataType,n.length),s=q(`x`,e[0].dataType,r.length),c=s.type.value,l=$c(o,r.length,t),u=[{name:`output_size`,type:`u32`},{name:`pads`,type:`i32`,length:t.pads.length}];return t.mode===0&&u.push({name:`constant_value`,type:a?c:`f32`}),`
            ${i.registerUniforms(u).declareVariables(s,o)}
            ${i.mainStart()}
            ${i.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

            let indices = ${o.offsetToIndices(`global_idx`)};

            var value = ${c}(0);
            ${l}
            output[global_idx] = value;
        }`}}},tl=(e,t)=>{if(e.length>1){let n=e[1].getBigInt64Array(),r=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,i=e[0].dims.length,a=new Int32Array(2*i).fill(0);if(e.length>=4){let t=e[3].getBigInt64Array();for(let e=0;e<t.length;e++)a[Number(t[e])]=Number(n[e]),a[Number(t[e])+i]=Number(n[e+t.length])}else n.forEach((e,t)=>a[Number(t)]=Number(e));let o=[];return a.forEach(e=>o.push(e)),{mode:t.mode,value:r,pads:o}}return t},nl=(e,t)=>{Jc(e.inputs);let n=tl(e.inputs,t);e.compute(el(e.inputs,n),{inputs:[0]})}}),il,al,ol,sl,cl,ll,ul,dl,fl,pl,ml,hl,gl,_l,vl,yl,bl,xl,Sl,Cl=a(()=>{"use strict";Te(),R(),V(),Y(),il=e=>{if(x.webgpu.validateInputContent&&(!e||e.length!==1))throw Error(`Pool ops requires 1 input.`)},al=(e,t,n)=>{let r=t.format===`NHWC`,i=e.dims.slice();r&&i.splice(1,0,i.pop());let a=Object.hasOwnProperty.call(t,`dilations`),o=t.kernelShape.slice(),s=t.strides.slice(),c=a?t.dilations.slice():[],l=t.pads.slice();Lt.adjustPoolAttributes(n,i,o,s,c,l);let u=Lt.computePoolOutputShape(n,i,s,c,o,l,t.autoPad,t.ceilMode),d=Object.assign({},t);a?Object.assign(d,{kernelShape:o,strides:s,pads:l,dilations:c,cacheKey:t.cacheKey}):Object.assign(d,{kernelShape:o,strides:s,pads:l,cacheKey:t.cacheKey});let f=u.slice();return f.push(f.splice(1,1)[0]),[d,r?f:u]},ol=(e,t)=>{let n=t.format===`NHWC`,r=B.size(e),i=B.size(t.kernelShape),a=[{type:12,data:r},{type:12,data:i}],o=[{name:`outputSize`,type:`u32`},{name:`kernelSize`,type:`u32`}];if(t.kernelShape.length<=2){let e=t.kernelShape[t.kernelShape.length-1],n=t.strides[t.strides.length-1],r=t.pads[t.pads.length/2-1],i=t.pads[t.pads.length-1],s=!!(r+i);a.push({type:12,data:e},{type:12,data:n},{type:12,data:r},{type:12,data:i}),o.push({name:`kw`,type:`u32`},{name:`sw`,type:`u32`},{name:`pwStart`,type:`u32`},{name:`pwEnd`,type:`u32`});let c=!1;if(t.kernelShape.length===2){let e=t.kernelShape[t.kernelShape.length-2],n=t.strides[t.strides.length-2],r=t.pads[t.pads.length/2-2],i=t.pads[t.pads.length-2];c=!!(r+i),a.push({type:12,data:e},{type:12,data:n},{type:12,data:r},{type:12,data:i}),o.push({name:`kh`,type:`u32`},{name:`sh`,type:`u32`},{name:`phStart`,type:`u32`},{name:`phEnd`,type:`u32`})}return[a,o,!0,s,c]}{if(n)throw Error(`Pooling with kernelShape.length > 2 is not supported for NHWC format.`);let e=B.computeStrides(t.kernelShape);return a.push({type:12,data:e},{type:12,data:t.pads},{type:12,data:t.strides}),o.push({name:`kernelStrides`,type:`u32`,length:e.length},{name:`pads`,type:`u32`,length:t.pads.length},{name:`strides`,type:`u32`,length:t.strides.length}),[a,o,!!t.pads.reduce((e,t)=>e+t),!1,!1]}},sl=(e,t,n,r,i,a,o,s,c,l,u,d)=>{let f=i.format===`NHWC`,p=t.type.value,m=J(`output`,t.type.tensor,r);if(i.kernelShape.length<=2){let r=``,l=``,h=``,g=n-(f?2:1);if(r=u?`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${g}] = indices[${g}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${g}] < 0 || xIndices[${g}]
                      >= uniforms.x_shape[${g}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset(`xIndices`)}];
                  ${a}
                }`:`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${g}] = indices[${g}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset(`xIndices`)}];
                  ${a}
                }`,i.kernelShape.length===2){let e=n-(f?3:2);l=d?`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${e}] = indices[${e}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${e}] < 0 || xIndices[${e}] >= uniforms.x_shape[${e}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${e}] = indices[${e}] * uniforms.sh - uniforms.phStart + j;
                `,h=`
              }
            `}return`
            ${e.registerUniforms(c).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}

              let indices = ${m.offsetToIndices(`global_idx`)};
              var xIndices = ${m.offsetToIndices(`global_idx`)};

              var value = ${p}(${s});
              var pad = 0;
              ${l}
              ${r}
              ${h}
              ${o}

              output[global_idx] = value;
            }`}{if(f)throw Error(`Pooling with kernelShape.length > 2 is not supported for NHWC format.`);let r=i.kernelShape.length,u=i.pads.length,d=``;return d=l?`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset(`xIndices`)}];
                ${a}
              }`:`
              }
              let x_val = x[${t.indicesToOffset(`xIndices`)}];
              ${a}
            `,`
            ${e.registerUniforms(c).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
              let indices = ${m.offsetToIndices(`global_idx`)};
              var xIndices = ${m.offsetToIndices(`global_idx`)};

              var offsets: array<u32, ${r}>;

              var value = ${p}(${s});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${r-1}u; j++) {
                  offsets[j] = offset / ${K(`uniforms.kernelStrides`,`j`,r)};
                  offset -= offsets[j] * ${K(`uniforms.kernelStrides`,`j`,r)};
                }
                offsets[${r-1}] = offset;

                isPad = false;
                for (var j = ${n-r}u; j < ${n}u; j++) {
                  xIndices[j] = indices[j] * ${K(`uniforms.strides`,`j - ${n-r}u`,r)}
                    + offsets[j - ${n-r}u] - ${K(`uniforms.pads`,`j - 2u`,u)};
                  ${d}
              }
              ${o}

              output[global_idx] = value;
            }`}},cl=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,ll=e=>`${cl(e)};${e.countIncludePad}`,ul=e=>`${cl(e)};${e.storageOrder};${e.dilations}`,dl=e=>({format:e.format,autoPad:[`NOTSET`,`VALID`,`SAME_UPPER`,`SAME_LOWER`][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),fl=(e,t,n,r)=>{let[i,a]=al(t,r,n),o=q(`x`,t.dataType,t.dims.length),s=o.type.value,c=``;i.countIncludePad?c+=`value /= ${s}(uniforms.kernelSize);`:c+=`value /= ${s}(i32(uniforms.kernelSize) - pad);`;let[l,u,d,f,p]=ol(a,i);return l.push(...W(t.dims,a)),{name:e,shaderCache:{hint:`${r.cacheKey};${d};${f};${p}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:a,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(B.size(a)/64)},programUniforms:l}),getShaderSource:e=>sl(e,o,t.dims.length,a.length,i,`value += x_val;`,c,0,u,d,f,p)}},pl=e=>{let t=e.count_include_pad!==0,n=dl(e);if(n.ceilMode!==0)throw Error(`ceil_mode output-shape is computed, but ceil_mode kernel execution (padding/divisor) is not yet implemented in the WebGPU AveragePool kernel`);let r={countIncludePad:t,...n,cacheKey:``};return{...r,cacheKey:ll(r)}},ml=(e,t)=>{il(e.inputs),e.compute(fl(`AveragePool`,e.inputs[0],!1,t))},hl={autoPad:``,ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},gl=e=>{let t=e.format;return{format:t,...hl,cacheKey:t}},_l=(e,t)=>{il(e.inputs),e.compute(fl(`GlobalAveragePool`,e.inputs[0],!0,t))},vl=(e,t,n,r)=>{let[i,a]=al(t,r,n),o=q(`x`,t.dataType,t.dims.length),s=[`rank`],[c,l,u,d,f]=ol(a,i);return c.push(...W(t.dims,a)),{name:e,shaderCache:{hint:`${r.cacheKey};${u};${d};${f}`,inputDependencies:s},getRunData:()=>({outputs:[{dims:a,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(B.size(a)/64)},programUniforms:c}),getShaderSource:e=>sl(e,o,t.dims.length,a.length,i,`
      value = max(x_val, value);
    `,``,t.dataType===10?-65504:-1e5,l,u,d,f)}},yl=(e,t)=>{il(e.inputs),e.compute(vl(`MaxPool`,e.inputs[0],!1,t))},bl=e=>{let t=e.storage_order,n=e.dilations,r=dl(e);if(t!==0)throw Error(`column major storage order is not yet supported for MaxPool`);if(r.ceilMode!==0)throw Error(`ceil_mode output-shape is computed, but ceil_mode kernel execution (padding) is not yet implemented in the WebGPU MaxPool kernel`);let i={storageOrder:t,dilations:n,...r,cacheKey:``};return{...i,cacheKey:ul(i)}},xl=e=>{let t=e.format;return{format:t,...hl,cacheKey:t}},Sl=(e,t)=>{il(e.inputs),e.compute(vl(`GlobalMaxPool`,e.inputs[0],!0,t))}}),wl,Tl,El,Dl,Ol=a(()=>{"use strict";R(),V(),U(),Y(),wl=(e,t)=>{if(e.length<2||e.length>3)throw Error(`DequantizeLinear requires 2 or 3 inputs.`);if(e.length===3&&e[1].dims===e[2].dims)throw Error(`x-scale and x-zero-point must have the same shape.`);if(e.length===3&&e[0].dataType!==e[2].dataType)throw Error(`x and x-zero-point must have the same data type.`);if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw Error(`scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.`);if(e.length>2){if(e[0].dataType!==e[2].dataType)throw Error(`x and x-zero-point must have the same data type.`);if(e[1].dims.length!==e[2].dims.length)throw Error(`scale and zero-point inputs must have the same rank.`);if(!e[1].dims.map((t,n)=>t===e[2].dims[n]).reduce((e,t)=>e&&t,!0))throw Error(`scale and zero-point inputs must have the same shape.`)}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw Error(`blockSize must be set only for block quantization.`);if(!e[1].dims.map((n,r)=>r===t.axis||n===e[0].dims[r]).reduce((e,t)=>e&&t,!0))throw Error(`For block qunatization, scale input shape to match the input shape except for the axis`);if(e[1].dims.length!==e[0].dims.length)throw Error(`For block qunatization the scale input rank must be the same as the x rank.`);let n=e[0].dims[t.axis],r=e[1].dims[t.axis];if(t.blockSize<Math.ceil(n/r)||t.blockSize>Math.ceil(n/(r-1)-1))throw Error(`blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].`)}},Tl=(e,t)=>{let n=B.normalizeAxis(t.axis,e[0].dims.length),r=e[0].dataType,i=r===3,a=e[0].dims,o=e[1].dataType,s=B.size(a),c=r===3||r===2,l=c?[Math.ceil(B.size(e[0].dims)/4)]:e[0].dims,u=e[1].dims,d=e.length>2?e[2]:void 0,f=d?c?[Math.ceil(B.size(d.dims)/4)]:d.dims:void 0,p=u.length===0||u.length===1&&u[0]===1,m=p===!1&&u.length===1,h=G(s),g=p&&(!c||h===4),_=g?h:1,v=g&&!c?h:1,y=q(`input`,c?12:r,l.length,v),b=q(`scale`,o,u.length),x=d?q(`zero_point`,c?12:r,f.length):void 0,S=J(`output`,o,a.length,_),C=[y,b];x&&C.push(x);let w=[l,u];d&&w.push(f);let T=[{type:12,data:s/_},{type:12,data:n},{type:12,data:t.blockSize},...W(...w,a)];return{name:`DequantizeLinear`,shaderCache:{hint:t.cacheKey,inputDependencies:x?[`rank`,`rank`,`rank`]:[`rank`,`rank`]},getShaderSource:e=>`
      ${e.registerUniforms([{name:`output_size`,type:`u32`},{name:`axis`,type:`u32`},{name:`block_size`,type:`u32`}]).declareVariables(...C,S)}
      ${e.mainStart()}
          ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
          let output_indices = ${S.offsetToIndices(`global_idx`)};

          // Set input x
          ${c?`
            let input = ${y.getByOffset(`global_idx / 4`)};
            let x_vec = ${i?`unpack4xI8(input)`:`unpack4xU8(input)`};
            let x_value = ${_===1?`x_vec[global_idx % 4]`:`x_vec`};`:`let x_value = ${y.getByOffset(`global_idx`)};`};

          // Set scale input
          ${p?`let scale_value= ${b.getByOffset(`0`)}`:m?`
            let scale_index = ${S.indicesGet(`output_indices`,`uniforms.axis`)};
            let scale_value= ${b.getByOffset(`scale_index`)};`:`
            var scale_indices: ${b.type.indices} = output_indices;
            let index = ${b.indicesGet(`scale_indices`,`uniforms.axis`)} / uniforms.block_size;
            ${b.indicesSet(`scale_indices`,`uniforms.axis`,`index`)};
            let scale_value= ${b.getByIndices(`scale_indices`)};`};

          // Set zero-point input
          ${x?p?c?`
                let zero_point_input = ${x.getByOffset(`0`)};
                let zero_point_vec =  ${i?`unpack4xI8(zero_point_input)`:`unpack4xU8(zero_point_input)`};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${x.getByOffset(`0`)}`:m?c?`
                let zero_point_index = ${S.indicesGet(`output_indices`,`uniforms.axis`)};
                let zero_point_input = ${x.getByOffset(`zero_point_index / 4`)};
                let zero_point_vec =  ${i?`unpack4xI8(zero_point_input)`:`unpack4xU8(zero_point_input)`};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${S.indicesGet(`output_indices`,`uniforms.axis`)};
                let zero_point_value = ${x.getByOffset(`zero_point_index`)};`:c?`
                let zero_point_offset = ${b.indicesToOffset(`scale_indices`)};
                let zero_point_input = ${x.getByOffset(`zero_point_offset / 4`)};
                let zero_point_vec = ${i?`unpack4xI8(zero_point_input)`:`unpack4xU8(zero_point_input)`};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${x.getByIndices(`scale_indices`)};`:`let zero_point_value = ${c?i?`i32`:`u32`:y.type.value}(0);`};
      // Compute and write output
      ${S.setByOffset(`global_idx`,`${S.type.value}(x_value - zero_point_value) * scale_value`)};
      }`,getRunData:()=>({outputs:[{dims:a,dataType:o}],dispatchGroup:{x:Math.ceil(s/_/64),y:1,z:1},programUniforms:T})}},El=(e,t)=>{wl(e.inputs,t),e.compute(Tl(e.inputs,t))},Dl=e=>H({axis:e.axis,blockSize:e.blockSize})}),kl,Al,jl,Ml=a(()=>{"use strict";Te(),R(),Y(),kl=(e,t,n)=>{if(e===t||e<t&&n<0||e>t&&n>0)throw Error(`Range these inputs' contents are invalid.`)},Al=(e,t,n,r)=>{let i=Math.abs(Math.ceil((t-e)/n)),a=[i],o=i,s=[{type:12,data:o},{type:r,data:e},{type:r,data:n},...W(a)];return{name:`Range`,shaderCache:{hint:`${r}`},getShaderSource:e=>{let t=J(`output`,r,a.length),n=t.type.value,i=[{name:`outputSize`,type:`u32`},{name:`start`,type:n},{name:`delta`,type:n}];return`
        ${e.registerUniforms(i).declareVariables(t)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
        output[global_idx] = uniforms.start + ${n}(global_idx) * uniforms.delta;
      }`},getRunData:()=>({outputs:[{dims:a,dataType:r}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:s})}},jl=e=>{let t=0,n=0,r=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],n=e.inputs[1].getInt32Array()[0],r=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],n=e.inputs[1].getFloat32Array()[0],r=e.inputs[2].getFloat32Array()[0]),x.webgpu.validateInputContent&&kl(t,n,r),e.compute(Al(t,n,r,e.inputs[0].dataType),{inputs:[]})}}),Nl,Pl,Fl,Il,Ll=a(()=>{"use strict";R(),V(),U(),Y(),Nl=(e,t,n,r)=>{if(e!==`none`&&r!==`i32`&&r!==`u32`&&r!==`f32`)throw Error(`Input ${r} is not supported with reduction ${e}.`);let i=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,a=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case`none`:return`${t}=${n};`;case`add`:return r===`i32`||r===`u32`?`atomicAdd(&${t}, bitcast<${r}>(${n}));`:`
              ${i}bitcast<${r}>(oldValue) + (${n})${a}`;case`max`:return r===`i32`||r===`u32`?`atomicMax(&${t}, bitcast<${r}>(${n}));`:`
                ${i}max(bitcast<f32>(oldValue), (${n}))${a}`;case`min`:return r===`i32`||r===`u32`?`atomicMin(&${t}, bitcast<${r}>(${n}));`:`${i}min(bitcast<${r}>(oldValue), (${n}))${a}`;case`mul`:return`${i}(bitcast<${r}>(oldValue) * (${n}))${a}`;default:throw Error(`Reduction ${e} is not supported.`)}},Pl=(e,t)=>{let n=e[0].dims,r=e[1].dims,i=n,a=Math.ceil(B.sizeToDimension(r,r.length-1)/1),o=r[r.length-1],s=B.sizeFromDimension(n,o),c=[{type:12,data:a},{type:12,data:o},{type:12,data:s},...W(e[1].dims,e[2].dims,i)];return{name:`ScatterND`,shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:c}),getShaderSource:n=>{let r=q(`indices`,e[1].dataType,e[1].dims.length),a=q(`updates`,e[2].dataType,e[2].dims.length,1),o=t.reduction!==`none`&&t.reduction!==``?En(`output`,e[0].dataType,i.length):J(`output`,e[0].dataType,i.length,1);return`
      ${n.registerUniform(`output_size`,`u32`).registerUniform(`last_index_dimension`,`u32`).registerUniform(`num_updates_elements`,`u32`).declareVariables(r,a,o)}
      ${n.mainStart()}
        ${n.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
  var data_offset = 0u;
  let indices_start = uniforms.last_index_dimension * global_idx;
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${e[0].dims.length===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[i - indices_start];
    let dim_value = uniforms.output_shape[i - indices_start];`}
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));
  }

  for (var i = 0u; i < uniforms.num_updates_elements; i++) {
    let value = updates[uniforms.num_updates_elements * global_idx + i];
    ${Nl(t.reduction,`output[data_offset + i]`,`value`,o.type.value)}
  }

      }`}}},Fl=e=>H({reduction:e.reduction}),Il=(e,t)=>{e.compute(Pl(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),Rl,zl,Bl,Vl,Hl,Ul,Wl,Gl,Kl,ql,Jl,Yl,Xl,Zl,Ql,$l,eu,tu,nu,ru,iu=a(()=>{"use strict";R(),V(),U(),Y(),Rl=(e,t)=>{if(e.every(e=>e>0||(()=>{throw Error(`Resize requires scales input values to be positive`)})),e.length>0){if(t.mode===`linear`){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode===`cubic`&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw Error(`Resize requires scales input size to be 2 or 4 for cubic mode`)}},zl=(e,t,n)=>{t.every(e=>e>=0&&e<n||(()=>{throw Error(`Resize requires axes input values to be positive and less than rank`)}));let r=Array(n).fill(1);return t.forEach((t,n)=>r[t]=e[n]),r},Bl=(e,t,n,r,i,a)=>{let[o,s,c]=n>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(o>0&&e.length>o&&e[o].dims.length>0)e[o].getFloat32Array().forEach(e=>a.push(e));else if(t.coordinateTransformMode===`tf_crop_and_resize`)throw Error(`Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize`);if(s>0&&e.length>s&&e[s].dims.length===1&&e[s].dims[0]>0){if(e[s].getFloat32Array().forEach(e=>r.push(e)),r.length!==0&&r.length!==l&&n>=18&&r.length!==t.axes.length)throw Error(`Resize requires scales input size to be same as input rank or axes size for opset 18 and up`);Rl(r,t),t.axes.length>0&&zl(r,t.axes,l).forEach((e,t)=>r[t]=e)}if(c>0&&e.length>c&&e[c].dims.length===1&&e[c].dims[0]>0&&(e[c].getBigInt64Array().forEach(e=>i.push(Number(e))),i.length!==0&&i.length!==l&&n>=18&&i.length!==t.axes.length))throw Error(`Resize requires sizes input size to be same as input rank or axes size for opset 18 and up`);if(t.axes.length>0){if(r.length!==0&&r.length!==t.axes.length)throw Error(`Resize requires "scales" input size to be of axes rank when axes attributes is specified`);if(i.length!==0&&i.length!==t.axes.length)throw Error(`Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified`)}if(typeof r<`u`&&typeof i<`u`&&r.length>0&&i.length>l)throw Error(`Resize requires only of scales or sizes to be specified`)},Vl=(e,t,n,r)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${r}(big / (${n}));
  let fract = ${r}(big % (${n})) / ${r}(${n});
  return whole + fract;
`,Hl=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case`asymmetric`:return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${Vl(`xResized`,`lengthOriginal`,`lengthResized`,t)}
          }
        `;case`pytorch_half_pixel`:return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case`tf_half_pixel_for_nn`:return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case`align_corners`:return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${Vl(`xResized`,`lengthOriginal - 1`,`lengthResized - 1`,t)}
                  }`;case`tf_crop_and_resize`:return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case`half_pixel_symmetric`:return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case`half_pixel`:return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw Error(`Coordinate transform mode ${e} is not supported`)}})()+`}`,Ul=(e,t,n)=>`fn getNearestPixelFromOriginal(xOriginal: ${n}, isDownSample: bool) -> ${n} {`+(()=>{switch(e){case`round_prefer_ceil`:return`if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }`;case`floor`:return`return floor(xOriginal);`;case`ceil`:return`return ceil(xOriginal);`;case`round_prefer_floor`:return`if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }`;default:if(t<11)return`if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }`;throw Error(`Nearest mode ${e} is not supported`)}})()+`}`,Wl=(e,t,n)=>{let r=Array(n).fill(0).concat(Array(n).fill(1)),i=e.length===0?r:e.slice();return t.length>0?(t.forEach((e,a)=>{r[e]=i[a],r[a+n]=i[t.length+a]}),r):i},Gl=(e,t,n,r)=>{let i=[];if(n.length>0){if(r.length>0){if(e.forEach(e=>i.push(e)),Math.max(...r)>e.length)throw Error(`axes is out of bound`);r.forEach((e,t)=>i[e]=n[t])}else n.forEach(e=>i.push(e))}else{if(t.length===0)throw Error(`Resize requires either scales or sizes.`);i=e.map((e,n)=>Math.round(e*t[n]))}return i},Kl=(e,t,n)=>{let r=(()=>{switch(n.keepAspectRatioPolicy){case`not_larger`:return n.axes.length>0?Math.min(...n.axes.map(e=>t[e]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case`not_smaller`:return n.axes.length>0?Math.max(...n.axes.map(e=>t[e]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw Error(`Keep aspect ratio policy ${n.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let i=e.slice();return n.axes.length>0?(n.axes.forEach(e=>t[e]=r),n.axes.forEach(n=>i[n]=Math.round(e[n]*t[n]))):(t.fill(r,0,t.length),i.forEach((e,n)=>i[n]=Math.round(e*t[n]))),i},ql=(e,t,n,r,i)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${n.length}> {
      var original_indices: array<${e.type.value}, ${n.length}>;
      for (var i:u32 = 0; i < ${n.length}; i++) {
        var output_index = ${e.indicesGet(`output_indices`,`i`)};
        var scale = ${K(`uniforms.scales`,`i`,r)};
        var roi_low = ${K(`uniforms.roi`,`i`,i)};
        var roi_hi = ${K(`uniforms.roi`,`i + ${t.length}`,i)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${K(`uniforms.input_shape`,`i`,t.length)};
          var output_shape_i = ${K(`uniforms.output_shape`,`i`,n.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Jl=(e,t,n,r,i,a,o)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${t.indicesGet(`output_indices`,`i`)};
        var input_index: u32;
        var scale = ${K(`uniforms.scales`,`i`,i)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${K(`uniforms.roi`,`i`,a)};
          var roi_hi = ${K(`uniforms.roi`,`i + ${n.length}`,a)};
          var input_shape_i = ${K(`uniforms.input_shape`,`i`,n.length)};
          var output_shape_i = ${K(`uniforms.output_shape`,`i`,r.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${o} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet(`input_indices`,`i`,`input_index`)}
      }
      return input_indices;
    }`,Yl=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet(`input_indices`,`i`)};
        if (input_index < 0 || input_index >= ${K(`uniforms.input_shape`,`i`,t.length)}) {
          return false;
        }
      }
      return true;
    }`,Xl=(e,t,n,r)=>e.rank>r?`
    ${e.indicesSet(`input_indices`,t,`channel`)};
    ${e.indicesSet(`input_indices`,n,`batch`)};
`:``,Zl=(e,t,n,r,i)=>{let[a,o,s,c]=n.length===2?[-1,0,1,-1]:[0,2,3,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet(`input_indices`,o,`max(0, min(row, ${n[o]} - 1))`)};
      ${e.indicesSet(`input_indices`,s,`max(0, min(col, ${n[s]} - 1))`)};
      ${Xl(e,c,a,2)}
      return ${e.getByIndices(`input_indices`)};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${l} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${l} = originalIndices[${o}];
      var col:${l} = originalIndices[${s}];
      ${r?`if (row < 0 || row > (${n[o]} - 1) || col < 0 || col > (${n[s]} - 1)) {
        return ${i};
      }`:``};
      row = max(0, min(row, ${n[o]} - 1));
      col = max(0, min(col, ${n[s]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${n.length>2?`u32(originalIndices[${c}])`:`0`};
      var batch: u32 =  ${n.length>2?`u32(originalIndices[${a}])`:`0`};
      var x11: ${l} = getInputValue(batch, channel, row1, col1);
      var x12: ${l} = getInputValue(batch, channel, row1, col2);
      var x21: ${l} = getInputValue(batch, channel, row2, col1);
      var x22: ${l} = getInputValue(batch, channel, row2, col2);
      var dx1: ${l} = abs(row - ${l}(row1));
      var dx2: ${l} = abs(${l}(row2) - row);
      var dy1: ${l} = abs(col - ${l}(col1));
      var dy2: ${l} = abs(${l}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Ql=(e,t,n,r,i,a,o,s,c,l)=>{let[u,d]=n.length===2?[0,1]:[2,3],f=e.type.value,p=o=>{let d=o===u?`row`:`col`;return`
      fn ${d}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${f} {
        var output_index = ${t.indicesGet(`output_indices`,o)};
        var originalIdx: ${f} = getOriginalCoordinateFromResizedCoordinate(output_index, ${i[o]},
        ${r[o]}, ${n[o]}, ${a[o]}, ${a[o]} + ${n.length});
        var fractOriginalIdx: ${f} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${s} && (originalIdx < 0 || originalIdx > (${n[o]} - 1))) {
          return ${c};
        }
        var data: array<${f}, 4> = array<${f}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${d}: ${f} = originalIdx + ${f}(i);
          if (${d} < 0 || ${d} >= ${n[o]}) {
            ${l?`coefs[i + 1] = 0.0;
                        continue;`:s?`return ${c};`:`${d} = max(0, min(${d}, ${n[o]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet(`input_indices_copy`,o,`u32(${d})`)};
          data[i + 1] = ${o===u?e.getByIndices(`input_indices_copy`):`rowCubicInterpolation(input_indices_copy, output_indices)`};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${p(u)};
    ${p(d)};
  fn getCubicInterpolationCoefs(s: ${f}) -> array<${f}, 4> {
    var absS = abs(s);
    var coeffs: array<${f}, 4> = array<${f}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${f} = 1.0 - absS;
    var twoMinusAbsS: ${f} = 2.0 - absS;
    var onePlusAbsS: ${f} = 1.0 + absS;
    coeffs[0] = ((${o} * onePlusAbsS - 5 * ${o}) * onePlusAbsS + 8 * ${o}) * onePlusAbsS - 4 * ${o};
    coeffs[1] = ((${o} + 2) * absS - (${o} + 3)) * absS * absS + 1;
    coeffs[2] = ((${o} + 2) * oneMinusAbsS - (${o} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${o} * twoMinusAbsS - 5 * ${o}) * twoMinusAbsS + 8 * ${o}) * twoMinusAbsS - 4 * ${o};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${f}, 4>, coefs: array<${f}, 4>) -> ${f} {
    var coefsSum: ${f} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${f} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},$l=(e,t,n,r,i)=>{let[a,o,s,c,l]=n.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],u=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${u} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet(`input_indices`,o,`max(0, min(depth, ${n[o]} - 1))`)};
      ${e.indicesSet(`input_indices`,s,`max(0, min(height, ${n[s]} - 1))`)};
      ${e.indicesSet(`input_indices`,c,`max(0, min(width, ${n[c]} - 1))`)};
      ${Xl(e,l,a,3)}
      return ${e.getByIndices(`input_indices`)};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${u} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${u} = originalIndices[${o}];
      var height:${u} = originalIndices[${s}];
      var width:${u} = originalIndices[${c}];
      ${r?`if (depth < 0 || depth > (${n[o]} - 1) || height < 0 || height > (${n[s]} - 1) || width < 0 || (width > ${n[c]} - 1)) {
      return ${i};
        }`:``};

    depth = max(0, min(depth, ${n[o]} - 1));
      height = max(0, min(height, ${n[s]} - 1));
      width = max(0, min(width, ${n[c]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${n.length>3?`u32(originalIndices[${l}])`:`0`};
      var batch: u32 =  ${n.length>3?`u32(originalIndices[${a}])`:`0`};

      var x111: ${u} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${u} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${u} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${u} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${u} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${u} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${u} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${u} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${u} = abs(depth - ${u}(depth1));
      var dx2: ${u} = abs(${u}(depth2) - depth);
      var dy1: ${u} = abs(height - ${u}(height1));
      var dy2: ${u} = abs(${u}(height2) - height);
      var dz1: ${u} = abs(width - ${u}(width1));
      var dz2: ${u} = abs(${u}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},eu=(e,t,n,r,i,a)=>{let o=e.dims,s=Wl(a,t.axes,o.length),c=Gl(o,r,i,t.axes),l=r.slice();r.length===0&&(l=o.map((e,t)=>e===0?1:c[t]/e),t.keepAspectRatioPolicy!==`stretch`&&(c=Kl(o,l,t)));let u=J(`output`,e.dataType,c.length),d=q(`input`,e.dataType,o.length),f=B.size(c),p=o.length===c.length&&o.every((e,t)=>e===c[t]),m=t.coordinateTransformMode===`tf_crop_and_resize`,h=t.extrapolationValue,g=d.type.value;return{name:`Resize`,shaderCache:{hint:`${t.cacheKey}|${n}|${l.length>0?t.mode===`cubic`?l:l.length:``}|${i.length>0?i:``}|${s.length>0?s:``}|${p}|${t.mode===`nearest`?o.length:o}`,inputDependencies:[`rank`]},getShaderSource:e=>`
      ${p?``:`
      ${Hl(t.coordinateTransformMode,g)};
      ${(()=>{switch(t.mode){case`nearest`:return`
              ${Yl(d,o)};
              ${Ul(t.nearestMode,n,g)};
              ${Jl(d,u,o,c,l.length,s.length,m)};
              `;case`linear`:return`
              ${ql(u,o,c,l.length,s.length)};
              ${(()=>{if(o.length===2||o.length===4)return`${Zl(d,u,o,m,h)}`;if(o.length===3||o.length===5)return`${$l(d,u,o,m,h)}`;throw Error(`Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.`)})()};
            `;case`cubic`:return`
            ${(()=>{if(o.length===2||o.length===4)return`${Ql(d,u,o,c,l,s,t.cubicCoeffA,m,t.extrapolationValue,t.excludeOutside)}`;throw Error(`Cubic mode only supports input dims 2 and 4 are supported in linear mode.`)})()};
            `;default:throw Error(`Invalid resize mode`)}})()};
      `}
      ${e.registerUniform(`output_size`,`u32`).registerUniform(`scales`,`f32`,l.length).registerUniform(`roi`,`f32`,s.length).declareVariables(d,u)}
      ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
        ${p?`output[global_idx] = input[global_idx];`:`
        let output_indices = ${u.offsetToIndices(`global_idx`)};
        var input_indices: ${d.type.indices};
        ${(()=>{switch(t.mode){case`nearest`:return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${d.getByIndices(`input_indices`)};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case`linear`:return`output[global_idx] = ${o.length===2||o.length===4?`bilinearInterpolation`:`trilinearInterpolation`}(output_indices);`;case`cubic`:return`output[global_idx] = bicubicInterpolation(output_indices);`;default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`,getRunData:()=>({outputs:[{dims:c,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},{type:1,data:l},{type:1,data:s},...W(o,c)]})}},tu=e=>{let t=e.customDataBuffer;return new Uint32Array(t.buffer,t.byteOffset,1)[0]},nu=(e,t)=>{let n=[],r=[],i=[],a=tu(e);if(t.antialias!==0)throw Error(`Only default value (0) for Antialias attribute is supported`);Bl(e.inputs,t,a,n,r,i),e.compute(eu(e.inputs[0],t,a,n,r,i),{inputs:[0]})},ru=e=>{let t=e.antialias,n=e.axes,r=e.coordinateTransformMode,i=e.cubicCoeffA,a=e.excludeOutside!==0,o=e.extrapolationValue,s=e.keepAspectRatioPolicy,c=e.mode,l=e.nearestMode===``?`simple`:e.nearestMode;return H({antialias:t,axes:n,coordinateTransformMode:r,cubicCoeffA:i,excludeOutside:a,extrapolationValue:o,keepAspectRatioPolicy:s,mode:c,nearestMode:l})}}),au,ou,su,cu=a(()=>{"use strict";R(),V(),Y(),au=e=>{if(!e||e.length<3)throw Error(`layerNorm requires at least 3 inputs.`);let t=e[0],n=e[1],r=e[2];if(t.dataType!==n.dataType||t.dataType!==r.dataType)throw Error(`All inputs must have the same data type`);if(t.dims.length!==3&&t.dims.length!==2)throw Error(`Input must be 2D or 3D`);if(n.dims.length!==3&&n.dims.length!==2)throw Error(`Skip must be 2D or 3D`);let i=t.dims[t.dims.length-1],a=t.dims[t.dims.length-2];if(n.dims[n.dims.length-1]!==i)throw Error(`Skip must have the same hidden size as input`);if(n.dims[n.dims.length-2]!==a)throw Error(`Skip must have the same sequence length as input`);if(r.dims.length!==1)throw Error(`Gamma must be 1D`);if(r.dims[r.dims.length-1]!==i)throw Error(`Gamma must have the same hidden size as input`);if(e.length>3){let t=e[3];if(t.dims.length!==1)throw Error(`Beta must be 1D`);if(t.dims[t.dims.length-1]!==i)throw Error(`Beta must have the same hidden size as input`)}if(e.length>4){let t=e[4];if(t.dims.length!==1)throw Error(`Bias must be 1D`);if(t.dims[t.dims.length-1]!==i)throw Error(`Bias must have the same hidden size as input`)}},ou=(e,t,n,r)=>{let i=t.simplified,a=e[0].dims,o=B.size(a),s=a,c=o,l=a.slice(-1)[0],u=r?a.slice(0,-1).concat(1):[],d=!i&&e.length>3,f=e.length>4,p=r&&n>1,m=r&&n>2,h=n>3,g=G(l),_=[{type:12,data:c},{type:12,data:g},{type:12,data:l},{type:1,data:t.epsilon}],v=t=>{let n=[{name:`output_size`,type:`u32`},{name:`components`,type:`u32`},{name:`hidden_size`,type:`u32`},{name:`epsilon`,type:`f32`}],r=[q(`x`,e[0].dataType,e[0].dims,g),q(`skip`,e[1].dataType,e[1].dims,g),q(`gamma`,e[2].dataType,e[2].dims,g)];d&&r.push(q(`beta`,e[3].dataType,e[3].dims,g)),f&&r.push(q(`bias`,e[4].dataType,e[4].dims,g)),r.push(J(`output`,e[0].dataType,s,g)),p&&r.push(J(`mean_output`,1,u)),m&&r.push(J(`inv_std_output`,1,u)),h&&r.push(J(`input_skip_bias_sum`,e[0].dataType,s,g));let a=bn(e[0].dataType),o=bn(1,g);return`

      ${t.registerUniforms(n).declareVariables(...r)}
      var<workgroup> sum_shared : array<${o}, 64>;
      var<workgroup> sum_squared_shared : array<${o}, 64>;

      ${t.mainStart([64,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / 64;

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / 64;
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == 63) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${f?`bias[offset1d + i]`:a+`(0.0)`};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${h?`input_skip_bias_sum[offset + i] = value;`:``}
          output[offset + i] = value;
          let f32_value = ${Cn(a,g,`value`)};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = 64;
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${wn(`sum`,g)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${wn(`square_sum`,g)} / f32(uniforms.hidden_size) ${i?``:`- mean * mean`} + uniforms.epsilon);
        ${p?`mean_output[global_idx] = mean;`:``}
        ${m?`inv_std_output[global_idx] = inv_std_dev;`:``}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${i?``:`- ${a}(mean)`}) *
            ${a}(inv_std_dev) * gamma[offset1d + i]
            ${d?`+ beta[offset1d + i]`:``};
        }
      }`},y=[{dims:s,dataType:e[0].dataType}];return n>1&&y.push({dims:u,dataType:1}),n>2&&y.push({dims:u,dataType:1}),n>3&&y.push({dims:a,dataType:e[0].dataType}),{name:`SkipLayerNormalization`,shaderCache:{hint:`${g};${p};${m};${h}`,inputDependencies:e.map((e,t)=>`type`)},getShaderSource:v,getRunData:()=>({outputs:y,dispatchGroup:{x:Math.ceil(c/l)},programUniforms:_})}},su=(e,t)=>{au(e.inputs);let n=[0];e.outputCount>1&&n.push(-3),e.outputCount>2&&n.push(-3),e.outputCount>3&&n.push(3),e.compute(ou(e.inputs,t,e.outputCount,!1),{outputs:n})}}),lu,uu,du,fu,pu,mu,hu,gu,_u=a(()=>{"use strict";R(),V(),U(),Y(),lu=(e,t)=>{if(!e||e.length<1)throw Error(`too few inputs`);if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw Error(`axes, starts and ends must have the same length`)}else if(t.starts.length!==t.ends.length)throw Error(`starts and ends must have the same length`);e.slice(1).forEach((t,n)=>{if(e[n+1].dataType!==6&&e[n+1].dataType!==7)throw Error(`Input ${n} must be an array of int32 or int64`)})},uu=(e,t)=>{let n=[];if(e.length>t){if(e[t].dataType===7)e[t].getBigInt64Array().forEach(e=>n.push(Number(e)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(e=>n.push(Number(e)));else throw Error(`Input ${t} must be an array of int32 or int64`)}return n},du=(e,t)=>{if(e.length>1){let t=uu(e,1),n=uu(e,2),r=uu(e,3);return r.length===0&&(r=[...Array(e[0].dims.length).keys()]),H({starts:t,ends:n,axes:r})}return t},fu=(e,t,n,r,i)=>{let a=e;return e<0&&(a+=n[r[t]]),i[t]<0?Math.max(0,Math.min(a,n[r[t]]-1)):Math.max(0,Math.min(a,n[r[t]]))},pu=(e,t,n)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${n.length-1}; i >= 0; i--) {
            let input_shape_i = ${K(`uniforms.input_shape`,`i`,n.length)};
            let steps_i = ${K(`uniforms.steps`,`i`,n.length)};
            let signs_i = ${K(`uniforms.signs`,`i`,n.length)};
            let starts_i = ${K(`uniforms.starts`,`i`,n.length)};
            var output_index = ${t.indicesGet(`output_indices`,`i`)};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet(`input_indices`,`i`,`input_index`)};
          }
          return input_indices;
      }`,mu=(e,t)=>{let n=e[0].dims,r=B.size(n),i=t.axes.length>0?B.normalizeAxes(t.axes,n.length):[...Array(n.length).keys()],a=uu(e,4);a.forEach(e=>e!==0||(()=>{throw Error(`step cannot be 0`)})),a.length===0&&(a=Array(i.length).fill(1));let o=t.starts.map((e,t)=>fu(e,t,n,i,a)),s=t.ends.map((e,t)=>fu(e,t,n,i,a));if(i.length!==o.length||i.length!==s.length)throw Error(`start, ends and axes should have the same number of elements`);if(i.length!==n.length)for(let e=0;e<n.length;++e)i.includes(e)||(o.splice(e,0,0),s.splice(e,0,n[e]),a.splice(e,0,1));let c=a.map(e=>Math.sign(e));a.forEach((e,t,n)=>{if(e<0){let r=(s[t]-o[t])/e,i=o[t],c=i+r*a[t];o[t]=c,s[t]=i,n[t]=-e}});let l=n.slice(0);i.forEach((e,t)=>{l[e]=Math.ceil((s[e]-o[e])/a[e])});let u={dims:l,dataType:e[0].dataType},d=J(`output`,e[0].dataType,l.length),f=q(`input`,e[0].dataType,e[0].dims.length),p=B.size(l),m=[{name:`outputSize`,type:`u32`},{name:`starts`,type:`u32`,length:o.length},{name:`signs`,type:`i32`,length:c.length},{name:`steps`,type:`u32`,length:a.length}],h=[{type:12,data:p},{type:12,data:o},{type:6,data:c},{type:12,data:a},...W(e[0].dims,l)];return{name:`Slice`,shaderCache:{hint:`${c.length}_${o.length}_${a.length}`,inputDependencies:[`rank`]},getShaderSource:e=>`
      ${e.registerUniforms(m).declareVariables(f,d)}
        ${pu(f,d,n)}
        ${e.mainStart()}
          ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
          let output_indices = ${d.offsetToIndices(`global_idx`)};
          let input_indices = calculateInputIndices(output_indices);
          ${d.setByOffset(`global_idx`,f.getByIndices(`input_indices`))}
      }`,getRunData:()=>({outputs:[u],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:h})}},hu=(e,t)=>{lu(e.inputs,t);let n=du(e.inputs,t);e.compute(mu(e.inputs,n),{inputs:[0]})},gu=e=>{let t=e.starts,n=e.ends,r=e.axes;return H({starts:t,ends:n,axes:r})}}),vu,yu,bu,xu,Su=a(()=>{"use strict";R(),V(),U(),zn(),Y(),vu=e=>{if(!e||e.length!==1)throw Error(`Softmax op requires 1 input.`)},yu=(e,t)=>{let n=e.inputs[0],r=n.dims,i=B.size(r),a=r.length,o=B.normalizeAxis(t.axis,a),s=o<r.length-1,c,l=[];s?(l=Array.from({length:a},(e,t)=>t),l[o]=a-1,l[a-1]=o,c=e.compute(In(n,l),{inputs:[n],outputs:[-1]})[0]):c=n;let u=c.dims,d=u[a-1],f=i/d,p=G(d),m=d/p,h=64;f===1&&(h=256);let g=(e,t)=>t===4?`max(max(${e}.x, ${e}.y), max(${e}.z, ${e}.w))`:t===2?`max(${e}.x, ${e}.y)`:t===3?`max(max(${e}.x, ${e}.y), ${e}.z)`:e,_=q(`x`,c.dataType,c.dims,p),v=J(`result`,c.dataType,c.dims,p),y=_.type.value,b=bn(c.dataType)===`f32`?`var threadMax = ${y}(-3.4028234663852886e+38f);`:`var threadMax = ${y}(-65504.0h);`,x=e.compute({name:`Softmax`,shaderCache:{hint:`${p};${h}`,inputDependencies:[`type`]},getRunData:()=>({outputs:[{dims:u,dataType:c.dataType}],dispatchGroup:{x:f},programUniforms:[{type:6,data:m}]}),getShaderSource:e=>`
      var<workgroup> rowMaxShared : ${y};
      var<workgroup> rowSumShared : ${y};
      var<workgroup> threadShared : array<${y}, ${h}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${y} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${y}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${e.registerUniform(`packedCols`,`i32`).declareVariables(_,v)}
      ${e.mainStart(h)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${h};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${b}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${y}(${g(`threadShared[0]`,p)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${y}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${y}(${wn(`threadShared[0]`,p)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          var value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          // max operation protects against NaN since all values should be >=0
          value = max(value, ${y}(0.0));
          setValue(row, col, row_stride, value);
        }
      }`},{inputs:[c],outputs:[s?-1:0]})[0];s&&e.compute(In(x,l),{inputs:[x]})},bu=(e,t)=>{vu(e.inputs),yu(e,t)},xu=e=>H({axis:e.axis})}),Cu,wu,Tu,Eu,Du,Ou=a(()=>{"use strict";R(),V(),Y(),Cu=e=>Array.from(e.getBigInt64Array(),Number),wu=e=>{if(!e||e.length!==2)throw Error(`Tile requires 2 inputs.`);if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw Error(`Tile only support float, float16, int32, and uint32 data types`);if(e[1].dataType!==7)throw Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw Error("Tile `repeats` input should be 1-D");if(Cu(e[1]).length!==e[0].dims.length)throw Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},Tu=(e,t)=>{let n=[];for(let r=0;r<e.length;++r)n.push(e[r]*t[r]);return n},Eu=(e,t)=>{let n=e[0].dims,r=t??Cu(e[1]),i=Tu(n,r),a=B.size(i),o=e[0].dataType,s=q(`input`,o,n.length),c=J(`output`,o,i.length);return{name:`Tile`,shaderCache:{hint:`${r}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},...W(e[0].dims,i)]}),getShaderSource:e=>`
      const inputShape = ${s.indices(...n)};
      ${e.registerUniform(`output_size`,`u32`).declareVariables(s,c)}
      ${e.mainStart()}
      ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
      let output_indices = ${c.offsetToIndices(`global_idx`)};
      var input_indices: ${s.type.indices};
      for (var i = 0; i < ${n.length}; i++) {
        let input_dim_i = ${s.indicesGet(`uniforms.input_shape`,`i`)};
        let input_dim_value = ${c.indicesGet(`output_indices`,`i`)}  % input_dim_i;

        ${s.indicesSet(`input_indices`,`i`,`input_dim_value`)}
      }
      ${c.setByOffset(`global_idx`,s.getByIndices(`input_indices`))}
    }`}},Du=e=>{wu(e.inputs),e.compute(Eu(e.inputs),{inputs:[0]})}}),ku,Au,ju,Mu=a(()=>{"use strict";R(),V(),Y(),ku=(e,t,n,r,i)=>{let a=J(`output_data`,i,n.length,4),o=q(`a_data`,t[1].dataType,t[1].dims.length,4),s=q(`b_data`,t[2].dataType,t[2].dims.length,4),c=q(`c_data`,t[0].dataType,t[0].dims.length,4),l,u=(e,t,n)=>`select(${t}, ${e}, ${n})`;if(!r)l=a.setByOffset(`global_idx`,u(o.getByOffset(`global_idx`),s.getByOffset(`global_idx`),c.getByOffset(`global_idx`)));else{let e=(e,t,n=``)=>{let r=`a_data[index_a${t}][component_a${t}]`,i=`b_data[index_b${t}][component_b${t}]`,l=`bool(c_data[index_c${t}] & (0xffu << (component_c${t} * 8)))`;return`
            let output_indices${t} = ${a.offsetToIndices(`global_idx * 4u + ${t}u`)};
            let offset_a${t} = ${o.broadcastedIndicesToOffset(`output_indices${t}`,a)};
            let offset_b${t} = ${s.broadcastedIndicesToOffset(`output_indices${t}`,a)};
            let offset_c${t} = ${c.broadcastedIndicesToOffset(`output_indices${t}`,a)};
            let index_a${t} = offset_a${t} / 4u;
            let index_b${t} = offset_b${t} / 4u;
            let index_c${t} = offset_c${t} / 4u;
            let component_a${t} = offset_a${t} % 4u;
            let component_b${t} = offset_b${t} % 4u;
            let component_c${t} = offset_c${t} % 4u;
            ${e}[${t}] = ${n}(${u(r,i,l)});
          `};l=i===9?`
            var data = vec4<u32>(0);
            ${e(`data`,0,`u32`)}
            ${e(`data`,1,`u32`)}
            ${e(`data`,2,`u32`)}
            ${e(`data`,3,`u32`)}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:`
            ${e(`output_data[global_idx]`,0)}
            ${e(`output_data[global_idx]`,1)}
            ${e(`output_data[global_idx]`,2)}
            ${e(`output_data[global_idx]`,3)}
          `}return`
        ${e.registerUniform(`vec_size`,`u32`).declareVariables(c,o,s,a)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}
        ${l}
      }`},Au=e=>{let t=e[1].dims,n=e[2].dims,r=e[0].dims,i=e[1].dataType,a=!(B.areEqual(t,n)&&B.areEqual(n,r)),o=t,s=B.size(t);if(a){let e=It.calcShape(It.calcShape(t,n,!1),r,!1);if(!e)throw Error(`Can't perform where op on the given tensors`);o=e,s=B.size(o)}let c=Math.ceil(s/4);return{name:`Where`,shaderCache:{inputDependencies:[`rank`,`rank`,`rank`]},getShaderSource:t=>ku(t,e,o,a,i),getRunData:()=>({outputs:[{dims:o,dataType:i}],dispatchGroup:{x:Math.ceil(s/64/4)},programUniforms:[{type:12,data:c},...W(r,t,n,o)]})}},ju=e=>{e.compute(Au(e.inputs))}}),Nu,Pu=a(()=>{"use strict";Ir(),Gr(),Xr(),ei(),Xi(),ua(),_a(),uo(),Co(),Do(),No(),Zo(),ls(),hs(),vs(),Cs(),Ds(),Ms(),Ls(),Hs(),rc(),kc(),Pc(),Rc(),Vc(),qc(),dc(),rl(),Cl(),Ol(),Ml(),Ll(),jr(),iu(),Cc(),cu(),_u(),Su(),yc(),Ou(),zn(),Ki(),Mu(),Nu=/* @__PURE__ */ new Map([[`Abs`,[ni]],[`Acos`,[ri]],[`Acosh`,[ii]],[`Add`,[ea]],[`ArgMax`,[Pr,Fr]],[`ArgMin`,[Nr,Fr]],[`Asin`,[ai]],[`Asinh`,[oi]],[`Atan`,[si]],[`Atanh`,[ci]],[`Attention`,[Wr]],[`AveragePool`,[ml,pl]],[`BatchNormalization`,[Yr]],[`BiasAdd`,[$r]],[`BiasSplitGelu`,[Yi]],[`Cast`,[ui,li]],[`Ceil`,[pi]],[`Clip`,[fi]],[`Concat`,[ha,ga]],[`Conv`,[lo,ao]],[`ConvTranspose`,[So,vo]],[`Cos`,[mi]],[`Cosh`,[hi]],[`CumSum`,[To,Eo]],[`DepthToSpace`,[jo,Mo]],[`DequantizeLinear`,[El,Dl]],[`DFT`,[Yo,Xo]],[`Div`,[ta]],[`Einsum`,[ss,cs]],[`Elu`,[_i,gi]],[`Equal`,[na]],[`Erf`,[yi]],[`Exp`,[bi]],[`Expand`,[ms]],[`FastGelu`,[_s]],[`Floor`,[xi]],[`FusedConv`,[lo,ao]],[`Gather`,[Ss,xs]],[`GatherElements`,[Is,Fs]],[`GatherBlockQuantized`,[As,js]],[`GatherND`,[Ts,Es]],[`Gelu`,[Si]],[`Gemm`,[Vs,Bs]],[`GlobalAveragePool`,[_l,gl]],[`GlobalMaxPool`,[Sl,xl]],[`Greater`,[oa]],[`GreaterOrEqual`,[ca]],[`GridSample`,[tc,nc]],[`GroupQueryAttention`,[Oc]],[`HardSigmoid`,[Ai,ki]],[`HardSwish`,[ji]],[`InstanceNormalization`,[Nc]],[`LayerNormalization`,[Lc]],[`LeakyRelu`,[Ci,gi]],[`Less`,[sa]],[`LessOrEqual`,[la]],[`Log`,[Hi]],[`MatMul`,[Bc]],[`MatMulNBits`,[Gc,Kc]],[`MaxPool`,[yl,bl]],[`Mul`,[ra]],[`MultiHeadAttention`,[uc,oc]],[`Neg`,[Ti]],[`Not`,[wi]],[`Pad`,[nl]],[`Pow`,[ia]],[`QuickGelu`,[Gi,gi]],[`Range`,[jl]],[`Reciprocal`,[Ei]],[`ReduceMin`,[Er]],[`ReduceMean`,[Cr]],[`ReduceMax`,[Tr]],[`ReduceSum`,[Or]],[`ReduceProd`,[Dr]],[`ReduceL1`,[Z]],[`ReduceL2`,[wr]],[`ReduceLogSum`,[Ar]],[`ReduceLogSumExp`,[Q]],[`ReduceSumSquare`,[kr]],[`Relu`,[Di]],[`Resize`,[nu,ru]],[`RotaryEmbedding`,[Sc]],[`ScatterND`,[Il,Fl]],[`Sigmoid`,[Oi]],[`Sin`,[Mi]],[`Sinh`,[Ni]],[`Slice`,[hu,gu]],[`SkipLayerNormalization`,[su]],[`Split`,[_c,vc]],[`Sqrt`,[Pi]],[`Softmax`,[bu,xu]],[`Sub`,[aa]],[`Tan`,[Fi]],[`Tanh`,[Li]],[`ThresholdedRelu`,[Vi,gi]],[`Tile`,[Du]],[`Transpose`,[Ln,Rn]],[`Where`,[ju]]])}),Fu,Iu=a(()=>{"use strict";Te(),Pt(),Y(),Fu=class{constructor(e){this.backend=e,this.repo=/* @__PURE__ */ new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,n,r,i){pe(e.programInfo.name);let a=this.backend.device,o=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let s=[];for(let e of t)s.push({binding:s.length,resource:{buffer:e.buffer}});for(let e of n)s.push({binding:s.length,resource:{buffer:e.buffer}});i&&s.push({binding:s.length,resource:i});let c=a.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:s,label:e.programInfo.name});if(this.backend.sessionStatus===`capturing`){let t={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:c,dispatchGroup:r};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(t)}o.setPipeline(e.computePipeline),o.setBindGroup(0,c),o.dispatchWorkgroups(...r),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType===`at-passes`)&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),me(e.programInfo.name)}dispose(){}build(e,t){pe(e.name);let n=this.backend.device,r=[];[{feature:`shader-f16`,extension:`f16`},{feature:`subgroups`,extension:`subgroups`}].forEach(e=>{n.features.has(e.feature)&&r.push(`enable ${e.extension};`)});let i=kn(t,this.backend.device.limits),a=e.getShaderSource(i),o=`${r.join(`
`)}
${i.additionalImplementations}
${a}`,s=n.createShaderModule({code:o,label:e.name});z(`verbose`,()=>`[WebGPU] ${e.name} shader code: ${o}`);let c=n.createComputePipeline({compute:{module:s,entryPoint:`main`},layout:`auto`,label:e.name});return me(e.name),{programInfo:e,computePipeline:c,uniformVariablesInfo:i.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e==`number`?e:e.x,n=typeof e==`number`?1:e.y||1,r=typeof e==`number`?1:e.z||1,i=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=i&&n<=i&&r<=i)return[t,n,r];let a=t*n*r,o=Math.ceil(Math.sqrt(a));if(o>i){if(o=Math.ceil(Math.cbrt(a)),o>i)throw Error(`Total dispatch size exceeds WebGPU maximum.`);return[o,o,o]}return[o,o,1]}}}),Lu={};o(Lu,{WebGpuBackend:()=>Vu});var Ru,zu,Bu,Vu,Hu=a(()=>{"use strict";Te(),R(),Pt(),Ht(),gn(),Pu(),Iu(),Ru=(e,t)=>{if(t.length!==e.length)throw Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let n=[];for(let r=0;r<e.length;++r){let i=e[r].dataType;switch(t[r]){case`none`:n.push(``);break;case`type`:n.push(`${i}`);break;case`rank`:{let t=e[r].dims.length;n.push(`${i};${t}`);break}case`dims`:{let t=e[r].dims.join(`,`);n.push(`${i};${t}`);break}default:throw Error(`unsupported input dependency: ${t[r]}`)}}return n.join(`|`)},zu=(e,t,n)=>{let r=e.name;return e.shaderCache?.hint&&(r+=`[`+e.shaderCache.hint+`]`),r+=`:`+n+`:${Ru(t,e.shaderCache?.inputDependencies??Array(t.length).fill(`dims`))}`,r},Bu=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Vu=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=/* @__PURE__ */ new Map,this.sessionStatus=`default`,this.capturedCommandList=/* @__PURE__ */ new Map,this.capturedPendingKernels=/* @__PURE__ */ new Map,this.sessionExternalDataMapping=/* @__PURE__ */ new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw Error(`currentKernelCustomData(): currentKernelId is null. (should not happen)`);let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let n=[],r={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:n},i=e=>t.features.has(e)&&n.push(e)&&!0;i(`chromium-experimental-timestamp-query-inside-passes`)||i(`timestamp-query`),i(`shader-f16`),i(`subgroups`),this.device=await t.requestDevice(r);let a=t,o=t.info??(typeof a.requestAdapterInfo==`function`?await a.requestAdapterInfo():void 0);this.adapterInfo=new Bu(o),this.gpuDataManager=hn(this),this.programManager=new Fu(this),this.kernels=/* @__PURE__ */ new Map,this.kernelPersistentData=/* @__PURE__ */ new Map,this.kernelCustomData=/* @__PURE__ */ new Map,Mt(e.logLevel,!!e.debug),this.device.onuncapturederror=e=>{e.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${e.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!0}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<`u`&&this.querySet.destroy(),this.gpuDataManager.dispose(),this.device&&this.env?.webgpu&&this.device.lost.then(()=>{delete this.env.webgpu.device})}getCommandEncoder(){return this.commandEncoder||=this.device.createCommandEncoder(),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType===`at-passes`&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&=(this.computePassEncoder.end(),null)}flush(){if(!this.commandEncoder)return;pe(),this.endComputePass();let e;this.queryType!==`none`&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!==`none`&&e.mapAsync(GPUMapMode.READ).then(()=>{let t=new BigUint64Array(e.getMappedRange()),n=this.pendingQueries.get(e);for(let e=0;e<t.length/2;e++){let r=n[e],i=r.kernelId,a=this.kernels.get(i),o=a.kernelType,s=a.kernelName,c=r.programName,l=r.inputTensorViews,u=r.outputTensorViews,d=t[e*2],f=t[e*2+1];typeof this.queryTimeBase>`u`&&(this.queryTimeBase=d);let p=Number(d-this.queryTimeBase),m=Number(f-this.queryTimeBase);if(!Number.isSafeInteger(p)||!Number.isSafeInteger(m))throw RangeError(`incorrect timestamp range`);if(this.env.webgpu.profiling?.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:l.map(e=>({dims:e.dims,dataType:yt(e.dataType)})),outputsMetadata:u.map(e=>({dims:e.dims,dataType:yt(e.dataType)})),kernelId:i,kernelType:o,kernelName:s,programName:c,startTime:p,endTime:m});else{let e=``;l.forEach((t,n)=>{e+=`input[${n}]: [${t.dims}] | ${yt(t.dataType)}, `});let t=``;u.forEach((e,n)=>{t+=`output[${n}]: [${e.dims}] | ${yt(e.dataType)}, `}),console.log(`[profiling] kernel "${i}|${o}|${s}|${c}" ${e}${t}start time: ${p} ns, execution time: ${m-p} ns`)}de(`GPU`,`${c}::${d}::${f}`)}e.unmap(),this.pendingQueries.delete(e)}),me()}run(e,t,n,r,i,a){pe(e.name);let o=[];for(let e=0;e<t.length;++e){let n=t[e].data;if(n===0)continue;let r=this.gpuDataManager.get(n);if(!r)throw Error(`no GPU data for input: ${n}`);o.push(r)}let{outputs:s,dispatchGroup:c,programUniforms:l}=e.getRunData(t),u=n.length===0?s.map((e,t)=>t):n;if(u.length!==s.length)throw Error(`Output size ${u.length} must be equal to ${s.length}.`);let d=[],f=[];for(let e=0;e<s.length;++e){if(!Number.isInteger(u[e])||u[e]<-3||u[e]>=a)throw Error(`Invalid output index: ${u[e]}`);if(u[e]===-3)continue;let t=u[e]===-1,n=u[e]===-2,o=t||n?i(s[e].dataType,s[e].dims):r(u[e],s[e].dataType,s[e].dims);if(d.push(o),o.data===0)continue;let c=this.gpuDataManager.get(o.data);if(!c)throw Error(`no GPU data for output: ${o.data}`);if(t&&this.temporaryData.push(c),n){let e=this.kernelPersistentData.get(this.currentKernelId);e||(e=[],this.kernelPersistentData.set(this.currentKernelId,e)),e.push(c)}f.push(c)}if(o.length!==t.length||f.length!==d.length){if(f.length===0)return me(e.name),d;throw Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let p;if(l){let e=0,t=[];l.forEach(n=>{let r=typeof n.data==`number`?[n.data]:n.data;if(r.length===0)return;let i=n.type===10?2:4,a,o;n.type===10?(o=r.length>4?16:r.length>2?8:r.length*i,a=r.length>4?16:i*r.length):(o=r.length<=2?r.length*i:16,a=16),e=Math.ceil(e/o)*o,t.push(e);let s=n.type===10?8:4;e+=r.length>4?Math.ceil(r.length/s)*a:r.length*i}),e=Math.ceil(e/16)*16;let n=new ArrayBuffer(e);l.forEach((e,r)=>{let i=t[r],a=typeof e.data==`number`?[e.data]:e.data;if(e.type===6)new Int32Array(n,i,a.length).set(a);else if(e.type===12)new Uint32Array(n,i,a.length).set(a);else if(e.type===10)new Uint16Array(n,i,a.length).set(a);else if(e.type===1)new Float32Array(n,i,a.length).set(a);else throw Error(`Unsupported uniform type: ${yt(e.type)}`)});let r=this.gpuDataManager.create(e,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(r.buffer,0,n,0,e),this.gpuDataManager.release(r.id),p={offset:0,size:e,buffer:r.buffer}}let m=this.programManager.normalizeDispatchGroupSize(c),h=m[1]===1&&m[2]===1,g=zu(e,t,h),_=this.programManager.getArtifact(g);if(_||(_=this.programManager.build(e,m),this.programManager.setArtifact(g,_),z(`info`,()=>`[artifact] key: ${g}, programName: ${e.name}`)),l&&_.uniformVariablesInfo){if(l.length!==_.uniformVariablesInfo.length)throw Error(`Uniform variables count mismatch: expect ${_.uniformVariablesInfo.length}, got ${l.length} in program "${_.programInfo.name}".`);for(let e=0;e<l.length;e++){let t=l[e],n=t.type,r=typeof t.data==`number`?1:t.data.length,[i,a]=_.uniformVariablesInfo[e];if(n!==i||r!==a)throw Error(`Uniform variable ${e} mismatch: expect type ${i} with size ${a}, got type ${n} with size ${r} in program "${_.programInfo.name}".`)}}if(z(`info`,()=>`[ProgramManager] run "${e.name}" (key=${g}) with ${m[0]}x${m[1]}x${m[2]}`),this.queryType!==`none`||this.sessionStatus===`capturing`){let e={kernelId:this.currentKernelId,programName:_.programInfo.name,inputTensorViews:t,outputTensorViews:d};this.pendingKernels.push(e),this.sessionStatus===`capturing`&&this.capturedPendingKernels.get(this.currentSessionId).push(e)}return this.programManager.run(_,o,f,m,p),me(e.name),d}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,n,r){let i=Nu.get(e);if(!i)throw Error(`kernel not implemented: ${e}`);let a={kernelType:e,kernelName:r,kernelEntry:i[0],attributes:[i[1],n]};this.kernels.set(t,a)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let e of t)this.gpuDataManager.release(e.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,n){let r=this.kernels.get(e);if(!r)throw Error(`kernel not created: ${e}`);let i=r.kernelType,a=r.kernelName,o=r.kernelEntry,s=r.attributes;if(this.currentKernelId!==null)throw Error(`kernel "[${i}] ${a}" is not allowed to be called recursively`);this.currentKernelId=e,s[0]&&=(s[1]=s[0](s[1]),void 0),z(`info`,()=>`[WebGPU] Start to run kernel "[${i}] ${a}"...`);let c=this.env.debug;this.temporaryData=[];try{return c&&this.device.pushErrorScope(`validation`),o(t,s[1]),0}catch(e){return n.push(Promise.resolve(`[WebGPU] Kernel "[${i}] ${a}" failed. ${e}`)),1}finally{c&&n.push(this.device.popErrorScope().then(e=>e?`GPU validation error for kernel "[${i}] ${a}": ${e.message}`:null));for(let e of this.temporaryData)this.gpuDataManager.release(e.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,n,r){let i=this.sessionExternalDataMapping.get(e);i||(i=/* @__PURE__ */ new Map,this.sessionExternalDataMapping.set(e,i));let a=i.get(t),o=this.gpuDataManager.registerExternalBuffer(n,r,a);return i.set(t,[o,n]),o}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(e=>this.gpuDataManager.unregisterExternalBuffer(e[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,n){return async()=>{let r=await pn(this,e,t);return Vt(r.buffer,n)}}writeTimestamp(e){this.queryType===`inside-passes`&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){this.queryType=`none`,(this.env.webgpu.profiling?.mode==="default"||(typeof this.env.trace>`u`?this.env.wasm.trace:this.env.trace))&&(this.device.features.has(`chromium-experimental-timestamp-query-inside-passes`)?this.queryType=`inside-passes`:this.device.features.has(`timestamp-query`)&&(this.queryType=`at-passes`),this.queryType!==`none`&&typeof this.querySet>`u`&&(this.querySet=this.device.createQuerySet({type:`timestamp`,count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){z(`info`,`captureBegin`),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus=`capturing`}captureEnd(){z(`info`,`captureEnd`),this.flush(),this.sessionStatus=`default`}replay(){z(`info`,`replay`),this.sessionStatus=`replaying`;let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),n=e.length;this.pendingKernels=[];for(let r=0;r<n;r++){let n=this.getComputePassEncoder(),i=e[r];this.writeTimestamp(this.pendingDispatchNumber*2),n.setPipeline(i.computePipeline),n.setBindGroup(0,i.bindGroup),n.dispatchWorkgroups(...i.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!==`none`&&this.pendingKernels.push(t[r]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType===`at-passes`)&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus=`default`}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Uu={};o(Uu,{init:()=>Ku});var Wu,Gu,Ku,qu=a(()=>{"use strict";R(),Pt(),V(),an(),Wu=class e{constructor(e,t,n,r){this.module=e,this.dataType=t,this.data=n,this.dims=r}getFloat32Array(){if(this.dataType!==1)throw Error(`Invalid data type`);let e=B.size(this.dims);return e===0?/* @__PURE__ */ new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,e)}getBigInt64Array(){if(this.dataType!==7)throw Error(`Invalid data type`);let e=B.size(this.dims);return e===0?/* @__PURE__ */ new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,e)}getInt32Array(){if(this.dataType!==6)throw Error(`Invalid data type`);let e=B.size(this.dims);return e===0?/* @__PURE__ */ new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,e)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw Error(`Invalid data type`);let e=B.size(this.dims);return e===0?/* @__PURE__ */ new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,e)}reshape(t){if(B.size(t)!==B.size(this.dims))throw Error(`Invalid new shape`);return new e(this.module,this.dataType,this.data,t)}},Gu=class{constructor(e,t,n){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let r=e.PTR_SIZE,i=n/e.PTR_SIZE,a=r===4?`i32`:`i64`;this.opKernelContext=Number(e.getValue(r*i++,a));let o=Number(e.getValue(r*i++,a));this.outputCount=Number(e.getValue(r*i++,a)),this.customDataOffset=Number(e.getValue(r*i++,`*`)),this.customDataSize=Number(e.getValue(r*i++,a));let s=[];for(let t=0;t<o;t++){let t=Number(e.getValue(r*i++,a)),n=Number(e.getValue(r*i++,`*`)),o=Number(e.getValue(r*i++,a)),c=[];for(let t=0;t<o;t++)c.push(Number(e.getValue(r*i++,a)));s.push(new Wu(e,t,n,c))}this.inputs=s}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){let n=t?.inputs?.map(e=>typeof e==`number`?this.inputs[e]:e)??this.inputs,r=t?.outputs??[];return this.backend.run(e,n,r,(e,t,n)=>new Wu(this.module,t,this.output(e,n),n),(e,t)=>{let n=bt(e,t);if(!n)throw Error(`Unsupported data type: ${e}`);let r=n>0?this.backend.gpuDataManager.create(n).id:0;return new Wu(this.module,e,r,t)},this.outputCount)}output(e,t){let n=this.module.stackSave();try{let n=this.module.PTR_SIZE,r=n===4?`i32`:`i64`,i=this.module.stackAlloc((1+t.length)*n);this.module.setValue(i,t.length,r);for(let e=0;e<t.length;e++)this.module.setValue(i+n*(e+1),t[e],r);return this.module._JsepOutput(this.opKernelContext,e,i)}catch(n){throw Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${n}`)}finally{this.module.stackRestore(n)}}},Ku=async(e,t,n,r)=>{let i=t.jsepInit;if(!i)throw Error(`Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.`);if(e===`webgpu`){let e=(Hu(),c(Lu)).WebGpuBackend,a=new e;await a.initialize(n,r),i(`webgpu`,[a,e=>a.alloc(Number(e)),e=>a.free(e),(e,n,r,i=!1)=>{if(i)z(`verbose`,()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(e)}, dst=${Number(n)}, size=${Number(r)}`),a.memcpy(Number(e),Number(n));else{z(`verbose`,()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(e)}, gpuDataId=${Number(n)}, size=${Number(r)}`);let i=t.HEAPU8.subarray(Number(e>>>0),Number(e>>>0)+Number(r));a.upload(Number(n),i)}},async(e,n,r)=>{z(`verbose`,()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${e}, dataOffset=${n}, size=${r}`),await a.download(Number(e),()=>t.HEAPU8.subarray(Number(n)>>>0,Number(n+r)>>>0))},(e,n,r)=>a.createKernel(e,Number(n),r,t.UTF8ToString(t._JsepGetNodeName(Number(n)))),e=>a.releaseKernel(e),(e,n,r,i)=>{z(`verbose`,()=>`[WebGPU] jsepRun: sessionHandle=${r}, kernel=${e}, contextDataOffset=${n}`);let o=new Gu(t,a,Number(n));return a.computeKernel(Number(e),o,i)},()=>a.captureBegin(),()=>a.captureEnd(),()=>a.replay()])}else{let e=new rn(n);i(`webnn`,[e,()=>e.reserveTensorId(),t=>e.releaseTensorId(t),async(t,n,r,i,a)=>e.ensureTensor(t,n,r,i,a),(t,n)=>{e.uploadTensor(t,n)},async(t,n)=>e.downloadTensor(t,n),(t,n)=>e.registerMLContext(t,n),!!n.trace])}}}),Ju,Yu,Xu,Zu,Qu,$u,ed,td,nd,rd,id,ad,od,sd=a(()=>{"use strict";Te(),ut(),_t(),R(),at(),ct(),Dt(),Ju=(e,t)=>{I()._OrtInit(e,t)!==0&&L(`Can't initialize onnxruntime.`)},Yu=async e=>{Ju(e.wasm.numThreads,St(e.logLevel))},Xu=async(e,t)=>{I().asyncInit?.();let n=e.webgpu.adapter;if(t===`webgpu`){if(typeof navigator>`u`||!navigator.gpu)throw Error(`WebGPU is not supported in current environment`);if(n){if(typeof n.limits!=`object`||typeof n.features!=`object`||typeof n.requestDevice!=`function`)throw Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let t=e.webgpu.powerPreference;if(t!==void 0&&t!==`low-power`&&t!==`high-performance`)throw Error(`Invalid powerPreference setting: "${t}"`);let r=e.webgpu.forceFallbackAdapter;if(r!==void 0&&typeof r!=`boolean`)throw Error(`Invalid forceFallbackAdapter setting: "${r}"`);if(n=await navigator.gpu.requestAdapter({powerPreference:t,forceFallbackAdapter:r}),!n)throw Error(`Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.`)}}if(t===`webnn`&&(typeof navigator>`u`||!navigator.ml))throw Error(`WebNN is not supported in current environment`);{let r=(qu(),c(Uu)).init;t===`webgpu`&&await r(`webgpu`,I(),e,n),t===`webnn`&&await r(`webnn`,I(),e)}},Zu=/* @__PURE__ */ new Map,Qu=e=>{let t=I(),n=t.stackSave();try{let n=t.PTR_SIZE,r=t.stackAlloc(2*n);t._OrtGetInputOutputCount(e,r,r+n)!==0&&L(`Can't get session input/output count.`);let i=n===4?`i32`:`i64`;return[Number(t.getValue(r,i)),Number(t.getValue(r+n,i))]}finally{t.stackRestore(n)}},$u=(e,t)=>{let n=I(),r=n.stackSave(),i=0;try{let r=n.PTR_SIZE,a=n.stackAlloc(2*r);n._OrtGetInputOutputMetadata(e,t,a,a+r)!==0&&L(`Can't get session input/output metadata.`);let o=Number(n.getValue(a,`*`));i=Number(n.getValue(a+r,`*`));let s=n.HEAP32[i/4];if(s===0)return[o,0];let c=n.HEAPU32[i/4+1],l=[];for(let e=0;e<c;e++){let t=Number(n.getValue(i+8+e*r,`*`));l.push(t===0?Number(n.getValue(i+8+(e+c)*r,`*`)):n.UTF8ToString(t))}return[o,s,l]}finally{n.stackRestore(r),i!==0&&n._OrtFree(i)}},ed=e=>{let t=I(),n=t._malloc(e.byteLength);if(n===0)throw Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,n),[n,e.byteLength]},td=async(e,t)=>{let n,r,i=I();Array.isArray(e)?[n,r]=e:e.buffer===i.HEAPU8.buffer?[n,r]=[e.byteOffset,e.byteLength]:[n,r]=ed(e);let a=0,o=0,s=0,c=[],l=[],u=[];try{if([o,c]=await gt(t),t?.externalData&&i.mountExternalData){let e=[];for(let n of t.externalData){let t=typeof n==`string`?n:n.path,r=typeof n==`string`?n:n.data;e.push(Et(r).then(e=>{i.mountExternalData(t,e)}))}await Promise.all(e)}for(let e of t?.executionProviders??[])if((typeof e==`string`?e:e.name)===`webnn`){if(i.shouldTransferToMLTensor=!1,typeof e!=`string`){let t=e,n=t?.context,r=t?.gpuDevice,a=t?.deviceType,o=t?.powerPreference;i.currentContext=n||(r?await i.webnnCreateMLContext(r):await i.webnnCreateMLContext({deviceType:a,powerPreference:o}))}else i.currentContext=await i.webnnCreateMLContext();break}a=await i._OrtCreateSession(n,r,o),i.webgpuOnCreateSession?.(a),a===0&&L(`Can't create a session.`),i.jsepOnCreateSession?.(),i.currentContext&&(i.webnnRegisterMLContext(a,i.currentContext),i.currentContext=void 0,i.shouldTransferToMLTensor=!0);let[e,d]=Qu(a),f=!!t?.enableGraphCapture,p=[],m=[],h=[],g=[],_=[];for(let t=0;t<e;t++){let[e,n,r]=$u(a,t);e===0&&L(`Can't get an input name.`),l.push(e);let o=i.UTF8ToString(e);p.push(o),h.push(n===0?{name:o,isTensor:!1}:{name:o,isTensor:!0,type:yt(n),shape:r})}for(let n=0;n<d;n++){let[r,o,s]=$u(a,n+e);r===0&&L(`Can't get an output name.`),u.push(r);let c=i.UTF8ToString(r);m.push(c),g.push(o===0?{name:c,isTensor:!1}:{name:c,isTensor:!0,type:yt(o),shape:s});{if(f&&t?.preferredOutputLocation===void 0){_.push(`gpu-buffer`);continue}let e=typeof t?.preferredOutputLocation==`string`?t.preferredOutputLocation:t?.preferredOutputLocation?.[c]??`cpu`,n=i.webnnIsGraphOutput;if(e===`cpu`&&n&&n(a,c)){_.push(`ml-tensor-cpu-output`);continue}if(e!==`cpu`&&e!==`cpu-pinned`&&e!==`gpu-buffer`&&e!==`ml-tensor`)throw Error(`Not supported preferred output location: ${e}.`);if(f&&e!==`gpu-buffer`)throw Error(`Not supported preferred output location: ${e}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);_.push(e)}}let v=null;return _.some(e=>e===`gpu-buffer`||e===`ml-tensor`||e===`ml-tensor-cpu-output`)&&(s=i._OrtCreateBinding(a),s===0&&L(`Can't create IO binding.`),v={handle:s,outputPreferredLocations:_,outputPreferredLocationsEncoded:_.map(e=>e===`ml-tensor-cpu-output`?`ml-tensor`:e).map(e=>Tt(e))}),Zu.set(a,[a,l,u,v,f,!1]),[a,p,m,h,g]}catch(e){throw l.forEach(e=>i._OrtFree(e)),u.forEach(e=>i._OrtFree(e)),s!==0&&i._OrtReleaseBinding(s)!==0&&L(`Can't release IO binding.`),a!==0&&i._OrtReleaseSession(a)!==0&&L(`Can't release session.`),e}finally{i._free(n),o!==0&&i._OrtReleaseSessionOptions(o)!==0&&L(`Can't release session options.`),c.forEach(e=>i._free(e)),i.unmountExternalData?.()}},nd=e=>{let t=I(),n=Zu.get(e);if(!n)throw Error(`cannot release session. invalid session id: ${e}`);let[r,i,a,o,s]=n;o&&(s&&t._OrtClearBoundOutputs(o.handle)!==0&&L(`Can't clear bound outputs.`),t._OrtReleaseBinding(o.handle)!==0&&L(`Can't release IO binding.`)),t.jsepOnReleaseSession?.(e),t.webnnOnReleaseSession?.(e),t.webgpuOnReleaseSession?.(e),i.forEach(e=>t._OrtFree(e)),a.forEach(e=>t._OrtFree(e)),t._OrtReleaseSession(r)!==0&&L(`Can't release session.`),Zu.delete(e)},rd=async(e,t,n,r,i,a,o=!1)=>{if(!e){t.push(0);return}let s=I(),c=s.PTR_SIZE,l=e[0],u=e[1],d=e[3],f=d,p,m;if(l===`string`&&(d===`gpu-buffer`||d===`ml-tensor`))throw Error(`String tensor is not supported on GPU.`);if(o&&d!==`gpu-buffer`)throw Error(`External buffer must be provided for input/output index ${a} when enableGraphCapture is true.`);if(d===`gpu-buffer`){let t=e[2].gpuBuffer;m=bt(vt(l),u);{let e=s.jsepRegisterBuffer;if(!e)throw Error(`Tensor location "gpu-buffer" is not supported without using WebGPU.`);p=e(r,a,t,m)}}else if(d===`ml-tensor`){let t=e[2].mlTensor;m=bt(vt(l),u);let n=s.webnnRegisterMLTensor;if(!n)throw Error(`Tensor location "ml-tensor" is not supported without using WebNN.`);p=n(r,t,vt(l),u)}else{let t=e[2];if(Array.isArray(t)){m=c*t.length,p=s._malloc(m),n.push(p);for(let e=0;e<t.length;e++){if(typeof t[e]!=`string`)throw TypeError(`tensor data at index ${e} is not a string`);s.setValue(p+e*c,ot(t[e],n),`*`)}}else{let e=s.webnnIsGraphInput,a=s.webnnIsGraphOutput;if(l!==`string`&&e&&a){let o=s.UTF8ToString(i);if(e(r,o)||a(r,o)){let e=vt(l);m=bt(e,u),f=`ml-tensor`;let n=s.webnnCreateTemporaryTensor,i=s.webnnUploadTensor;if(!n||!i)throw Error(`Tensor location "ml-tensor" is not supported without using WebNN.`);let a=await n(r,e,u);i(a,new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),p=a}else m=t.byteLength,p=s._malloc(m),n.push(p),s.HEAPU8.set(new Uint8Array(t.buffer,t.byteOffset,m),p)}else m=t.byteLength,p=s._malloc(m),n.push(p),s.HEAPU8.set(new Uint8Array(t.buffer,t.byteOffset,m),p)}}let h=s.stackSave(),g=s.stackAlloc(4*u.length);try{u.forEach((e,t)=>s.setValue(g+t*c,e,c===4?`i32`:`i64`));let e=s._OrtCreateTensor(vt(l),p,m,g,u.length,Tt(f));e===0&&L(`Can't create tensor for input/output. session=${r}, index=${a}.`),t.push(e)}finally{s.stackRestore(h)}},id=async(e,t,n,r,i,a)=>{let o=I(),s=o.PTR_SIZE,c=Zu.get(e);if(!c)throw Error(`cannot run inference. invalid session id: ${e}`);let l=c[0],u=c[1],d=c[2],f=c[3],p=c[4],m=c[5],h=t.length,g=r.length,_=0,v=[],y=[],b=[],x=[],S=[],C=o.stackSave(),w=o.stackAlloc(h*s),T=o.stackAlloc(h*s),E=o.stackAlloc(g*s),D=o.stackAlloc(g*s);try{[_,v]=lt(a),he(`wasm prepareInputOutputTensor`);for(let r=0;r<h;r++)await rd(n[r],y,x,e,u[t[r]],t[r],p);for(let t=0;t<g;t++)await rd(i[t],b,x,e,d[r[t]],h+r[t],p);P(`wasm prepareInputOutputTensor`);for(let e=0;e<h;e++)o.setValue(w+e*s,y[e],`*`),o.setValue(T+e*s,u[t[e]],`*`);for(let e=0;e<g;e++)o.setValue(E+e*s,b[e],`*`),o.setValue(D+e*s,d[r[e]],`*`);if(f&&!m){let{handle:n,outputPreferredLocations:a,outputPreferredLocationsEncoded:s}=f;if(u.length!==h)throw Error(`input count from feeds (${h}) is expected to be always equal to model's input count (${u.length}).`);he(`wasm bindInputsOutputs`);for(let r=0;r<h;r++){let i=t[r];await o._OrtBindInput(n,u[i],y[r])!==0&&L(`Can't bind input[${r}] for session=${e}.`)}for(let t=0;t<g;t++){let c=r[t];i[t]?.[3]?(S.push(b[t]),o._OrtBindOutput(n,d[c],b[t],0)!==0&&L(`Can't bind pre-allocated output[${t}] for session=${e}.`)):o._OrtBindOutput(n,d[c],0,s[c])!==0&&L(`Can't bind output[${t}] to ${a[t]} for session=${e}.`)}P(`wasm bindInputsOutputs`),Zu.set(e,[l,u,d,f,p,!0])}o.jsepOnRunStart?.(l),o.webnnOnRunStart?.(l);let c;c=f?await o._OrtRunWithBinding(l,f.handle,g,E,_):await o._OrtRun(l,T,w,h,D,g,E,_),c!==0&&L(`failed to call OrtRun().`);let C=[],O=[];he(`wasm ProcessOutputTensor`);for(let t=0;t<g;t++){let n=Number(o.getValue(E+t*s,`*`));if(n===b[t]||S.includes(b[t])){C.push(i[t]),n!==b[t]&&o._OrtReleaseTensor(n)!==0&&L(`Can't release tensor.`);continue}let a=o.stackSave(),c=o.stackAlloc(4*s),l=!1,u,d=0;try{o._OrtGetTensorData(n,c,c+s,c+2*s,c+3*s)!==0&&L(`Can't access output tensor data on index ${t}.`);let i=s===4?`i32`:`i64`,a=Number(o.getValue(c,i));d=o.getValue(c+s,`*`);let p=o.getValue(c+s*2,`*`),m=Number(o.getValue(c+s*3,i)),h=[];for(let e=0;e<m;e++)h.push(Number(o.getValue(p+e*s,i)));o._OrtFree(p)!==0&&L(`Can't free memory for tensor dims.`);let g=h.reduce((e,t)=>e*t,1);u=yt(a);let _=f?.outputPreferredLocations[r[t]];if(u===`string`){if(_===`gpu-buffer`||_===`ml-tensor`)throw Error(`String tensor is not supported on GPU.`);let e=[];for(let t=0;t<g;t++){let n=o.getValue(d+t*s,`*`),r=o.getValue(d+(t+1)*s,`*`),i=t===g-1?void 0:r-n;e.push(o.UTF8ToString(n,i))}C.push([u,h,e,`cpu`])}else if(_===`gpu-buffer`&&g>0){let e=o.jsepGetBuffer;if(!e)throw Error(`preferredLocation "gpu-buffer" is not supported without using WebGPU.`);let t=e(d),r=bt(a,g);if(r===void 0||!Ct(u))throw Error(`Unsupported data type: ${u}`);l=!0,C.push([u,h,{gpuBuffer:t,download:o.jsepCreateDownloader(t,r,u),dispose:()=>{o._OrtReleaseTensor(n)!==0&&L(`Can't release tensor.`)}},`gpu-buffer`])}else if(_===`ml-tensor`&&g>0){let t=o.webnnEnsureTensor,r=o.webnnIsGraphInputOutputTypeSupported;if(!t||!r)throw Error(`preferredLocation "ml-tensor" is not supported without using WebNN.`);if(bt(a,g)===void 0||!wt(u))throw Error(`Unsupported data type: ${u}`);if(!r(e,u,!1))throw Error(`preferredLocation "ml-tensor" for ${u} output is not supported by current WebNN Context.`);let i=await t(e,d,a,h,!1);l=!0,C.push([u,h,{mlTensor:i,download:o.webnnCreateMLTensorDownloader(d,u),dispose:()=>{o.webnnReleaseTensorId(d),o._OrtReleaseTensor(n)}},`ml-tensor`])}else if(_===`ml-tensor-cpu-output`&&g>0){let e=o.webnnCreateMLTensorDownloader(d,u)(),t=C.length;l=!0,O.push((async()=>{let r=[t,await e];return o.webnnReleaseTensorId(d),o._OrtReleaseTensor(n),r})()),C.push([u,h,[],`cpu`])}else{let e=new(xt(u))(g);new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(o.HEAPU8.subarray(d,d+e.byteLength)),C.push([u,h,e,`cpu`])}}finally{o.stackRestore(a),u===`string`&&d&&o._free(d),l||o._OrtReleaseTensor(n)}}f&&!p&&(o._OrtClearBoundOutputs(f.handle)!==0&&L(`Can't clear bound outputs.`),Zu.set(e,[l,u,d,f,p,!1]));for(let[e,t]of await Promise.all(O))C[e][2]=t;return P(`wasm ProcessOutputTensor`),C}finally{o.webnnOnRunEnd?.(l),o.stackRestore(C),y.forEach(e=>o._OrtReleaseTensor(e)),b.forEach(e=>o._OrtReleaseTensor(e)),x.forEach(e=>o._free(e)),_!==0&&o._OrtReleaseRunOptions(_),v.forEach(e=>o._free(e))}},ad=e=>{let t=I(),n=Zu.get(e);if(!n)throw Error(`invalid session id`);let r=n[0],i=t._OrtEndProfiling(r);i===0&&L(`Can't get an profile file name.`),t._OrtFree(i)},od=e=>{let t=[];for(let n of e){let e=n[2];!Array.isArray(e)&&`buffer`in e&&t.push(e.buffer)}return t}}),cd,ld,ud,dd,fd,pd,md,hd,gd,_d,vd,yd,bd,xd,Sd,Cd,wd,Td,Ed=a(()=>{"use strict";Te(),sd(),at(),Xe(),cd=()=>!!x.wasm.proxy&&typeof document<`u`,ud=!1,dd=!1,fd=!1,hd=/* @__PURE__ */ new Map,gd=(e,t)=>{let n=hd.get(e);n?n.push(t):hd.set(e,[t])},_d=()=>{if(ud||!dd||fd||!ld)throw Error(`worker not ready`)},vd=e=>{switch(e.data.type){case`init-wasm`:ud=!1,e.data.err?(fd=!0,md[1](e.data.err)):(dd=!0,md[0]()),pd&&=(URL.revokeObjectURL(pd),void 0);break;case`init-ep`:case`copy-from`:case`create`:case`release`:case`run`:case`end-profiling`:{let t=hd.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},yd=async()=>{if(!dd){if(ud)throw Error(`multiple calls to 'initWasm()' detected.`);if(fd)throw Error(`previous call to 'initWasm()' failed.`);if(ud=!0,cd())return new Promise((e,t)=>{ld?.terminate(),Je().then(([n,r])=>{try{ld=r,ld.onerror=e=>t(e),ld.onmessage=vd,md=[e,t];let i={type:`init-wasm`,in:x};!i.in.wasm.wasmPaths&&(n||Re)&&(i.in.wasm.wasmPaths={wasm:new URL(`/assets/ort-wasm-simd-threaded.jsep-MDYUKy93.wasm`,``+self.location.href).href}),ld.postMessage(i),pd=n}catch(e){t(e)}},t)});try{await it(x.wasm),await Yu(x),dd=!0}catch(e){throw fd=!0,e}finally{ud=!1}}},bd=async e=>{if(cd())return _d(),new Promise((t,n)=>{gd(`init-ep`,[t,n]);let r={type:`init-ep`,in:{epName:e,env:x}};ld.postMessage(r)});await Xu(x,e)},xd=async e=>cd()?(_d(),new Promise((t,n)=>{gd(`copy-from`,[t,n]);let r={type:`copy-from`,in:{buffer:e}};ld.postMessage(r,[e.buffer])})):ed(e),Sd=async(e,t)=>{if(cd()){if(t?.preferredOutputLocation)throw Error(`session option "preferredOutputLocation" is not supported for proxy.`);return _d(),new Promise((n,r)=>{gd(`create`,[n,r]);let i={type:`create`,in:{model:e,options:{...t}}},a=[];e instanceof Uint8Array&&a.push(e.buffer),ld.postMessage(i,a)})}return td(e,t)},Cd=async e=>{if(cd())return _d(),new Promise((t,n)=>{gd(`release`,[t,n]);let r={type:`release`,in:e};ld.postMessage(r)});nd(e)},wd=async(e,t,n,r,i,a)=>{if(cd()){if(n.some(e=>e[3]!==`cpu`))throw Error(`input tensor on GPU is not supported for proxy.`);if(i.some(e=>e))throw Error(`pre-allocated output tensor is not supported for proxy.`);return _d(),new Promise((i,o)=>{gd(`run`,[i,o]);let s=n,c={type:`run`,in:{sessionId:e,inputIndices:t,inputs:s,outputIndices:r,options:a}};ld.postMessage(c,od(s))})}return id(e,t,n,r,i,a)},Td=async e=>{if(cd())return _d(),new Promise((t,n)=>{gd(`end-profiling`,[t,n]);let r={type:`end-profiling`,in:e};ld.postMessage(r)});ad(e)}}),Dd,Od,kd,Ad=a(()=>{"use strict";Te(),Ed(),R(),Ee(),Dt(),Dd=(e,t)=>{switch(e.location){case`cpu`:return[e.type,e.dims,e.data,`cpu`];case`gpu-buffer`:return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},`gpu-buffer`];case`ml-tensor`:return[e.type,e.dims,{mlTensor:e.mlTensor},`ml-tensor`];default:throw Error(`invalid data location: ${e.location} for ${t()}`)}},Od=e=>{switch(e[3]){case`cpu`:return new le(e[0],e[2],e[1]);case`gpu-buffer`:{let t=e[0];if(!Ct(t))throw Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:n,download:r,dispose:i}=e[2];return le.fromGpuBuffer(n,{dataType:t,dims:e[1],download:r,dispose:i})}case`ml-tensor`:{let t=e[0];if(!wt(t))throw Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:n,download:r,dispose:i}=e[2];return le.fromMLTensor(n,{dataType:t,dims:e[1],download:r,dispose:i})}default:throw Error(`invalid data location: ${e[3]}`)}},kd=class{async fetchModelAndCopyToWasmMemory(e){return xd(await Et(e))}async loadModel(e,t){pe();let n;n=typeof e==`string`?await this.fetchModelAndCopyToWasmMemory(e):e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Sd(n,t),me()}async dispose(){return Cd(this.sessionId)}async run(e,t,n){pe();let r=[],i=[];Object.entries(e).forEach(e=>{let t=e[0],n=e[1],a=this.inputNames.indexOf(t);if(a===-1)throw Error(`invalid input '${t}'`);r.push(n),i.push(a)});let a=[],o=[];Object.entries(t).forEach(e=>{let t=e[0],n=e[1],r=this.outputNames.indexOf(t);if(r===-1)throw Error(`invalid output '${t}'`);a.push(n),o.push(r)});let s=r.map((e,t)=>Dd(e,()=>`input "${this.inputNames[i[t]]}"`)),c=a.map((e,t)=>e?Dd(e,()=>`output "${this.outputNames[o[t]]}"`):null),l=await wd(this.sessionId,i,s,o,c,n),u={};for(let e=0;e<l.length;e++)u[this.outputNames[o[e]]]=a[e]??Od(l[e]);return me(),u}startProfiling(){}endProfiling(){Td(this.sessionId)}}}),jd={};o(jd,{OnnxruntimeWebAssemblyBackend:()=>Nd,initializeFlags:()=>Md,wasmBackend:()=>Pd});var Md,Nd,Pd,Fd=a(()=>{"use strict";Te(),Ed(),Ad(),Md=()=>{(typeof x.wasm.initTimeout!=`number`||x.wasm.initTimeout<0)&&(x.wasm.initTimeout=0);let e=x.wasm.simd;if(typeof e!=`boolean`&&e!==void 0&&e!==`fixed`&&e!==`relaxed`&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),x.wasm.simd=!1),typeof x.wasm.proxy!=`boolean`&&(x.wasm.proxy=!1),typeof x.wasm.trace!=`boolean`&&(x.wasm.trace=!1),typeof x.wasm.numThreads!=`number`||!Number.isInteger(x.wasm.numThreads)||x.wasm.numThreads<=0){if(typeof self<`u`&&!self.crossOriginIsolated)x.wasm.numThreads=1;else{let e=typeof navigator>`u`?i(`node:os`).cpus().length:navigator.hardwareConcurrency;x.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}}},Nd=class{async init(e){Md(),await yd(),await bd(e)}async createInferenceSessionHandler(e,t){let n=new kd;return await n.loadModel(e,t),n}},Pd=new Nd});Te(),Te(),Te();var Id=`1.30.0`;{let e=(Fd(),c(jd)).wasmBackend;d(`webgpu`,e,5),d(`webnn`,e,5),d(`cpu`,e,10),d(`wasm`,e,10)}Object.defineProperty(x.versions,"web",{value:Id,enumerable:!0});
/**
* @license
* Copyright 2021 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*/
/**
* @license
* Copyright 2020 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*/
/**
* @license
* Copyright 2019 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*/
function Ld(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,`default`)?e.default:e}var Rd={},zd={},Bd={},Vd;function Hd(){if(Vd)return Bd;Vd=1;function e(e){return e==null}function t(e){return typeof e==`object`&&!!e}function n(t){return Array.isArray(t)?t:e(t)?[]:[t]}function r(e,t){if(t){let n=Object.keys(t);for(let r=0,i=n.length;r<i;r+=1){let i=n[r];e[i]=t[i]}}return e}function i(e,t){let n=``;for(let r=0;r<t;r+=1)n+=e;return n}function a(e){return e===0&&1/e==-1/0}return Bd.isNothing=e,Bd.isObject=t,Bd.toArray=n,Bd.repeat=i,Bd.isNegativeZero=a,Bd.extend=r,Bd}var Ud,Wd;function Gd(){if(Wd)return Ud;Wd=1;function e(e,t){let n=``,r=e.reason||`(unknown reason)`;return e.mark?(e.mark.name&&(n+=`in "`+e.mark.name+`" `),n+=`(`+(e.mark.line+1)+`:`+(e.mark.column+1)+`)`,!t&&e.mark.snippet&&(n+=`

`+e.mark.snippet),r+` `+n):r}function t(t,n){Error.call(this),this.name=`YAMLException`,this.reason=t,this.mark=n,this.message=e(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=(/* @__PURE__ */ Error()).stack||``}return t.prototype=Object.create(Error.prototype),t.prototype.constructor=t,t.prototype.toString=function(t){return this.name+`: `+e(this,t)},Ud=t,Ud}var Kd,qd;function Jd(){if(qd)return Kd;qd=1;let e=Hd();function t(e,t,n,r,i){let a=``,o=``,s=Math.floor(i/2)-1;return r-t>s&&(a=` ... `,t=r-s+a.length),n-r>s&&(o=` ...`,n=r+s-o.length),{str:a+e.slice(t,n).replace(/\t/g,`→`)+o,pos:r-t+a.length}}function n(t,n){return e.repeat(` `,n-t.length)+t}function r(r,i){if(i=Object.create(i||null),!r.buffer)return null;i.maxLength||(i.maxLength=79),typeof i.indent!=`number`&&(i.indent=1),typeof i.linesBefore!=`number`&&(i.linesBefore=3),typeof i.linesAfter!=`number`&&(i.linesAfter=2);let a=/\r?\n|\r|\0/g,o=[0],s=[],c,l=-1;for(;c=a.exec(r.buffer);)s.push(c.index),o.push(c.index+c[0].length),r.position<=c.index&&l<0&&(l=o.length-2);l<0&&(l=o.length-1);let u=``,d=Math.min(r.line+i.linesAfter,s.length).toString().length,f=i.maxLength-(i.indent+d+3);for(let a=1;a<=i.linesBefore&&!(l-a<0);a++){let c=t(r.buffer,o[l-a],s[l-a],r.position-(o[l]-o[l-a]),f);u=e.repeat(` `,i.indent)+n((r.line-a+1).toString(),d)+` | `+c.str+`
`+u}let p=t(r.buffer,o[l],s[l],r.position,f);u+=e.repeat(` `,i.indent)+n((r.line+1).toString(),d)+` | `+p.str+`
`,u+=e.repeat(`-`,i.indent+d+3+p.pos)+`^
`;for(let a=1;a<=i.linesAfter&&!(l+a>=s.length);a++){let c=t(r.buffer,o[l+a],s[l+a],r.position-(o[l]-o[l+a]),f);u+=e.repeat(` `,i.indent)+n((r.line+a+1).toString(),d)+` | `+c.str+`
`}return u.replace(/\n$/,``)}return Kd=r,Kd}var Yd,Xd;function Zd(){if(Xd)return Yd;Xd=1;let e=Gd(),t=[`kind`,`multi`,`resolve`,`construct`,`instanceOf`,`predicate`,`represent`,`representName`,`defaultStyle`,`styleAliases`],n=[`scalar`,`sequence`,`mapping`];function r(e){let t={};return e!==null&&Object.keys(e).forEach(function(n){e[n].forEach(function(e){t[String(e)]=n})}),t}function i(i,a){if(a||={},Object.keys(a).forEach(function(n){if(t.indexOf(n)===-1)throw new e(`Unknown option "`+n+`" is met in definition of "`+i+`" YAML type.`)}),this.options=a,this.tag=i,this.kind=a.kind||null,this.resolve=a.resolve||function(){return!0},this.construct=a.construct||function(e){return e},this.instanceOf=a.instanceOf||null,this.predicate=a.predicate||null,this.represent=a.represent||null,this.representName=a.representName||null,this.defaultStyle=a.defaultStyle||null,this.multi=a.multi||!1,this.styleAliases=r(a.styleAliases||null),n.indexOf(this.kind)===-1)throw new e(`Unknown kind "`+this.kind+`" is specified for "`+i+`" YAML type.`)}return Yd=i,Yd}var Qd,$d;function ef(){if($d)return Qd;$d=1;let e=Gd(),t=Zd();function n(e,t){let n=[];return e[t].forEach(function(e){let t=n.length;n.forEach(function(n,r){n.tag===e.tag&&n.kind===e.kind&&n.multi===e.multi&&(t=r)}),n[t]=e}),n}function r(){let e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}};function t(t){t.multi?(e.multi[t.kind].push(t),e.multi.fallback.push(t)):e[t.kind][t.tag]=e.fallback[t.tag]=t}for(let e=0,n=arguments.length;e<n;e+=1)arguments[e].forEach(t);return e}function i(e){return this.extend(e)}return i.prototype.extend=function(a){let o=[],s=[];if(a instanceof t)s.push(a);else if(Array.isArray(a))s=s.concat(a);else if(a&&(Array.isArray(a.implicit)||Array.isArray(a.explicit)))a.implicit&&(o=o.concat(a.implicit)),a.explicit&&(s=s.concat(a.explicit));else throw new e(`Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })`);o.forEach(function(n){if(!(n instanceof t))throw new e(`Specified list of YAML types (or a single Type object) contains a non-Type object.`);if(n.loadKind&&n.loadKind!==`scalar`)throw new e(`There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.`);if(n.multi)throw new e(`There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.`)}),s.forEach(function(n){if(!(n instanceof t))throw new e(`Specified list of YAML types (or a single Type object) contains a non-Type object.`)});let c=Object.create(i.prototype);return c.implicit=(this.implicit||[]).concat(o),c.explicit=(this.explicit||[]).concat(s),c.compiledImplicit=n(c,`implicit`),c.compiledExplicit=n(c,`explicit`),c.compiledTypeMap=r(c.compiledImplicit,c.compiledExplicit),c},Qd=i,Qd}var tf,nf;function rf(){return nf?tf:(nf=1,tf=new(Zd())(`tag:yaml.org,2002:str`,{kind:`scalar`,construct:function(e){return e===null?``:e}}),tf)}var af,of;function sf(){return of?af:(of=1,af=new(Zd())(`tag:yaml.org,2002:seq`,{kind:`sequence`,construct:function(e){return e===null?[]:e}}),af)}var cf,lf;function uf(){return lf?cf:(lf=1,cf=new(Zd())(`tag:yaml.org,2002:map`,{kind:`mapping`,construct:function(e){return e===null?{}:e}}),cf)}var df,ff;function pf(){return ff?df:(ff=1,df=new(ef())({explicit:[rf(),sf(),uf()]}),df)}var mf,hf;function gf(){if(hf)return mf;hf=1;let e=Zd();function t(e){if(e===null)return!0;let t=e.length;return t===1&&e===`~`||t===4&&(e===`null`||e===`Null`||e===`NULL`)}function n(){return null}function r(e){return e===null}return mf=new e(`tag:yaml.org,2002:null`,{kind:`scalar`,resolve:t,construct:n,predicate:r,represent:{canonical:function(){return`~`},lowercase:function(){return`null`},uppercase:function(){return`NULL`},camelcase:function(){return`Null`},empty:function(){return``}},defaultStyle:`lowercase`}),mf}var _f,vf;function yf(){if(vf)return _f;vf=1;let e=Zd();function t(e){if(e===null)return!1;let t=e.length;return t===4&&(e===`true`||e===`True`||e===`TRUE`)||t===5&&(e===`false`||e===`False`||e===`FALSE`)}function n(e){return e===`true`||e===`True`||e===`TRUE`}function r(e){return Object.prototype.toString.call(e)===`[object Boolean]`}return _f=new e(`tag:yaml.org,2002:bool`,{kind:`scalar`,resolve:t,construct:n,predicate:r,represent:{lowercase:function(e){return e?`true`:`false`},uppercase:function(e){return e?`TRUE`:`FALSE`},camelcase:function(e){return e?`True`:`False`}},defaultStyle:`lowercase`}),_f}var bf,xf;function Sf(){if(xf)return bf;xf=1;let e=Hd(),t=Zd();function n(e){return e>=48&&e<=57||e>=65&&e<=70||e>=97&&e<=102}function r(e){return e>=48&&e<=55}function i(e){return e>=48&&e<=57}function a(e){if(e===null)return!1;let t=e.length,a=0,s=!1;if(!t)return!1;let c=e[a];if((c===`-`||c===`+`)&&(c=e[++a]),c===`0`){if(a+1===t)return!0;if(c=e[++a],c===`b`){for(a++;a<t;a++){if(c=e[a],c!==`0`&&c!==`1`)return!1;s=!0}return s&&isFinite(o(e))}if(c===`x`){for(a++;a<t;a++){if(!n(e.charCodeAt(a)))return!1;s=!0}return s&&isFinite(o(e))}if(c===`o`){for(a++;a<t;a++){if(!r(e.charCodeAt(a)))return!1;s=!0}return s&&isFinite(o(e))}}for(;a<t;a++){if(!i(e.charCodeAt(a)))return!1;s=!0}return s?isFinite(o(e)):!1}function o(e){let t=e,n=1,r=t[0];if((r===`-`||r===`+`)&&(r===`-`&&(n=-1),t=t.slice(1),r=t[0]),t===`0`)return 0;if(r===`0`){if(t[1]===`b`)return n*parseInt(t.slice(2),2);if(t[1]===`x`)return n*parseInt(t.slice(2),16);if(t[1]===`o`)return n*parseInt(t.slice(2),8)}return n*parseInt(t,10)}function s(e){return o(e)}function c(t){return Object.prototype.toString.call(t)===`[object Number]`&&t%1==0&&!e.isNegativeZero(t)}return bf=new t(`tag:yaml.org,2002:int`,{kind:`scalar`,resolve:a,construct:s,predicate:c,represent:{binary:function(e){return e>=0?`0b`+e.toString(2):`-0b`+e.toString(2).slice(1)},octal:function(e){return e>=0?`0o`+e.toString(8):`-0o`+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?`0x`+e.toString(16).toUpperCase():`-0x`+e.toString(16).toUpperCase().slice(1)}},defaultStyle:`decimal`,styleAliases:{binary:[2,`bin`],octal:[8,`oct`],decimal:[10,`dec`],hexadecimal:[16,`hex`]}}),bf}var Cf,wf;function Tf(){if(wf)return Cf;wf=1;let e=Hd(),t=Zd(),n=/* @__PURE__ */ RegExp(`^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$`),r=/* @__PURE__ */ RegExp(`^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$`);function i(e){return e===null||!n.test(e)?!1:isFinite(parseFloat(e,10))?!0:r.test(e)}function a(e){let t=e.toLowerCase(),n=t[0]===`-`?-1:1;return`+-`.indexOf(t[0])>=0&&(t=t.slice(1)),t===`.inf`?n===1?1/0:-1/0:t===`.nan`?NaN:n*parseFloat(t,10)}let o=/^[-+]?[0-9]+e/;function s(t,n){if(isNaN(t))switch(n){case`lowercase`:return`.nan`;case`uppercase`:return`.NAN`;case`camelcase`:return`.NaN`}else if(t===1/0)switch(n){case`lowercase`:return`.inf`;case`uppercase`:return`.INF`;case`camelcase`:return`.Inf`}else if(t===-1/0)switch(n){case`lowercase`:return`-.inf`;case`uppercase`:return`-.INF`;case`camelcase`:return`-.Inf`}else if(e.isNegativeZero(t))return`-0.0`;let r=t.toString(10);return o.test(r)?r.replace(`e`,`.e`):r}function c(t){return Object.prototype.toString.call(t)===`[object Number]`&&(t%1!=0||e.isNegativeZero(t))}return Cf=new t(`tag:yaml.org,2002:float`,{kind:`scalar`,resolve:i,construct:a,predicate:c,represent:s,defaultStyle:`lowercase`}),Cf}var Ef,Df;function Of(){return Df?Ef:(Df=1,Ef=pf().extend({implicit:[gf(),yf(),Sf(),Tf()]}),Ef)}var kf,Af;function jf(){return Af?kf:(Af=1,kf=Of(),kf)}var Mf,Nf;function Pf(){if(Nf)return Mf;Nf=1;let e=Zd(),t=/* @__PURE__ */ RegExp(`^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$`),n=/* @__PURE__ */ RegExp(`^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$`);function r(e){return e===null?!1:t.exec(e)!==null||n.exec(e)!==null}function i(e){let r=0,i=null,a=t.exec(e);if(a===null&&(a=n.exec(e)),a===null)throw Error(`Date resolve error`);let o=+a[1],s=a[2]-1,c=+a[3];if(!a[4])return new Date(Date.UTC(o,s,c));let l=+a[4],u=+a[5],d=+a[6];if(a[7]){for(r=a[7].slice(0,3);r.length<3;)r+=`0`;r=+r}if(a[9]){let e=+a[10],t=+(a[11]||0);i=(e*60+t)*6e4,a[9]===`-`&&(i=-i)}let f=new Date(Date.UTC(o,s,c,l,u,d,r));return i&&f.setTime(f.getTime()-i),f}function a(e){return e.toISOString()}return Mf=new e(`tag:yaml.org,2002:timestamp`,{kind:`scalar`,resolve:r,construct:i,instanceOf:Date,represent:a}),Mf}var Ff,If;function Lf(){if(If)return Ff;If=1;let e=Zd();function t(e){return e===`<<`||e===null}return Ff=new e(`tag:yaml.org,2002:merge`,{kind:`scalar`,resolve:t}),Ff}var Rf,zf;function Bf(){if(zf)return Rf;zf=1;let e=Zd();function t(e){if(e===null)return!1;let t=0,n=e.length;for(let r=0;r<n;r++){let n=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`.indexOf(e.charAt(r));if(!(n>64)){if(n<0)return!1;t+=6}}return t%8==0}function n(e){let t=e.replace(/[\r\n=]/g,``),n=t.length,r=0,i=[];for(let e=0;e<n;e++)e%4==0&&e&&(i.push(r>>16&255),i.push(r>>8&255),i.push(r&255)),r=r<<6|`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`.indexOf(t.charAt(e));let a=n%4*6;return a===0?(i.push(r>>16&255),i.push(r>>8&255),i.push(r&255)):a===18?(i.push(r>>10&255),i.push(r>>2&255)):a===12&&i.push(r>>4&255),new Uint8Array(i)}function r(e){let t=``,n=0,r=e.length,i=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;for(let a=0;a<r;a++)a%3==0&&a&&(t+=i[n>>18&63],t+=i[n>>12&63],t+=i[n>>6&63],t+=i[n&63]),n=(n<<8)+e[a];let a=r%3;return a===0?(t+=i[n>>18&63],t+=i[n>>12&63],t+=i[n>>6&63],t+=i[n&63]):a===2?(t+=i[n>>10&63],t+=i[n>>4&63],t+=i[n<<2&63],t+=i[64]):a===1&&(t+=i[n>>2&63],t+=i[n<<4&63],t+=i[64],t+=i[64]),t}function i(e){return Object.prototype.toString.call(e)===`[object Uint8Array]`}return Rf=new e(`tag:yaml.org,2002:binary`,{kind:`scalar`,resolve:t,construct:n,predicate:i,represent:r}),Rf}var Vf,Hf;function Uf(){if(Hf)return Vf;Hf=1;let e=Zd(),t=Object.prototype.hasOwnProperty,n=Object.prototype.toString;function r(e){if(e===null)return!0;let r={},i=e;for(let e=0,a=i.length;e<a;e+=1){let a=i[e],o=!1;if(n.call(a)!==`[object Object]`)return!1;let s;for(s in a)if(t.call(a,s)){if(!o)o=!0;else return!1}if(!o||t.call(r,s))return!1;Object.defineProperty(r,s,{value:!0})}return!0}function i(e){return e===null?[]:e}return Vf=new e(`tag:yaml.org,2002:omap`,{kind:`sequence`,resolve:r,construct:i}),Vf}var Wf,Gf;function Kf(){if(Gf)return Wf;Gf=1;let e=Zd(),t=Object.prototype.toString;function n(e){if(e===null)return!0;let n=e,r=Array(n.length);for(let e=0,i=n.length;e<i;e+=1){let i=n[e];if(t.call(i)!==`[object Object]`)return!1;let a=Object.keys(i);if(a.length!==1)return!1;r[e]=[a[0],i[a[0]]]}return!0}function r(e){if(e===null)return[];let t=e,n=Array(t.length);for(let e=0,r=t.length;e<r;e+=1){let r=t[e],i=Object.keys(r);n[e]=[i[0],r[i[0]]]}return n}return Wf=new e(`tag:yaml.org,2002:pairs`,{kind:`sequence`,resolve:n,construct:r}),Wf}var qf,Jf;function Yf(){if(Jf)return qf;Jf=1;let e=Zd(),t=Object.prototype.hasOwnProperty;function n(e){if(e===null)return!0;let n=e;for(let e in n)if(t.call(n,e)&&n[e]!==null)return!1;return!0}function r(e){return e===null?{}:e}return qf=new e(`tag:yaml.org,2002:set`,{kind:`mapping`,resolve:n,construct:r}),qf}var Xf,Zf;function Qf(){return Zf?Xf:(Zf=1,Xf=jf().extend({implicit:[Pf(),Lf()],explicit:[Bf(),Uf(),Kf(),Yf()]}),Xf)}var $f;function ep(){if($f)return zd;$f=1;let e=Hd(),t=Gd(),n=Jd(),r=Qf(),i=Object.prototype.hasOwnProperty,a=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,o=/[\x85\u2028\u2029]/,s=/[,\[\]{}]/,c=/^(?:!|!!|![0-9A-Za-z-]+!)$/,l=/^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;function u(e){return Object.prototype.toString.call(e)}function d(e){return e===10||e===13}function f(e){return e===9||e===32}function p(e){return e===9||e===32||e===10||e===13}function m(e){return e===44||e===91||e===93||e===123||e===125}function h(e){if(e>=48&&e<=57)return e-48;let t=e|32;return t>=97&&t<=102?t-97+10:-1}function g(e){return e===120?2:e===117?4:e===85?8:0}function _(e){return e>=48&&e<=57?e-48:-1}function v(e){switch(e){case 48:return`\0`;case 97:return`\x07`;case 98:return`\b`;case 116:return`	`;case 9:return`	`;case 110:return`
`;case 118:return`\v`;case 102:return`\f`;case 114:return`\r`;case 101:return`\x1B`;case 32:return` `;case 34:return`"`;case 47:return`/`;case 92:return`\\`;case 78:return``;case 95:return`\xA0`;case 76:return`\u2028`;case 80:return`\u2029`;default:return``}}function y(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function b(e,t,n){t===`__proto__`?Object.defineProperty(e,t,{configurable:!0,enumerable:!0,writable:!0,value:n}):e[t]=n}let x=Array(256),S=Array(256);for(let e=0;e<256;e++)x[e]=+!!v(e),S[e]=v(e);function C(e,t){this.input=e,this.filename=t.filename||null,this.schema=t.schema||r,this.onWarning=t.onWarning||null,this.legacy=t.legacy||!1,this.json=t.json||!1,this.listener=t.listener||null,this.maxDepth=typeof t.maxDepth==`number`?t.maxDepth:100,this.maxTotalMergeKeys=typeof t.maxTotalMergeKeys==`number`?t.maxTotalMergeKeys:1e4,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.depth=0,this.totalMergeKeys=0,this.firstTabInLine=-1,this.documents=[],this.anchorMapTransactions=[]}function w(e,r){let i={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return i.snippet=n(i),new t(r,i)}function T(e,t){throw w(e,t)}function E(e,t){e.onWarning&&e.onWarning.call(null,w(e,t))}function D(e,t,n){let r=e.anchorMapTransactions;if(r.length!==0){let n=r[r.length-1];i.call(n,t)||(n[t]={existed:i.call(e.anchorMap,t),value:e.anchorMap[t]})}e.anchorMap[t]=n}function O(e){e.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null))}function k(e){let t=e.anchorMapTransactions.pop(),n=e.anchorMapTransactions;if(n.length===0)return;let r=n[n.length-1],a=Object.keys(t);for(let e=0,n=a.length;e<n;e+=1){let n=a[e];i.call(r,n)||(r[n]=t[n])}}function A(e){let t=e.anchorMapTransactions.pop(),n=Object.keys(t);for(let r=n.length-1;r>=0;--r){let i=t[n[r]];i.existed?e.anchorMap[n[r]]=i.value:delete e.anchorMap[n[r]]}}function j(e){return{position:e.position,line:e.line,lineStart:e.lineStart,lineIndent:e.lineIndent,firstTabInLine:e.firstTabInLine,tag:e.tag,anchor:e.anchor,kind:e.kind,result:e.result}}function ee(e,t){e.position=t.position,e.line=t.line,e.lineStart=t.lineStart,e.lineIndent=t.lineIndent,e.firstTabInLine=t.firstTabInLine,e.tag=t.tag,e.anchor=t.anchor,e.kind=t.kind,e.result=t.result}let te={YAML:function(e,t,n){e.version!==null&&T(e,`duplication of %YAML directive`),n.length!==1&&T(e,`YAML directive accepts exactly one argument`);let r=/^([0-9]+)\.([0-9]+)$/.exec(n[0]);r===null&&T(e,`ill-formed argument of the YAML directive`);let i=parseInt(r[1],10),a=parseInt(r[2],10);i!==1&&T(e,`unacceptable YAML version of the document`),e.version=n[0],e.checkLineBreaks=a<2,a!==1&&a!==2&&E(e,`unsupported YAML version of the document`)},TAG:function(e,t,n){let r;n.length!==2&&T(e,`TAG directive accepts exactly two arguments`);let a=n[0];r=n[1],c.test(a)||T(e,`ill-formed tag handle (first argument) of the TAG directive`),i.call(e.tagMap,a)&&T(e,`there is a previously declared suffix for "`+a+`" tag handle`),l.test(r)||T(e,`ill-formed tag prefix (second argument) of the TAG directive`);try{r=decodeURIComponent(r)}catch{T(e,`tag prefix is malformed: `+r)}e.tagMap[a]=r}};function M(e,t,n,r){if(t<n){let i=e.input.slice(t,n);if(r)for(let t=0,n=i.length;t<n;t+=1){let n=i.charCodeAt(t);n===9||n>=32&&n<=1114111||T(e,`expected valid JSON character`)}else a.test(i)&&T(e,`the stream contains non-printable characters`);e.result+=i}}function ne(e){e.totalMergeKeys++,e.maxTotalMergeKeys!==-1&&e.totalMergeKeys>e.maxTotalMergeKeys&&T(e,`merge keys exceeded maxTotalMergeKeys (`+e.maxTotalMergeKeys+`)`)}function re(t,n,r,a){e.isObject(r)||T(t,`cannot merge mappings; the provided source object is unacceptable`),ne(t);let o=Object.keys(r);for(let e=0,s=o.length;e<s;e+=1){let s=o[e];ne(t),i.call(n,s)||(b(n,s,r[s]),a[s]=!0)}}function ie(e,t,n,r,a,o,s,c,l){if(Array.isArray(a)){a=Array.prototype.slice.call(a);for(let t=0,n=a.length;t<n;t+=1)Array.isArray(a[t])&&T(e,`nested arrays are not supported inside keys`),typeof a==`object`&&u(a[t])===`[object Object]`&&(a[t]=`[object Object]`)}if(typeof a==`object`&&u(a)===`[object Object]`&&(a=`[object Object]`),a=String(a),t===null&&(t={}),r===`tag:yaml.org,2002:merge`){if(Array.isArray(o)){o.length>100&&T(e,`abnormal merge sequence size`);for(let r=0,i=o.length;r<i;r+=1)re(e,t,o[r],n)}else re(e,t,o,n)}else!e.json&&!i.call(n,a)&&i.call(t,a)&&(e.line=s||e.line,e.lineStart=c||e.lineStart,e.position=l||e.position,T(e,`duplicated mapping key`)),b(t,a,o),delete n[a];return t}function ae(e){let t=e.input.charCodeAt(e.position);t===10?e.position++:t===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):T(e,`a line break is expected`),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function N(e,t,n){let r=0,i=e.input.charCodeAt(e.position);for(;i!==0;){for(;f(i);)i===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),i=e.input.charCodeAt(++e.position);if(t&&i===35)do i=e.input.charCodeAt(++e.position);while(i!==10&&i!==13&&i!==0);if(d(i))for(ae(e),i=e.input.charCodeAt(e.position),r++,e.lineIndent=0;i===32;)e.lineIndent++,i=e.input.charCodeAt(++e.position);else break}return n!==-1&&r!==0&&e.lineIndent<n&&E(e,`deficient indentation`),r}function oe(e){let t=e.position,n=e.input.charCodeAt(t);return!!((n===45||n===46)&&n===e.input.charCodeAt(t+1)&&n===e.input.charCodeAt(t+2)&&(t+=3,n=e.input.charCodeAt(t),n===0||p(n)))}function se(t,n){n===1?t.result+=` `:n>1&&(t.result+=e.repeat(`
`,n-1))}function ce(e,t,n){let r,i,a,o,s,c,l=e.kind,u=e.result,h=e.input.charCodeAt(e.position);if(p(h)||m(h)||h===35||h===38||h===42||h===33||h===124||h===62||h===39||h===34||h===37||h===64||h===96)return!1;if(h===63||h===45){let t=e.input.charCodeAt(e.position+1);if(p(t)||n&&m(t))return!1}for(e.kind=`scalar`,e.result=``,r=i=e.position,a=!1;h!==0;){if(h===58){let t=e.input.charCodeAt(e.position+1);if(p(t)||n&&m(t))break}else if(h===35){if(p(e.input.charCodeAt(e.position-1)))break}else if(e.position===e.lineStart&&oe(e)||n&&m(h))break;else if(d(h)){if(o=e.line,s=e.lineStart,c=e.lineIndent,N(e,!1,-1),e.lineIndent>=t){a=!0,h=e.input.charCodeAt(e.position);continue}e.position=i,e.line=o,e.lineStart=s,e.lineIndent=c;break}a&&=(M(e,r,i,!1),se(e,e.line-o),r=i=e.position,!1),f(h)||(i=e.position+1),h=e.input.charCodeAt(++e.position)}return M(e,r,i,!1),e.result?!0:(e.kind=l,e.result=u,!1)}function le(e,t){let n,r,i=e.input.charCodeAt(e.position);if(i!==39)return!1;for(e.kind=`scalar`,e.result=``,e.position++,n=r=e.position;(i=e.input.charCodeAt(e.position))!==0;)if(i===39){if(M(e,n,e.position,!0),i=e.input.charCodeAt(++e.position),i===39)n=e.position,e.position++,r=e.position;else return!0}else d(i)?(M(e,n,r,!0),se(e,N(e,!1,t)),n=r=e.position):e.position===e.lineStart&&oe(e)?T(e,`unexpected end of the document within a single quoted scalar`):(e.position++,f(i)||(r=e.position));T(e,`unexpected end of the stream within a single quoted scalar`)}function ue(e,t){let n,r,i,a=e.input.charCodeAt(e.position);if(a!==34)return!1;for(e.kind=`scalar`,e.result=``,e.position++,n=r=e.position;(a=e.input.charCodeAt(e.position))!==0;)if(a===34)return M(e,n,e.position,!0),e.position++,!0;else if(a===92){if(M(e,n,e.position,!0),a=e.input.charCodeAt(++e.position),d(a))N(e,!1,t);else if(a<256&&x[a])e.result+=S[a],e.position++;else if((i=g(a))>0){let t=i,n=0;for(;t>0;t--)a=e.input.charCodeAt(++e.position),(i=h(a))>=0?n=(n<<4)+i:T(e,`expected hexadecimal character`);e.result+=y(n),e.position++}else T(e,`unknown escape sequence`);n=r=e.position}else d(a)?(M(e,n,r,!0),se(e,N(e,!1,t)),n=r=e.position):e.position===e.lineStart&&oe(e)?T(e,`unexpected end of the document within a double quoted scalar`):(e.position++,f(a)||(r=e.position));T(e,`unexpected end of the stream within a double quoted scalar`)}function de(e,t){let n=!0,r,i,a,o=e.tag,s,c=e.anchor,l,u,d,f,m=/* @__PURE__ */ Object.create(null),h,g,_,v=e.input.charCodeAt(e.position);if(v===91)l=93,f=!1,s=[];else if(v===123)l=125,f=!0,s={};else return!1;for(e.anchor!==null&&D(e,e.anchor,s),v=e.input.charCodeAt(++e.position);v!==0;){if(N(e,!0,t),v=e.input.charCodeAt(e.position),v===l)return e.position++,e.tag=o,e.anchor=c,e.kind=f?`mapping`:`sequence`,e.result=s,!0;n?v===44&&T(e,`expected the node content, but found ','`):T(e,`missed comma between flow collection entries`),g=h=_=null,u=d=!1,v===63&&p(e.input.charCodeAt(e.position+1))&&(u=d=!0,e.position++,N(e,!0,t)),r=e.line,i=e.lineStart,a=e.position,ve(e,t,1,!1,!0),g=e.tag,h=e.result,N(e,!0,t),v=e.input.charCodeAt(e.position),(d||e.line===r)&&v===58&&(u=!0,v=e.input.charCodeAt(++e.position),N(e,!0,t),ve(e,t,1,!1,!0),_=e.result),f?ie(e,s,m,g,h,_,r,i,a):u?s.push(ie(e,null,m,g,h,_,r,i,a)):s.push(h),N(e,!0,t),v=e.input.charCodeAt(e.position),v===44?(n=!0,v=e.input.charCodeAt(++e.position)):n=!1}T(e,`unexpected end of the stream within a flow collection`)}function fe(t,n){let r,i=1,a=!1,o=!1,s=n,c=0,l=!1,u,p=t.input.charCodeAt(t.position);if(p===124)r=!1;else if(p===62)r=!0;else return!1;for(t.kind=`scalar`,t.result=``;p!==0;)if(p=t.input.charCodeAt(++t.position),p===43||p===45)i===1?i=p===43?3:2:T(t,`repeat of a chomping mode identifier`);else if((u=_(p))>=0)u===0?T(t,`bad explicit indentation width of a block scalar; it cannot be less than one`):o?T(t,`repeat of an indentation width identifier`):(s=n+u-1,o=!0);else break;if(f(p)){do p=t.input.charCodeAt(++t.position);while(f(p));if(p===35)do p=t.input.charCodeAt(++t.position);while(!d(p)&&p!==0)}for(;p!==0;){for(ae(t),t.lineIndent=0,p=t.input.charCodeAt(t.position);(!o||t.lineIndent<s)&&p===32;)t.lineIndent++,p=t.input.charCodeAt(++t.position);if(!o&&t.lineIndent>s&&(s=t.lineIndent),d(p)){c++;continue}if(!o&&s===0&&T(t,`missing indentation for block scalar`),t.lineIndent<s){i===3?t.result+=e.repeat(`
`,a?1+c:c):i===1&&a&&(t.result+=`
`);break}r?f(p)?(l=!0,t.result+=e.repeat(`
`,a?1+c:c)):l?(l=!1,t.result+=e.repeat(`
`,c+1)):c===0?a&&(t.result+=` `):t.result+=e.repeat(`
`,c):t.result+=e.repeat(`
`,a?1+c:c),a=!0,o=!0,c=0;let n=t.position;for(;!d(p)&&p!==0;)p=t.input.charCodeAt(++t.position);M(t,n,t.position,!1)}return!0}function pe(e,t){let n=e.tag,r=e.anchor,i=[],a=!1;if(e.firstTabInLine!==-1)return!1;e.anchor!==null&&D(e,e.anchor,i);let o=e.input.charCodeAt(e.position);for(;o!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,T(e,`tab characters must not be used in indentation`)),o===45&&p(e.input.charCodeAt(e.position+1)));){if(a=!0,e.position++,N(e,!0,-1)&&e.lineIndent<=t){i.push(null),o=e.input.charCodeAt(e.position);continue}let n=e.line;if(ve(e,t,3,!1,!0),i.push(e.result),N(e,!0,-1),o=e.input.charCodeAt(e.position),(e.line===n||e.lineIndent>t)&&o!==0)T(e,`bad indentation of a sequence entry`);else if(e.lineIndent<t)break}return a?(e.tag=n,e.anchor=r,e.kind=`sequence`,e.result=i,!0):!1}function me(e,t,n){let r,i,a,o,s=e.tag,c=e.anchor,l={},u=/* @__PURE__ */ Object.create(null),d=null,m=null,h=null,g=!1,_=!1;if(e.firstTabInLine!==-1)return!1;e.anchor!==null&&D(e,e.anchor,l);let v=e.input.charCodeAt(e.position);for(;v!==0;){!g&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,T(e,`tab characters must not be used in indentation`));let y=e.input.charCodeAt(e.position+1),b=e.line;if((v===63||v===58)&&p(y))v===63?(g&&(ie(e,l,u,d,m,null,i,a,o),d=m=h=null),_=!0,g=!0,r=!0):g?(g=!1,r=!0):T(e,`incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line`),e.position+=1,v=y;else{if(i=e.line,a=e.lineStart,o=e.position,!ve(e,n,2,!1,!0))break;if(e.line===b){for(v=e.input.charCodeAt(e.position);f(v);)v=e.input.charCodeAt(++e.position);if(v===58)v=e.input.charCodeAt(++e.position),p(v)||T(e,`a whitespace character is expected after the key-value separator within a block mapping`),g&&(ie(e,l,u,d,m,null,i,a,o),d=m=h=null),_=!0,g=!1,r=!1,d=e.tag,m=e.result;else if(_)T(e,`can not read an implicit mapping pair; a colon is missed`);else return e.tag=s,e.anchor=c,!0}else if(_)T(e,`can not read a block mapping entry; a multiline key may not be an implicit key`);else return e.tag=s,e.anchor=c,!0}if((e.line===b||e.lineIndent>t)&&(g&&(i=e.line,a=e.lineStart,o=e.position),ve(e,t,4,!0,r)&&(g?m=e.result:h=e.result),g||(ie(e,l,u,d,m,h,i,a,o),d=m=h=null),N(e,!0,-1),v=e.input.charCodeAt(e.position)),(e.line===b||e.lineIndent>t)&&v!==0)T(e,`bad indentation of a mapping entry`);else if(e.lineIndent<t)break}return g&&ie(e,l,u,d,m,null,i,a,o),_&&(e.tag=s,e.anchor=c,e.kind=`mapping`,e.result=l),_}function he(e){let t=!1,n=!1,r,a,o=e.input.charCodeAt(e.position);if(o!==33)return!1;e.tag!==null&&T(e,`duplication of a tag property`),o=e.input.charCodeAt(++e.position),o===60?(t=!0,o=e.input.charCodeAt(++e.position)):o===33?(n=!0,r=`!!`,o=e.input.charCodeAt(++e.position)):r=`!`;let u=e.position;if(t){do o=e.input.charCodeAt(++e.position);while(o!==0&&o!==62);e.position<e.length?(a=e.input.slice(u,e.position),o=e.input.charCodeAt(++e.position)):T(e,`unexpected end of the stream within a verbatim tag`)}else{for(;o!==0&&!p(o);)o===33&&(n?T(e,`tag suffix cannot contain exclamation marks`):(r=e.input.slice(u-1,e.position+1),c.test(r)||T(e,`named tag handle cannot contain such characters`),n=!0,u=e.position+1)),o=e.input.charCodeAt(++e.position);a=e.input.slice(u,e.position),s.test(a)&&T(e,`tag suffix cannot contain flow indicator characters`)}a&&!l.test(a)&&T(e,`tag name cannot contain such characters: `+a);try{a=decodeURIComponent(a)}catch{T(e,`tag name is malformed: `+a)}return t?e.tag=a:i.call(e.tagMap,r)?e.tag=e.tagMap[r]+a:r===`!`?e.tag=`!`+a:r===`!!`?e.tag=`tag:yaml.org,2002:`+a:T(e,`undeclared tag handle "`+r+`"`),!0}function P(e){let t=e.input.charCodeAt(e.position);if(t!==38)return!1;e.anchor!==null&&T(e,`duplication of an anchor property`),t=e.input.charCodeAt(++e.position);let n=e.position;for(;t!==0&&!p(t)&&!m(t);)t=e.input.charCodeAt(++e.position);return e.position===n&&T(e,`name of an anchor node must contain at least one character`),e.anchor=e.input.slice(n,e.position),!0}function ge(e){let t=e.input.charCodeAt(e.position);if(t!==42)return!1;t=e.input.charCodeAt(++e.position);let n=e.position;for(;t!==0&&!p(t)&&!m(t);)t=e.input.charCodeAt(++e.position);e.position===n&&T(e,`name of an alias node must contain at least one character`);let r=e.input.slice(n,e.position);return i.call(e.anchorMap,r)||T(e,`unidentified alias "`+r+`"`),e.result=e.anchorMap[r],N(e,!0,-1),!0}function _e(e,t,n,r){let i=j(e);return O(e),ee(e,t),e.tag=null,e.anchor=null,e.kind=null,e.result=null,me(e,n,r)&&e.kind===`mapping`?(k(e),!0):(A(e),ee(e,i),!1)}function ve(e,t,n,r,a){let o,s,c=1,l=!1,u=!1,d=null,f,p,m;e.depth>=e.maxDepth&&T(e,`nesting exceeded maxDepth (`+e.maxDepth+`)`),e.depth+=1,e.listener!==null&&e.listener(`open`,e),e.tag=null,e.anchor=null,e.kind=null,e.result=null;let h=o=s=n===4||n===3;if(r&&N(e,!0,-1)&&(l=!0,e.lineIndent>t?c=1:e.lineIndent===t?c=0:e.lineIndent<t&&(c=-1)),c===1)for(;;){let n=e.input.charCodeAt(e.position),r=j(e);if(l&&(n===33&&e.tag!==null||n===38&&e.anchor!==null)||!he(e)&&!P(e))break;d===null&&(d=r),N(e,!0,-1)?(l=!0,s=h,e.lineIndent>t?c=1:e.lineIndent===t?c=0:e.lineIndent<t&&(c=-1)):s=!1}if(s&&=l||a,c===1||n===4){if(p=n===1||n===2?t:t+1,m=e.position-e.lineStart,c===1){if(s&&(pe(e,m)||me(e,m,p))||de(e,p))u=!0;else{let t=e.input.charCodeAt(e.position);d!==null&&h&&!s&&t!==124&&t!==62&&_e(e,d,d.position-d.lineStart,p)||o&&fe(e,p)||le(e,p)||ue(e,p)?u=!0:ge(e)?(u=!0,(e.tag!==null||e.anchor!==null)&&T(e,`alias node should not have any properties`)):ce(e,p,n===1)&&(u=!0,e.tag===null&&(e.tag=`?`)),e.anchor!==null&&D(e,e.anchor,e.result)}}else c===0&&(u=s&&pe(e,m))}if(e.tag===null)e.anchor!==null&&D(e,e.anchor,e.result);else if(e.tag===`?`){e.result!==null&&e.kind!==`scalar`&&T(e,`unacceptable node kind for !<?> tag; it should be "scalar", not "`+e.kind+`"`);for(let t=0,n=e.implicitTypes.length;t<n;t+=1)if(f=e.implicitTypes[t],f.resolve(e.result)){e.result=f.construct(e.result),e.tag=f.tag,e.anchor!==null&&D(e,e.anchor,e.result);break}}else if(e.tag!==`!`){if(i.call(e.typeMap[e.kind||`fallback`],e.tag))f=e.typeMap[e.kind||`fallback`][e.tag];else{f=null;let t=e.typeMap.multi[e.kind||`fallback`];for(let n=0,r=t.length;n<r;n+=1)if(e.tag.slice(0,t[n].tag.length)===t[n].tag){f=t[n];break}}f||T(e,`unknown tag !<`+e.tag+`>`),e.result!==null&&f.kind!==e.kind&&T(e,`unacceptable node kind for !<`+e.tag+`> tag; it should be "`+f.kind+`", not "`+e.kind+`"`),f.resolve(e.result,e.tag)?(e.result=f.construct(e.result,e.tag),e.anchor!==null&&D(e,e.anchor,e.result)):T(e,`cannot resolve a node with !<`+e.tag+`> explicit tag`)}return e.listener!==null&&e.listener(`close`,e),--e.depth,e.tag!==null||e.anchor!==null||u}function ye(e){let t=e.position,n=!1,r;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=/* @__PURE__ */ Object.create(null),e.anchorMap=/* @__PURE__ */ Object.create(null);(r=e.input.charCodeAt(e.position))!==0&&(N(e,!0,-1),r=e.input.charCodeAt(e.position),!(e.lineIndent>0||r!==37));){n=!0,r=e.input.charCodeAt(++e.position);let t=e.position;for(;r!==0&&!p(r);)r=e.input.charCodeAt(++e.position);let a=e.input.slice(t,e.position),o=[];for(a.length<1&&T(e,`directive name must not be less than one character in length`);r!==0;){for(;f(r);)r=e.input.charCodeAt(++e.position);if(r===35){do r=e.input.charCodeAt(++e.position);while(r!==0&&!d(r));break}if(d(r))break;for(t=e.position;r!==0&&!p(r);)r=e.input.charCodeAt(++e.position);o.push(e.input.slice(t,e.position))}r!==0&&ae(e),i.call(te,a)?te[a](e,a,o):E(e,`unknown document directive "`+a+`"`)}if(N(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,N(e,!0,-1)):n&&T(e,`directives end mark is expected`),ve(e,e.lineIndent-1,4,!1,!0),N(e,!0,-1),e.checkLineBreaks&&o.test(e.input.slice(t,e.position))&&E(e,`non-ASCII line breaks are interpreted as content`),e.documents.push(e.result),e.position===e.lineStart&&oe(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,N(e,!0,-1));return}e.position<e.length-1&&T(e,`end of the stream or a document separator is expected`)}function be(e,t){e=String(e),t||={},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));let n=new C(e,t),r=e.indexOf(`\0`);for(r!==-1&&(n.position=r,T(n,`null byte is not allowed in input`)),n.input+=`\0`;n.input.charCodeAt(n.position)===32;)n.lineIndent+=1,n.position+=1;for(;n.position<n.length-1;)ye(n);return n.documents}function xe(e,t,n){typeof t==`object`&&t&&n===void 0&&(n=t,t=null);let r=be(e,n);if(typeof t!=`function`)return r;for(let e=0,n=r.length;e<n;e+=1)t(r[e])}function Se(e,n){let r=be(e,n);if(r.length!==0){if(r.length===1)return r[0];throw new t(`expected a single document in the stream, but found more`)}}return zd.loadAll=xe,zd.load=Se,zd}var tp={},np;function rp(){if(np)return tp;np=1;let e=Hd(),t=Gd(),n=Qf(),r=Object.prototype.toString,i=Object.prototype.hasOwnProperty,a=65279,o={};o[0]=`\\0`,o[7]=`\\a`,o[8]=`\\b`,o[9]=`\\t`,o[10]=`\\n`,o[11]=`\\v`,o[12]=`\\f`,o[13]=`\\r`,o[27]=`\\e`,o[34]=`\\"`,o[92]=`\\\\`,o[133]=`\\N`,o[160]=`\\_`,o[8232]=`\\L`,o[8233]=`\\P`;let s=[`y`,`Y`,`yes`,`Yes`,`YES`,`on`,`On`,`ON`,`n`,`N`,`no`,`No`,`NO`,`off`,`Off`,`OFF`],c=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function l(e,t){if(t===null)return{};let n={},r=Object.keys(t);for(let a=0,o=r.length;a<o;a+=1){let o=r[a],s=String(t[o]);o.slice(0,2)===`!!`&&(o=`tag:yaml.org,2002:`+o.slice(2));let c=e.compiledTypeMap.fallback[o];c&&i.call(c.styleAliases,s)&&(s=c.styleAliases[s]),n[o]=s}return n}function u(n){let r,i,a=n.toString(16).toUpperCase();if(n<=255)r=`x`,i=2;else if(n<=65535)r=`u`,i=4;else if(n<=4294967295)r=`U`,i=8;else throw new t(`code point within a string may not be greater than 0xFFFFFFFF`);return`\\`+r+e.repeat(`0`,i-a.length)+a}function d(t){this.schema=t.schema||n,this.indent=Math.max(1,t.indent||2),this.noArrayIndent=t.noArrayIndent||!1,this.skipInvalid=t.skipInvalid||!1,this.flowLevel=e.isNothing(t.flowLevel)?-1:t.flowLevel,this.styleMap=l(this.schema,t.styles||null),this.sortKeys=t.sortKeys||!1,this.lineWidth=t.lineWidth||80,this.noRefs=t.noRefs||!1,this.noCompatMode=t.noCompatMode||!1,this.condenseFlow=t.condenseFlow||!1,this.quotingType=t.quotingType===`"`?2:1,this.forceQuotes=t.forceQuotes||!1,this.replacer=typeof t.replacer==`function`?t.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result=``,this.duplicates=[],this.usedDuplicates=null}function f(t,n){let r=e.repeat(` `,n),i=0,a=``,o=t.length;for(;i<o;){let e,n=t.indexOf(`
`,i);n===-1?(e=t.slice(i),i=o):(e=t.slice(i,n+1),i=n+1),e.length&&e!==`
`&&(a+=r),a+=e}return a}function p(t,n){return`
`+e.repeat(` `,t.indent*n)}function m(e,t){for(let n=0,r=e.implicitTypes.length;n<r;n+=1)if(e.implicitTypes[n].resolve(t))return!0;return!1}function h(e){return e===32||e===9}function g(e){return e>=32&&e<=126||e>=161&&e<=55295&&e!==8232&&e!==8233||e>=57344&&e<=65533&&e!==a||e>=65536&&e<=1114111}function _(e){return g(e)&&e!==a&&e!==13&&e!==10}function v(e,t,n){let r=_(e),i=r&&!h(e);return(n?r:r&&e!==44&&e!==91&&e!==93&&e!==123&&e!==125)&&e!==35&&!(t===58&&!i)||_(t)&&!h(t)&&e===35||t===58&&i}function y(e){return g(e)&&e!==a&&!h(e)&&e!==45&&e!==63&&e!==58&&e!==44&&e!==91&&e!==93&&e!==123&&e!==125&&e!==35&&e!==38&&e!==42&&e!==33&&e!==124&&e!==61&&e!==62&&e!==39&&e!==34&&e!==37&&e!==64&&e!==96}function b(e){return!h(e)&&e!==58}function x(e,t){let n=e.charCodeAt(t),r;return n>=55296&&n<=56319&&t+1<e.length&&(r=e.charCodeAt(t+1),r>=56320&&r<=57343)?(n-55296)*1024+r-56320+65536:n}function S(e){return/^\n* /.test(e)}function C(e,t,n,r,i,a,o,s){let c,l=0,u=null,d=!1,f=!1,p=r!==-1,m=-1,h=y(x(e,0))&&b(x(e,e.length-1));if(t||o)for(c=0;c<e.length;l>=65536?c+=2:c++){if(l=x(e,c),!g(l))return 5;h&&=v(l,u,s),u=l}else{for(c=0;c<e.length;l>=65536?c+=2:c++){if(l=x(e,c),l===10)d=!0,p&&(f||=c-m-1>r&&e[m+1]!==` `,m=c);else if(!g(l))return 5;h&&=v(l,u,s),u=l}f||=p&&c-m-1>r&&e[m+1]!==` `}return!d&&!f?h&&!o&&!i(e)?1:a===2?5:2:n>9&&S(e)?5:o?a===2?5:2:f?4:3}function w(e,n,r,i,a){e.dump=(function(){if(n.length===0)return e.quotingType===2?`""`:`''`;if(!e.noCompatMode&&(s.indexOf(n)!==-1||c.test(n)))return e.quotingType===2?`"`+n+`"`:`'`+n+`'`;let o=e.indent*Math.max(1,r),l=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-o),u=i||e.flowLevel>-1&&r>=e.flowLevel;function d(t){return m(e,t)}switch(C(n,u,e.indent,l,d,e.quotingType,e.forceQuotes&&!i,a)){case 1:return n;case 2:return`'`+n.replace(/'/g,`''`)+`'`;case 3:return`|`+T(n,e.indent)+E(f(n,o));case 4:return`>`+T(n,e.indent)+E(f(D(n,l),o));case 5:return`"`+k(n)+`"`;default:throw new t(`impossible error: invalid scalar style`)}})()}function T(e,t){let n=S(e)?String(t):``,r=e[e.length-1]===`
`;return n+(r&&(e[e.length-2]===`
`||e===`
`)?`+`:r?``:`-`)+`
`}function E(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function D(e,t){let n=/(\n+)([^\n]*)/g,r=(function(){let r=e.indexOf(`
`);return r=r===-1?e.length:r,n.lastIndex=r,O(e.slice(0,r),t)})(),i=e[0]===`
`||e[0]===` `,a,o;for(;o=n.exec(e);){let e=o[1],n=o[2];a=n[0]===` `,r+=e+(!i&&!a&&n!==``?`
`:``)+O(n,t),i=a}return r}function O(e,t){if(e===``||e[0]===` `)return e;let n=/ [^ ]/g,r,i=0,a,o=0,s=0,c=``;for(;r=n.exec(e);)s=r.index,s-i>t&&(a=o>i?o:s,c+=`
`+e.slice(i,a),i=a+1),o=s;return c+=`
`,e.length-i>t&&o>i?c+=e.slice(i,o)+`
`+e.slice(o+1):c+=e.slice(i),c.slice(1)}function k(e){let t=``,n=0;for(let r=0;r<e.length;n>=65536?r+=2:r++){n=x(e,r);let i=o[n];!i&&g(n)?(t+=e[r],n>=65536&&(t+=e[r+1])):t+=i||u(n)}return t}function A(e,t,n){let r=``,i=e.tag;for(let i=0,a=n.length;i<a;i+=1){let a=n[i];e.replacer&&(a=e.replacer.call(n,String(i),a)),(ne(e,t,a,!1,!1)||a===void 0&&ne(e,t,null,!1,!1))&&(r!==``&&(r+=`,`+(e.condenseFlow?``:` `)),r+=e.dump)}e.tag=i,e.dump=`[`+r+`]`}function j(e,t,n,r){let i=``,a=e.tag;for(let a=0,o=n.length;a<o;a+=1){let o=n[a];e.replacer&&(o=e.replacer.call(n,String(a),o)),(ne(e,t+1,o,!0,!0,!1,!0)||o===void 0&&ne(e,t+1,null,!0,!0,!1,!0))&&((!r||i!==``)&&(i+=p(e,t)),e.dump&&e.dump.charCodeAt(0)===10?i+=`-`:i+=`- `,i+=e.dump)}e.tag=a,e.dump=i||`[]`}function ee(e,t,n){let r=``,i=e.tag,a=Object.keys(n);for(let i=0,o=a.length;i<o;i+=1){let o=``;r!==``&&(o+=`, `),e.condenseFlow&&(o+=`"`);let s=a[i],c=n[s];e.replacer&&(c=e.replacer.call(n,s,c)),ne(e,t,s,!1,!1)&&(e.dump.length>1024&&(o+=`? `),o+=e.dump+(e.condenseFlow?`"`:``)+`:`+(e.condenseFlow?``:` `),ne(e,t,c,!1,!1)&&(o+=e.dump,r+=o))}e.tag=i,e.dump=`{`+r+`}`}function te(e,n,r,i){let a=``,o=e.tag,s=Object.keys(r);if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys==`function`)s.sort(e.sortKeys);else if(e.sortKeys)throw new t(`sortKeys must be a boolean or a function`);for(let t=0,o=s.length;t<o;t+=1){let o=``;(!i||a!==``)&&(o+=p(e,n));let c=s[t],l=r[c];if(e.replacer&&(l=e.replacer.call(r,c,l)),!ne(e,n+1,c,!0,!0,!0))continue;let u=e.tag!==null&&e.tag!==`?`||e.dump&&e.dump.length>1024;u&&(e.dump&&e.dump.charCodeAt(0)===10?o+=`?`:o+=`? `),o+=e.dump,u&&(o+=p(e,n)),ne(e,n+1,l,!0,u)&&(e.dump&&e.dump.charCodeAt(0)===10?o+=`:`:o+=`: `,o+=e.dump,a+=o)}e.tag=o,e.dump=a||`{}`}function M(e,n,a){let o=a?e.explicitTypes:e.implicitTypes;for(let s=0,c=o.length;s<c;s+=1){let c=o[s];if((c.instanceOf||c.predicate)&&(!c.instanceOf||typeof n==`object`&&n instanceof c.instanceOf)&&(!c.predicate||c.predicate(n))){if(e.tag=a?c.multi&&c.representName?c.representName(n):c.tag:`?`,c.represent){let a=e.styleMap[c.tag]||c.defaultStyle,o;if(r.call(c.represent)===`[object Function]`)o=c.represent(n,a);else if(i.call(c.represent,a))o=c.represent[a](n,a);else throw new t(`!<`+c.tag+`> tag resolver accepts not "`+a+`" style`);e.dump=o}return!0}}return!1}function ne(e,n,i,a,o,s,c){e.tag=null,e.dump=i,M(e,i,!1)||M(e,i,!0);let l=r.call(e.dump),u=a;a&&=e.flowLevel<0||e.flowLevel>n;let d=l===`[object Object]`||l===`[object Array]`,f,p;if(d&&(f=e.duplicates.indexOf(i),p=f!==-1),(e.tag!==null&&e.tag!==`?`||p||e.indent!==2&&n>0)&&(o=!1),p&&e.usedDuplicates[f])e.dump=`*ref_`+f;else{if(d&&p&&!e.usedDuplicates[f]&&(e.usedDuplicates[f]=!0),l===`[object Object]`)a&&Object.keys(e.dump).length!==0?(te(e,n,e.dump,o),p&&(e.dump=`&ref_`+f+e.dump)):(ee(e,n,e.dump),p&&(e.dump=`&ref_`+f+` `+e.dump));else if(l===`[object Array]`)a&&e.dump.length!==0?(e.noArrayIndent&&!c&&n>0?j(e,n-1,e.dump,o):j(e,n,e.dump,o),p&&(e.dump=`&ref_`+f+e.dump)):(A(e,n,e.dump),p&&(e.dump=`&ref_`+f+` `+e.dump));else if(l===`[object String]`)e.tag!==`?`&&w(e,e.dump,n,s,u);else if(l===`[object Undefined]`)return!1;else{if(e.skipInvalid)return!1;throw new t(`unacceptable kind of an object to dump `+l)}if(e.tag!==null&&e.tag!==`?`){let t=encodeURI(e.tag[0]===`!`?e.tag.slice(1):e.tag).replace(/!/g,`%21`);t=e.tag[0]===`!`?`!`+t:t.slice(0,18)===`tag:yaml.org,2002:`?`!!`+t.slice(18):`!<`+t+`>`,e.dump=t+` `+e.dump}}return!0}function re(e,t){let n=[],r=[];ie(e,n,r);let i=r.length;for(let e=0;e<i;e+=1)t.duplicates.push(n[r[e]]);t.usedDuplicates=Array(i)}function ie(e,t,n){if(typeof e==`object`&&e){let r=t.indexOf(e);if(r!==-1)n.indexOf(r)===-1&&n.push(r);else if(t.push(e),Array.isArray(e))for(let r=0,i=e.length;r<i;r+=1)ie(e[r],t,n);else{let r=Object.keys(e);for(let i=0,a=r.length;i<a;i+=1)ie(e[r[i]],t,n)}}}function ae(e,t){t||={};let n=new d(t);n.noRefs||re(e,n);let r=e;return n.replacer&&(r=n.replacer.call({"":r},``,r)),ne(n,0,r,!0,!0)?n.dump+`
`:``}return tp.dump=ae,tp}var ip;function ap(){if(ip)return Rd;ip=1;let e=ep(),t=rp();function n(e,t){return function(){throw Error(`Function yaml.`+e+` is removed in js-yaml 4. Use yaml.`+t+` instead, which is now safe by default.`)}}return Rd.Type=Zd(),Rd.Schema=ef(),Rd.FAILSAFE_SCHEMA=pf(),Rd.JSON_SCHEMA=Of(),Rd.CORE_SCHEMA=jf(),Rd.DEFAULT_SCHEMA=Qf(),Rd.load=e.load,Rd.loadAll=e.loadAll,Rd.dump=t.dump,Rd.YAMLException=Gd(),Rd.types={binary:Bf(),float:Tf(),map:uf(),null:gf(),pairs:Kf(),set:Yf(),timestamp:Pf(),bool:yf(),int:Sf(),merge:Lf(),omap:Uf(),seq:sf(),str:rf()},Rd.safeLoad=n(`safeLoad`,`load`),Rd.safeLoadAll=n(`safeLoadAll`,`loadAll`),Rd.safeDump=n(`safeDump`,`dump`),Rd}let op=/* @__PURE__ */ Ld(ap()),{Type:sp,Schema:cp,FAILSAFE_SCHEMA:lp,JSON_SCHEMA:up,CORE_SCHEMA:dp,DEFAULT_SCHEMA:fp,load:pp,loadAll:mp,dump:hp,YAMLException:gp,types:_p,safeLoad:vp,safeLoadAll:yp,safeDump:bp}=op;function xp(e){return e.normalize(`NFKD`).replace(/[\u0300-\u036f]/g,``).toLowerCase().replace(/[’‘]/g,`'`).replace(/[^a-z0-9\-',æ ]/g,` `).replace(/\s+/g,` `).trim()}function Sp(e,t){return e===-1/0?t:t===-1/0?e:Math.max(e,t)+Math.log1p(Math.exp(-Math.abs(e-t)))}function Cp(e,t,n,r,i){let a=i===void 0?0:i,o=/* @__PURE__ */ new Map;for(let e=0;e<n.length;e++){if(e===a)continue;let t=n[e].toLowerCase();o.has(t)||o.set(t,[]),o.get(t).push(e)}let s=/* @__PURE__ */ new Map,c=n.length;function l(n){if(s.has(n))return s.get(n);let r=n===null?[a]:o.get(n);if(!r)return null;let i=new Float64Array(t);for(let n=0;n<t;n++){let t=0;for(let i of r)t+=e[n*c+i];i[n]=Math.log(Math.max(1e-30,t))}return s.set(n,i),i}let u=l(null),d=[];for(let e of new Set(r)){let n=Array.from(xp(e));if(!n.length||n.length>t)continue;let r=n.map(l);if(r.some(e=>!e))continue;let i=n.length*2+1,a=new Float64Array(i).fill(-1/0);a[0]=u[0],a[1]=r[0][0];for(let e=1;e<t;e++){let t=new Float64Array(i).fill(-1/0);for(let o=0;o<i;o++){let i=a[o];o&&(i=Sp(i,a[o-1])),o>1&&o%2==1&&n[(o-1)/2]!==n[(o-3)/2]&&(i=Sp(i,a[o-2])),t[o]=i+(o%2?r[(o-1)/2][e]:u[e])}a=t}let o=Sp(a[i-1],a[i-2]),s=o/n.length;d.push({name:e,logProbability:o,meanLogProbability:s,rawTokenSupport:Math.exp(s)})}return d.sort((e,t)=>t.meanLogProbability-e.meanLogProbability)}let wp=`abcdefghijklmnopqrstuvwxyz-,'æ `;function Tp(e){return e.normalize(`NFKD`).replace(/[\u0300-\u036f]/g,``).toLowerCase().replace(/[^a-z\-',æ ]/g,` `).replace(/\s+/g,` `).trim()}function Ep(e,t){return e===-1/0?t:t===-1/0?e:Math.max(e,t)+Math.log1p(Math.exp(-Math.abs(e-t)))}function Dp(e){let t=[{next:/* @__PURE__ */ new Map,length:0,char:-1,names:[]}];for(let n of e){if(n.startsWith(`A-`))continue;let e=Tp(n);if(e.length<4||e.length>50)continue;let r=0;for(let n of e){let e=wp.indexOf(n);t[r].next.has(e)||(t[r].next.set(e,t.length),t.push({next:/* @__PURE__ */ new Map,length:t[r].length+1,char:e,names:[]})),r=t[r].next.get(e)}t[r].names.push(n)}return t}function Op(e,t,n,r,i){let{beamWidth:a=160,bonus:o=.2,skip:s=2,blankIndex:c=n.length-1}=i===void 0?{}:i,l=n.length,u=c,d=Array.from({length:31},()=>[]);for(let e=0;e<l;e++){if(e===u)continue;let t=wp.indexOf(n[e].toLowerCase());t>=0&&d[t].push(e)}let f=[{id:0,b:0,n:-1/0,total:0}];for(let n=s;n<t;n++){let t=d.map(t=>Math.log(Math.max(1e-12,t.reduce((t,r)=>t+e[n*l+r],0)))),i=Math.log(Math.max(1e-12,e[n*l+u])),s=/* @__PURE__ */ new Map;function p(e){let t=s.get(e);return t||(t={id:e,b:-1/0,n:-1/0},s.set(e,t)),t}for(let e of f){let n=r[e.id],a=p(e.id);a.b=Ep(a.b,e.total+i),n.char>=0&&(a.n=Ep(a.n,e.n+t[n.char]));for(let[r,i]of n.next){let a=p(i),o=r===n.char?e.b:e.total;a.n=Ep(a.n,o+t[r])}}f=Array.from(s.values()).map(e=>({id:e.id,b:e.b,n:e.n,total:Ep(e.b,e.n)})).sort((e,t)=>t.total+r[t.id].length*o-(e.total+r[e.id].length*o)).slice(0,a)}return f.filter(e=>r[e.id].names.length).flatMap(e=>r[e.id].names.map(t=>({name:t,logProbability:e.total,perCharacter:Math.exp(e.total/r[e.id].length)}))).sort((e,t)=>t.logProbability-e.logProbability).slice(0,5)}function kp(e,t,n){let{width:r,height:i,data:a}=e,o=t===void 0?2:t,s=n===void 0?12:n,c=r*i,l=Math.ceil(o*3),u=[],d=0;for(let e=-l;e<=l;e++){let t=Math.exp(-e*e/(2*o*o));u.push(t),d+=t}for(let e=0;e<u.length;e++)u[e]/=d;let f=new Float32Array(c);function p(e,t){for(let t=0;t<i;t++)for(let n=0;n<r;n++){let i=0;for(let a=-l;a<=l;a++)i+=e[t*r+Math.max(0,Math.min(r-1,n+a))]*u[a+l];f[t*r+n]=i}for(let e=0;e<i;e++)for(let n=0;n<r;n++){let a=0;for(let t=-l;t<=l;t++)a+=f[Math.max(0,Math.min(i-1,e+t))*r+n]*u[t+l];t[e*r+n]=a}}let m=new Float32Array(c);for(let e=0;e<c;e++)m[e]=(.299*a[e*4]+.587*a[e*4+1]+.114*a[e*4+2])/255;let h=m.slice(),g=new Float32Array(c),_=new Float32Array(c),v=new Float32Array(c);for(let e=0;e<s;e++){p(h,g);for(let e=0;e<c;e++)_[e]=Math.min(3,(m[e]+.003)/(g[e]+.003));p(_,v);for(let e=0;e<c;e++)h[e]=Math.max(.001,Math.min(1.2,h[e]*v[e]))}for(let e=0;e<c;e++)a[e*4]=a[e*4+1]=a[e*4+2]=Math.round(Math.min(255,h[e]*255));return e}x.wasm.numThreads=self.crossOriginIsolated?Math.min(4,navigator.hardwareConcurrency||1):1;let Ap,jp,Mp;function Np(e){self.postMessage(e)}function Pp(e){return e===`medium`?`medium-rec`:e===`server`?`server-rec`:e===`english`?`en-rec`:`rec`}async function Fp(e){let t=await fetch(`/ocr/models/paddle/${Pp(e)}.yml`);if(!t.ok)throw Error(`Missing OCR recognition assets; restore the Git-tracked model files and run npm run install:ocr`);jp=op.load(await t.text()).PostProcess.character_dict.concat([` `]),Ap=await ye.create(`/ocr/models/paddle/${Pp(e)}.onnx`,{executionProviders:navigator.gpu?[`webgpu`,`wasm`]:[`wasm`]})}function Ip(e){let{width:t,height:n,data:r}=e,i=new Float32Array(t*n);for(let e=0;e<i.length;e++)i[e]=.299*r[e*4]+.587*r[e*4+1]+.114*r[e*4+2];for(let e=0;e<n;e++)for(let a=0;a<t;a++){let o=0,s=0;for(let r=-3;r<=3;r++)for(let c=-3;c<=3;c++){let l=Math.max(0,Math.min(t-1,a+c)),u=Math.max(0,Math.min(n-1,e+r));o+=i[u*t+l],s++}let c=e*t+a,l=Math.max(0,Math.min(255,128+(i[c]+2*(i[c]-o/s)-128)*1.5));r[c*4]=r[c*4+1]=r[c*4+2]=l}}async function Lp(e){let{id:t,pixels:n,stretch:r=1,enhance:i=!1,deblur:a=0,lexical:o=!1,candidateNames:s}=e;if(!Ap)throw Error(`Recognizer is not loaded`);a&&kp(n,a),i&&Ip(n);let c=new OffscreenCanvas(n.width,n.height);c.getContext(`2d`).putImageData(n,0,0);let l=Math.min(3200,Math.ceil(48*n.width/n.height/r)),u=Math.max(320,l),d=new OffscreenCanvas(l,48).getContext(`2d`);d.drawImage(c,0,0,l,48);let f=d.getImageData(0,0,l,48).data,p=new Float32Array(3*u*48);for(let e=0;e<48;e++)for(let t=0;t<l;t++)for(let n=0;n<3;n++)p[n*u*48+e*u+t]=f[(e*l+t)*4+2-n]/127.5-1;let m=new le(`float32`,p,[1,3,48,u]),h=await Ap.run({[Ap.inputNames[0]]:m}),g=h[Ap.outputNames[0]],_=g.data,v=``,y=0,b=0,x=-1,S=g.dims[1],C=g.dims[2];for(let e=0;e<S;e++){let t=-1/0,n=0;for(let r=0;r<C;r++){let i=_[e*C+r];i>t&&(t=i,n=r)}n>0&&n!==x&&(v+=jp[n-1]||``,y+=t,b++),x=n}let w;o&&(v.length>=3||s?.length)&&(Mp||=Dp(await(await fetch(`/ocr/card-names.json`)).json()),w=Op(_,S,[`_`].concat(jp),Mp,{skip:0,blankIndex:0})),s?.length&&(w=Cp(_,S,[`_`].concat(jp),s.concat((w||[]).map(e=>e.name)),0)),m.dispose();for(let e of Object.values(h))e.dispose();Np({id:t,text:v,score:b?y/b:0,lexical:w})}async function Rp(e){try{Ap||await Fp(e.model),e.pixels?await Lp({id:e.id,pixels:e.pixels,model:e.model,stretch:e.stretch,enhance:e.enhance,deblur:e.deblur,lexical:e.lexical,candidateNames:e.candidateNames}):Np({id:e.id,ready:!0})}catch(t){Np({id:e.id,error:String(t)})}}let zp=Promise.resolve();self.onmessage=function(e){zp=zp.then(()=>Rp(e.data))}})();