import { Card, Text, IconButton } from 'react-native-paper';
import { useEffect } from 'react';
import { ScrollView, Image, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useDispatch, useSelector } from '../store';
import { detectBook, createBook } from './operations';
import { Alert } from '../components';
import { ITEM_TYPE } from '../domain';

const DetectedBook = ({ book, onAdd }) => {
  const { summary, title, authors, pictureUrl, isbn, source } = book;
  return (
    <Card>
      <Card.Content>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View
              style={{
                width: 60,
                height: 90,
              }}
            >
              <Image
                source={{
                  uri: pictureUrl,
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
            <View style={{ flex: 1, paddingLeft: 5, justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Text variant="labelLarge" style={{ flexWrap: 'wrap' }}>
                  {title}
                </Text>
                <Text style={{ fontStyle: 'italic' }}>{authors.join(', ')}</Text>
              </View>
              <View>
                <Text>ISBN: {isbn}</Text>
                <Text>(Source: {source})</Text>
              </View>
            </View>
          </View>
          <IconButton
            icon="plus-circle"
            animated
            mode="contained"
            size={16}
            style={{ marginTop: 0 }}
            onPress={() => onAdd(book)}
          />
        </View>
        <Text style={{ paddingTop: 5, textAlign: 'justify' }}>{summary}</Text>
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
    const { title, summary, authors, isbn, pictureUrl } = b;
    dispatch(
      createBook(
        { title, summary, authors, isbn, libraryId: library.id, type: ITEM_TYPE.BOOK, pictureUrl },
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
