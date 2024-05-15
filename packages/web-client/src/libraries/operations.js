import {
  fetchLibrariesSuccess,
  createLibrarySuccess,
  updateLibrarySuccess,
  deleteLibrarySuccess,
  fetchLibraryItemsSuccess,
  createBookSuccess,
  refreshLibraryItemsSuccess,
  deleteLibraryItemSuccess,
  updateBookSuccess,
  detectBookSuccess,
  shareLibrarySuccess,
  unShareLibrarySuccess,
  lendItemSuccess,
  fetchItemHistorySuccess,
  refreshItemHistorySuccess,
  returnItemSuccess,
  deleteItemHistorySuccess,
} from './actions';

import { api } from '../api';
import { appError, appWaiting, appRefreshing } from '../store';
import { ITEM_EVENT_TYPE } from '../domain';

export const fetchLibraryItems =
  (libraryId, nextToken, refresh = false) =>
  async (dispatch) => {
    dispatch(refresh ? appRefreshing() : appWaiting());
    try {
      let url = `/v1/libraries/${libraryId}/items`;
      if (nextToken) {
        url += `?nextToken=${nextToken}`;
      }
      const data = await api.get(url);
      dispatch(refresh ? refreshLibraryItemsSuccess(data) : fetchLibraryItemsSuccess(data));
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

export const fetchLibraries =
  (refresh = false) =>
  async (dispatch) => {
    dispatch(refresh ? appRefreshing() : appWaiting());

    try {
      const data = await api.get('/v1/libraries');
      dispatch(fetchLibrariesSuccess(data));
    } catch (e) {
      dispatch(appError(e));
    }
  };

export const createLibrary = (library, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post('/v1/libraries', library);
    const data = await api.get('/v1/libraries');
    dispatch(createLibrarySuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const updateLibrary = (library, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.put(`/v1/libraries/${library.id}`, library);
    const data = await api.get('/v1/libraries');
    dispatch(updateLibrarySuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const deleteLibrary = (libraryId) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.del(`/v1/libraries/${libraryId}`);
    const data = await api.get('/v1/libraries');
    dispatch(deleteLibrarySuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const shareLibrary = (libraryId, userName, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post(`/v1/libraries/${libraryId}/share`, { userName });
    const data = await api.get('/v1/libraries');
    dispatch(shareLibrarySuccess(data));
    if (callback) {
      callback();
    }
  } catch (e) {
    dispatch(appError(e));
  }
};

export const unshareLibrary = (libraryId, userName, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post(`/v1/libraries/${libraryId}/unshare`, { userName });
    const data = await api.get('/v1/libraries');
    dispatch(unShareLibrarySuccess(data));
    if (callback) {
      callback();
    }
  } catch (e) {
    dispatch(appError(e));
  }
};

export const deleteLibraryItem = (libraryId, itemId) => async (dispatch) => {
  dispatch(appRefreshing());
  try {
    await api.del(`/v1/libraries/${libraryId}/items/${itemId}`);
    const data = await api.get(`/v1/libraries/${libraryId}/items`);
    dispatch(deleteLibraryItemSuccess({ ...data, libraryId }));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const createBook = (item, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post(`/v1/libraries/${item.libraryId}/books`, item);
    const data = await api.get(`/v1/libraries/${item.libraryId}/items`);
    dispatch(createBookSuccess({ ...data, libraryId: item.libraryId }));
    callback();
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

export const detectBook = (code) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const data = await api.post('/v1/detections', { type: 0, code });
    dispatch(detectBookSuccess(data));
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

export const deleteLibraryItemHistory = (item) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    await api.del(`/v1/libraries/${item.libraryId}/items/${item.id}/events`);
    dispatch(deleteItemHistorySuccess());
  } catch (e) {
    dispatch(appError(e));
  }
};
