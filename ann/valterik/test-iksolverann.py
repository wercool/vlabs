import os
import tensorflow as tf
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

n_node_hl1 = 30
n_node_hl2 = 30
n_node_hl3 = 30

n_joints = 5
batch_size = 100

X = tf.placeholder(tf.float32, [None, 3])
Y = tf.placeholder(tf.float32, [None, 5])


hl1_w_ = np.loadtxt('./iksolver_ann_params/hl1_w.txt', delimiter=',')
hl1_w  = tf.convert_to_tensor(hl1_w_, np.float32)
hl1_b_ = np.loadtxt('./iksolver_ann_params/hl1_b.txt', delimiter=',')
hl1_b  = tf.convert_to_tensor(hl1_b_, np.float32)

hl2_w_ = np.loadtxt('./iksolver_ann_params/hl2_w.txt', delimiter=',')
hl2_w  = tf.convert_to_tensor(hl2_w_, np.float32)
hl2_b_ = np.loadtxt('./iksolver_ann_params/hl2_b.txt', delimiter=',')
hl2_b  = tf.convert_to_tensor(hl2_b_, np.float32)

outl_w_ = np.loadtxt('./iksolver_ann_params/outl_w.txt', delimiter=',')
outl_w  = tf.convert_to_tensor(outl_w_, np.float32)
outl_b_ = np.loadtxt('./iksolver_ann_params/outl_b.txt', delimiter=',')
outl_b  = tf.convert_to_tensor(outl_b_, np.float32)

def neural_network_model(data):
    # hl1->hl2->outl

    hidden_layer_1 = {'weights': hl1_w,  'biases':  hl1_b}
    hidden_layer_2 = {'weights': hl2_w,  'biases':  hl2_b}
    output_layer   = {'weights': outl_w, 'biases':  outl_b}

    l1 = tf.matmul(data, hidden_layer_1['weights']) + hidden_layer_1['biases']
    l1 = tf.nn.sigmoid(l1)

    l2 = tf.matmul(l1, hidden_layer_2['weights']) + hidden_layer_2['biases']
    l2 = tf.nn.sigmoid(l2)

    output = tf.matmul(l2, output_layer['weights']) + output_layer['biases']

    return output, l2

prediction = neural_network_model(X)

sess = tf.Session()
sess.run(tf.global_variables_initializer())
test_xs = np.zeros(shape=(1, 3))
# SELECT CONCAT(eefX, ', ', eefY, ', ', eefZ) as eef, bodyYaw, bodyTilt, rightLimb, rightForearm, rightShoulder FROM rightArm WHERE id = 2000;
test_xs[0] = [-0.276, 4.210, 10.874]
result, l2 = sess.run(prediction, feed_dict={X: test_xs})
print result
# print l2