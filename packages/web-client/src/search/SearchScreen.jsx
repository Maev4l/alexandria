import { TextInput, Icon, useTheme } from 'react-native-paper';
import { View, ScrollView } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useActionSheet } from '@expo/react-native-action-sheet';

import { useDispatch, useSelector, ACTION_TYPES } from '../store';
import { searchItems } from './operations';

import { Alert } from '../components';
import { ITEM_TYPE } from '../domain';
import { BookItem, returnLibraryItem, deleteLibraryItem } from '../items';

const SearchScreen = () => {
  const [terms, setTerms] = useState('');
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { matchedItems, lastAction } = useSelector((state) => ({
    matchedItems: state.matchedItems,
    lastAction: state.lastAction,
  }));
  const { showActionSheetWithOptions } = useActionSheet();
  const theme = useTheme();

  const handleChangeTerms = (v) => setTerms(v);

  const handlePressSearch = () => dispatch(searchItems(terms));

  const handlePressActions = (item) => {
    showActionSheetWithOptions(
      {
        options: ['Update', item.lentTo ? 'Return' : 'Lend', 'Delete', 'Cancel'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
        showSeparators: true,
        tintIcons: true,
        icons: [
          <Icon color={theme.colors.onBackground} source="pencil" size={20} />,
          item.lentTo ? (
            <Icon color={theme.colors.onBackground} source="arrow-left-top" size={20} />
          ) : (
            <Icon color={theme.colors.onBackground} source="arrow-right-top" size={20} />
          ),
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
            if (item.lentTo) {
              dispatch(returnLibraryItem(item));
            } else {
              navigation.navigate('LendItem', { item });
            }
            break;
          }
          case 2: {
            dispatch(deleteLibraryItem(item.libraryId, item.id));
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
        onSubmitEditing={handlePressSearch}
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
              <BookItem
                key={m.id}
                book={m}
                onPress={() => navigation.navigate('BookDetails', { book: { ...m } })}
                onPressActions={() => handlePressActions(m)}
                showDivider={index !== matchedItems.length - 1}
                showLibrary
                showOrder
                showCollection
              />
            ) : null;
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default SearchScreen;
