import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { View } from 'react-native';
import { useState, useEffect } from 'react';

import Video from './Video';

const MediaState = Object.freeze({
  NO_CAMERA_SUPPORT: 1,
  PERMISSION_DENIED: 2,
  CAMERA_ON: 3,
  CAMERA_OFF: 4,
});

const BarcodeInputField = ({ style, onPress }) => {
  const [isbn, setIsbn] = useState('');
  const theme = useTheme();

  const handleChange = (v) => setIsbn(v);

  const handlePress = () => {
    if (isbn) {
      onPress(isbn);
    }
  };
  return (
    <TextInput
      value={isbn}
      style={style}
      label="ISBN Code"
      mode="outlined"
      onChangeText={handleChange}
      right={
        <TextInput.Icon
          icon="arrow-right-thick"
          onPress={handlePress}
          color={theme.colors.primary}
        />
      }
    />
  );
};

const ScanCodeScreen = ({ navigation }) => {
  const [mediaState, setMediaState] = useState(MediaState.CAMERA_OFF);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaState(MediaState.NO_CAMERA_SUPPORT);
      return null;
    }
    setMediaState(MediaState.CAMERA_OFF);
    const unsuscribe = navigation.addListener('blur', () => setMediaState(MediaState.CAMERA_OFF));
    return unsuscribe;
  }, [navigation]);

  const handleCameraError = () => setMediaState(MediaState.PERMISSION_DENIED);

  const handleToggleCamera = () => {
    if (mediaState === MediaState.CAMERA_OFF) {
      setMediaState(MediaState.CAMERA_ON);
    } else {
      setMediaState(MediaState.CAMERA_OFF);
    }
  };

  const handleSubmitCode = (isbn) => navigation.navigate('BooksDetection', { isbn });

  return (
    <View style={{ padding: 10, flex: 1, alignItems: 'center' }}>
      {(mediaState === MediaState.NO_CAMERA_SUPPORT ||
        mediaState === MediaState.PERMISSION_DENIED) && (
        <>
          <Text>
            Your device does not support camera access or something went wrong. You can enter the
            barcode below:
          </Text>
          <BarcodeInputField style={{ marginTop: 10 }} onPress={handleSubmitCode} />
        </>
      )}
      {(mediaState === MediaState.CAMERA_OFF || mediaState === MediaState.CAMERA_ON) && (
        <>
          <Text>If the detection is unsuccessful, you can enter the barcode below:</Text>
          <BarcodeInputField style={{ marginTop: 10 }} onPress={handleSubmitCode} />
          <Button mode="contained" style={{ marginTop: 10 }} onPress={handleToggleCamera}>
            {mediaState === MediaState.CAMERA_OFF ? 'Start scanning' : 'Stop scanning'}
          </Button>
          {mediaState === MediaState.CAMERA_ON && (
            <Video
              style={{ marginTop: 10, width: '100%' }}
              onResult={handleSubmitCode}
              onError={handleCameraError}
            />
          )}
        </>
      )}
    </View>
  );
};

export default ScanCodeScreen;
