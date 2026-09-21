"""Fine-tune OCR on synthetic renders of the full catalog, never on photo labels/pixels."""
import os,time,json,random,unicodedata,argparse,shutil
from pathlib import Path
import numpy as np,h5py,torch
from PIL import Image,ImageDraw,ImageFont,ImageFilter
root=Path(__file__).parent
chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-,'Æ "
parser=argparse.ArgumentParser();parser.add_argument('--steps',type=int,default=1000);parser.add_argument('--resume');args=parser.parse_args()
torch.set_num_threads(6);random.seed(921);np.random.seed(921);torch.manual_seed(921)
device='mps' if torch.backends.mps.is_available() else 'cpu'
class Net(torch.nn.Module):
 def __init__(self):
  super().__init__();self.conv1=torch.nn.Conv2d(1,16,5,padding=2);self.conv2=torch.nn.Conv2d(16,16,3,padding=1);self.dense1=torch.nn.Linear(128,32);self.lstm=torch.nn.LSTM(32,168,bidirectional=True,batch_first=True);self.dense2=torch.nn.Linear(336,58)
 def forward(self,x):
  x=x.permute(0,3,1,2);x=torch.nn.functional.max_pool2d(torch.relu(self.conv1(x)),2);x=torch.nn.functional.max_pool2d(torch.relu(self.conv2(x)),2);x=x.permute(0,2,3,1).reshape(-1,78,128);x=torch.relu(self.dense1(x));x=self.lstm(x)[0];return self.dense2(x)
net=Net();original=Path('/tmp/mtg-visions/models/recognition_lstm_weights.h5')
with h5py.File(original) as f:
 w=f['model_weights']
 for name in ['conv1','conv2','dense1','dense2']:
  m=getattr(net,name);k=np.array(w[name][name]['kernel:0']);m.weight.data=torch.tensor(k.transpose(3,2,0,1) if name.startswith('conv') else k.T);m.bias.data=torch.tensor(np.array(w[name][name]['bias:0']))
 for direct,suffix in [('forward',''),('backward','_reverse')]:
  g=w['bidirectional_1']['bidirectional_1'][direct+'_lstm_1'];getattr(net.lstm,'weight_ih_l0'+suffix).data=torch.tensor(np.array(g['kernel:0'])).T;getattr(net.lstm,'weight_hh_l0'+suffix).data=torch.tensor(np.array(g['recurrent_kernel:0'])).T;getattr(net.lstm,'bias_ih_l0'+suffix).data=torch.tensor(np.array(g['bias:0']));getattr(net.lstm,'bias_hh_l0'+suffix).data.zero_()
if args.resume:net.load_state_dict(torch.load(args.resume,map_location='cpu',weights_only=True))
net.to(device);opt=torch.optim.AdamW(net.parameters(),lr=.00015);loss_fn=torch.nn.CTCLoss(blank=57,zero_infinity=True)
names=json.loads((root/'res/card-names.json').read_text());names=[n for n in names if not n.startswith('A-') and 4<=len(n)<=33 and all(c in chars for c in n)];random.shuffle(names);heldout=names[:500];names=names[500:]
font=ImageFont.truetype(str(root/'models/fonts/beleren.ttf'),32)

def sample(name,augment=True):
 box=font.getbbox(name);tw,th=box[2]-box[0],box[3]-box[1]
 if augment:
  left=random.randint(3,15);top=random.randint(3,15);right=random.randint(3,max(4,int(tw*.8)));bottom=random.randint(3,12);bg=random.randint(160,255);ink=random.randint(0,60)
  im=Image.new('L',(tw+left+right,th+top+bottom),bg);d=ImageDraw.Draw(im)
  if random.random()<.6:
   d.rounded_rectangle((0,0,im.width-1,im.height-1),radius=random.randint(2,10),outline=random.randint(0,60),width=random.randint(1,5))
  d.text((left-box[0],top-box[1]),name,font=font,fill=ink)
  if right>th*1.5 and random.random()<.5:
   radius=th*.25;cx=im.width-th*.6;cy=top+th*.5;d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),fill=random.randint(40,130))
  im=im.rotate(random.uniform(-2.5,2.5),resample=Image.Resampling.BICUBIC,expand=True,fillcolor=bg)
  h=random.randint(14,40);w=max(4,round(im.width/im.height*h*random.uniform(.7,1.25)));im=im.resize((w,h),Image.Resampling.LANCZOS)
  if random.random()<.9:im=im.filter(ImageFilter.GaussianBlur(random.uniform(.05,1.6)))
 else:
  im=Image.new('L',(tw+10,th+8),255);ImageDraw.Draw(im).text((5-box[0],4-box[1]),name,font=font,fill=0)
 scale=32/im.height;w=min(312,max(1,round(im.width*scale)));im=im.resize((w,32),Image.Resampling.BILINEAR);a=np.asarray(im,dtype='float32')/255
 if augment:
  bg=random.uniform(.65,1);fg=random.uniform(0,.3);a=fg+(bg-fg)*a;a+=np.random.normal(0,random.uniform(0,.02),a.shape)
 out=np.full((312,32,1),.5,dtype='float32');out[:w,:,0]=a.T-.5
 return out,[chars.index(c) for c in name]
def decode(p):
 out=[]
 for row in p.argmax(-1):
  last=-1;s=''
  for c in row:
   c=int(c)
   if c!=last and c!=57:s+=chars[c]
   last=c
  out.append(s.strip())
 return out
outdir=root/'models/domain';outdir.mkdir(exist_ok=True)
started=time.time()
for step in range(args.steps):
 batch=[sample(random.choice(names)) for _ in range(48)];x=torch.tensor(np.stack([b[0]for b in batch]),device=device);targets=torch.tensor([c for b in batch for c in b[1]],dtype=torch.long);lens=torch.tensor([len(b[1])for b in batch],dtype=torch.long)
 net.train();opt.zero_grad();logits=net(x);loss=loss_fn(logits.log_softmax(-1).transpose(0,1).cpu(),targets,torch.full((48,),78,dtype=torch.long),lens);loss.backward();torch.nn.utils.clip_grad_norm_(net.parameters(),5);opt.step()
 if (step+1)%100==0:
  torch.save({k:v.cpu() for k,v in net.state_dict().items()},outdir/'checkpoint.pt');net.eval()
  with torch.no_grad():
   batch=[sample(n,False) for n in heldout[:48]];pred=decode(net(torch.tensor(np.stack([b[0]for b in batch]),device=device)).cpu());acc=sum(p==n for p,n in zip(pred,heldout[:48]))/48
  print(json.dumps({'step':step+1,'loss':float(loss.detach()),'heldoutCleanExact':acc,'seconds':time.time()-started,'samples':list(zip(heldout[:3],pred[:3]))}),flush=True)
net.cpu();shutil.copy(original,outdir/'weights.h5')
with h5py.File(outdir/'weights.h5','r+')as f:
 w=f['model_weights']
 for name in ['conv1','conv2','dense1','dense2']:
  m=getattr(net,name);k=m.weight.detach().numpy();w[name][name]['kernel:0'][...]=k.transpose(2,3,1,0)if name.startswith('conv')else k.T;w[name][name]['bias:0'][...]=m.bias.detach().numpy()
 for direct,suffix in [('forward',''),('backward','_reverse')]:
  g=w['bidirectional_1']['bidirectional_1'][direct+'_lstm_1'];g['kernel:0'][...]=getattr(net.lstm,'weight_ih_l0'+suffix).detach().numpy().T;g['recurrent_kernel:0'][...]=getattr(net.lstm,'weight_hh_l0'+suffix).detach().numpy().T;g['bias:0'][...]=(getattr(net.lstm,'bias_ih_l0'+suffix)+getattr(net.lstm,'bias_hh_l0'+suffix)).detach().numpy()
(outdir/'training.json').write_text(json.dumps({'device':device,'steps':args.steps,'seed':921,'trainingNames':len(names),'heldoutNames':heldout,'photoPixelsUsed':False,'photoLabelsUsed':False,'initialWeights':str(original)},indent=2))
