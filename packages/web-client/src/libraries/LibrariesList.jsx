import { ScrollView, View } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';

const LibraryItemList = ({ library, style }) => {
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
        ...style,
      }}
    >
      <View>
        <Text variant="titleMedium">{name}</Text>
        <Text variant="bodyMedium" style={{ flexWrap: 'wrap' }}>
          {description}
        </Text>
        <Text variant="bodySmall" style={{ fontStyle: 'italic' }}>
          Total items: {totalItems}
        </Text>
      </View>
      <IconButton icon="dots-vertical" animated size={16} mode="contained" />
    </View>
  );
};

const LibrariesList = ({ libraries }) => (
  <ScrollView>
    {libraries.map((l) => (
      <LibraryItemList key={l.id} library={l} style={{ marginBottom: 10 }} />
    ))}
  </ScrollView>
);

export default LibrariesList;
