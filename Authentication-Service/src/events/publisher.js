import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let connection, channel;
const responseHandlers = new Map(); // 🧠 correlationId => resolve()

export async function initPublisher() {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('authentication_queue', { durable: true });

    // ✅ Consume once!
    await channel.consume('authentication_queue', (msg) => {
        const correlationId = msg.properties.correlationId;
        const resolve = responseHandlers.get(correlationId);

        if (resolve) {
            const data = JSON.parse(msg.content.toString());
            resolve(data);
            responseHandlers.delete(correlationId); // cleanup
        }
    }, { noAck: true });

    console.log("✅ Publisher connected");
}

export async function publishEventWithResponse(queueName, messagePayload) {
    return new Promise((resolve, reject) => {
        const correlationId = uuidv4();

        responseHandlers.set(correlationId, resolve); // store resolver

        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(messagePayload)), {
            correlationId,
            replyTo: 'authentication_queue',
            // amq.rabbitmq.reply - to
        });

        // ⏳ Optional timeout safeguard:
        // setTimeout(() => {
        //     if (responseHandlers.has(correlationId)) {
        //         responseHandlers.delete(correlationId);
        //         reject(new Error("Timeout waiting for response from notification service."));
        //     }
        // }, 5000);
    });
}
