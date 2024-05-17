import { Text, useTheme, IconButton, Icon, Divider, FAB } from 'react-native-paper';
import { FlatList, View, Image, Pressable } from 'react-native';
import { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { RefreshControl } from 'react-native-web-refresh-control';

import { ITEM_TYPE } from '../domain';
import { useDispatch } from '../store';
import { deleteLibraryItem, returnLibraryItem } from './operations';

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
              book={item}
              sharedFrom={sharedFrom}
              onPress={() => onPress(item)}
              onPressActions={() => onPressActions(item)}
              showDivider={index !== items.length - 1}
            />
          ))}
        </View>
      </View>
      {showDivider ? <Divider style={{ marginBottom: 10 }} horizontalInset /> : null}
    </View>
  );
};

const BookItem = ({ book, sharedFrom, style, onPress, onPressActions, showDivider }) => {
  const theme = useTheme();
  const { title, authors, /* isbn, */ picture, lentTo } = book;
  return (
    <>
      <Pressable onPress={onPress}>
        <View
          style={{
            flex: 1,
            /* borderWidth: 2,
          borderRadius: '5px',
          borderColor: theme.colors.secondary,
          padding: 5, */
            minHeight: '100px',
            ...style,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {picture ? (
                <View
                  style={{
                    width: 60,
                    height: 90,
                  }}
                >
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${picture}`,
                    }}
                    style={{
                      resizeMode: 'stretch',
                      flex: 1,
                      width: '100%',
                      height: '100%',
                      borderRadius: '5%',
                    }}
                  />
                </View>
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 90,
                    borderWidth: '1px',
                    borderRadius: '5%',
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text variant="titleLarge">?</Text>
                </View>
              )}
              <View style={{ flex: 1, height: 90, paddingLeft: 5 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text variant="labelLarge" style={{ flexWrap: 'wrap' }}>
                    {title}
                  </Text>
                  <Text style={{ fontStyle: 'italic' }}>{authors.join(', ')}</Text>
                </View>
                {/* <Text>ISBN: {isbn}</Text> */}
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              {!sharedFrom && (
                <IconButton
                  icon="dots-vertical"
                  animated
                  size={16}
                  mode="contained"
                  onPress={onPressActions}
                  style={{ marginTop: 0 }}
                />
              )}
              {!sharedFrom && lentTo && <Icon source="arrow-right-top" size={20} />}
            </View>
          </View>
        </View>
      </Pressable>
      {showDivider ? <Divider style={{ marginBottom: 10 }} horizontalInset /> : null}
    </>
  );
};

const ItemsList = ({ library, items, onEndReached, onRefresh, refreshing }) => {
  const { sharedFrom } = library;
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
  items.forEach((item, index) => {
    const { collection } = item;
    if (collection) {
      const found = collection2index[collection];
      if (!found) {
        collection2index[collection] = index;
        // const { picture, ...rest } = item;
        const col = {
          name: collection,
          items: [item],
        };
        groupedItems = [...groupedItems, col];
      } else {
        const col = groupedItems[found];
        // const { picture, ...rest } = item;
        groupedItems[found] = { ...col, items: [...col.items, item] };
      }
    } else {
      // const { picture, ...rest } = item;
      groupedItems = [...groupedItems, item];
    }
  });

  const renderElement = ({ item, index }) => {
    const { items: collectionItems, type } = item;
    // if the element has "items" property exists, that means we have to render
    // a collection

    if (collectionItems) {
      return (
        <CollectionItem
          collection={item}
          sharedFrom={sharedFrom}
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
        book={item}
        sharedFrom={sharedFrom}
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
