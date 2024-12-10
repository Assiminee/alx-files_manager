import dbClient from '../utils/db';

describe('dB Client', () => {
  it('should return true for isAlive', () => {
    expect.assertions(1);
    expect(dbClient.isAlive()).toBe(true);
  });

  it('should return number of users', async () => {
    expect.assertions(1);
    const users = await dbClient.nbUsers();
    expect(typeof users).toBe('number');
  });

  it('should return number of files', async () => {
    expect.assertions(1);
    const files = await dbClient.nbFiles();
    expect(typeof files).toBe('number');
  });
});
