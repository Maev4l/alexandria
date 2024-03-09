import { Text, Chip } from 'react-native-paper';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import { Alert } from '../components';
import { ACTION_TYPES, useSelector, useDispatch } from '../store';
import ItemsList from './ItemsList';
import { fetchLibraryItems } from './operations';

export const ItemsScreenHeader = ({ route }) => {
  const {
    params: {
      library: { name },
    },
  } = route;

  return (
    <Text style={{ fontSize: '18px', padding: 10 }} numberOfLines={1} ellipsizeMode="tail">
      {name}
    </Text>
  );
};

const ItemsScreen = ({ route }) => {
  const {
    params: { library },
  } = route;

  const { id: libraryId } = library;

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { items, nextToken, lastAction } = useSelector((state) => ({
    items: state.libraryItems.items,
    continuationToken: state.libraryItems.continuationToken,
    lastAction: state.lastAction,
  }));

  useEffect(() => dispatch(fetchLibraryItems(libraryId, nextToken)), [libraryId]);

  const handleAddBook = () => {};

  const handleScanBarCode = () => navigation.navigate('ScanCode');

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Chip icon="plus-circle" compact elevated onPress={handleAddBook}>
          Add book
        </Chip>
        <Chip icon="camera" compact elevated onPress={handleScanBarCode}>
          Scan barcode
        </Chip>
      </View>
      {lastAction === ACTION_TYPES.FETCH_LIBRARY_ITEMS_SUCCESS && items.length === 0 ? (
        <Alert
          variant="primary"
          style={{ marginTop: 20 }}
          text="You have no items in this library."
        />
      ) : null}
      <ItemsList items={items} library={library} />
    </View>
  );
};

export default ItemsScreen;
