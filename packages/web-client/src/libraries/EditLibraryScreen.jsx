import { View } from 'react-native';

import LibraryForm from './LibraryForm';
import { useSelector } from '../store';

const EditLibraryScreen = ({ route }) => {
  const {
    params: { libraryId },
  } = route;

  const library = useSelector((state) => {
    const [found] = state.libraries.filter((l) => l.id === libraryId);
    return found;
  });

  const handleSubmit = () => {};

  return (
    <View style={{ padding: 10 }}>
      <LibraryForm library={library} onSubmit={handleSubmit} />
    </View>
  );
};

export default EditLibraryScreen;
