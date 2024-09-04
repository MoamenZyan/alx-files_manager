import sha1 from 'sha1';
import dbClient from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect (req, res) {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const auth = Buffer.from(authorizationHeader.split(' ')[1], 'base64').toString().split(':');
      const email = auth[0];
      const unHashedPassword = sha1(auth[1]);

      const user = await dbClient.getUser({ email });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
      }

      if (unHashedPassword !== user.password) {
        res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      const duration = (60 * 60 * 24);
      await redisClient.set(key, user._id.toString(), duration);

      res.status(200).json({ token });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect (req, res) {
    try {
      const token = req.header('X-Token');
      const key = await redisClient.get(`auth_${token}`);
      if (!key) {
        res.status(401).json({ error: 'Unauthorized' });
      }
      await redisClient.del(`auth_${token}`);
      res.status(204).send('Disconnected');
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

export default AuthController;
