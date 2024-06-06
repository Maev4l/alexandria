import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BookItemForm } from '../items';
import { createBook } from './operations';
import { useDispatch } from '../store';
import { ITEM_TYPE } from '../domain';

const CreateItemScreen = ({ route }) => {
  const {
    params: { library },
  } = route;

  const { id: libraryId } = library;

  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleSubmit = (item) => dispatch(createBook(item, () => navigation.goBack()));

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <BookItemForm
        book={{
          title: '',
          summary: '',
          authors: [],
          picture: '',
          isbn: '',
          libraryId,
          type: ITEM_TYPE.BOOK,
        }}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

export default CreateItemScreen;
