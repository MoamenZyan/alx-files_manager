import { ObjectId } from 'mongodb';
import Queue from 'bull';
import { mkdir, writeFile, readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { getIdAndKey, isValidUser } from '../utils/users';
import dbClient from '../utils/db';

class FilesController {
    // Post method
  static async postUpload (req, res) {
    const fileQ = new Queue('fileQ');
    const dir = process.env.FOLDER_PATH || '/tmp/files_manager';

    const { userId } = await getIdAndKey(req);
    if (!isValidUser(userId)) 
        return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });


    if (!user) 
        return res.status(401).send({ error: 'Unauthorized' });

    const fileName = req.body.name;

    if (!fileName) 
        return res.status(400).send({ error: 'Missing name' });

    const fileType = req.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return res.status(400).send({ error: 'Missing type' });

    const fileData = req.body.data;

    if (!fileData && fileType !== 'folder') 
        return res.status(400).send({ error: 'Missing data' });

    const publicFile = req.body.isPublic || false;
    let parentId = req.body.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;
    if (parentId !== 0) {
      const parentFile = await dbClient.files.findOne({ _id: ObjectId(parentId) });
    
      if (!parentFile) 
        return res.status(400).send({ error: 'Parent not found' });

      if (parentFile.type !== 'folder') 
        return res.status(400).send({ error: 'Parent is not a folder' });
    }

    const fileInsert = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: publicFile,
      parentId
    };

    if (fileType === 'folder') {
      await dbClient.files.insertOne(fileInsert);
      return res.status(201).send({
        id: fileInsert._id,
        userId: fileInsert.userId,
        name: fileInsert.name,
        type: fileInsert.type,
        isPublic: fileInsert.isPublic,
        parentId: fileInsert.parentId
      });
    }

    const fileUid = uuidv4();

    const decData = Buffer.from(fileData, 'base64');
    const filePath = `${dir}/${fileUid}`;

    mkdir(dir, { recursive: true }, (error) => {
      if (error) 
        return res.status(400).send({ error: error.message });

      return true;
    });

    writeFile(filePath, decData, (error) => {
      if (error) 
        return res.status(400).send({ error: error.message });

      return true;
    });

    fileInsert.localPath = filePath;
    await dbClient.files.insertOne(fileInsert);

    fileQ.add({
      userId: fileInsert.userId,
      fileId: fileInsert._id
    });

    return res.status(201).send({
      id: fileInsert._id,
      userId: fileInsert.userId,
      name: fileInsert.name,
      type: fileInsert.type,
      isPublic: fileInsert.isPublic,
      parentId: fileInsert.parentId
    });
  }



  // GET method
  static async getShow (req, res) {
    const { userId } = await getIdAndKey(req);
    if (!isValidUser(userId))
        return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) 
        return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || '';
    const file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) 
        return res.status(404).send({ error: 'Not found' });

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId
    });
  }

    // GET method
  static async getIndex (req, res) {
    const { userId } = await getIdAndKey(req);
    if (!isValidUser(userId)) 
        return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) 
        return res.status(401).send({ error: 'Unauthorized' });

    let parentId = req.query.parentId || 0;
    if (parentId === '0') parentId = 0;
    if (parentId !== 0) {
      if (!isValidUser(parentId)) 
        return res.status(401).send({ error: 'Unauthorized' });

      parentId = ObjectId(parentId);

      const folder = await dbClient.files.findOne({ _id: ObjectId(parentId) });
      if (!folder || folder.type !== 'folder') 
        return res.status(200).send([]);
    }

    const page = req.query.page || 0;

    const agg = { $and: [{ parentId }] };
    let aggData = [{ $match: agg }, { $skip: page * 20 }, { $limit: 20 }];
    if (parentId === 0) aggData = [{ $skip: page * 20 }, { $limit: 20 }];

    const pageFiles = await dbClient.files.aggregate(aggData);
    const files = [];

    await pageFiles.forEach((file) => {
      const fileObj = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId
      };
      files.push(fileObj);
    });

    return res.status(200).send(files);
  }

    // Put method
  static async putPublish (req, res) {
    const { userId } = await getIdAndKey(req);
    if (!isValidUser(userId)) 
        return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) 
        return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || '';

    let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) 
        return res.status(404).send({ error: 'Not found' });

    await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId
    });
  }

    // Put method
  static async putUnpublish (req, res) {
    const { userId } = await getIdAndKey(req);
    if (!isValidUser(userId)) 
        return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) 
        return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || '';

    let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) 
        return res.status(404).send({ error: 'Not found' });

    await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId
    });
  }

    // GET method
  static async getFile (req, res) {
    const fileId = req.params.id || '';
    const size = req.query.size || 0;

    const file = await dbClient.files.findOne({ _id: ObjectId(fileId) });

    if (!file) 
        return res.status(404).send({ error: 'Not found' });

    const { isPublic, userId, type } = file;

    const { userId: user } = await getIdAndKey(req);

    if ((!isPublic && !user) || (user && userId.toString() !== user && !isPublic)) return res.status(404).send({ error: 'Not found' });

    if (type === 'folder') 
        return res.status(400).send({ error: 'A folder doesn\'t have content' });

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    try {
      const fileData = readFileSync(path);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileData);
    } catch (err) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
