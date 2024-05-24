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
