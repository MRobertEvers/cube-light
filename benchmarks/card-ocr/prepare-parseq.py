"""Export official PARSeq weights; no photo or expected names are used."""
import sys,json
from pathlib import Path
import torch,yaml
sys.path.insert(0,'/tmp/card-parseq')
from strhub.models.parseq.model import PARSeq
from strhub.data.utils import Tokenizer
ar='--ar' in sys.argv
root=Path(__file__).parent/('models/parseq-ar' if ar else 'models/parseq');root.mkdir(parents=True,exist_ok=True)
chars=yaml.safe_load(Path('/tmp/card-parseq/configs/charset/94_full.yaml').read_text())['model']['charset_train']
model=PARSeq(num_tokens=len(chars)+3,max_label_length=25,img_size=[32,128],patch_size=[4,8],embed_dim=384,enc_num_heads=6,enc_mlp_ratio=4,enc_depth=12,dec_num_heads=12,dec_mlp_ratio=4,dec_depth=1,decode_ar=ar,refine_iters=1 if ar else 2,dropout=.1).eval()
weights=torch.hub.load_state_dict_from_url('https://github.com/baudm/parseq/releases/download/v1.0.0/parseq-bb5792a6.pt',map_location='cpu',check_hash=True)
model.load_state_dict(weights);torch.set_num_threads(4)
tokenizer=Tokenizer(chars)
class Wrapper(torch.nn.Module):
 def __init__(self):
  super().__init__();self.model=model
 def forward(self,image):return self.model(tokenizer,image,25)
wrapped=Wrapper().eval();torch.backends.mha.set_fastpath_enabled(False)
x=torch.rand(1,3,32,128)*2-1
with torch.no_grad():
 torch.onnx.export(wrapped,x,str(root/'model.onnx'),input_names=['image'],output_names=['logits'],opset_version=17,dynamo=False)
 expected=wrapped(x).numpy()
import numpy as np
np.savez(root/'export-check.npz',image=x.numpy(),logits=expected)
(root/'config.json').write_text(json.dumps({'characters':['[EOS]']+list(chars),'width':128,'height':32,'source':'baudm/parseq','decode_ar':ar,'refine_iters':1 if ar else 2}))
print('Exported',root,flush=True)

(root/'check-input.bin').write_bytes(x.numpy().tobytes())
(root/'check-logits.json').write_text(json.dumps(expected.flatten().tolist()))
