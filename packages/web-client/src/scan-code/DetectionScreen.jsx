import { Text } from 'react-native-paper';

const DetectionScreen = ({ route }) => {
  const {
    params: { isbn },
  } = route;

  return <Text>{isbn}</Text>;
};

export default DetectionScreen;
