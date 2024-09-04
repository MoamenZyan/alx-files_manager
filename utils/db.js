import { MongoClient } from 'mongodb';

const db = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 27017}/`;

class DBClient {
  constructor() {
    this.db = null;
    MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
      if (error) console.log(error);
      this.db = client.db(db);
      this.db.createCollection('users');
      this.db.createCollection('files');
    });
  }

  // check connection
  isAlive() {
    return !!this.db;
  }

  // count users
  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  // get User
  async getUser(query) {
    console.log('QUERY IN DB.JS', query);
    const user = await this.db.collection('users').findOne(query);
    console.log('GET USER IN DB.JS', user);
    return user;
  }

  // count files
  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
