package cognito

import (
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func TestParseUserAttributes(t *testing.T) {
	attrs := []types.AttributeType{
		{Name: aws.String("custom:Id"), Value: aws.String("ABC123")},
		{Name: aws.String("name"), Value: aws.String("John")},
		{Name: aws.String("email"), Value: aws.String("john@x.com")},
		{Name: aws.String("custom:Approved"), Value: aws.String("true")},
	}
	id, name, email, approved := parseUserAttributes(attrs)
	if id != "ABC123" || name != "John" || email != "john@x.com" || !approved {
		t.Fatalf("got id=%q name=%q email=%q approved=%v", id, name, email, approved)
	}
}

func TestParseUserAttributesUnapproved(t *testing.T) {
	attrs := []types.AttributeType{
		{Name: aws.String("custom:Approved"), Value: aws.String("false")},
	}
	_, _, _, approved := parseUserAttributes(attrs)
	if approved {
		t.Fatal("expected approved=false")
	}
}
