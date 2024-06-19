import { Card, Text, Chip, useTheme, Divider, TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { ScrollView, Image, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useDispatch, useSelector } from '../store';
import { detectBook, createBook } from './operations';
import { Alert, ResolverIcon } from '../components';
import { ITEM_TYPE } from '../domain';

const DetectedBook = ({ book, onAdd }) => {
  const [item, setItem] = useState(book);

  const handleChangeTitle = (v) => setItem({ ...item, title: v });
  const handleCollectionName = (v) => setItem({ ...item, collection: v });
  const handleCollectionOrder = (v) => {
    if (v) {
      setItem({ ...item, order: Number(v.replace(/[^0-9]/g, '')) });
    } else {
      setItem({ ...item, order: '' });
    }
  };

  const isSubmitDisabled = () =>
    item.title.length === 0 || (item.collection && !item.order) || (!item.collection && item.order);

  const theme = useTheme();
  return (
    <Card>
      <Card.Content>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignContent: 'center',
            alignItems: 'center',
            paddingBottom: 5,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 5,
            }}
          >
            <ResolverIcon style={{ width: 30, height: 30 }} source={item.source} />
            <Text variant="titleMedium">{item.source}</Text>
          </View>
          {!item.error ? (
            <Chip
              icon="plus-circle"
              compact
              elevated
              onPress={() => onAdd(item)}
              disabled={isSubmitDisabled()}
            >
              Add
            </Chip>
          ) : null}
        </View>
        <Divider style={{ marginBottom: 5 }} />
        {!item.error ? (
          <>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View
                style={{
                  width: 60,
                  height: 90,
                }}
              >
                {item.pictureUrl ? (
                  <Image
                    source={{
                      uri: item.pictureUrl,
                    }}
                    style={{
                      resizeMode: 'stretch',
                      flex: 1,
                      width: '100%',
                      height: '100%',
                      borderRadius: '5%',
                    }}
                  />
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
              </View>
              <View style={{ flex: 1, paddingLeft: 5, justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <TextInput
                    autoCorrect={false}
                    autoCapitalize="none"
                    value={item.title}
                    maxLength={100}
                    mode="outlined"
                    label="Title"
                    multiline
                    placeholder="Enter title"
                    onChangeText={handleChangeTitle}
                    style={{ marginBottom: 5, width: '100%' }}
                  />
                  <Text style={{ fontStyle: 'italic' }}>{item.authors.join(', ')}</Text>
                </View>
                <View>
                  <Text>ISBN: {item.isbn}</Text>
                </View>
              </View>
            </View>

            <Text style={{ paddingTop: 5, textAlign: 'justify' }}>{item.summary}</Text>
            <TextInput
              autoCorrect={false}
              autoCapitalize="none"
              value={item.collection}
              maxLength={100}
              mode="outlined"
              label="Serie"
              placeholder="Enter serie name"
              onChangeText={handleCollectionName}
              style={{ marginBottom: 5, width: '100%' }}
            />
            <TextInput
              autoCorrect={false}
              autoCapitalize="none"
              value={item.order}
              keyboardType="numeric"
              maxLength={5}
              mode="outlined"
              label="Order"
              placeholder="Enter serie order"
              onChangeText={handleCollectionOrder}
              style={{ marginBottom: 5, width: '100%' }}
            />
          </>
        ) : (
          <Text>{item.error}</Text>
        )}
      </Card.Content>
    </Card>
  );
};

const BookDetectionScreen = ({ route }) => {
  const {
    params: { code, library },
  } = route;

  const navigation = useNavigation();

  const dispatch = useDispatch();
  const { loading, books } = useSelector((state) => ({
    books: state.resolvedBooks,
    loading: state.loading,
  }));

  useEffect(() => {
    dispatch(detectBook(code));
  }, [code]);

  const handleAddResolved = (b) => {
    const { title, summary, authors, isbn, pictureUrl, collection, order } = b;
    dispatch(
      createBook(
        {
          title,
          summary,
          authors,
          collection,
          order,
          isbn,
          libraryId: library.id,
          type: ITEM_TYPE.BOOK,
          pictureUrl,
        },
        () => navigation.goBack(),
      ),
    );
  };

  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      {!loading && books.length === 0 ? (
        <Alert variant="primary" style={{ marginTop: 20 }} text="No match found." />
      ) : null}
      {books.map((b) => (
        <View key={b.id} style={{ marginBottom: 10 }}>
          <DetectedBook book={b} onAdd={handleAddResolved} />
        </View>
      ))}
    </ScrollView>
  );
};

export default BookDetectionScreen;
