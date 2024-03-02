import { Text } from 'react-native-paper';
import { View } from 'react-native';

const EditLibraryScreen = ({ route }) => {
  const {
    params: { /* libraryId, */ libraryName },
  } = route;
  return (
    <View style={{ padding: 10 }}>
      <Text>Edit Library {libraryName}</Text>
    </View>
  );
};

export default EditLibraryScreen;
