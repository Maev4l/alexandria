import { ACTION_TYPES } from '../store';

export const fetchItemHistorySuccess = (data) => ({
  type: ACTION_TYPES.FETCH_ITEM_HISTORY_SUCCESS,
  payload: data,
});

export const refreshItemHistorySuccess = (data) => ({
  type: ACTION_TYPES.REFRESH_ITEM_HISTORY_SUCCESS,
  payload: data,
});

export const deleteItemHistorySuccess = () => ({
  type: ACTION_TYPES.DELETE_ITEM_HISTORY_SUCCESS,
});

export const returnItemSuccess = (itemId) => ({
  type: ACTION_TYPES.RETURN_ITEM_SUCCESS,
  payload: { itemId },
});

export const deleteLibraryItemSuccess = (data) => ({
  type: ACTION_TYPES.DELETE_LIBRARY_ITEM_SUCCESS,
  payload: data,
});

export const updateBookSuccess = (data) => ({
  type: ACTION_TYPES.UPDATE_BOOK_SUCCESS,
  payload: data,
});

export const lendItemSuccess = (itemId, lentTo) => ({
  type: ACTION_TYPES.LEND_ITEM_SUCCESS,
  payload: { itemId, lentTo },
});
