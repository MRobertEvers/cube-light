// Resolve the extensionless relative imports used by Vite when running Node's test runner.
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){
 try{return nextResolve(specifier,context);}catch(error){
  if(error.code!=='ERR_MODULE_NOT_FOUND'||!specifier.startsWith('.'))throw error;
  for(const suffix of ['.ts','.tsx','/index.ts'])try{return nextResolve(specifier+suffix,context);}catch{}
  throw error;
 }
}});
