import { Text, useTheme } from 'react-native-paper';
import { View, ScrollView, Image } from 'react-native';

export const BookDetailsHeader = ({ route }) => {
  const {
    params: {
      book: { title },
    },
  } = route;

  return (
    <Text style={{ fontSize: '18px', padding: 10 }} numberOfLines={1} ellipsizeMode="tail">
      {title}
    </Text>
  );
};

const BookDetails = ({ route }) => {
  const {
    params: { book },
  } = route;
  const { summary, title, authors, picture, isbn } = book;

  const theme = useTheme();

  return (
    <View style={{ padding: 10, flex: 1 }}>
      <ScrollView>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {picture ? (
            <View
              style={{
                width: 120,
                height: 180,
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
                width: 120,
                height: 180,
                borderWidth: '1px',
                borderRadius: '5%',
                borderColor: theme.colors.primary,
              }}
            >
              <Text variant="headlineLarge">?</Text>
            </View>
          )}

          <View style={{ flex: 1, paddingLeft: 5, flexShrink: 1 }}>
            <Text variant="titleLarge" style={{ flexWrap: 'wrap' }}>
              {title}
            </Text>
            <Text variant="bodyLarge" style={{ fontStyle: 'italic' }}>
              {authors.join(', ')}
            </Text>
            <View>
              <Text>ISBN: {isbn}</Text>
            </View>
          </View>
        </View>
        <Text style={{ paddingTop: 5, textAlign: 'justify' }}>{summary}</Text>
      </ScrollView>
    </View>
  );
};

export default BookDetails;
