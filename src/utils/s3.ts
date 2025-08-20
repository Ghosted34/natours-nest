// services/s3Service.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const s3Client = new S3Client({
  region: process.env.S3_REGION || '',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

const bucketName = process.env.S3_BUCKET_NAME || 'your-tour-images-bucket';

// Multer configuration for memory storage (we'll upload to S3 manually)
export const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: (
    req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload image to S3 with optimization
export const uploadImageToS3 = async (
  file: Express.Multer.File,
  folder: string = 'tours',
): Promise<string> => {
  try {
    // Optimize image with sharp
    const optimizedBuffer = await sharp(file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const fileName = `${folder}/${uuidv4()}-${Date.now()}.${
      file.mimetype.split('/')[1]
    }`;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: `image/${file.mimetype.split('/')[1]}`,
      ACL: 'public-read' as const,
      Metadata: {
        originalName: file.originalname,
        uploadDate: new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return the public URL
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw error;
  }
};

// Upload multiple images to S3
export const uploadMultipleImagesToS3 = async (
  files: Express.Multer.File[],
  folder: string = 'tours',
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) => uploadImageToS3(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple images to S3:', error);
    throw error;
  }
};

// Delete image from S3
export const deleteImageFromS3 = async (imageUrl: string): Promise<void> => {
  try {
    // Extract key from URL
    const urlParts = imageUrl.split('/');
    const key = urlParts.slice(-2).join('/'); // Get 'tours/filename'

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting image from S3:', error);
    throw error;
  }
};

// Delete multiple images from S3
export const deleteMultipleImagesFromS3 = async (
  imageUrls: string[],
): Promise<void> => {
  try {
    const deletePromises = imageUrls.map((url) => deleteImageFromS3(url));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting multiple images from S3:', error);
    throw error;
  }
};

export const configureTourImageUpload = () => {
  return uploadToMemory.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 5 },
  ]);
};
