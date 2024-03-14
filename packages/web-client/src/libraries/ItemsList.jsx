import { Text, useTheme, IconButton, Icon } from 'react-native-paper';
import { FlatList, View, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useActionSheet } from '@expo/react-native-action-sheet';

import { Alert } from '../components';
import { ITEM_TYPE } from '../domain';
import { useDispatch } from '../store';
import { deleteLibraryItem } from './operations';

const BookItem = ({ book, style, onPress, onPressActions }) => {
  const theme = useTheme();
  const { title, authors, isbn, picture } = book;
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flex: 1,
          borderWidth: 2,
          borderRadius: '5px',
          borderColor: theme.colors.secondary,
          padding: 5,
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
            <View style={{ flex: 1, height: 90, paddingLeft: 5, justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Text variant="labelLarge" style={{ flexWrap: 'wrap' }}>
                  {title}
                </Text>
                <Text style={{ fontStyle: 'italic' }}>{authors.join(', ')}</Text>
              </View>
              <Text>ISBN: {isbn}</Text>
            </View>
          </View>
          <IconButton
            icon="dots-vertical"
            animated
            size={16}
            mode="contained"
            onPress={onPressActions}
            style={{ marginTop: 0 }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const ItemsList = ({ library, items, onEndReached }) => {
  const { id: libraryId } = library;
  const dispatch = useDispatch();

  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const theme = useTheme();

  const handlePressActions = (item) => {
    showActionSheetWithOptions(
      {
        options: ['Update', 'Delete', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        showSeparators: true,
        tintIcons: true,
        icons: [
          <Icon source="pencil" size={20} />,
          <Icon source="trash-can-outline" size={20} color={theme.colors.error} />,
          <Icon source="close" size={20} />,
        ],
        destructiveColor: theme.colors.error,
      },
      (index) => {
        switch (index) {
          case 0: {
            /* navigation.navigate('UpdateLibrary', {
              libraryId: library.id,
              libraryName: library.name,
            }); */
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

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ flexGrow: 1 }}
        data={items}
        onEndReachedThreshold={0.2}
        onEndReached={onEndReached}
        ListEmptyComponent={() => (
          <Alert variant="primary" style={{ marginTop: 20 }} text="You have no items." />
        )}
        renderItem={({ item }) =>
          item.type === ITEM_TYPE.BOOK ? (
            <BookItem
              book={item}
              style={{ marginBottom: 10 }}
              onPress={() => navigation.navigate('BookDetails', { book: { ...item } })}
              onPressActions={() => handlePressActions(item)}
            />
          ) : null
        }
      />
    </View>
  );
};

export default ItemsList;
