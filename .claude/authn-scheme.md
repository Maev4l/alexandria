# Authentication Scheme

## Overview

Alexandria uses AWS Cognito for authentication with two sign-in methods:
- **Native**: Email + password
- **Federated**: Google OAuth (extensible to other providers)

All users require admin approval before accessing the application.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│   Frontend      │────▶│  AWS Cognito    │────▶│  user-management Lambda │
│   (React)       │     │  User Pool      │     │  (PreSignUp, PostConfirm)│
└─────────────────┘     └─────────────────┘     └─────────────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Google OAuth   │
                        │  (via Cognito)  │
                        └─────────────────┘
```

## Custom Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `custom:Id` | String | Unique user identifier (UUID, uppercase, no dashes). Used as owner ID in DynamoDB. |
| `custom:Approved` | String | "true" or "false". Users cannot access the app until approved by admin. |

## Sign-Up Flows

### Native Sign-Up

```
User submits email + password
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ PreSignUp_SignUp trigger                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Validate username is email format                        │
│ 2. Check if ANY user exists with same email                 │
│    ├─ YES → Reject: "user already exists"                   │
│    └─ NO  → Continue                                        │
│ 3. Auto-confirm user (skip email verification)              │
│ 4. Send SNS notification for admin approval                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ PostConfirmation_ConfirmSignUp trigger                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Generate new custom:Id (UUID)                            │
│ 2. Set custom:Approved = "false"                            │
│ 3. Set email attribute from username                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
   User created (pending approval)
```

### Federated Sign-Up (Google)

```
User clicks "Sign in with Google"
         │
         ▼
   Cognito redirects to Google
         │
         ▼
   User authenticates with Google
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ PreSignUp_ExternalProvider trigger                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Extract email from Google attributes                     │
│ 2. Check if ANY user exists with same email                 │
│    ├─ YES → Link federated identity to existing user        │
│    │        Return error: "linked to existing account"      │
│    │        (prevents duplicate user creation)              │
│    └─ NO  → Continue (new user)                             │
│ 3. Send SNS notification for admin approval                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ (only if new user)
┌─────────────────────────────────────────────────────────────┐
│ PostConfirmation_ConfirmSignUp trigger                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Generate new custom:Id (UUID)                            │
│ 2. Set custom:Approved = "false"                            │
│ (email already set from Google)                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
   User created (pending approval)
```

## Account Linking

The system ensures **one Cognito user per email** regardless of sign-in method.

### Linking Matrix

| Existing User | New Sign-Up | Result |
|---------------|-------------|--------|
| Native | Native (same email) | Blocked: `UsernameExistsException` |
| Native | Google (same email) | Linked → native user gains Google identity |
| Google | Native (same email) | Blocked: "user already exists" |
| Google | Facebook (same email) | Linked → Google user gains Facebook identity |
| Facebook | Google (same email) | Linked → Facebook user gains Google identity |

### Linking Mechanism

Uses Cognito's `AdminLinkProviderForUser` API:

```go
linkInput := &cognitoidentityprovider.AdminLinkProviderForUserInput{
    UserPoolId: aws.String(userPoolId),
    DestinationUser: &types.ProviderUserIdentifierType{
        ProviderName:           aws.String("Cognito"),
        ProviderAttributeValue: aws.String(existingUsername),
    },
    SourceUser: &types.ProviderUserIdentifierType{
        ProviderName:           aws.String("Google"),
        ProviderAttributeName:  aws.String("Cognito_Subject"),
        ProviderAttributeValue: aws.String(googleSubjectId),
    },
}
```

### Provider Name Normalization

Cognito generates federated usernames with lowercase prefixes (e.g., `google_123456789`), but `AdminLinkProviderForUser` requires PascalCase provider names. The Lambda normalizes:

| Username Prefix | Cognito Provider Name |
|-----------------|----------------------|
| `google` | `Google` |
| `facebook` | `Facebook` |
| `signinwithapple` | `SignInWithApple` |
| `loginwithamazon` | `LoginWithAmazon` |

## Sign-In Flows

### Native Sign-In

```
User submits email + password
         │
         ▼
   Cognito validates credentials
         │
         ├─ Invalid → Error: "Incorrect username or password"
         │
         ├─ Not confirmed → Error: "UserNotConfirmedException"
         │   (Frontend shows: "Your account is pending approval")
         │
         └─ Valid → Return tokens
                    │
                    ▼
              Frontend extracts from ID token:
              - custom:Id
              - custom:Approved
              - email
              - name (display name)
                    │
                    ├─ Approved = false → Show "Pending Approval" page
                    │
                    └─ Approved = true → Redirect to app
```

### Federated Sign-In (Google)

```
User clicks "Sign in with Google"
         │
         ▼
   signInWithRedirect({ provider: 'Google' })
         │
         ▼
   Cognito redirects to Google → User authenticates → Redirect back
         │
         ├─ New user (no existing account)
         │   └─ PreSignUp + PostConfirmation triggers fire
         │      └─ Redirect to app (pending approval)
         │
         ├─ Linked to existing account
         │   └─ Cognito returns error_description: "...linked..."
         │      └─ Frontend shows: "Your Google account has been linked. Please sign in again."
         │      └─ User must sign in again (expected Cognito behavior)
         │
         └─ Existing federated user
             └─ Direct sign-in, return tokens
```

## OAuth Callback Handling

The frontend checks URL parameters after OAuth redirect:

```javascript
const checkOAuthError = () => {
  const params = new URLSearchParams(window.location.search);
  const errorDesc = params.get('error_description');

  if (errorDesc) {
    window.history.replaceState({}, '', window.location.pathname);

    if (errorDesc.toLowerCase().includes('linked')) {
      return { type: 'linked' };  // Success: account linked
    }
    if (errorDesc.toLowerCase().includes('user already exists')) {
      return { type: 'error', message: 'Account exists. Sign in with Google.' };
    }
    return { type: 'error', message: errorDesc };
  }
  return null;
};
```

## Admin Approval Flow

```
New user signs up (native or federated)
         │
         ▼
   SNS notification sent
         │
         ▼
   Slack message: "Awaiting registration for user@example.com"
         │
         ▼
   Admin uses CLI to approve:
   $ alexandria users approve user@example.com
         │
         ▼
   CLI sets custom:Approved = "true" via AdminUpdateUserAttributes
         │
         ▼
   User can now access the app
```

## JWT Token Structure

ID token claims used by the application:

| Claim | Description |
|-------|-------------|
| `sub` | Cognito user ID (UUID with dashes) |
| `email` | User's email address |
| `name` | Display name (optional, from Google or native signup) |
| `custom:Id` | Application user ID (UUID, uppercase, no dashes) |
| `custom:Approved` | "true" or "false" |

**Note**: The `custom:Id` is used as the owner ID throughout the application (libraries, items, sharing). It is normalized: UUID without dashes, uppercase.

## Infrastructure

### Cognito User Pool (Terraform)

```hcl
# User Pool with Lambda triggers
resource "aws_cognito_user_pool" "alexandria_user_pool" {
  lambda_config {
    pre_sign_up       = aws_lambda_function.user_management.arn
    post_confirmation = aws_lambda_function.user_management.arn
  }
}

# Google Identity Provider
resource "aws_cognito_identity_provider" "google" {
  provider_name = "Google"
  provider_type = "Google"
  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# User Pool Client with OAuth
resource "aws_cognito_user_pool_client" "alexandria_client" {
  supported_identity_providers = ["COGNITO", "Google"]
  allowed_oauth_flows          = ["code"]
  allowed_oauth_scopes         = ["openid", "email", "profile"]
  callback_urls = [
    "https://alexandria.isnan.eu/",
    "http://localhost:5173/"
  ]
}
```

### Lambda IAM Permissions

```hcl
actions = [
  "cognito-idp:AdminGetUser",
  "cognito-idp:AdminUpdateUserAttributes",
  "cognito-idp:AdminLinkProviderForUser",
  "cognito-idp:ListUsers",
]
```

## Error Messages

| Error | Context | User Message |
|-------|---------|--------------|
| `UsernameExistsException` | Native signup | "An account with this email already exists" |
| `user already exists` | Native signup (PreSignUp) | "An account with this email already exists." |
| `UserNotConfirmedException` | Native sign-in | "Your account is pending approval..." |
| `linked to existing account` | OAuth callback | "Your Google account has been linked. Please sign in again." |

## Security Considerations

1. **No email verification**: Native users are auto-confirmed. Admin approval serves as the verification step.
2. **One user per email**: Account linking prevents duplicate accounts across providers.
3. **Secrets in SSM**: Google OAuth credentials stored as SecureString in Parameter Store.
4. **Custom domain**: OAuth uses `alexandria-auth.isnan.eu` for branded experience.
