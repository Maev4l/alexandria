import { useZxing, DecodeHintType } from 'react-zxing';
import { View } from 'react-native';

const BarcodeFormat = Object.freeze({
  /** Aztec 2D barcode format. */
  AZTEC: 0,
  /** CODABAR 1D format. */
  CODABAR: 1,
  /** Code 39 1D format. */
  CODE_39: 2,
  /** Code 93 1D format. */
  CODE_93: 3,
  /** Code 128 1D format. */
  CODE_128: 4,
  /** Data Matrix 2D barcode format. */
  DATA_MATRIX: 5,
  /** EAN-8 1D format. */
  EAN_8: 6,
  /** EAN-13 1D format. */
  EAN_13: 7,
  /** ITF (Interleaved Two of Five) 1D format. */
  ITF: 8,
  /** MaxiCode 2D barcode format. */
  MAXICODE: 9,
  /** PDF417 format. */
  PDF_417: 10,
  /** QR Code 2D barcode format. */
  QR_CODE: 11,
  /** RSS 14 */
  RSS_14: 12,
  /** RSS EXPANDED */
  RSS_EXPANDED: 13,
  /** UPC-A 1D format. */
  UPC_A: 14,
  /** UPC-E 1D format. */
  UPC_E: 15,
  /** UPC/EAN extension format. Not a stand-alone format. */
  UPC_EAN_EXTENSION: 16,
});

const VideoIsbn = ({ style, onResult, onError }) => {
  // eslint-disable-next-line no-undef
  const constraints = __DEV__
    ? {
        video: { facingMode: 'user' },
        audio: false,
      }
    : {
        video: { facingMode: 'environment' },
        audio: false,
      };

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_8, BarcodeFormat.EAN_13]);

  const { ref } = useZxing({
    hints,
    constraints,
    onDecodeResult: (result) => onResult(result.getText()),
    onError: (e) => onError(e),
  });

  return (
    <View style={{ overflow: 'hidden', width: '100%', height: '50%', ...style }}>
      <video
        autoPlay
        ref={ref}
        style={{
          objectFit: 'cover',
        }}
      />
    </View>
  );
};

export default VideoIsbn;
