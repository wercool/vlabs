import os
import tensorflow as tf
import numpy as np
from valterikdb import ValterIKDB

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# from tensorflow.examples.tutorials.mnist import input_data
# mnist = input_data.read_data_sets('/tmp/tensorflow/mnist/input_data', one_hot=True)
# x  = mnist.test.images
# y_ = mnist.test.labels
# print y_
# quit()





valterIKDB = ValterIKDB('')
valterIKDB.dbConnect()
valterIKDB.retrieveBounds()
valterIKDB.printBounds()
quit()




valterIKDB = ValterIKDB('')
valterIKDB.dbConnect()


#valterIKDB.getBounds()
eefXMin = -7.510000
eefXMax = 12.743000
eefYMin = -8.292000
eefYMax = 12.649000
eefZMin = 7.101000
eefZMax = 20.797000
valterIKDB.setBounds((eefXMin, eefXMax, eefYMin, eefYMax, eefZMin, eefZMax))
valterIKDB.printBounds()


# Create the model
x = tf.placeholder(tf.float32, [None, 3])
W = tf.Variable(tf.zeros([3, 6]))
b = tf.Variable(tf.zeros([6]))
y = tf.matmul(x, W) + b

# Define loss and optimizer
y_ = tf.placeholder(tf.float32, [None, 6])

# The raw formulation of cross-entropy,
#
#   tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(tf.nn.softmax(y)), reduction_indices=[1]))
#
# can be numerically unstable.
#
# So here we use tf.nn.softmax_cross_entropy_with_logits on the raw
# outputs of 'y', and then average across the batch.
cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(labels=y_, logits=y))

train_step = tf.train.GradientDescentOptimizer(0.001).minimize(cross_entropy)

sess = tf.InteractiveSession()
tf.global_variables_initializer().run()

trainStepCnt = 0

# Train
for step in range(10000000):
    batchSize = 1000
    normalizedBatch = valterIKDB.getBatch(batchSize)

    batch_xs = np.zeros(shape=(batchSize, 3))
    batch_ys = np.zeros(shape=(batchSize, 6))
    batchId = 0
    for batch in normalizedBatch:
        batch_xs[batchId] = [batch[1], batch[2], batch[3]]
        batch_ys[batchId] = [batch[4], batch[5], batch[6], batch[7], batch[8], batch[9]]
        batchId = batchId + 1

    sess.run(train_step, feed_dict={x: batch_xs, y_: batch_ys})
    # print("Step %d" % step)
    trainStepCnt = trainStepCnt + 1
    if (trainStepCnt > 1000):
        trainStepCnt = 0
        # Test trained model
        batchSize = 250
        normalizedTestBatch = valterIKDB.getBatch(batchSize)
        testBatch_xs = np.zeros(shape=(batchSize, 3))
        testBatch_ys = np.zeros(shape=(batchSize, 6))
        testBatchId = 0
        for testBatch in normalizedTestBatch:
            testBatch_xs[testBatchId] = [testBatch[1], testBatch[2], testBatch[3]]
            testBatch_ys[testBatchId] = [testBatch[4], testBatch[5], testBatch[6], testBatch[7], testBatch[8], testBatch[9]]
            testBatchId = testBatchId + 1

        correct_prediction = tf.equal(tf.argmax(y, 1), tf.argmax(y_, 1))
        accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))
        print("Accuracy: %f" % (sess.run(accuracy, feed_dict={x: testBatch_xs, y_: testBatch_ys})))

