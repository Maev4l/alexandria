import { ACTION_TYPES } from '../store';

export const fetchTokenSuccess = (token) => ({
  type: ACTION_TYPES.FETCH_TOKEN_SUCCESS,
  payload: token,
});

export const signOutSuccess = () => ({
  type: ACTION_TYPES.SIGN_OUT_SUCCESS,
});

export const signInSuccess = (token) => ({
  type: ACTION_TYPES.SIGN_IN_SUCCESS,
  payload: token,
});

export const changePasswordSuccess = () => ({
  type: ACTION_TYPES.CHANGE_PASSWORD_SUCCESS,
});

export const signUpSuccess = () => ({
  type: ACTION_TYPES.SIGNUP_SUCCESS,
});
