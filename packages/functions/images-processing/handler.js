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

// Lossy WebP, not lossless. Measured against the live bucket: 302 lossless thumbnails averaged
// 67KB for a 210x300 cover (median 69KB, p90 87KB, max 111KB), where re-encoding the very same
// pixels at q85 is 4.3x smaller - ~18KB. At 30 rows per listing page that is 2.0MB of covers
// instead of ~0.5MB, and on mobile data that difference IS the window where a row has scrolled
// into view and its cover has not arrived yet.
//
// Nothing is given up for it. A cover is a photograph, so lossless was buying byte-exactness
// nobody can see at this size; encoding a stored lossless thumbnail at q85 was verified to be
// byte-identical, with a maximum per-pixel difference of 0, to encoding its original source
// image directly (checked against reachable Google Books, Babelio and TMDB sources).
const WEBP_QUALITY = 85;

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
      .webp({ quality: WEBP_QUALITY })
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
        // The marker that makes re-encoding an existing thumbnail safe to repeat. `data
        // reencode-thumbnails` (packages/cli) re-queues stored thumbnails through this Lambda to
        // convert the lossless back-catalogue, and running it twice would put an already-lossy
        // file through a second lossy pass - real, visible generation loss. The key's PRESENCE is
        // the predicate the CLI skips on, not its value, so it keeps working if the quality ever
        // changes: the question being asked is "has this been through a lossy encode", not "was it
        // this exact quality". A comment saying "run once" is not a guard.
        Metadata: { encode: `webp-q${WEBP_QUALITY}` },
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
