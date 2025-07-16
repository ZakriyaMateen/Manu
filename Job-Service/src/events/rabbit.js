// events/rabbit.js
import amqp from 'amqplib';

let connection, channel;
export async function getChannel() {
    if (channel) return channel;
    connection = await amqp.connect(process.env.RABBIT_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    return channel;
}
