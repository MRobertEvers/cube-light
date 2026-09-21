"""Evaluation-only annotations, manually transcribed from the original photo.
Coordinates below use the 1824x1368 preview for readability; output uses original pixels.
Never imported by the scanner.
"""
import json
from pathlib import Path
S=5712/1824
rows=[]
def add(name,boxes,visibility='full'):
 for box in boxes:
  rows.append(dict(id=f'card-{len(rows)+1:02}',name=name,visibility=visibility,box=[round(v*S) for v in box]))
add("Inventor's Goggles",[[601,320,126,18]])
add("Inventor's Goggles",[[434,335,40,17],[480,324,54,17],[540,324,52,17]],'partial')
add("Inventor's Axe",[[145,368,151,37]])
add("Inventor's Axe",[[94,403,51,23]],'partial')
add('Galvanic Blast',[[775,331,123,16]])
add('Galvanic Discharge',[[1108,309,114,34]])
add('Galvanic Discharge',[[990,304,43,13],[1036,303,25,13],[1060,310,42,14]],'partial')
add('Kenku Artificer',[[703,475,132,21]])
add('Kenku Artificer',[[648,480,51,20]],'partial')
add('Aether Swooper',[[408,557,150,24]])
add('Aether Swooper',[[210,593,65,26],[277,577,65,26],[347,567,54,24]],'partial')
add('Aether Chaser',[[0,678,56,44],[59,622,139,56],[1558,757,128,29],[1590,789,138,29]])
add('Cloudsculpt Technician',[[1185,493,103,31],[1289,522,135,66]])
add('Cloudsculpt Technician',[[1073,490,35,19],[1110,489,64,27]],'partial')
add('Metallic Rebuke',[[264,845,174,60],[151,897,108,42]])
add('Gearseeker Serpent',[[624,774,154,49]])
add('Gearseeker Serpent',[[551,812,73,32]],'partial')
add('Selfcraft Mechan',[[813,692,132,54],[932,707,135,31]])
add('Selfcraft Mechan',[[859,735,23,29],[888,724,40,29]],'partial')
add('Cryogen Relic',[[1108,707,94,22],[1222,709,135,23]])
Path(__file__).with_name('photo-ground-truth.json').write_text(json.dumps({'image':'IMG_8535.jpeg','width':5712,'height':4284,'notes':'Full = sufficient exposed title to identify independently. Partial = identity annotated using visible art and adjacent cards; must not imply OCR can recover the hidden suffix. Unreadable left-edge stack, partially exposed Unsummon at right and completely hidden cards excluded from known-name scoring; any detections there require review. Exact physical total is indeterminate.','cards':rows},indent=2)+'\n')
