package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/gin-gonic/gin"
)

// stubServices stands in for the service layer and records what the handler
// forwarded. Embedding ports.Services satisfies the methods left unexercised.
type stubServices struct {
	ports.Services

	item *domain.LibraryItem
	err  error

	gotOwnerId   string
	gotLibraryId string
	gotItemId    string
}

func (s *stubServices) GetLibraryItem(ownerId string, libraryId string, itemId string) (*domain.LibraryItem, error) {
	s.gotOwnerId = ownerId
	s.gotLibraryId = libraryId
	s.gotItemId = itemId
	return s.item, s.err
}

// newItemRequestContext builds a gin context carrying the path params and the
// identity the auth middleware would normally have installed.
func newItemRequestContext(userId string, libraryId string, itemId string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, fmt.Sprintf("/libraries/%s/items/%s", libraryId, itemId), nil)
	c.Params = gin.Params{
		{Key: "libraryId", Value: libraryId},
		{Key: "itemId", Value: itemId},
	}
	c.Set("tokenInfo", &tokenInfo{userId: userId})
	return c, recorder
}

func decodeBody(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("body %q is not JSON: %v", recorder.Body.String(), err)
	}
	return body
}

func TestGetLibraryItem_ForwardsRequesterAndPathParams(t *testing.T) {
	s := &stubServices{item: &domain.LibraryItem{Id: "IT1", Type: domain.ItemBook}}
	h := NewHTTPHandler(s)
	c, _ := newItemRequestContext("OWNER", "LIB1", "IT1")

	h.GetLibraryItem(c)

	if s.gotOwnerId != "OWNER" {
		t.Errorf("owner id = %q, want OWNER (from the token)", s.gotOwnerId)
	}
	if s.gotLibraryId != "LIB1" || s.gotItemId != "IT1" {
		t.Errorf("(library, item) = (%q, %q), want (LIB1, IT1)", s.gotLibraryId, s.gotItemId)
	}
}

func TestGetLibraryItem_ReturnsBookPayload(t *testing.T) {
	pictureUrl := "https://books.example/cover.jpg"
	lentTo := "Alice"
	s := &stubServices{item: &domain.LibraryItem{
		Id:          "IT1",
		Title:       "Dune",
		Type:        domain.ItemBook,
		Authors:     []string{"Frank Herbert"},
		Summary:     "Arrakis",
		Isbn:        "9780441013593",
		LibraryId:   "LIB1",
		LibraryName: "Sci-Fi",
		OwnerId:     "OWNER",
		PictureUrl:  &pictureUrl,
		LentTo:      &lentTo,
	}}
	h := NewHTTPHandler(s)
	c, recorder := newItemRequestContext("OWNER", "LIB1", "IT1")

	h.GetLibraryItem(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", recorder.Code)
	}
	body := decodeBody(t, recorder)

	if body["type"] != float64(domain.ItemBook) {
		t.Errorf("type = %v, want %d", body["type"], domain.ItemBook)
	}
	if body["title"] != "Dune" {
		t.Errorf("title = %v, want Dune", body["title"])
	}
	if body["isbn"] != "9780441013593" {
		t.Errorf("isbn = %v, want 9780441013593", body["isbn"])
	}
	if body["summary"] != "Arrakis" {
		t.Errorf("summary = %v, want Arrakis", body["summary"])
	}
	authors, _ := body["authors"].([]any)
	if len(authors) != 1 || authors[0] != "Frank Herbert" {
		t.Errorf("authors = %v, want [Frank Herbert]", body["authors"])
	}
	if body["lentTo"] != "Alice" {
		t.Errorf("lentTo = %v, want Alice", body["lentTo"])
	}
	// The thumbnail is served through CloudFront, keyed by owner/library/item,
	// not echoed from the external source URL.
	if body["picture"] != "https://alexandria.isnan.eu/thumbnails/user/OWNER/library/LIB1/item/IT1" {
		t.Errorf("picture = %v, want the CloudFront thumbnail URL", body["picture"])
	}
	if body["pictureUrl"] != pictureUrl {
		t.Errorf("pictureUrl = %v, want %s", body["pictureUrl"], pictureUrl)
	}
}

func TestGetLibraryItem_ReturnsVideoPayload(t *testing.T) {
	releaseYear := 1984
	duration := 137
	tmdbId := "841"
	s := &stubServices{item: &domain.LibraryItem{
		Id:          "IT2",
		Title:       "Dune",
		Type:        domain.ItemVideo,
		Directors:   []string{"David Lynch"},
		Cast:        []string{"Kyle MacLachlan"},
		ReleaseYear: &releaseYear,
		Duration:    &duration,
		TmdbId:      &tmdbId,
		LibraryId:   "LIB1",
		OwnerId:     "OWNER",
	}}
	h := NewHTTPHandler(s)
	c, recorder := newItemRequestContext("OWNER", "LIB1", "IT2")

	h.GetLibraryItem(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", recorder.Code)
	}
	body := decodeBody(t, recorder)

	if body["type"] != float64(domain.ItemVideo) {
		t.Errorf("type = %v, want %d", body["type"], domain.ItemVideo)
	}
	directors, _ := body["directors"].([]any)
	if len(directors) != 1 || directors[0] != "David Lynch" {
		t.Errorf("directors = %v, want [David Lynch]", body["directors"])
	}
	if body["releaseYear"] != float64(1984) {
		t.Errorf("releaseYear = %v, want 1984", body["releaseYear"])
	}
	if body["duration"] != float64(137) {
		t.Errorf("duration = %v, want 137", body["duration"])
	}
	if body["tmdbId"] != "841" {
		t.Errorf("tmdbId = %v, want 841", body["tmdbId"])
	}
	// A video carries no ISBN or authors, so those book fields must stay out.
	if _, present := body["isbn"]; present {
		t.Errorf("isbn present in a video payload: %v", body)
	}
	// No thumbnail was uploaded, so no CloudFront URL should be advertised.
	if _, present := body["picture"]; present {
		t.Errorf("picture present without a source picture: %v", body)
	}
}

func TestGetLibraryItem_MissingItemReturns404(t *testing.T) {
	s := &stubServices{err: fmt.Errorf("get item: %w", domain.ErrItemNotFound)}
	h := NewHTTPHandler(s)
	c, recorder := newItemRequestContext("OWNER", "LIB1", "GONE")

	h.GetLibraryItem(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", recorder.Code)
	}
	if _, present := decodeBody(t, recorder)["message"]; !present {
		t.Errorf("body %q carries no message field", recorder.Body.String())
	}
}

func TestGetLibraryItem_ReadFailureReturns500(t *testing.T) {
	s := &stubServices{err: errors.New("dynamodb unavailable")}
	h := NewHTTPHandler(s)
	c, recorder := newItemRequestContext("OWNER", "LIB1", "IT1")

	h.GetLibraryItem(c)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", recorder.Code)
	}
	if _, present := decodeBody(t, recorder)["message"]; !present {
		t.Errorf("body %q carries no message field", recorder.Body.String())
	}
}
