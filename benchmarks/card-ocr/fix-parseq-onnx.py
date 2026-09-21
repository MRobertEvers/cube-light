import onnx,sys
from pathlib import Path
p=Path(__file__).parent/('models/parseq-ar/model.onnx' if '--ar' in sys.argv else 'models/parseq/model.onnx');m=onnx.shape_inference.infer_shapes(onnx.load(p))
types={v.name:v.type.tensor_type.elem_type for v in [*m.graph.value_info,*m.graph.input,*m.graph.output]};nodes=[]
for n in m.graph.node:
 if n.op_type=='Where' and types.get(n.output[0])==onnx.TensorProto.BOOL:
  a,b,c=n.input;prefix=n.output[0];nodes.extend([onnx.helper.make_node('And',[a,b],[prefix+'_yes']),onnx.helper.make_node('Not',[a],[prefix+'_not']),onnx.helper.make_node('And',[prefix+'_not',c],[prefix+'_no']),onnx.helper.make_node('Or',[prefix+'_yes',prefix+'_no'],list(n.output))])
 else:nodes.append(n)
del m.graph.node[:];m.graph.node.extend(nodes);onnx.checker.check_model(m);onnx.save(m,p);print('Patched boolean Where')
