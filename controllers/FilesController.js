import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const filesCollection = await dbClient.db.collection('files');
      const file = await filesCollection.findOne({
        _id: new ObjectId(id), userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const filesCollection = await dbClient.db.collection('files');
      const query = { userId: new ObjectId(userId), parentId };
      const files = await filesCollection
        .find(query)
        .skip(page * 20)
        .limit(20)
        .toArray();

      const formattedFiles = files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));

      return res.status(200).json(formattedFiles);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const filesCollection = await dbClient.db.collection('files');
      const file = await filesCollection.findOne({
        _id: new ObjectId(id), userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      await filesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isPublic: true } },
      );

      const updatedFile = await filesCollection.findOne({ _id: new ObjectId(id) });

      return res.status(200).json({
        id: updatedFile._id,
        userId: updatedFile.userId,
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: updatedFile.parentId,
      });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;
    const { size } = req.query;

    try {
      const filesCollection = await dbClient.db.collection('files');
      const file = await filesCollection.findOne({ _id: new ObjectId(id) });

      if (!file) return res.status(404).json({ error: 'Not found' });

      if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });

      const userId = await redisClient.get(`auth_${token}`);
      if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
        return res.status(404).json({ error: 'Not found' });
      }

      let filePath = file.localPath;
      if (size && ['500', '250', '100'].includes(size)) filePath = `${filePath}_${size}`;

      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });

      const fileContent = fs.createReadStream(filePath);
      fileContent.pipe(res);
    } catch (error) {
      console.error(`❌ Error retrieving file content: ${error.message}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // 🔥 Ensure consistent return (for ESLint)
    return null;
  }

  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!name) return res.status(400).json({ error: 'Missing name' });

    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });

    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    const filesCollection = await dbClient.db.collection('files');

    if (type === 'folder') {
      const newFile = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? '0' : new ObjectId(parentId),
      };

      const result = await filesCollection.insertOne(newFile);

      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    const filePath = path.join(folderPath, uuidv4());
    const fileData = Buffer.from(data, 'base64');

    await fs.promises.writeFile(filePath, fileData);

    const newFile = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : new ObjectId(parentId),
      localPath: filePath,
    };

    const result = await filesCollection.insertOne(newFile);

    if (type === 'image') {
      await fileQueue.add({
        userId,
        fileId: result.insertedId.toString(),
      });
    }

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const {id} = req.params;

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({error: 'Unauthorized'});
    }

    try {
      const filesCollection = await dbClient.db.collection('files');
      const file = await filesCollection.findOne({
        _id: new ObjectId(id), userId: new ObjectId(userId)
      });

      if (!file) {
        return res.status(404).json({error: 'Not found'});
      }

      await filesCollection.updateOne(
          {_id: new ObjectId(id)},
          {$set: {isPublic: false}}
      );

      const updatedFile = await filesCollection.findOne({_id: new ObjectId(id)});

      return res.status(200).json({
        id: updatedFile._id,
        userId: updatedFile.userId,
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: updatedFile.parentId,
      });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({error: 'Internal Server Error'});
    }
  }
}

export default FilesController;
