import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import LibraryForm from './LibraryForm';
import { createLibrary } from './operations';
import { useDispatch } from '../store';

const CreateLibraryScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleSubmit = (item) =>
    dispatch(createLibrary(item, () => navigation.navigate('Libraries')));

  return (
    <View style={{ padding: 10 }}>
      <LibraryForm library={{ name: '', description: '' }} onSubmit={handleSubmit} />
    </View>
  );
};

export default CreateLibraryScreen;
