import Queue from 'bull';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }

  try {
    const filesCollection = await dbClient.getCollection('files');
    const file = await filesCollection.findOne({
      _id: new ObjectId(fileId), userId: new ObjectId(userId),
    });

    if (!file) {
      done(new Error('File not found'));
      return;
    }

    const sizes = [500, 250, 100];

    const thumbnailPromises = sizes.map(async (size) => {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      const thumbnailPath = `${file.localPath}_${size}`;
      await fs.promises.writeFile(thumbnailPath, thumbnail);
    });

    await Promise.all(thumbnailPromises);

    done();
  } catch (error) {
    done(new Error(`Error generating thumbnails: ${error.message}`));
  }
});
