import DBClient from './utils/db';

const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const userQueue = new Bull('userQueue');
const fileQueue = new Bull('fileQueue');
const Bull = require('bull');

const createThumbnail = async (path, options) => {
  try {
    const tn = await imageThumbnail(path, options);
    const pathNail = `${path}_${options.width}`;

    await fs.writeFileSync(pathNail, tn);
  } catch (error) {
    console.log(error);
  }
};

fileQueue.process(async (job) => {
  const { fileId } = job.data;
  if (!fileId) throw Error('Missing fileId');

  const { userId } = job.data;
  if (!userId) throw Error('Missing userId');

  const fileDocs = await DBClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!fileDocs) throw Error('File not found');

  createThumbnail(fileDocs.localPath, { width: 500 });
  createThumbnail(fileDocs.localPath, { width: 250 });
  createThumbnail(fileDocs.localPath, { width: 100 });
});

userQueue.process(async (job) => {
  const { userId } = job.data;
  if (!userId) throw Error('Missing userId');

  const userDocs = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
  if (!userDocs) throw Error('User not found');

  console.log(`Welcome ${userDocs.email}`);
});
