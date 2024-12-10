import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.log(err.message);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const GET = promisify(this.client.get).bind(this.client);
    return GET(key);
  }

  async set(key, value, duration) {
    const SET = promisify(this.client.set).bind(this.client);
    return SET(key, value, 'EX', duration);
  }

  async del(key) {
    const DEL = promisify(this.client.del).bind(this.client);
    return DEL(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
