// `picture` is a CloudFront thumbnail URL synthesised from a template whenever `pictureUrl`
// exists, without checking S3 (handlers/search.go) — so it can 404 while the image-processing
// Lambda is still working. Callers must treat a load failure as the empty frame, not an error.
//
// The CDN caches thumbnails for seven days and forwards query strings, so ?v= is how a
// replaced cover actually reaches the reader.
export const pictureSrc = (item) => {
  if (!item?.picture) return null;
  return item.updatedAt ? `${item.picture}?v=${encodeURIComponent(item.updatedAt)}` : item.picture;
};
