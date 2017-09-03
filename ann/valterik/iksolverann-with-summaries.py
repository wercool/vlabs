import os
import tensorflow as tf
import numpy as np
from valterikdb import ValterIKDB
from random import shuffle

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

valterIKDB = ValterIKDB('')
valterIKDB.dbConnect()
# valterIKDB.retrieveBounds()
# valterIKDB.printBounds()


# print valterIKDB.getNormalizedInput(1000)
# quit()

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

n_joints = 5
batch_size = 100

X = tf.placeholder(tf.float32, [None, 3])
Y = tf.placeholder(tf.float32, [None, 5])

test_batch_xs = np.zeros(shape=(len(testIKSpace), 3))
test_batch_ys = np.zeros(shape=(len(testIKSpace), 5))

for batch_test_sample_idx in range(len(testIKSpace)):
    test_batch_xs[batch_test_sample_idx] = [testIKSpace[batch_test_sample_idx][1], 
                                            testIKSpace[batch_test_sample_idx][2], 
                                            testIKSpace[batch_test_sample_idx][3]]

    test_batch_ys[batch_test_sample_idx] = [testIKSpace[batch_test_sample_idx][4], 
                                            testIKSpace[batch_test_sample_idx][5], 
                                            testIKSpace[batch_test_sample_idx][6],
                                            testIKSpace[batch_test_sample_idx][7],
                                            testIKSpace[batch_test_sample_idx][8]]

hl1_w = tf.Variable(tf.random_normal([3, n_node_hl1]))
hl1_b = tf.Variable(tf.random_normal([n_node_hl1]))

hl2_w = tf.Variable(tf.random_normal([n_node_hl1, n_node_hl2]))
hl2_b = tf.Variable(tf.random_normal([n_node_hl2]))

hl3_w = tf.Variable(tf.random_normal([n_node_hl2, n_node_hl3]))
hl3_b = tf.Variable(tf.random_normal([n_node_hl3]))

outl_w = tf.Variable(tf.random_normal([n_node_hl2, n_joints]))
outl_b = tf.Variable(tf.random_normal([n_joints]))

# Add ops to save and restore all the variables.
saver = tf.train.Saver()

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
    l1 = tf.nn.sigmoid(l1)

    l2 = tf.add(tf.matmul(l1, hidden_layer_2['weights']), hidden_layer_2['biases'])
    l2 = tf.nn.sigmoid(l2)

    # l3 = tf.add(tf.matmul(l2, hidden_layer_3['weights']), hidden_layer_3['biases'])
    # l3 = tf.nn.relu(l3)

    output = tf.matmul(l2, output_layer['weights']) + output_layer['biases']

    return output

def train_neural_network(X):
    learning_rate = 0.01
    epochs = 1000

    prediction = neural_network_model(X)

    # Define loss and optimizer

    # https://github.com/tensorflow/tensorflow/issues/4074
    cost = tf.reduce_mean(tf.squared_difference(prediction, Y))
    optimizer = tf.train.AdamOptimizer(learning_rate=learning_rate).minimize(cost)
    # optimizer = tf.train.GradientDescentOptimizer(learning_rate).minimize(cost)

    # https://github.com/aymericdamien/TensorFlow-Examples/blob/master/examples/3_NeuralNetworks/autoencoder.py
    # cost = tf.reduce_mean(tf.pow(Y - prediction, 2))
    # optimizer = tf.train.RMSPropOptimizer(learning_rate).minimize(cost)
    # optimizer = tf.train.GradientDescentOptimizer(learning_rate).minimize(cost)

    saver_cnt = 0

    with tf.Session() as sess:
        # Restore variables from disk.
        try:
            saver.restore(sess, "valteriksolver.ckpt")
            print("Model restored")
        except Exception as e:
            print "No model to restore"

        train_writer = tf.summary.FileWriter('./iksolver-summaries', sess.graph)
        tf.summary.scalar('cost', cost)
        merged = tf.summary.merge_all()

        sess.run(tf.global_variables_initializer())

        for epoch in range(epochs):
            shuffle(trainIKSpace)
            epoch_loss = 0
            train_sample_idx = 0
            for _ in range(int(len(trainIKSpace) / batch_size)):
                # prepare training samples batch
                batch_xs = np.zeros(shape=(batch_size, 3))
                batch_ys = np.zeros(shape=(batch_size, 5))

                for batch_sample_idx in range(batch_size):
                    batch_xs[batch_sample_idx] = [trainIKSpace[train_sample_idx][1], 
                                                  trainIKSpace[train_sample_idx][2], 
                                                  trainIKSpace[train_sample_idx][3]]

                    batch_ys[batch_sample_idx] = [trainIKSpace[train_sample_idx][4], 
                                                  trainIKSpace[train_sample_idx][5], 
                                                  trainIKSpace[train_sample_idx][6],
                                                  trainIKSpace[train_sample_idx][7],
                                                  trainIKSpace[train_sample_idx][8]]
                    train_sample_idx = train_sample_idx + 1
                _, c, cost_value = sess.run([optimizer, cost, merged], feed_dict={X: batch_xs, Y: batch_ys})
                epoch_loss += c
                train_writer.add_summary(cost_value, epoch)

            correct_prediction = tf.equal(tf.argmax(prediction, 1), tf.argmax(Y, 1))
            accuracy_model = tf.reduce_mean(tf.cast(correct_prediction, 'float'))
            accuracy = sess.run(accuracy_model, feed_dict={X: test_batch_xs, Y: test_batch_ys})
            print("Epoch %d of %d, Loss: %f, Accuracy: %f" % (epoch + 1, epochs, epoch_loss, accuracy))

            # saver_cnt += 1
            # if (saver_cnt > 100):
            #     save_path = saver.save(sess, "valteriksolver.ckpt");
            #     saver_cnt = 0
            #     print("Model saved");

            test_xs = np.zeros(shape=(1, 3))
            # SELECT CONCAT(eefX, ', ', eefY, ', ', eefZ) as eef, bodyYaw, bodyTilt, rightLimb, rightForearm, rightShoulder FROM rightArm WHERE id = 2000;
            test_xs[0] = [-0.276, 4.210, 10.874] 
            result = sess.run(prediction, feed_dict={X: test_xs})

            print "[[ %.8f %.8f %.8f %.8f %.8f ]]" % (1.090, 0.000, -0.180, 0.397, 0.000)
            print result
            print "\n"

            # if (satisfaction > 5) or (epoch > 995):
            if (accuracy > 0.92):
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

                train_writer.close()

                print "Satisfaction"
                break

train_neural_network(X)