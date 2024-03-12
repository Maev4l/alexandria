/* eslint-disable import/no-extraneous-dependencies */
const winston = require('winston');
const sharp = require('sharp');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

const {
  env: { REGION: region, S3_PICTURES_BUCKET },
} = process;

const s3 = new S3Client({ region });

const getLogger = (category) => {
  const options = {
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({ label: category }),
      winston.format.printf(
        ({ level, message, label, timestamp }) => `${timestamp} [${label}] ${level}: ${message}`,
      ),
    ),
    transports: [new winston.transports.Console({ level: 'info' })],
  };
  const logger = winston.loggers.get(category, options);
  return logger;
};

const logger = getLogger('img-processing');

const streamToBuffer = (stream) => {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const processPicture = async (incomingKey) => {
  try {
    const { Body: stream, Metadata: metadata } = await s3.send(
      new GetObjectCommand({
        Bucket: S3_PICTURES_BUCKET,
        Key: incomingKey,
      }),
    );

    logger.info(`Picture ${incomingKey} fetched - metadata: ${JSON.stringify(metadata)}`);

    const buffer = await streamToBuffer(stream);

    const { targetwidth: width, targetheight: height, targetprefix: targetPrefix } = metadata;

    const data = await sharp(buffer)
      .resize(parseInt(width, 10), parseInt(height, 10), {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ lossless: true })
      .toBuffer();

    logger.info(`Picture ${incomingKey} resized`);

    const resizedPictureStream = Readable.from(data); // Convert buffer to stream

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: S3_PICTURES_BUCKET,
        Key: targetPrefix,
        Body: resizedPictureStream,
        ContentType: `image/webp`,
      },
    });

    await upload.done();
  } catch (e) {
    logger.error(`Failed to resize picture ${incomingKey}: ${e.message}`);
  }
};

const handle = async (event) => {
  const { Records: records } = event;

  await Promise.all(
    records.map(async (r) => {
      await processPicture(r.s3.object.key);
    }),
  );
};

exports.handle = handle;
