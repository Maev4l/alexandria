import { TextInput } from 'react-native-paper';
import { useState } from 'react';

const PasswordInput = ({ value, style, mode, onChangeText, label, placeholder }) => {
  const [showPassword, setShowPassword] = useState(false);

  const onToggle = () => setShowPassword(!showPassword);
  const handleChange = (v) => {
    if (onChangeText) {
      onChangeText(v);
    }
  };

  return (
    <TextInput
      autoCorrect={false}
      autoCapitalize="none"
      secureTextEntry={!showPassword}
      value={value}
      mode={mode}
      label={label}
      placeholder={placeholder}
      onChangeText={handleChange}
      style={style}
      right={
        <TextInput.Icon
          icon={showPassword ? 'eye-outline' : 'eye-off-outline'}
          onPress={onToggle}
        />
      }
    />
  );
};

export default PasswordInput;
