import os
import tensorflow as tf
import numpy as np
from valterikdb import ValterIKDB
from random import shuffle

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

valterIKDB = ValterIKDB('')
valterIKDB.dbConnect()
valterIKDB.retrieveBounds()
valterIKDB.printBounds()

# eefXMin = -7.510000
# eefXMax = 12.743000
# eefYMin = -8.292000
# eefYMax = 12.649000
# eefZMin = 7.101000
# eefZMax = 20.797000
# valterIKDB.setBounds((eefXMin, eefXMax, eefYMin, eefYMax, eefZMin, eefZMax))

fullIKSpace = valterIKDB.getFullIKSpace()
shuffle(fullIKSpace)

print "IK full space size: %d" % len(fullIKSpace)

trainIKSpace_end = int(len(fullIKSpace) * 0.8)
testIKSpace_start = int(len(fullIKSpace) * 0.8 + 1)

trainIKSpace = fullIKSpace[:trainIKSpace_end]
testIKSpace  = fullIKSpace[testIKSpace_start:]

fullIKSpace = None

print "IK train space size: %d" % len(trainIKSpace)
print "IK test space size: %d" % len(testIKSpace)

n_node_hl1 = 30
n_node_hl2 = 30
n_node_hl3 = 30

n_joints = 3
batch_size = 100

X = tf.placeholder(tf.float32, [None, 3])
Y = tf.placeholder(tf.float32, [None, 3])

test_batch_xs = np.zeros(shape=(len(testIKSpace), 3))
test_batch_ys = np.zeros(shape=(len(testIKSpace), 3))

for batch_test_sample_idx in range(len(testIKSpace)):
    test_batch_xs[batch_test_sample_idx] = [testIKSpace[batch_test_sample_idx][1], 
                                            testIKSpace[batch_test_sample_idx][2], 
                                            testIKSpace[batch_test_sample_idx][3]]

    test_batch_ys[batch_test_sample_idx] = [testIKSpace[batch_test_sample_idx][4], 
                                            testIKSpace[batch_test_sample_idx][5], 
                                            testIKSpace[batch_test_sample_idx][6]]
                                            # testIKSpace[batch_test_sample_idx][7],
                                            # testIKSpace[batch_test_sample_idx][8],
                                            # testIKSpace[batch_test_sample_idx][9]]

hl1_w = tf.Variable(tf.random_normal([3, n_node_hl1]))
hl1_b = tf.Variable(tf.random_normal([n_node_hl1]))

hl2_w = tf.Variable(tf.random_normal([n_node_hl1, n_node_hl2]))
hl2_b = tf.Variable(tf.random_normal([n_node_hl2]))

hl3_w = tf.Variable(tf.random_normal([n_node_hl2, n_node_hl3]))
hl3_b = tf.Variable(tf.random_normal([n_node_hl3]))

outl_w = tf.Variable(tf.random_normal([n_node_hl2, n_joints]))
outl_b = tf.Variable(tf.random_normal([n_joints]))

def neural_network_model(data):
    # hl1->hl2->outl

    hidden_layer_1 = {'weights': hl1_w,
                      'biases':  hl1_b}
    hidden_layer_2 = {'weights': hl2_w,
                      'biases':  hl2_b}
    # hidden_layer_3 = {'weights': hl3_w,
    #                   'biases':  hl3_b}
    output_layer   = {'weights': outl_w,
                      'biases':  outl_b}

    l1 = tf.add(tf.matmul(data, hidden_layer_1['weights']), hidden_layer_1['biases'])
    l1 = tf.nn.relu(l1)

    l2 = tf.add(tf.matmul(l1, hidden_layer_2['weights']), hidden_layer_2['biases'])
    l2 = tf.nn.relu(l2)

    # l3 = tf.add(tf.matmul(l2, hidden_layer_3['weights']), hidden_layer_3['biases'])
    # l3 = tf.nn.relu(l3)

    output = tf.matmul(l2, output_layer['weights']) + output_layer['biases']

    return output

def train_neural_network(X):
    learning_rate = 0.0005
    epochs = 10000

    prediction = neural_network_model(X)

    # Define loss and optimizer
    # https://github.com/tensorflow/tensorflow/issues/4074
    cost = tf.reduce_mean(tf.squared_difference(prediction, Y))
    optimizer = tf.train.AdamOptimizer(learning_rate=learning_rate).minimize(cost)

    satisfaction = 0

    with tf.Session() as sess:
        sess.run(tf.global_variables_initializer())
        for epoch in range(epochs):
            shuffle(trainIKSpace)
            epoch_loss = 0
            train_sample_idx = 0
            for _ in range(int(len(trainIKSpace) / batch_size)):
                # prepare training samples batch
                batch_xs = np.zeros(shape=(batch_size, 3))
                batch_ys = np.zeros(shape=(batch_size, 3))

                for batch_sample_idx in range(batch_size):
                    batch_xs[batch_sample_idx] = [trainIKSpace[train_sample_idx][1], 
                                                  trainIKSpace[train_sample_idx][2], 
                                                  trainIKSpace[train_sample_idx][3]]

                    batch_ys[batch_sample_idx] = [trainIKSpace[train_sample_idx][4], 
                                                  trainIKSpace[train_sample_idx][5], 
                                                  trainIKSpace[train_sample_idx][6]]
                                                  # trainIKSpace[train_sample_idx][7],
                                                  # trainIKSpace[train_sample_idx][8],
                                                  # trainIKSpace[train_sample_idx][9]]
                    train_sample_idx = train_sample_idx + 1
                _, c = sess.run([optimizer, cost], feed_dict={X: batch_xs, Y: batch_ys})
                epoch_loss += c

            correct_prediction = tf.equal(tf.argmax(prediction, 1), tf.argmax(Y, 1))
            accuracy_model = tf.reduce_mean(tf.cast(correct_prediction, 'float'))
            accuracy = sess.run(accuracy_model, feed_dict={X: test_batch_xs, Y: test_batch_ys})
            print("Epoch %d of %d, Loss: %f, Accuracy: %f" % (epoch + 1, epochs, epoch_loss, accuracy))

            if accuracy > 0.65:
                satisfaction += 1
            else:
                satisfaction = 0

            if (satisfaction > 1):
                hl1_w_  = hl1_w.eval()
                hl1_b_  = hl1_b.eval()
                hl2_w_  = hl2_w.eval()
                hl2_b_  = hl2_b.eval()
                outl_w_ = outl_w.eval()
                outl_b_ = outl_b.eval()

                # np.savetxt('./iksolver_ann_params/hl1_w.txt',  hl1_w_, delimiter=',')
                # np.savetxt('./iksolver_ann_params/hl1_b.txt',  hl1_b_, delimiter=',')
                # np.savetxt('./iksolver_ann_params/hl2_w.txt',  hl2_w_, delimiter=',')
                # np.savetxt('./iksolver_ann_params/hl2_b.txt',  hl2_b_, delimiter=',')
                # np.savetxt('./iksolver_ann_params/outl_w.txt', outl_w_, delimiter=',')
                # np.savetxt('./iksolver_ann_params/outl_b.txt', outl_b_, delimiter=',')

                print "Satisfaction"
                break

train_neural_network(X)