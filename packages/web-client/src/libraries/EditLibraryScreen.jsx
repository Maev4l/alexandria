import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import LibraryForm from './LibraryForm';
import { useSelector, useDispatch } from '../store';
import { updateLibrary } from './operations';

const EditLibraryScreen = ({ route }) => {
  const {
    params: { libraryId },
  } = route;

  const navigation = useNavigation();
  const dispatch = useDispatch();

  const library = useSelector((state) => {
    const [found] = state.libraries.filter((l) => l.id === libraryId);
    return found;
  });

  const handleSubmit = (item) =>
    dispatch(updateLibrary(item, () => navigation.navigate('Libraries')));

  return (
    <View style={{ padding: 10 }}>
      <LibraryForm library={library} onSubmit={handleSubmit} />
    </View>
  );
};

export default EditLibraryScreen;
