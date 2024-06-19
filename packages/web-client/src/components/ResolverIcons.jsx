import { Image } from 'react-native';

import goodReadsImg from './img/goodreads.svg';
import googleImg from './img/google.svg';
import babelio from './img/babelio.jpg';

export const ResolverIcon = ({ style, source }) => {
  let img = null;
  if (source === 'Babelio') {
    img = babelio;
  } else if (source === 'Goodreads') {
    img = goodReadsImg;
  } else if (source === 'Google') {
    img = googleImg;
  }
  return <Image style={{ ...style }} source={img} />;
};
