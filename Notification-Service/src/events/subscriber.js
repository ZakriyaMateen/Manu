// // events/subscriber.js
// import amqplib from 'amqplib';
// import NotificationService from '../services/notificationService.js'; // your logic here
// import { generateOtpTemplate } from '../utils/generateOtpTemplate.js';

// const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// export async function startConsumer() {
//     const connection = await amqplib.connect(RABBITMQ_URL);
//     const channel = await connection.createChannel();
//     const queue = 'notification_queue';

//     await channel.assertQueue(queue, { durable: true });

//     console.log(`✅ Notification Service listening on [${queue}]`);

//     channel.consume(queue, async (msg) => {

//         if (msg !== null) {
//             await new Promise((resolve) => setTimeout(resolve, 5000));
//             const data = JSON.parse(msg.content.toString());
//             console.log("DATA RECEIVED AT QUUEUE");
//             const { email, otp, type } = data;
//             const replyTo = msg.properties.replyTo;
//             const correlationId = msg.properties.correlationId;

//             console.log("📥 Received event:", data);

//             let responsePayload = {};

//             try {
//                 if (type === 'send_otp') {

//                     await NotificationService.sendEmail(email, generateOtpTemplate(email, otp));
//                     responsePayload = { success: true };
//                 } else {
//                     throw new Error("Unknown event type: " + type);
//                 }
//             } catch (err) {
//                 console.error("❌ Error sending email:", err.message);
//                 responsePayload = {
//                     success: false,
//                     error: err.message,
//                 };
//             }

//             // Send back response to replyTo queue
//             if (replyTo && correlationId) {

//                 channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(responsePayload)), {
//                     correlationId,
//                 });
//             }

//             channel.ack(msg);
//         }
//     });
// }

// events/subscriber.js
import amqplib from 'amqplib';
import NotificationService from '../services/notificationService.js';
import { generateOtpTemplate } from '../utils/generateOtpTemplate.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'notification_queue';
const RETRY_DELAY = 5000; // ms

export async function startConsumer() {
    let connection;
    let channel;

    // 1) Retry loop for connection + channel
    while (!channel) {
        try {
            connection = await amqplib.connect(RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });
            console.log(`✅ Connected to RabbitMQ and asserted queue "${QUEUE_NAME}"`);
        } catch (err) {
            console.error(
                `🐇 RabbitMQ not ready at ${RABBITMQ_URL}, retrying in ${RETRY_DELAY}ms…`,
                err.message
            );
            // wait then retry
            await new Promise((res) => setTimeout(res, RETRY_DELAY));
        }
    }

    // 2) Start consuming
    channel.consume(
        QUEUE_NAME,
        async (msg) => {
            if (!msg) return;

            // simulate work
            await new Promise((r) => setTimeout(r, 5000));

            const data = JSON.parse(msg.content.toString());
            console.log('📥 Received event:', data);

            const { email, otp, type } = data;
            const { replyTo, correlationId } = msg.properties;
            let responsePayload;

            try {
                if (type === 'send_otp') {
                    await NotificationService.sendEmail(
                        email,
                        generateOtpTemplate(email, otp)
                    );
                    responsePayload = { success: true };
                } else {
                    throw new Error('Unknown event type: ' + type);
                }
            } catch (err) {
                console.error('❌ Error sending email:', err.message);
                responsePayload = { success: false, error: err.message };
            }

            // send back RPC‐style response
            if (replyTo && correlationId) {
                channel.sendToQueue(
                    replyTo,
                    Buffer.from(JSON.stringify(responsePayload)),
                    { correlationId }
                );
            }

            channel.ack(msg);
        },
        { noAck: false }
    );

    console.log(`🎧 Waiting for messages on "${QUEUE_NAME}"…`);
}
