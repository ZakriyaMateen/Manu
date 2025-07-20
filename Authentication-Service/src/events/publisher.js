// import amqplib from 'amqplib';
// import { v4 as uuidv4 } from 'uuid';

// const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
// let connection, channel;
// const responseHandlers = new Map(); // 🧠 correlationId => resolve()

// export async function initPublisher() {
//     connection = await amqplib.connect(RABBITMQ_URL);
//     channel = await connection.createChannel();
//     await channel.assertQueue('authentication_queue', { durable: true });

//     // ✅ Consume once!
//     await channel.consume('authentication_queue', (msg) => {
//         const correlationId = msg.properties.correlationId;
//         const resolve = responseHandlers.get(correlationId);

//         if (resolve) {
//             const data = JSON.parse(msg.content.toString());
//             resolve(data);
//             responseHandlers.delete(correlationId); // cleanup
//         }
//     }, { noAck: true });

//     console.log("✅ Publisher connected");
// }

// export async function publishEventWithResponse(queueName, messagePayload) {
//     return new Promise((resolve, reject) => {
//         const correlationId = uuidv4();

//         responseHandlers.set(correlationId, resolve); // store resolver

//         channel.sendToQueue(queueName, Buffer.from(JSON.stringify(messagePayload)), {
//             correlationId,
//             replyTo: 'authentication_queue',

//         });
//     });
// }

import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let connection;
let channel;
let replyQueue;
const responseHandlers = new Map(); // correlationId -> { resolve, reject }

export async function initPublisher() {
    // 1) Connect (with simple retry)
    while (!connection) {
        try {
            connection = await amqplib.connect(RABBITMQ_URL);
        } catch (err) {
            console.error('❌ RabbitMQ connect failed, retrying in 5s', err.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // 2) Create channel
    channel = await connection.createChannel();

    // 3) Ensure the main queue exists (durable)
    await channel.assertQueue('authentication_queue', { durable: true });

    // 4) Create a *private* reply queue
    const { queue } = await channel.assertQueue('', { exclusive: true });
    replyQueue = queue;

    // 5) Start consuming *only* from the reply queue
    await channel.consume(
        replyQueue,
        (msg) => {
            if (!msg) return;
            const { correlationId } = msg.properties;
            const handler = responseHandlers.get(correlationId);
            if (handler) {
                let payload;
                try {
                    payload = JSON.parse(msg.content.toString());
                } catch (e) {
                    return handler.reject(e);
                }
                handler.resolve(payload);
                responseHandlers.delete(correlationId);
            }
        },
        { noAck: true }
    );

    console.log('✅ RabbitMQ publisher initialized');
}

export async function publishEventWithResponse(queueName, messagePayload, timeout = 10000) {
    if (!channel || !replyQueue) {
        throw new Error('RabbitMQ not initialized; call initPublisher() first');
    }

    const correlationId = uuidv4();

    return new Promise((resolve, reject) => {
        // Track this request
        responseHandlers.set(correlationId, { resolve, reject });

        // Send the message
        channel.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(messagePayload)),
            {
                correlationId,
                replyTo: replyQueue,
                persistent: true,
            }
        );

        // Enforce a timeout so we don't leak memory
        setTimeout(() => {
            if (responseHandlers.has(correlationId)) {
                responseHandlers.get(correlationId).reject(new Error('RPC timeout'));
                responseHandlers.delete(correlationId);
            }
        }, timeout);
    });
}
