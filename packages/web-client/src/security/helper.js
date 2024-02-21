import { fetchAuthSession } from "aws-amplify/auth";

export const fetchToken = async () => {
  const { tokens } = await fetchAuthSession();
  if (tokens) {
    const { idToken } = tokens;
    return idToken;
  }
  return null;
};
