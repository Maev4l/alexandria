package transport

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
)

func MakeResponse(status int, body interface{}) (*events.APIGatewayProxyResponse, error) {
	resp := events.APIGatewayProxyResponse{Headers: map[string]string{
		"Content-Type":                     "application/json",
		"Access-Control-Allow-Origin":      "*",
		"Access-Control-Allow-Credentials": "true",
	}}
	resp.StatusCode = status
	if body != nil {
		var stringBody []byte
		stringBody, _ = json.Marshal(body)

		resp.Body = string(stringBody)
	}
	/*
		if body != nil {
			var stringBody []byte
			switch t := body.(type) {
			case models.UnsafeMarshaller:
				stringBody, _ = t.Encode()
			default:
				stringBody, _ = json.Marshal(body)
			}

			resp.Body = string(stringBody)
		}
	*/
	return &resp, nil
}
