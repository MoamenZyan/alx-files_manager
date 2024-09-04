import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    try {
      const cachedb = redisClient.isAlive();
      const db = dbClient.isAlive();
      res.status(200).send({ cachedb, db });
    } catch (error) {
      console.log(error);
    }
  }

  static async getStats(req, res) {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();
      res.status(200).send({ users, files });
    } catch (error) {
      console.log(error);
    }
  }
}

export default AppController;
