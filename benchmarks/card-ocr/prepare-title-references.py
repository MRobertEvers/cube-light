"""Download reference printings for machine-generated hypotheses only."""
import json,sqlite3,urllib.request,time,concurrent.futures
from pathlib import Path
root=Path(__file__).parent;out=root/'models/title-references';out.mkdir(parents=True,exist_ok=True)
regions=json.loads((root/'photo-results/glm-constrained-preserve-crops-v4.json').read_text())['outputs']
# Fixed budget applies uniformly to every automatically selected proposal.
names=sorted(set(n for r in regions for n in r['seeds'][:8] if '_' not in n))
c=sqlite3.connect('file:'+str(root.parent.parent/'projects/server/src/assets/AllPrintings.sqlite')+'?mode=ro',uri=True)
refs=[]
for name in names:
 rows=c.execute('select c.uuid,c.frameVersion,i.scryfallId,c.manaCost,c.text from cards c join cardIdentifiers i on i.uuid=c.uuid where c.name=? and c.language=\'English\' and c.layout=\'normal\' and i.scryfallId is not null order by coalesce(c.isAlternative,0),coalesce(c.isFullArt,0),coalesce(c.isPromo,0),coalesce(length(c.frameEffects),0),c.setCode desc',(name,)).fetchall()
 seen=set()
 for uuid,frame,sid,mana,text in rows:
  if frame in seen:continue
  seen.add(frame);refs.append(dict(name=name,frame=frame,id=sid,file=sid+'.jpg',mana=mana,text=text))
  if len(seen)==2:break
print(len(names),'names',len(refs),'references',flush=True)
def download(r):
 p=out/r['file']
 if p.exists():return r
 url=f"https://cards.scryfall.io/normal/front/{r['id'][0]}/{r['id'][1]}/{r['id']}.jpg"
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'CardNameOCRResearch/0.1'})
  with urllib.request.urlopen(req,timeout=25) as resp:p.write_bytes(resp.read())
  return r
 except Exception as e: print('Failed',r['name'],str(e),flush=True);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 results=[]
 for i,r in enumerate(pool.map(download,refs)):
  if r:results.append(r)
  if i%25==0:print('Downloaded',i,'/',len(refs),flush=True)
(out/'manifest.json').write_text(json.dumps(results));print('Saved',len(results),flush=True)
