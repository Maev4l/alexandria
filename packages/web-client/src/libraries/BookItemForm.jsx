import { Text, TextInput, useTheme, Button } from 'react-native-paper';
import { Image, View, ScrollView } from 'react-native';

import { useState } from 'react';

const BookItemForm = ({ book, onSubmit }) => {
  const [item, setItem] = useState(book);
  const theme = useTheme();
  const [previewUrl, setPreviewUrl] = useState({ url: '', preview: false });

  const handleChangePictureUrl = (v) => setPreviewUrl({ ...previewUrl, url: v });

  const handleChangeTitle = (v) => setItem({ ...item, title: v });
  const handleChangeSummary = (v) => setItem({ ...item, summary: v });
  const handleChangeAuthors = (v) => setItem({ ...item, authors: v.split(',') });
  const handleChangeIsbn = (v) => setItem({ ...item, isbn: v });
  const handleCollectionName = (v) => setItem({ ...item, collection: v });
  const handleCollectionOrder = (v) =>
    setItem({ ...item, order: Number(v.replace(/[^0-9]/g, '')) });

  const isSubmitDisabled = () =>
    item.title.length === 0 || (item.collection && !item.order) || (!item.collection && item.order);

  const handlePressPictureUrlIcon = async () => {
    setPreviewUrl({ ...previewUrl, preview: true });
  };

  const handleSubmit = () => {
    onSubmit({ ...item, pictureUrl: previewUrl.url });
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
      {item.picture || (previewUrl.preview && previewUrl.url) ? (
        <View
          style={{
            width: 60,
            height: 90,
          }}
        >
          <Image
            source={{
              uri: previewUrl.preview ? previewUrl.url : `data:image/webp;base64,${item.picture}`,
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
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={previewUrl.url}
        mode="outlined"
        label="Picture URL"
        placeholder="Enter picture URL"
        onChangeText={handleChangePictureUrl}
        style={{ marginBottom: 5, width: '100%' }}
        right={
          <TextInput.Icon
            icon="arrow-right-thick"
            onPress={handlePressPictureUrlIcon}
            color={theme.colors.primary}
          />
        }
      />
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={item.title}
        maxLength={100}
        mode="outlined"
        label="Title"
        placeholder="Enter title"
        onChangeText={handleChangeTitle}
        style={{ marginBottom: 5, width: '100%' }}
      />
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={item.summary}
        maxLength={4000}
        multiline
        numberOfLines={5}
        mode="outlined"
        label="Summary"
        placeholder="Enter summary"
        onChangeText={handleChangeSummary}
        style={{ marginBottom: 5, width: '100%', height: 150 }}
      />
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={item.authors.join(',')}
        mode="outlined"
        label="Authors"
        placeholder="Enter authors (comma separated)"
        onChangeText={handleChangeAuthors}
        style={{ marginBottom: 5, width: '100%' }}
      />
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={item.isbn}
        maxLength={13}
        mode="outlined"
        label="ISBN"
        placeholder="Enter ISBN"
        onChangeText={handleChangeIsbn}
        style={{ marginBottom: 5, width: '100%' }}
      />
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
      <Button mode="contained" onPress={handleSubmit} disabled={isSubmitDisabled()}>
        SUBMIT
      </Button>
    </ScrollView>
  );
};

export default BookItemForm;
