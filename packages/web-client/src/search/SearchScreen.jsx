import { Text, TextInput, useTheme, Divider } from 'react-native-paper';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useDispatch, useSelector, ACTION_TYPES } from '../store';
import { searchItems } from './operations';

import { Alert } from '../components';
import { ITEM_TYPE } from '../domain';

const MatchedBookItem = ({ book, style, onPress, showDivider }) => {
  const theme = useTheme();
  const { title, authors, isbn, picture, libraryName } = book;
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
              <View style={{ flexShrink: 1 }}>
                <Text>ISBN: {isbn}</Text>
                <Text numberOfLines={1} ellipsizeMode="tail">
                  Library: {libraryName}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
      {showDivider ? <Divider style={{ marginBottom: 10 }} horizontalInset /> : null}
    </>
  );
};

const SearchScreen = () => {
  const [terms, setTerms] = useState('');
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { matchedItems, lastAction } = useSelector((state) => ({
    matchedItems: state.matchedItems,
    lastAction: state.lastAction,
  }));

  const handleChangeTerms = (v) => setTerms(v);

  const handlePressSearch = () => dispatch(searchItems(terms));

  return (
    <View style={{ padding: 10, flex: 1, alignItems: 'center' }}>
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={terms}
        mode="outlined"
        label="Search"
        placeholder="Enter title or authors"
        onChangeText={handleChangeTerms}
        style={{ marginBottom: 10, width: '80%' }}
        right={<TextInput.Icon icon="magnify" onPress={handlePressSearch} />}
      />
      {lastAction === ACTION_TYPES.SEARCH_ITEMS_SUCCESS && matchedItems.length === 0 ? (
        <Alert
          variant="primary"
          style={{ marginTop: 20, width: '100%' }}
          text="There is no matches"
        />
      ) : (
        <ScrollView style={{ width: '100%' }}>
          {matchedItems.map((m, index) => {
            const { type } = m;
            return type === ITEM_TYPE.BOOK ? (
              <MatchedBookItem
                key={m.id}
                book={m}
                showDivider={index !== matchedItems.length - 1}
                onPress={() => navigation.navigate('BookDetails', { book: { ...m } })}
              />
            ) : null;
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default SearchScreen;
