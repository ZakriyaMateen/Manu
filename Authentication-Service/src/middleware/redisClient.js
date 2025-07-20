// import Redis from 'ioredis';
// const redis = new Redis(); // defaults to localhost:6379



// export async function isBlacklisted(refreshToken) {
//     const result = await redis.get(`bl:${refreshToken}`);
//     return result === 'true';
// }

// export default redis;
import Redis from 'ioredis';

// use the URL from env (or fallback to localhost for local dev)
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', e => console.error('❌ Redis error', e));

export async function isBlacklisted(refreshToken) {
    const result = await redis.get(`bl:${refreshToken}`);
    return result === 'true';
}

export default redis;
