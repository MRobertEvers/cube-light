"""Convert Lauri Hursti's MIT-licensed Visions recognizer to ONNX (no training).
Source: https://github.com/LauriHursti/visions — models/recognition_lstm_weights.h5
Usage: python convert-visions.py path/to/recognition_lstm_weights.h5
"""
import sys,json,hashlib
from pathlib import Path
import h5py,numpy as np,onnx
from onnx import helper as H,numpy_helper as N,TensorProto as T
source=Path(sys.argv[1]);f=h5py.File(source,'r');weights=f['model_weights'];nodes=[];initializers=[]
def init(name,a):initializers.append(N.from_array(np.asarray(a),name));return name
def node(op,inputs,output,**attrs):nodes.append(H.make_node(op,inputs,[output],**attrs));return output
def w(layer,param):return np.asarray(weights[layer][layer][param+':0'],dtype='float32')
x=node('Transpose',['pixels'],'nchw',perm=[0,3,1,2])
for layer,k in [('conv1',5),('conv2',3)]:
 x=node('Conv',[x,init(layer+'_w',w(layer,'kernel').transpose(3,2,0,1)),init(layer+'_b',w(layer,'bias'))],layer+'_out',pads=[k//2]*4)
 x=node('Relu',[x],layer+'_relu');x=node('MaxPool',[x],layer+'_pool',kernel_shape=[2,2],strides=[2,2])
x=node('Transpose',[x],'nhwc',perm=[0,2,3,1]);x=node('Reshape',[x,init('shape1',np.array([1,78,128],dtype='int64'))],'seq')
x=node('MatMul',[x,init('dense1_w',w('dense1','kernel'))],'d1m');x=node('Add',[x,init('dense1_b',w('dense1','bias'))],'d1a');x=node('Relu',[x],'d1r');x=node('Transpose',[x],'time_major',perm=[1,0,2])
Ws=[];Rs=[];Bs=[]
for direction in ['forward','backward']:
 group=weights['bidirectional_1']['bidirectional_1'][direction+'_lstm_1']
 order=np.r_[np.arange(0,168),np.arange(504,672),np.arange(168,504)] # Keras i,f,c,o -> ONNX i,o,f,c
 Ws.append(np.asarray(group['kernel:0'],dtype='float32').T[order]);Rs.append(np.asarray(group['recurrent_kernel:0'],dtype='float32').T[order]);Bs.append(np.r_[np.asarray(group['bias:0'],dtype='float32')[order],np.zeros(672,dtype='float32')])
config=json.loads(f.attrs['model_config']);rnn=next(l for l in config['config']['layers'] if l['class_name']=='Bidirectional');activation=rnn['config']['layer']['config']['recurrent_activation'];assert activation=='sigmoid',activation
x=node('LSTM',[x,init('W',np.stack(Ws)),init('R',np.stack(Rs)),init('B',np.stack(Bs))],'rnn',hidden_size=168,direction='bidirectional')
x=node('Transpose',[x],'rnn_batch',perm=[2,0,1,3]);x=node('Reshape',[x,init('shape2',np.array([1,78,336],dtype='int64'))],'rnn_flat')
x=node('MatMul',[x,init('dense2_w',w('dense2','kernel'))],'d2m');x=node('Add',[x,init('dense2_b',w('dense2','bias'))],'d2a');node('Softmax',[x],'probabilities',axis=2)
g=H.make_graph(nodes,'Visions card-title OCR',[H.make_tensor_value_info('pixels',T.FLOAT,[1,312,32,1])],[H.make_tensor_value_info('probabilities',T.FLOAT,[1,78,58])],initializers)
model=H.make_model(g,opset_imports=[H.make_opsetid('',13)],producer_name='cube-light Visions converter',ir_version=8);onnx.checker.check_model(model)
out=Path(__file__).with_name('models')/(sys.argv[2] if len(sys.argv)>2 else 'visions');out.mkdir(parents=True,exist_ok=True);onnx.save(model,out/'recognizer.onnx')
(out/'provenance.json').write_text(json.dumps({'source':'https://github.com/LauriHursti/visions','weightsSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'license':'MIT','trainedOnCurrentPhoto':False,'conversion':'Keras NHWC conv + bidirectional sigmoid LSTM -> ONNX; weights unchanged'},indent=2))
print(out/'recognizer.onnx')
