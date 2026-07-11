package main

import (
	"strings"
	"testing"

	"github.com/Maev4l/platform/users-management/pkg/cognito"
)

func TestSignupNotification_HasApproveRejectButtons(t *testing.T) {
	msg := signupNotification(&cognito.PreSignUpEvent{Email: "a@b.c", UserName: "U9"})

	if msg.Source != "alexandria-onboard-users" {
		t.Fatalf("source = %q, want alexandria-onboard-users", msg.Source)
	}
	if !strings.Contains(msg.Content, "a@b.c") {
		t.Fatalf("content missing email: %q", msg.Content)
	}
	if msg.Interactive == nil {
		t.Fatal("expected Interactive block, got nil")
	}
	if msg.Interactive.CallbackID != "a@b.c" {
		t.Fatalf("callbackId = %q, want a@b.c", msg.Interactive.CallbackID)
	}
	if msg.Interactive.Payload != "U9" {
		t.Fatalf("payload = %q, want U9", msg.Interactive.Payload)
	}
	if len(msg.Interactive.Actions) != 2 {
		t.Fatalf("expected 2 actions, got %d", len(msg.Interactive.Actions))
	}
	if msg.Interactive.Actions[0].ID != "approve" || msg.Interactive.Actions[1].ID != "reject" {
		t.Fatalf("unexpected action ids: %+v", msg.Interactive.Actions)
	}
}
