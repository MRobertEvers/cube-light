"""Prepare reference identifiers for the full catalog, without downloading images."""
import sqlite3,json
from pathlib import Path
root=Path(__file__).parent
c=sqlite3.connect('file:'+str(root.parent.parent/'projects/server/src/assets/AllPrintings.sqlite')+'?mode=ro',uri=True)
names=set(json.loads((root/'res/card-names.json').read_text()));frames={};refs=[]
query="""select c.name,c.frameVersion,i.scryfallId from cards c join cardIdentifiers i on i.uuid=c.uuid where c.language='English' and c.layout='normal' and i.scryfallId is not null order by c.name,c.frameVersion desc,coalesce(c.isAlternative,0),coalesce(c.isFullArt,0),coalesce(c.isPromo,0),coalesce(length(c.frameEffects),0),c.setCode desc"""
for name,frame,sid in c.execute(query):
 if name not in names or name.startswith('A-'):continue
 seen=frames.setdefault(name,set())
 if frame in seen or len(seen)>=2:continue
 seen.add(frame);refs.append(dict(name=name,frame=frame,id=sid,file=sid+'.jpg'))
(root/'models/title-references/catalog.json').write_text(json.dumps(refs));print(len(refs),'references for',len(frames),'catalog names')
