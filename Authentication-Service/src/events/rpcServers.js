// src/events/rpcServer.js
import { getChannel } from './rabbit.js';

/**
 * Listen on a single queue and dispatch by `action` field.
 *
 * @param {string} queueName
 * @param {{ [action: string]: (data: any) => Promise<any> }} actionHandlers
 */
export async function startRpcServer(queueName, actionHandlers) {
    const ch = await getChannel();
    await ch.assertQueue(queueName, { durable: false });
    ch.prefetch(1);
    console.log(`[RPC] Listening on queue '${queueName}'`);

    ch.consume(
        queueName,
        async (msg) => {
            if (!msg) return;
            let payload;
            try { payload = JSON.parse(msg.content.toString()); }
            catch (err) {
                console.error('[RPC] Invalid JSON payload:', err);
                return ch.ack(msg);
            }

            const { action, data } = payload;
            const handler = actionHandlers[action];
            if (!handler) {
                console.error(`[RPC] No handler for action '${action}'`);
                ch.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(
                        JSON.stringify({ ok: false, error: `Unknown action: ${action}` })
                    ),
                    { correlationId: msg.properties.correlationId }
                );
                ch.ack(msg);
                return;
            }

            try {
                const result = await handler(data);
                ch.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify({ ok: true, data: result })),
                    { correlationId: msg.properties.correlationId }
                );
            } catch (err) {
                console.error(`[RPC] Error in handler '${action}':`, err);
                ch.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify({ ok: false, error: err.message })),
                    { correlationId: msg.properties.correlationId }
                );
            }

            ch.ack(msg);
        },
        { noAck: false }
    );
}
