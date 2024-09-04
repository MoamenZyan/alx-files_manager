import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
    // Post Method
  static async postNew (req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      res.status(400).json({ error: 'Missing password' });
    }

    const hash = sha1(password);

    try {
      const collection = dbClient.db.collection('users');
      const user = await collection.findOne({ email });

      if (user) {
        res.status(400).json({ error: 'Already exist' });
      } else {
        collection.insertOne({ email, password: hash });
        const newUser = await collection.findOne(
          { email }, { projection: { email: 1 } }
        );
        res.status(201).json({ id: newUser._id, email: newUser.email });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // GET Method
  static async getMe (req, res) {
    try {
      const token = req.header('X-Token');
      const key = `auth_${token}`;

      const userId = await redisClient.get(key);
      console.log('USER KEY GET ME', userId);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await dbClient.getUser({ _id: ObjectId(userId) });

      res.json({ id: user._id, email: user.email });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
