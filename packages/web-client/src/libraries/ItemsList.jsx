import { Text, useTheme, IconButton, Icon, Divider, FAB } from 'react-native-paper';
import { FlatList, View, Image, Pressable } from 'react-native';
import { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { RefreshControl } from 'react-native-web-refresh-control';

import { ITEM_TYPE } from '../domain';
import { useDispatch } from '../store';
import { deleteLibraryItem } from './operations';

const BookItem = ({ book, sharedFrom, style, onPress, onPressActions, showDivider }) => {
  const theme = useTheme();
  const { title, authors, isbn, picture } = book;
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
          <View style={{ flex: 1, flexDirection: 'row' }}>
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
              <View
                style={{ flex: 1, height: 90, paddingLeft: 5, justifyContent: 'space-between' }}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text variant="labelLarge" style={{ flexWrap: 'wrap' }}>
                    {title}
                  </Text>
                  <Text style={{ fontStyle: 'italic' }}>{authors.join(', ')}</Text>
                </View>
                <Text>ISBN: {isbn}</Text>
              </View>
            </View>
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
        options: ['Update', 'Delete', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        showSeparators: true,
        tintIcons: true,
        icons: [
          <Icon color={theme.colors.onBackground} source="pencil" size={20} />,
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

  return (
    <>
      <FlatList
        ref={ref}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
        contentContainerStyle={{ flexGrow: 1 }}
        data={items}
        onEndReachedThreshold={0.2}
        onEndReached={onEndReached}
        onScroll={onScroll}
        scrollEventThrottle={100}
        /* ListEmptyComponent={() => (
          <Alert variant="primary" style={{ marginTop: 20 }} text="You have no items." />
        )} */
        renderItem={({ item, index }) =>
          item.type === ITEM_TYPE.BOOK ? (
            <BookItem
              book={item}
              sharedFrom={sharedFrom}
              onPress={() => navigation.navigate('BookDetails', { book: { ...item } })}
              onPressActions={() => handlePressActions(item)}
              showDivider={index !== items.length - 1}
            />
          ) : null
        }
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
