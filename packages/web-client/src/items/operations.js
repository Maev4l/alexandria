import {
  fetchItemHistorySuccess,
  refreshItemHistorySuccess,
  deleteItemHistorySuccess,
  returnItemSuccess,
  deleteLibraryItemSuccess,
  updateBookSuccess,
  lendItemSuccess,
} from './actions';
import { appError, appWaiting, appRefreshing } from '../store';
import { api } from '../api';
import { ITEM_EVENT_TYPE } from '../domain';

export const deleteLibraryItemHistory = (item) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    await api.del(`/v1/libraries/${item.libraryId}/items/${item.id}/events`);
    dispatch(deleteItemHistorySuccess());
  } catch (e) {
    dispatch(appError(e));
  }
};

export const fetchItemHistory =
  (item, nextToken, refresh = false) =>
  async (dispatch) => {
    dispatch(refresh ? appRefreshing() : appWaiting());

    try {
      let url = `/v1/libraries/${item.libraryId}/items/${item.id}/events`;
      if (nextToken) {
        url += `?nextToken=${nextToken}`;
      }
      const data = await api.get(url);
      dispatch(refresh ? refreshItemHistorySuccess(data) : fetchItemHistorySuccess(data));
    } catch (e) {
      dispatch(appError(e));
    }
  };

export const returnLibraryItem = (item) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    await api.post(`/v1/libraries/${item.libraryId}/items/${item.id}/events`, {
      type: ITEM_EVENT_TYPE.RETURNED,
      event: item.lentTo,
    });
    dispatch(returnItemSuccess(item.id));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const deleteLibraryItem = (libraryId, itemId) => async (dispatch) => {
  dispatch(appRefreshing());
  try {
    await api.del(`/v1/libraries/${libraryId}/items/${itemId}`);
    const data = await api.get(`/v1/libraries/${libraryId}/items`);
    dispatch(deleteLibraryItemSuccess({ ...data, libraryId, itemId }));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const updateBook = (item, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    // no need to send back the picture to the server
    const { picture, ...rest } = item;

    await api.put(`/v1/libraries/${item.libraryId}/books/${item.id}`, {
      ...rest,
      pictureUrl: rest.pictureUrl === '' ? null : rest.pictureUrl,
    });
    const data = await api.get(`/v1/libraries/${item.libraryId}/items`);
    dispatch(updateBookSuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const lendLibraryItem = (item, lentTo, callback) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    await api.post(`/v1/libraries/${item.libraryId}/items/${item.id}/events`, {
      type: ITEM_EVENT_TYPE.LENT,
      event: lentTo,
    });
    dispatch(lendItemSuccess(item.id, lentTo));
    if (callback) {
      callback();
    }
  } catch (e) {
    dispatch(appError(e));
  }
};
