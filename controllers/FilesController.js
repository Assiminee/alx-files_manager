import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) { return res.status(401).json({ error: 'Unauthorized' }); }

    if (!name) { return res.status(400).json({ error: 'Missing name' }); }

    if (!type || !['folder', 'file', 'image'].includes(type)) { return res.status(400).json({ error: 'Missing type' }); }

    if (type !== 'folder' && !data) { return res.status(400).json({ error: 'Missing data' }); }

    if (parentId !== 0) {
      const filesCollection = await dbClient.db.collection('files');
      const parentFile = await filesCollection.findOne({ _id: new ObjectId(parentId) });

      if (!parentFile) { return res.status(400).json({ error: 'Parent not found' }); }

      if (parentFile.type !== 'folder') { return res.status(400).json({ error: 'Parent is not a folder' }); }
    }

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

    if (!fs.existsSync(folderPath)) { fs.mkdirSync(folderPath, { recursive: true }); }

    const filePath = path.join(folderPath, uuidv4());
    const fileData = Buffer.from(data, 'base64');

    try {
      await fs.promises.writeFile(filePath, fileData);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Error saving file' });
    }

    const newFile = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : new ObjectId(parentId),
      localPath: filePath,
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
}

export default FilesController;
