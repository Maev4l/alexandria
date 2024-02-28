import { Card, Text, useTheme } from 'react-native-paper';
import { useEffect } from 'react';
import { ScrollView, Image, View } from 'react-native';

import { useDispatch, useSelector } from '../store';
import { detectBook } from './operations';

const DetectedBook = ({ book }) => {
  const { summary, title, authors, pictureUrl, isbn } = book;
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
            <Text>ISBN: {isbn}</Text>
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

  const theme = useTheme();
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 20,
            borderWidth: 2,
            borderRadius: '5px',
            borderColor: theme.colors.error,
            backgroundColor: theme.colors.errorContainer,
          }}
        >
          <Text style={{ padding: 10, color: theme.colors.onErrorContainer }}>No match found.</Text>
        </View>
      ) : null}
      {books.map((b) => (
        <DetectedBook key={b.id} book={b} />
      ))}
    </ScrollView>
  );
};

export default BookDetectionScreen;
