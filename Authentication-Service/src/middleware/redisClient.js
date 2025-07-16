import Redis from 'ioredis';
const redis = new Redis(); // defaults to localhost:6379



export async function isBlacklisted(refreshToken) {
    const result = await redis.get(`bl:${refreshToken}`);
    return result === 'true';
}

export default redis;
