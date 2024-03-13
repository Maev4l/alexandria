import { View } from 'react-native';
import { useState } from 'react';
import { TextInput, Button } from 'react-native-paper';

const LibraryForm = ({ library, onSubmit }) => {
  const [item, setItem] = useState(library);

  const handleChangeName = (v) => {
    setItem({ ...item, name: v });
  };

  const handleChangeDescription = (v) => {
    setItem({ ...item, description: v });
  };

  const handleSubmit = () => {
    onSubmit({ ...item });
  };

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={item.name}
        maxLength={20}
        mode="outlined"
        label="Name"
        placeholder="Enter library name"
        onChangeText={handleChangeName}
        style={{ marginBottom: 10, width: '100%' }}
      />

      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={item.description}
        maxLength={100}
        multiline
        numberOfLines={5}
        mode="outlined"
        label="Description"
        placeholder="Enter library description"
        onChangeText={handleChangeDescription}
        style={{ marginBottom: 10, width: '100%', height: 150 }}
      />

      <Button mode="contained" onPress={handleSubmit} disabled={item.name.length === 0}>
        SUBMIT
      </Button>
    </View>
  );
};

export default LibraryForm;
