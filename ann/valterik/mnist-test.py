import os
import tensorflow as tf
from tensorflow.examples.tutorials.mnist import input_data

mnist = input_data.read_data_sets('/tmp/tensorflow/mnist/input_data', one_hot=True)

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

n_node_hl1 = 500
n_node_hl2 = 500
n_node_hl3 = 500

n_classes = 10
batch_size = 100

X = tf.placeholder(tf.float32, [None, 784])
Y = tf.placeholder(tf.float32, [None, 10])

output_layer_w = tf.Variable(tf.random_normal([n_node_hl3, n_classes]), name='output_layer_w')
output_layer_b = tf.Variable(tf.random_normal([n_classes]))

#https://pythonprogramming.net/community/262/TensorFlow%20For%20loop%20to%20set%20weights%20and%20biases/
def neural_network_model(data):
    hidden_layer_1 = {'weights': tf.Variable(tf.random_normal([784, n_node_hl1])),
                      'biases':  tf.Variable(tf.random_normal([n_node_hl1]))}
    hidden_layer_2 = {'weights': tf.Variable(tf.random_normal([n_node_hl1, n_node_hl2])),
                      'biases':  tf.Variable(tf.random_normal([n_node_hl2]))}
    hidden_layer_3 = {'weights': tf.Variable(tf.random_normal([n_node_hl2, n_node_hl3])),
                      'biases':  tf.Variable(tf.random_normal([n_node_hl3]))}
    output_layer   = {'weights': output_layer_w,
                      'biases':  output_layer_b}

    l1 = tf.add(tf.matmul(data, hidden_layer_1['weights']), hidden_layer_1['biases'])
    l1 = tf.nn.relu(l1)

    l2 = tf.add(tf.matmul(l1, hidden_layer_2['weights']), hidden_layer_2['biases'])
    l2 = tf.nn.relu(l2)

    l3 = tf.add(tf.matmul(l2, hidden_layer_3['weights']), hidden_layer_3['biases'])
    l3 = tf.nn.relu(l3)

    output = tf.matmul(l3, output_layer['weights']) + output_layer['biases']

    return output

def train_neural_network(X):
    learning_rate = 0.001
    epochs = 1

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
            for _ in range(int(mnist.train.num_examples / batch_size)):
                # prepare training samples batch
                batch_xs, batch_ys = mnist.train.next_batch(batch_size)
                _, c = sess.run([optimizer, cost], feed_dict = {X: batch_xs, Y: batch_ys})
                epoch_loss += c
            print ("Epoch %d completed out of %d, loss: %f" % (epoch, epochs, epoch_loss))


            correct_prediction = tf.equal(tf.argmax(prediction, 1), tf.argmax(Y, 1))
            accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))
            print("Accuracy: %f" % (sess.run(accuracy, feed_dict={X: mnist.test.images, Y: mnist.test.labels})))

        # sess.run(output_layer_w)
        weights = output_layer_w.eval()
        biases  = output_layer_b.eval()
        print biases

train_neural_network(X)