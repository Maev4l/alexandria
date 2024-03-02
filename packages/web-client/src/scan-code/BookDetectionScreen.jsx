import { Card, Text } from 'react-native-paper';
import { useEffect } from 'react';
import { ScrollView, Image, View } from 'react-native';

import { useDispatch, useSelector } from '../store';
import { detectBook } from './operations';
import { Alert } from '../components';

const DetectedBook = ({ book }) => {
  const { summary, title, authors, pictureUrl, isbn, source } = book;
  return (
    <Card>
      <Card.Content>
        <View style={{ flex: 1, flexDirection: 'row' }}>
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
        <Text style={{ paddingTop: 5, textAlign: 'justify' }}>{summary}</Text>
      </Card.Content>
    </Card>
  );
};

const BookDetectionScreen = ({ route }) => {
  const {
    params: { isbn },
  } = route;

  const dispatch = useDispatch();
  const { loading, books } = useSelector((state) => ({
    books: state.resolvedBooks,
    loading: state.loading,
  }));

  useEffect(() => {
    dispatch(detectBook(isbn));
  }, [isbn]);

  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      {!loading && books.length === 0 ? (
        <Alert variant="primary" style={{ marginTop: 20 }} text="No match found." />
      ) : null}
      {books.map((b) => (
        <View key={b.id} style={{ marginBottom: 10 }}>
          <DetectedBook book={b} />
        </View>
      ))}
    </ScrollView>
  );
};

export default BookDetectionScreen;
