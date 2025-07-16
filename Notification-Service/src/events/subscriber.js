// events/subscriber.js
import amqplib from 'amqplib';
import NotificationService from '../services/notificationService.js'; // your logic here
import { generateOtpTemplate } from '../utils/generateOtpTemplate.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export async function startConsumer() {
    const connection = await amqplib.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'notification_queue';

    await channel.assertQueue(queue, { durable: true });

    console.log(`✅ Notification Service listening on [${queue}]`);

    channel.consume(queue, async (msg) => {

        if (msg !== null) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            const data = JSON.parse(msg.content.toString());
            console.log("DATA RECEIVED AT QUUEUE");
            const { email, otp, type } = data;
            const replyTo = msg.properties.replyTo;
            const correlationId = msg.properties.correlationId;

            console.log("📥 Received event:", data);

            let responsePayload = {};

            try {
                if (type === 'send_otp') {

                    await NotificationService.sendEmail(email, generateOtpTemplate(email, otp));
                    responsePayload = { success: true };
                } else {
                    throw new Error("Unknown event type: " + type);
                }
            } catch (err) {
                console.error("❌ Error sending email:", err.message);
                responsePayload = {
                    success: false,
                    error: err.message,
                };
            }

            // Send back response to replyTo queue
            if (replyTo && correlationId) {

                channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(responsePayload)), {
                    correlationId,
                });
            }

            channel.ack(msg);
        }
    });
}
