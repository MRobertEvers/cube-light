"""Port the MIT-licensed Visions text-component classifier to ONNX."""
from pathlib import Path
import h5py,numpy as np,onnx
from onnx import helper as H,numpy_helper as N,TensorProto as T
f=h5py.File('/tmp/mtg-visions/models/component_cnn_clf_weights.h5');nodes=[];weights=[]
def add(n,a):weights.append(N.from_array(np.asarray(a),n));return n
def op(kind,inputs,out,**kw):nodes.append(H.make_node(kind,inputs,[out],**kw));return out
x=op('Transpose',['pixels'],'nchw',perm=[0,3,1,2])
for i,k in enumerate([5,3,3],1):
 n=f'conv2d_{i}';g=f[n][n];x=op('Conv',[x,add(n+'_w',np.asarray(g['kernel:0']).transpose(3,2,0,1)),add(n+'_b',np.asarray(g['bias:0']))],n);x=op('Elu',[x],n+'_elu',alpha=1.)
 if i<3:x=op('MaxPool',[x],n+'_pool',kernel_shape=[2,2],strides=[2,2])
x=op('Transpose',[x],'nhwc',perm=[0,2,3,1]);x=op('Reshape',[x,add('shape',np.array([-1,160],dtype='int64'))],'flat');g=f['dense_1']['dense_1'];x=op('MatMul',[x,add('dw',np.asarray(g['kernel:0']))],'dense');x=op('Add',[x,add('db',np.asarray(g['bias:0']))],'logits');op('Sigmoid',[x],'textness')
g=H.make_graph(nodes,'Visions text components',[H.make_tensor_value_info('pixels',T.FLOAT,['batch',24,24,3])],[H.make_tensor_value_info('textness',T.FLOAT,['batch',1])],weights);m=H.make_model(g,opset_imports=[H.make_opsetid('',13)],ir_version=8);onnx.checker.check_model(m);onnx.save(m,Path(__file__).with_name('models')/'visions/text-detector.onnx')
