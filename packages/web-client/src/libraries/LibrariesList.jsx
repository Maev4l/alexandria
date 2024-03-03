import { ScrollView, View } from 'react-native';
import { Text, useTheme, IconButton, Icon } from 'react-native-paper';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';

const LibraryItemList = ({ library, style, onPressActions }) => {
  const theme = useTheme();

  const { name, description, totalItems } = library;

  return (
    <View
      style={{
        flex: 1,
        borderWidth: 2,
        borderRadius: '5px',
        borderColor: theme.colors.secondary,
        padding: 5,
        justifyContent: 'space-between',
        flexDirection: 'row',
        minHeight: '100px',
        ...style,
      }}
    >
      <View style={{ paddingRight: 5, flex: 1, justifyContent: 'space-between' }}>
        <View>
          <Text variant="titleMedium" numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
          <Text variant="bodyMedium" style={{ flexWrap: 'wrap' }}>
            {description}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ fontStyle: 'italic' }}>
          Total items: {totalItems}
        </Text>
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
  );
};

const LibrariesList = ({ libraries }) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const navigation = useNavigation();
  const theme = useTheme();

  const handlePressActions = (library) => {
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
            navigation.navigate('UpdateLibrary', {
              libraryId: library.id,
              libraryName: library.name,
            });
            break;
          }
          case 1: {
            // delete
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
    <ScrollView>
      {libraries.map((l) => (
        <LibraryItemList
          key={l.id}
          library={l}
          style={{ marginBottom: 10 }}
          onPressActions={() => handlePressActions(l)}
        />
      ))}
    </ScrollView>
  );
};

export default LibrariesList;
