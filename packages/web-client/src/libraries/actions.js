import { ACTION_TYPES } from '../store';

export const fetchLibrariesSuccess = (data) => ({
  type: ACTION_TYPES.FETCH_LIBRARIES_SUCCESS,
  payload: data,
});

export const createLibrarySuccess = (data) => ({
  type: ACTION_TYPES.CREATE_LIBRARY_SUCCESS,
  payload: data,
});

export const updateLibrarySuccess = (data) => ({
  type: ACTION_TYPES.UPDATE_LIBRARY_SUCCESS,
  payload: data,
});

export const deleteLibrarySuccess = (data) => ({
  type: ACTION_TYPES.DELETE_LIBRARY_SUCCESS,
  payload: data,
});

export const fetchLibraryItemsSuccess = (data) => ({
  type: ACTION_TYPES.FETCH_LIBRARY_ITEMS_SUCCESS,
  payload: data,
});

export const refreshLibraryItemsSuccess = (data) => ({
  type: ACTION_TYPES.REFRESH_LIBRARY_ITEMS_SUCCESS,
  payload: data,
});

export const createBookSuccess = (data) => ({
  type: ACTION_TYPES.CREATE_BOOK_SUCCESS,
  payload: data,
});

export const detectBookSuccess = (data) => ({
  type: ACTION_TYPES.DETECT_BOOK_SUCCESS,
  payload: data,
});

export const shareLibrarySuccess = (data) => ({
  type: ACTION_TYPES.SHARE_LIBRARY_SUCCESS,
  payload: data,
});

export const unShareLibrarySuccess = (data) => ({
  type: ACTION_TYPES.UNSHARE_LIBRARY_SUCCESS,
  payload: data,
});
