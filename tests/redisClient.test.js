import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redis Client', () => {
  it('should return true for isAlive', () => {
    expect.assertions(1);
    expect(redisClient.isAlive()).toBe(true);
  });

  it('should set, get and delete a key', async () => {
    expect.assertions(3);
    await redisClient.set('testKey', 'testValue', 10);
    const value = await redisClient.get('testKey');
    expect(value).toBe('testValue');
    await redisClient.del('testKey');
    const deletedValue = await redisClient.get('testKey');
    expect(deletedValue).toBeNull();
  });
});
