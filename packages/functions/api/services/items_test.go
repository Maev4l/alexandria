package services

import (
	"errors"
	"fmt"
	"testing"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/internal/domain"
)

// stubDatabase records which owner id the service reads an item under, so the
// shared-library resolution can be asserted without a live DynamoDB table.
// Embedding ports.Database satisfies the methods the tests never exercise.
type stubDatabase struct {
	ports.Database

	sharedOwnerId string
	sharedErr     error
	item          *domain.LibraryItem
	itemErr       error

	gotOwnerId   string
	gotLibraryId string
	gotItemId    string
	itemCalls    int
}

func (s *stubDatabase) GetSharedLibrary(ownerId string, libraryId string) (string, error) {
	return s.sharedOwnerId, s.sharedErr
}

func (s *stubDatabase) GetLibraryItem(ownerId string, libraryId string, itemId string) (*domain.LibraryItem, error) {
	s.itemCalls++
	s.gotOwnerId = ownerId
	s.gotLibraryId = libraryId
	s.gotItemId = itemId
	return s.item, s.itemErr
}

func TestGetLibraryItem_ReadsSharedLibraryUnderSharerOwnerId(t *testing.T) {
	db := &stubDatabase{
		sharedOwnerId: "SHARER",
		item:          &domain.LibraryItem{Id: "IT1", Title: "Dune", Type: domain.ItemBook},
	}
	s := NewServices(db, nil, nil, nil)

	item, err := s.GetLibraryItem("RECIPIENT", "LIB1", "IT1")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}

	if db.gotOwnerId != "SHARER" {
		t.Errorf("item read under owner %q, want SHARER", db.gotOwnerId)
	}
	if db.gotLibraryId != "LIB1" || db.gotItemId != "IT1" {
		t.Errorf("read (library, item) = (%q, %q), want (LIB1, IT1)", db.gotLibraryId, db.gotItemId)
	}
	if item == nil || item.Title != "Dune" {
		t.Errorf("item = %+v, want the record returned by the database", item)
	}
}

func TestGetLibraryItem_ReadsOwnLibraryUnderRequesterOwnerId(t *testing.T) {
	db := &stubDatabase{
		sharedOwnerId: "",
		item:          &domain.LibraryItem{Id: "IT1", Type: domain.ItemBook},
	}
	s := NewServices(db, nil, nil, nil)

	if _, err := s.GetLibraryItem("OWNER", "LIB1", "IT1"); err != nil {
		t.Fatalf("err = %v, want nil", err)
	}

	if db.gotOwnerId != "OWNER" {
		t.Errorf("item read under owner %q, want OWNER", db.gotOwnerId)
	}
}

func TestGetLibraryItem_SkipsItemReadWhenSharedLookupFails(t *testing.T) {
	db := &stubDatabase{sharedErr: errors.New("dynamodb unavailable")}
	s := NewServices(db, nil, nil, nil)

	item, err := s.GetLibraryItem("RECIPIENT", "LIB1", "IT1")
	if err == nil {
		t.Fatal("err = nil, want the shared-library lookup failure")
	}
	if item != nil {
		t.Errorf("item = %+v, want nil", item)
	}
	if db.itemCalls != 0 {
		t.Errorf("item read %d times, want 0 — ownership was never resolved", db.itemCalls)
	}
}

// The handler answers 404 only if the sentinel survives the service layer, so a
// wrapping that drops %w would silently turn missing items into 500s.
func TestGetLibraryItem_PreservesNotFoundSentinel(t *testing.T) {
	db := &stubDatabase{itemErr: fmt.Errorf("get item: %w", domain.ErrItemNotFound)}
	s := NewServices(db, nil, nil, nil)

	_, err := s.GetLibraryItem("OWNER", "LIB1", "MISSING")
	if !errors.Is(err, domain.ErrItemNotFound) {
		t.Errorf("errors.Is(err, ErrItemNotFound) = false for err = %v, want true", err)
	}
}
