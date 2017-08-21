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

testIKSpace_idxs = range(len(testIKSpace))

n_node_hl1 = 500
n_node_hl2 = 500
n_node_hl3 = 500

n_joints = 6
batch_size = 100

X = tf.placeholder(tf.float32, [None, 3])
Y = tf.placeholder(tf.float32, [None, 6])

def neural_network_model(data):
    hidden_layer_1 = {'weights': tf.Variable(tf.random_normal([3, n_node_hl1])),
                      'biases':  tf.Variable(tf.random_normal([n_node_hl1]))}
    hidden_layer_2 = {'weights': tf.Variable(tf.random_normal([n_node_hl1, n_node_hl2])),
                      'biases':  tf.Variable(tf.random_normal([n_node_hl2]))}
    hidden_layer_3 = {'weights': tf.Variable(tf.random_normal([n_node_hl2, n_node_hl3])),
                      'biases':  tf.Variable(tf.random_normal([n_node_hl3]))}
    output_layer   = {'weights': tf.Variable(tf.random_normal([n_node_hl3, n_joints])),
                      'biases':  tf.Variable(tf.random_normal([n_joints]))}

    l1 = tf.add(tf.matmul(data, hidden_layer_1['weights']), hidden_layer_1['biases'])
    l1 = tf.nn.relu(l1)

    l2 = tf.add(tf.matmul(l1, hidden_layer_2['weights']), hidden_layer_2['biases'])
    l2 = tf.nn.relu(l2)

    l3 = tf.add(tf.matmul(l2, hidden_layer_3['weights']), hidden_layer_3['biases'])
    l3 = tf.nn.relu(l3)

    output = tf.matmul(l3, output_layer['weights']) + output_layer['biases']

    return output

def train_neural_network(X):
    learning_rate = 0.01
    epochs =  10000
    train_sample_idx = 0

    prediction = neural_network_model(X)

    # Define loss and optimizer
    # cost = tf.reduce_mean(tf.nn.sigmoid_cross_entropy_with_logits(logits=prediction, labels=Y))
    # optimizer = tf.train.AdamOptimizer().minimize(cost)
    cost = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=prediction, labels=Y))
    optimizer = tf.train.AdamOptimizer(learning_rate=learning_rate).minimize(cost)

    with tf.Session() as sess:
        sess.run(tf.global_variables_initializer())
        for epoch in range(epochs):
            epoch_loss = 0
            # prepare training samples batch
            batch_xs = np.zeros(shape=(batch_size, 3))
            batch_ys = np.zeros(shape=(batch_size, 6))
            try:
                for batch_sample_idx in range(batch_size):
                    batch_xs[batch_sample_idx] = [trainIKSpace[train_sample_idx][1], 
                                                  trainIKSpace[train_sample_idx][2], 
                                                  trainIKSpace[train_sample_idx][3]]

                    batch_ys[batch_sample_idx] = [trainIKSpace[train_sample_idx][4], 
                                                  trainIKSpace[train_sample_idx][5], 
                                                  trainIKSpace[train_sample_idx][6],
                                                  trainIKSpace[train_sample_idx][7],
                                                  trainIKSpace[train_sample_idx][8],
                                                  trainIKSpace[train_sample_idx][9]]
                    train_sample_idx = train_sample_idx + 1
                _, c = sess.run([optimizer, cost], feed_dict = {X: batch_xs, Y: batch_ys})
                epoch_loss += c
                print ("Epoch %d completed out of %d, loss: %f" % (epoch, epochs, epoch_loss))
            except IndexError:
                print "Requested training sample is our of range in training IK space"
                break

        # prepare test samples batch
        shuffle(testIKSpace_idxs)
        test_batch_xs = np.zeros(shape=(batch_size, 3))
        test_batch_ys = np.zeros(shape=(batch_size, 6))
        for batch_test_sample_idx in range(batch_size):
            test_batch_xs[batch_test_sample_idx] = [testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][1], 
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][2], 
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][3]]

            test_batch_ys[batch_test_sample_idx] = [testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][4], 
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][5], 
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][6],
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][7],
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][8],
                                                    testIKSpace[testIKSpace_idxs[batch_test_sample_idx]][9]]

        correct_prediction = tf.equal(tf.argmax(prediction, 1), tf.argmax(Y, 1))
        accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))
        print("Accuracy: %f" % (sess.run(accuracy, feed_dict={X: test_batch_xs, Y: test_batch_ys})))

train_neural_network(X)