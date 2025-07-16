// // events/rabbit.js
// import amqp from 'amqplib';

// let connection, channel;

// export async function getChannel() {
//     if (channel) return channel;

//     const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
//     let retries = 5;

//     while (retries) {
//         try {
//             console.log(`🔁 Trying to connect to RabbitMQ at ${RABBIT_URL}...`);
//             connection = await amqp.connect(RABBIT_URL);
//             channel = await connection.createChannel();
//             console.log('✅ Connected to RabbitMQ');
//             return channel;
//         } catch (err) {
//             console.log(`❌ RabbitMQ connection failed. Retrying in 5 seconds... (${retries} retries left)`);
//             retries--;
//             await new Promise(res => setTimeout(res, 5000));
//         }
//     }

//     throw new Error('❌ Could not connect to RabbitMQ after multiple retries.');
// }
// src/events/rabbit.js
import amqplib from 'amqplib';

let channel;

export async function getChannel() {
    if (channel) return channel;

    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5671';

    try {
        const conn = await amqplib.connect(RABBITMQ_URL);
        channel = await conn.createChannel();
        return channel;
    } catch (err) {
        console.error('❌ Failed to connect to RabbitMQ:', err);
        throw err;
    }
}
