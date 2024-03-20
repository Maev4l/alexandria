import { View } from "react-native";
import { TextInput, Icon, useTheme, Text, Button } from "react-native-paper";
import { useState } from "react";

import { useDispatch } from "../store";
import { changePassword } from "../security";

const COMPLEXITY_CHECK_STATE = {
  UNDEFINED: 1,
  VALID: 2,
  INVALID: 3,
};

const checkPasswordComplexity = (password) => {
  const containsUppercase = (ch) => /[A-Z]/.test(ch);
  const containsLowercase = (ch) => /[a-z]/.test(ch);
  // const containsSpecialChar = (ch) => /[`!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?~ ]/.test(ch);
  const containsSpecialChar = (ch) =>
    /[`!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?~ ]/.test(ch);
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

  return {
    minimumLength:
      password.length > 8
        ? COMPLEXITY_CHECK_STATE.VALID
        : COMPLEXITY_CHECK_STATE.INVALID,
    numbers:
      countOfNumbers > 0
        ? COMPLEXITY_CHECK_STATE.VALID
        : COMPLEXITY_CHECK_STATE.INVALID,
    upperCases:
      countOfUpperCase > 0
        ? COMPLEXITY_CHECK_STATE.VALID
        : COMPLEXITY_CHECK_STATE.INVALID,
    lowerCases:
      countOfLowerCase > 0
        ? COMPLEXITY_CHECK_STATE.VALID
        : COMPLEXITY_CHECK_STATE.INVALID,
    symbols:
      countOfSpecialChar > 0
        ? COMPLEXITY_CHECK_STATE.VALID
        : COMPLEXITY_CHECK_STATE.INVALID,
  };
};

const ChangePassword = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [enableSubmit, setEnableSubmit] = useState(false);
  const [complexityCheck, setComplexityCheck] = useState({
    minimumLength: COMPLEXITY_CHECK_STATE.UNDEFINED,
    numbers: COMPLEXITY_CHECK_STATE.UNDEFINED,
    lowerCases: COMPLEXITY_CHECK_STATE.UNDEFINED,
    symbols: COMPLEXITY_CHECK_STATE.UNDEFINED,
    upperCases: COMPLEXITY_CHECK_STATE.UNDEFINED,
  });

  const isSubmitEnabled = (check, p, c) => {
    const { minimumLength, numbers, lowerCases, symbols, upperCases } = check;
    const res =
      minimumLength === COMPLEXITY_CHECK_STATE.VALID &&
      numbers === COMPLEXITY_CHECK_STATE.VALID &&
      lowerCases === COMPLEXITY_CHECK_STATE.VALID &&
      symbols === COMPLEXITY_CHECK_STATE.VALID &&
      upperCases === COMPLEXITY_CHECK_STATE.VALID &&
      p === c;
    return res;
  };

  const renderComplexityIcon = (state) => {
    if (state === COMPLEXITY_CHECK_STATE.UNDEFINED) {
      return <Icon source="circle-small" size={20} />; // Empty icon
    }
    if (state === COMPLEXITY_CHECK_STATE.VALID) {
      return <Icon size={20} source="check" color={theme.colors.primary} />;
    }
    return <Icon size={20} source="close" color={theme.colors.error} />;
  };

  const handleChangeOldPassword = (val) => setOldPassword(val);

  const handleToggleOldPasswordVisibility = () =>
    setShowOldPassword(!showOldPassword);

  const handleChangeNewPassword = (val) => {
    setNewPassword(val);
    let check;
    if (!val) {
      check = {
        minimumLength: COMPLEXITY_CHECK_STATE.UNDEFINED,
        numbers: COMPLEXITY_CHECK_STATE.UNDEFINED,
        lowerCases: COMPLEXITY_CHECK_STATE.UNDEFINED,
        symbols: COMPLEXITY_CHECK_STATE.UNDEFINED,
        upperCases: COMPLEXITY_CHECK_STATE.UNDEFINED,
      };
    } else {
      check = checkPasswordComplexity(val);
    }
    setComplexityCheck(check);
    setEnableSubmit(isSubmitEnabled(check, val, confirm));
    setNewPassword(val);
  };

  const handleToggleNewPasswordVisibility = () =>
    setShowNewPassword(!showNewPassword);

  const handleChangeConfirm = (val) => {
    setConfirm(val);
    setEnableSubmit(isSubmitEnabled(complexityCheck, newPassword, val));
  };

  const handleToggleConfirmVisibility = () => setShowConfirm(!showConfirm);

  const handleSubmit = () => dispatch(changePassword(oldPassword, newPassword));

  return (
    <View
      w="100%"
      h="100%"
      style={{
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        secureTextEntry={!showOldPassword}
        value={oldPassword}
        mode="outlined"
        label="Current password"
        placeholder="Enter your current password"
        onChangeText={handleChangeOldPassword}
        style={{ marginBottom: 10, width: "80%" }}
        right={
          <TextInput.Icon
            icon={showOldPassword ? "eye-outline" : "eye-off-outline"}
            onPress={handleToggleOldPasswordVisibility}
          />
        }
      />

      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        secureTextEntry={!showNewPassword}
        value={newPassword}
        mode="outlined"
        label="New password"
        placeholder="Enter your new password"
        onChangeText={handleChangeNewPassword}
        style={{ marginBottom: 10, width: "80%" }}
        right={
          <TextInput.Icon
            icon={showNewPassword ? "eye-outline" : "eye-off-outline"}
            onPress={handleToggleNewPasswordVisibility}
          />
        }
      />
      {/* Complexity block */}
      <View style={{ paddingTop: 8, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {renderComplexityIcon(complexityCheck.minimumLength)}
          <Text>Minimum 8 characters</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {renderComplexityIcon(complexityCheck.upperCases)}
          <Text>Contains uppercase characters</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {renderComplexityIcon(complexityCheck.lowerCases)}
          <Text>Contains lowercase characters</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {renderComplexityIcon(complexityCheck.symbols)}
          <Text>Contains specials characters</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {renderComplexityIcon(complexityCheck.numbers)}
          <Text>Contains numbers</Text>
        </View>
      </View>
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        secureTextEntry={!showConfirm}
        value={confirm}
        mode="outlined"
        label="Confirm password"
        placeholder="Confirm your new password"
        onChangeText={handleChangeConfirm}
        style={{ marginBottom: 10, width: "80%" }}
        right={
          <TextInput.Icon
            icon={showNewPassword ? "eye-outline" : "eye-off-outline"}
            onPress={handleToggleConfirmVisibility}
          />
        }
      />
      <Button disabled={!enableSubmit} mode="contained" onPress={handleSubmit}>
        SUBMIT
      </Button>
    </View>
  );
};

export default ChangePassword;
