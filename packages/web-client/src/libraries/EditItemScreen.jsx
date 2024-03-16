import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import BookItemForm from './BookItemForm';
import { useDispatch } from '../store';
import { updateBook } from './operations';

const EditItemScreen = ({ route }) => {
  const {
    params: { item },
  } = route;

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleSubmit = (i) => dispatch(updateBook(i, () => navigation.goBack()));

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <BookItemForm book={item} onSubmit={handleSubmit} />
    </View>
  );
};

export default EditItemScreen;
