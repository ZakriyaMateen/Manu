import { getChannel } from './rabbit.js';
import { v4 as uuid } from 'uuid';

/**
 * Perform an RPC call over RabbitMQ to a generic queue and action
 * @param {string} queueName - The name of the RPC queue to send to
 * @param {string} action - The action name for dispatching in the server
 * @param {object} data - The payload data for the RPC call
 * @param {number} [timeout=5000] - Timeout in milliseconds
 * @returns {Promise<any>} - Resolves with the parsed response payload
 */
export async function rpcCall(queueName, action, data = {}, timeout = 5000) {
    const ch = await getChannel();
    const correlationId = uuid();
    const { queue: replyQueue } = await ch.assertQueue('', { exclusive: true });

    return new Promise((resolve, reject) => {
        // Timeout handler
        const timer = setTimeout(() => {
            reject(new Error(`RPC timeout after ${timeout}ms on queue ${queueName}`));
        }, timeout);

        // Consume the reply
        ch.consume(replyQueue, msg => {
            if (!msg) return;
            if (msg.properties.correlationId !== correlationId) return;
            clearTimeout(timer);

            let response;
            try {
                response = JSON.parse(msg.content.toString());
            } catch (err) {
                return reject(new Error('Invalid JSON in RPC response'));
            }

            // Cleanup: delete the temporary queue
            setTimeout(() => {
                ch.deleteQueue(replyQueue).catch(console.error);
            }, 100);

            if (response.ok) {
                return resolve(response.data);
            } else {
                return reject(new Error(response.error || 'RPC returned error'));
            }
        }, { noAck: true });

        // Send the RPC request with action and data
        const message = { action, data };
        ch.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(message)),
            { correlationId, replyTo: replyQueue }
        );
        console.log(`📤 Sent RPC request to '${queueName}' action='${action}'`);
    });
}

/**
 * Fetch a user via RPC
 * @param {string} userId
 * @returns {Promise<object>}
 */
export function fetchUser(userId) {
    // uses the generic 'rpc_requests' queue and 'rpc_get_user' action
    return rpcCall('rpc_requests', 'rpc_get_user', { userId });
}

/**
 * Fetch all users via RPC
 * @returns {Promise<object[]>}
 */
export function fetchAllUsers() {
    return rpcCall('rpc_requests', 'rpc_all_users');
}
