import { ACTION_TYPES } from "../store";

const fetchingToken = () => ({ type: ACTION_TYPES.FETCHING_TOKEN });

const fetchTokenSuccess = (token) => ({
  type: ACTION_TYPES.FETCH_TOKEN_SUCCESS,
  payload: token,
});

const fetchTokenError = () => ({ type: ACTION_TYPES.FETCH_TOKEN_ERROR });

const signingOut = () => ({
  type: ACTION_TYPES.SIGNING_OUT,
});

const signOutSuccess = () => ({
  type: ACTION_TYPES.SIGN_OUT_SUCCESS,
});

const signOutError = () => ({
  type: ACTION_TYPES.SIGN_OUT_ERROR,
});

const signingIn = () => ({
  type: ACTION_TYPES.SIGNING_IN,
});

const signInSuccess = (token) => ({
  type: ACTION_TYPES.SIGN_IN_SUCCESS,
  payload: token,
});

const signInError = (error) => ({
  type: ACTION_TYPES.SIGN_IN_ERROR,
  payload: error,
});

const changingPassword = () => ({ type: ACTION_TYPES.CHANGING_PASSWORD });

const changePasswordSuccess = () => ({
  type: ACTION_TYPES.CHANGE_PASSWORD_SUCCESS,
});

const changePasswordError = () => ({
  type: ACTION_TYPES.CHANGE_PASSWORD_ERROR,
});

export default {
  fetchingToken,
  fetchTokenSuccess,
  fetchTokenError,
  signingIn,
  signInSuccess,
  signInError,
  signingOut,
  signOutSuccess,
  signOutError,
  changingPassword,
  changePasswordSuccess,
  changePasswordError,
};
