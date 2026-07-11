package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/rs/zerolog/log"
)

// Action IDs must match the buttons emitted by user-onboarding's signup
// notification (packages/functions/user-onboarding/cmd/main.go).
const (
	actionApprove = "approve"
	actionReject  = "reject"
)

// appSource is this application's notification source. The SNS subscription
// already filters on it (filter_policy), but we re-check in code so a
// misconfigured subscription can never make us act on another app's decision.
const appSource = "alexandria-onboard-users"

// decision is the shape the platform alerter responder publishes onto the
// alerting-responses topic. The json tags ARE the wire contract with the
// responder; we consume only the fields we act on.
type decision struct {
	Source     string `json:"source"`
	CallbackID string `json:"callbackId"` // the user's email (human label)
	Action     string `json:"action"`     // "approve" | "reject"
	Payload    string `json:"payload"`    // the Cognito username
}

// approver applies an admin decision to a Cognito user.
type approver interface {
	ApproveUser(username string) error
	DeleteUser(username string) error
	IsApproved(username string) (bool, error)
}

// notifier publishes a best-effort failure alert back to Slack.
type notifier interface {
	Notify(sourceDescription, content string) error
}

// handleDecision applies one decision. On a Cognito failure it emits a Slack
// alert (the responder already optimistically confirmed the click, so a silent
// failure would otherwise be invisible) and returns the error for logging.
func handleDecision(a approver, n notifier, d decision) error {
	switch d.Action {
	case actionApprove:
		if err := a.ApproveUser(d.Payload); err != nil {
			alertFailure(n, d, err)
			return err
		}
		log.Info().Str("email", d.CallbackID).Msg("User approved via Slack")
	case actionReject:
		// Guard: the Slack buttons never expire, so a Reject can arrive after the
		// user was already approved via another path (CLI, a second admin, or a
		// linked-existing account). Deleting an active user would orphan their
		// DynamoDB rows, so skip the delete and notify instead.
		approved, err := a.IsApproved(d.Payload)
		if err != nil {
			alertFailure(n, d, err)
			return err
		}
		if approved {
			log.Warn().Str("email", d.CallbackID).Msg("Reject ignored: user already approved")
			alertRejectIgnored(n, d)
			return nil
		}
		if err := a.DeleteUser(d.Payload); err != nil {
			alertFailure(n, d, err)
			return err
		}
		log.Info().Str("email", d.CallbackID).Msg("User rejected (deleted) via Slack")
	default:
		log.Warn().Str("action", d.Action).Msg("Unknown decision action; ignoring")
	}
	return nil
}

// alertFailure publishes a Markdown failure alert. The email is fenced as inline
// code (may contain _). Best-effort: a failed alert is only logged.
func alertFailure(n notifier, d decision, cause error) {
	content := fmt.Sprintf(
		"# ⚠️ Signup Decision Failed\n\n- **Action:** %s\n- **User:** `%s`\n- **App:** Alexandria\n- **Error:** %s",
		d.Action, d.CallbackID, cause.Error())
	if err := n.Notify("", content); err != nil {
		log.Error().Err(err).Msg("Failed to publish decision-failure alert")
	}
}

// alertRejectIgnored notifies operators that a Reject was a no-op because the
// user is already approved. Best-effort, like alertFailure.
func alertRejectIgnored(n notifier, d decision) {
	content := fmt.Sprintf(
		"# ℹ️ Reject Ignored\n\n- **User:** `%s`\n- **App:** Alexandria\n- **Reason:** already approved (via another path); not deleted to avoid orphaning data",
		d.CallbackID)
	if err := n.Notify("", content); err != nil {
		log.Error().Err(err).Msg("Failed to publish reject-ignored alert")
	}
}

// makeHandler builds the SNS event handler. It always returns nil: failures are
// alerted + logged, and returning an error would make SNS retry and re-process
// (double-alert). Records are independent, so one bad record never blocks others.
func makeHandler(a approver, n notifier) func(context.Context, events.SNSEvent) error {
	return func(ctx context.Context, e events.SNSEvent) error {
		for _, rec := range e.Records {
			var d decision
			if err := json.Unmarshal([]byte(rec.SNS.Message), &d); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal decision; skipping record")
				continue
			}
			// Defensive: only act on this app's decisions (the SNS filter policy
			// should already guarantee this).
			if d.Source != appSource {
				log.Warn().Str("source", d.Source).Msg("Decision for a different app; ignoring")
				continue
			}
			if err := handleDecision(a, n, d); err != nil {
				log.Error().Err(err).Str("action", d.Action).Msg("Decision failed")
			}
		}
		return nil
	}
}
