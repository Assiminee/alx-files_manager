import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) { return res.status(400).json({ error: 'Missing email' }); }

    if (!password) { return res.status(400).json({ error: 'Missing password' }); }

    try {
      const usersCollection = await dbClient.db.collection('users');
      const userExists = await usersCollection.findOne({ email });

      if (userExists) { return res.status(400).json({ error: 'Already exist' }); }

      const hashedPassword = sha1(password);
      const result = await usersCollection.insertOne({ email, password: hashedPassword });
      const newUser = {
        id: result.insertedId,
        email,
      };

      return res.status(201).json(newUser);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const usersCollection = await dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

export default UsersController;
