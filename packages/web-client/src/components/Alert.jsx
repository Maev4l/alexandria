import { Text, useTheme } from 'react-native-paper';
import { View } from 'react-native';

const Alert = ({ variant, text, style }) => {
  const theme = useTheme();

  const borderColor = theme.colors[variant];
  const backgroundColor = theme.colors[`${variant}Container`];

  const textColor =
    theme.colors[`on${variant.charAt(0).toUpperCase() + variant.slice(1)}Container`];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderRadius: '5px',
        borderColor,
        backgroundColor,
        ...style,
      }}
    >
      <Text style={{ padding: 10, color: textColor }}>{text}</Text>
    </View>
  );
};
export default Alert;
