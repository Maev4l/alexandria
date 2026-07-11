package main

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

type fakeApprover struct {
	approveErr    error
	deleteErr     error
	isApprovedErr error
	approved      bool
	approvedUser  string
	deletedUser   string
}

func (f *fakeApprover) ApproveUser(u string) error        { f.approvedUser = u; return f.approveErr }
func (f *fakeApprover) DeleteUser(u string) error         { f.deletedUser = u; return f.deleteErr }
func (f *fakeApprover) IsApproved(u string) (bool, error) { return f.approved, f.isApprovedErr }

type fakeNotifier struct {
	alerts      int
	lastContent string
}

func (f *fakeNotifier) Notify(_ string, content string) error {
	f.alerts++
	f.lastContent = content
	return nil
}

func TestHandleDecision_Approve(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionApprove, Payload: "U1", CallbackID: "x@y.z"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "U1" {
		t.Fatalf("approvedUser = %q, want U1", a.approvedUser)
	}
	if n.alerts != 0 {
		t.Fatalf("expected no alert on success, got %d", n.alerts)
	}
}

func TestHandleDecision_Reject(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U2", CallbackID: "x@y.z"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.deletedUser != "U2" {
		t.Fatalf("deletedUser = %q, want U2", a.deletedUser)
	}
	if n.alerts != 0 {
		t.Fatalf("expected no alert on success, got %d", n.alerts)
	}
}

func TestHandleDecision_ApproveError_AlertsWithEmail(t *testing.T) {
	a, n := &fakeApprover{approveErr: errors.New("boom")}, &fakeNotifier{}
	err := handleDecision(a, n, decision{Action: actionApprove, Payload: "U3", CallbackID: "fail@y.z"})
	if err == nil {
		t.Fatal("expected error to propagate")
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 failure alert, got %d", n.alerts)
	}
	if !strings.Contains(n.lastContent, "fail@y.z") {
		t.Fatalf("alert content missing email: %q", n.lastContent)
	}
}

func TestHandleDecision_RejectError_Alerts(t *testing.T) {
	a, n := &fakeApprover{deleteErr: errors.New("boom")}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U4", CallbackID: "x@y.z"}); err == nil {
		t.Fatal("expected error to propagate")
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 failure alert, got %d", n.alerts)
	}
}

func TestHandleDecision_Reject_AlreadyApproved_SkipsDelete(t *testing.T) {
	a, n := &fakeApprover{approved: true}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U9", CallbackID: "x@y.z"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.deletedUser != "" {
		t.Fatalf("must NOT delete an already-approved user, deleted %q", a.deletedUser)
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 reject-ignored alert, got %d", n.alerts)
	}
	if !strings.Contains(n.lastContent, "x@y.z") {
		t.Fatalf("alert missing email: %q", n.lastContent)
	}
}

func TestHandleDecision_Reject_IsApprovedError_Alerts(t *testing.T) {
	a, n := &fakeApprover{isApprovedErr: errors.New("boom")}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U9", CallbackID: "x@y.z"}); err == nil {
		t.Fatal("expected error to propagate")
	}
	if a.deletedUser != "" {
		t.Fatal("must not delete when approval check failed")
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 failure alert, got %d", n.alerts)
	}
}

func TestHandleDecision_UnknownAction_Ignored(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: "nope", Payload: "U5"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "" || a.deletedUser != "" || n.alerts != 0 {
		t.Fatal("unknown action should be a no-op")
	}
}

func snsEvent(message string) events.SNSEvent {
	return events.SNSEvent{Records: []events.SNSEventRecord{{SNS: events.SNSEntity{Message: message}}}}
}

func TestMakeHandler_IgnoresForeignSource(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	h := makeHandler(a, n)
	msg := `{"source":"some-other-app","action":"approve","payload":"U1","callbackId":"x@y.z"}`
	if err := h(context.Background(), snsEvent(msg)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "" {
		t.Fatalf("foreign source must be ignored, approved %q", a.approvedUser)
	}
}

func TestMakeHandler_ProcessesOwnSource(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	h := makeHandler(a, n)
	msg := `{"source":"alexandria-onboard-users","action":"approve","payload":"U1","callbackId":"x@y.z"}`
	if err := h(context.Background(), snsEvent(msg)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "U1" {
		t.Fatalf("own-source decision not processed, approvedUser = %q", a.approvedUser)
	}
}
