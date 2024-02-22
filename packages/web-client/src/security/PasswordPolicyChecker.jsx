import { View } from 'react-native';
import { useEffect } from 'react';
import { Icon, useTheme, Text } from 'react-native-paper';

const COMPLEXITY_CHECK_STATE = {
  UNDEFINED: 1,
  VALID: 2,
  INVALID: 3,
};

const checkPasswordComplexity = (password) => {
  if (!password) {
    return [
      COMPLEXITY_CHECK_STATE.UNDEFINED,
      COMPLEXITY_CHECK_STATE.UNDEFINED,
      COMPLEXITY_CHECK_STATE.UNDEFINED,
      COMPLEXITY_CHECK_STATE.UNDEFINED,
      COMPLEXITY_CHECK_STATE.UNDEFINED,
    ];
  }
  const containsUppercase = (ch) => /[A-Z]/.test(ch);
  const containsLowercase = (ch) => /[a-z]/.test(ch);
  // const containsSpecialChar = (ch) => /[`!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?~ ]/.test(ch);
  const containsSpecialChar = (ch) => /[`!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?~ ]/.test(ch);
  let countOfUpperCase = 0;
  let countOfLowerCase = 0;
  let countOfNumbers = 0;
  let countOfSpecialChar = 0;

  for (let i = 0; i < password.length; i += 1) {
    const ch = password.charAt(i);
    if (!Number.isNaN(+ch)) {
      countOfNumbers += 1;
    } else if (containsUppercase(ch)) {
      countOfUpperCase += 1;
    } else if (containsLowercase(ch)) {
      countOfLowerCase += 1;
    } else if (containsSpecialChar(ch)) {
      countOfSpecialChar += 1;
    }
  }

  return [
    password.length > 8 ? COMPLEXITY_CHECK_STATE.VALID : COMPLEXITY_CHECK_STATE.INVALID,
    countOfNumbers > 0 ? COMPLEXITY_CHECK_STATE.VALID : COMPLEXITY_CHECK_STATE.INVALID,
    countOfUpperCase > 0 ? COMPLEXITY_CHECK_STATE.VALID : COMPLEXITY_CHECK_STATE.INVALID,
    countOfLowerCase > 0 ? COMPLEXITY_CHECK_STATE.VALID : COMPLEXITY_CHECK_STATE.INVALID,
    countOfSpecialChar > 0 ? COMPLEXITY_CHECK_STATE.VALID : COMPLEXITY_CHECK_STATE.INVALID,
  ];
};

const PasswordPolicyChecker = ({ style, password, onChange }) => {
  const theme = useTheme();

  const passwordComplexity = checkPasswordComplexity(password);
  const [minimumLength, numbers, upperCases, lowerCases, symbols] = passwordComplexity;
  const isValid = passwordComplexity.every((c) => c === COMPLEXITY_CHECK_STATE.VALID);

  useEffect(() => onChange(isValid), [isValid, passwordComplexity]);

  const renderComplexityIcon = (state) => {
    if (state === COMPLEXITY_CHECK_STATE.UNDEFINED) {
      return <Icon source="circle-small" size={20} />; // Empty icon
    }
    if (state === COMPLEXITY_CHECK_STATE.VALID) {
      return <Icon size={20} source="check" color={theme.colors.primary} />;
    }
    return <Icon size={20} source="close" color={theme.colors.error} />;
  };

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {renderComplexityIcon(minimumLength)}
        <Text>Minimum 8 characters</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {renderComplexityIcon(upperCases)}
        <Text>Contains uppercase characters</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {renderComplexityIcon(lowerCases)}
        <Text>Contains lowercase characters</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {renderComplexityIcon(symbols)}
        <Text>Contains specials characters</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {renderComplexityIcon(numbers)}
        <Text>Contains numbers</Text>
      </View>
    </View>
  );
};

export default PasswordPolicyChecker;
