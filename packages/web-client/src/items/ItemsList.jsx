import { Text, useTheme, Icon, Divider, FAB } from 'react-native-paper';
import { FlatList, View } from 'react-native';
import { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { RefreshControl } from 'react-native-web-refresh-control';

import { ITEM_TYPE } from '../domain';
import { useDispatch } from '../store';
import { deleteLibraryItem, returnLibraryItem } from './operations';
import BookItem from './BookItem';

const CollectionItem = ({ collection, sharedFrom, onPress, onPressActions, showDivider }) => {
  const { name, items } = collection;
  return (
    <View style={{ flex: 1, minHeight: '100px' }}>
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          marginBottom: 5,
          alignItems: 'center',
          columnGap: 5,
        }}
      >
        <Icon source="archive-outline" size={20} style={{ marginLeft: 0, paddingLeft: 0 }} />
        <Text style={{ fontWeight: 600, flexWrap: 'wrap' }}>{name}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Divider style={{ width: 1, height: '100%' }} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          {items.map((item, index) => (
            <BookItem
              key={item.id}
              book={item}
              sharedFrom={sharedFrom}
              onPress={() => onPress(item)}
              onPressActions={() => onPressActions(item)}
              showDivider={index !== items.length - 1}
              showOrder
            />
          ))}
        </View>
      </View>
      {showDivider ? <Divider style={{ marginBottom: 10 }} horizontalInset /> : null}
    </View>
  );
};

const ItemsList = ({ library, items, onEndReached, onRefresh, refreshing }) => {
  const dispatch = useDispatch();
  const ref = useRef();
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const theme = useTheme();
  const [showFab, setFabVisibility] = useState(false);

  const handlePressActions = (item) => {
    showActionSheetWithOptions(
      {
        options: ['Update', item.lentTo ? 'Return' : 'Lend', 'Delete', 'Cancel'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
        showSeparators: true,
        tintIcons: true,
        icons: [
          <Icon color={theme.colors.onBackground} source="pencil" size={20} />,
          item.lentTo ? (
            <Icon color={theme.colors.onBackground} source="arrow-left-top" size={20} />
          ) : (
            <Icon color={theme.colors.onBackground} source="arrow-right-top" size={20} />
          ),
          <Icon color={theme.colors.error} source="trash-can-outline" size={20} />,
          <Icon color={theme.colors.onBackground} source="close" size={20} />,
        ],
        destructiveColor: theme.colors.error,
        containerStyle: { backgroundColor: theme.colors.background },
        tintColor: theme.colors.onBackground,
      },
      (index) => {
        switch (index) {
          case 0: {
            navigation.navigate('UpdateItem', { item });
            break;
          }
          case 1: {
            if (item.lentTo) {
              dispatch(returnLibraryItem(item));
            } else {
              navigation.navigate('LendItem', { item });
            }
            break;
          }
          case 2: {
            dispatch(deleteLibraryItem(library.id, item.id));
            break;
          }

          default: {
            /* empty */
          }
        }
      },
    );
  };

  const onScroll = (e) => {
    const {
      nativeEvent: {
        contentOffset: { y },
      },
    } = e;

    setFabVisibility(y > 0);
  };

  // Group items by collection (if any)
  const collection2index = {};
  let groupedItems = [];
  items.forEach((item) => {
    const { collection } = item;
    if (collection) {
      const found = collection in collection2index;
      if (!found) {
        // const { picture, ...rest } = item;
        const col = {
          name: collection,
          items: [item],
        };
        groupedItems = [...groupedItems, col];
        collection2index[collection] = groupedItems.length - 1;
      } else {
        const col = groupedItems[collection2index[collection]];
        // const { picture, ...rest } = item;
        groupedItems[collection2index[collection]] = { ...col, items: [...col.items, item] };
      }
    } else {
      // const { picture, ...rest } = item;
      groupedItems = [...groupedItems, item];
    }
  });

  // console.log(`groupeditems: ${JSON.stringify(groupedItems)}`);
  const renderElement = ({ item, index }) => {
    const { items: collectionItems, type } = item;
    // if the element has "items" property exists, that means we have to render
    // a collection

    if (collectionItems) {
      return (
        <CollectionItem
          key={item.id}
          collection={item}
          onPress={(i) => navigation.navigate('BookDetails', { book: { ...i } })}
          onPressActions={(i) => handlePressActions(i)}
          showDivider={index !== items.length - 1}
        />
      );
    }

    if (type !== ITEM_TYPE.BOOK) {
      return null;
    }

    return (
      <BookItem
        key={item.id}
        book={item}
        onPress={() => navigation.navigate('BookDetails', { book: { ...item } })}
        onPressActions={() => handlePressActions(item)}
        showDivider={index !== items.length - 1}
      />
    );
  };

  return (
    <>
      <FlatList
        ref={ref}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
        contentContainerStyle={{ flexGrow: 1 }}
        data={groupedItems}
        onEndReachedThreshold={0.2}
        onEndReached={onEndReached}
        onScroll={onScroll}
        scrollEventThrottle={100}
        /* ListEmptyComponent={() => (
          <Alert variant="primary" style={{ marginTop: 20 }} text="You have no items." />
        )} */
        renderItem={renderElement}
      />
      {showFab && (
        <FAB
          icon="arrow-up"
          style={{ position: 'absolute', margin: 16, right: 0, bottom: 0 }}
          size="small"
          visible={items.length > 0}
          onPress={() => ref.current?.scrollToIndex({ index: 0 })}
        />
      )}
    </>
  );
};

export default ItemsList;
