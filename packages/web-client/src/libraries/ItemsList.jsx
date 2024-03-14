import { Text, useTheme } from 'react-native-paper';
import { FlatList, View, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Alert } from '../components';
import { ITEM_TYPE } from '../domain';

const BookItem = ({ book, style, onPress }) => {
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
      </View>
    </Pressable>
  );
};

const ItemsList = ({ items, onEndReached }) => {
  const navigation = useNavigation();

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
            />
          ) : null
        }
      />
    </View>
  );
};

export default ItemsList;
