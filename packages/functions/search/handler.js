const winston = require('winston');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { S3, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBDocument, paginateQuery } = require('@aws-sdk/lib-dynamodb');
const Fuse = require('fuse.js');

const {
  env: { REGION: region, DYNAMODB_TABLE_NAME, S3_PICTURES_BUCKET },
} = process;

const s3 = new S3({ region });

const dynamo = DynamoDBDocument.from(new DynamoDBClient({ region }));
const paginatorConfig = {
  client: dynamo,
  pageSize: 50,
};

const makeResponse = (contentType, body, httpCode = 200) => ({
  statusCode: httpCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Content-Type': contentType,
  },
  body: JSON.stringify(body),
});

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

const logger = getLogger('search');

let lastScanDate = 0;
// scanResult is the object that FuseJS create for the search
let scanResult;

const scanAll = async (ownerId) => {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :ownerId and begins_with(GSI2SK,:item_prefix)',
    ExpressionAttributeValues: {
      ':ownerId': `owner#${ownerId}`,
      ':item_prefix': 'item#',
    },
  };

  const paginator = paginateQuery(paginatorConfig, params);
  const items = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const page of paginator) {
    items.push(...page.Items);
  }
  return items.map((i) => {
    const { Authors, Title } = i;
    return { ...i, keywords: [Title, ...Authors] };
  });
};

const buildIndex = async (ownerId) => {
  const data = await scanAll(ownerId);
  const options = {
    includeScore: true,
    minMatchCharLength: 2,
    keys: ['keywords'],
  };

  scanResult = new Fuse(data, options);
  lastScanDate = new Date().getTime();
};

const streamToString = (stream, encoding) => {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString(encoding)));
  });
};

const fetchPictures = async (matches) => {
  const results = await Promise.all(
    matches.map(async (m) => {
      const {
        item: { OwnerId, LibraryId, ItemId, Isbn, LibraryName, Summary, Title, Type, Authors },
      } = m;
      const key = `user/${OwnerId}/library/${LibraryId}/item/${ItemId}`;
      const params = {
        Bucket: S3_PICTURES_BUCKET,
        Key: key,
      };

      let data = null;

      try {
        const command = new GetObjectCommand(params);
        const { Body } = await s3.send(command);
        data = await streamToString(Body, 'base64');
      } catch (e) {
        if (e.name !== 'NoSuchKey') {
          logger.error(`Failed to fetch picture (key: ${key}): ${e.message}`);
        }
      }
      const item = {
        id: ItemId,
        isbn: Isbn,
        libraryId: LibraryId,
        libraryName: LibraryName,
        summary: Summary,
        title: Title,
        type: Type,
        authors: Authors,
      };
      if (data) {
        item.picture = data;
      }
      return item;
    }),
  );
  return results;
};

const handle = async (event) => {
  const {
    requestContext: {
      authorizer: {
        claims: { sub },
      },
    },
    body,
  } = event;

  if (
    lastScanDate === undefined ||
    scanResult === undefined ||
    lastScanDate + 900000 < new Date().getTime()
  ) {
    const ownerId = sub.replaceAll('-', '').toUpperCase();

    await buildIndex(ownerId);
  }

  const payload = JSON.parse(body);
  const { terms } = payload;
  const matches = scanResult
    .search(terms.join(' '), { limit: 10 })
    .map((i) => ({ item: i.item, score: i.score }));

  const results = await fetchPictures(matches);
  return makeResponse('application/json', { results });
};

exports.handle = handle;
