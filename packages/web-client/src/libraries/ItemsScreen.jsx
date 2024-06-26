import { Text, Chip } from 'react-native-paper';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import { Alert } from '../components';
import { ACTION_TYPES, useSelector, useDispatch } from '../store';
import { ItemsList } from '../items';
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

  const { id: libraryId, sharedFrom } = library;

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { items, nextToken, lastAction, refreshing } = useSelector((state) => ({
    items: state.libraryItems.items,
    nextToken: state.libraryItems.nextToken,
    lastAction: state.lastAction,
    refreshing: state.refreshing,
  }));

  useEffect(() => {
    dispatch(fetchLibraryItems(libraryId, nextToken, true));
  }, []);

  const handleAddItem = () => navigation.navigate('AddItem', { library });

  const handleScanBarCode = () => navigation.navigate('ScanCode', { library });

  const handleRefresh = () => dispatch(fetchLibraryItems(libraryId, '', true));

  const handleEndReached = () => {
    if (nextToken) {
      dispatch(fetchLibraryItems(libraryId, nextToken));
    }
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {!sharedFrom && (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <Chip icon="plus-circle" compact elevated onPress={handleAddItem}>
            Add item
          </Chip>
          <Chip icon="camera" compact elevated onPress={handleScanBarCode}>
            Scan ISBN
          </Chip>
        </View>
      )}
      {(lastAction === ACTION_TYPES.FETCH_LIBRARY_ITEMS_SUCCESS ||
        lastAction === ACTION_TYPES.REFRESH_LIBRARY_ITEMS_SUCCESS ||
        lastAction === ACTION_TYPES.DELETE_LIBRARY_ITEM_SUCCESS ||
        lastAction === ACTION_TYPES.DISMISS_NOTIFICATION) &&
      items.length === 0 ? (
        <Alert
          variant="primary"
          style={{ marginTop: 20 }}
          text="You have no items in this library."
        />
      ) : null}

      <ItemsList
        items={items}
        library={library}
        onEndReached={handleEndReached}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </View>
  );
};

export default ItemsScreen;
