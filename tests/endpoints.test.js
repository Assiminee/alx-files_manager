import request from 'supertest';
import { expect } from 'chai';
import app from '../server';

describe('aPI Endpoints', () => {
  it('should return status of Redis and DB', async () => {
    expect.assertions(3);
    const res = await request(app).get('/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('db');
  });

  it('should return stats of users and files', async () => {
    expect.assertions(3);
    const res = await request(app).get('/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('files');
  });
});
