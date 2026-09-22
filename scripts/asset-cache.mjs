import os from 'node:os';import path from 'node:path';
export function cacheRoot(){return process.env.CUBE_MODEL_CACHE||path.join(os.homedir(),process.platform==='darwin'?'Library/Caches':'.cache','CubeLight','models');}
export function cachedAsset(asset){return path.join(cacheRoot(),'sha256',asset.sha256);}
