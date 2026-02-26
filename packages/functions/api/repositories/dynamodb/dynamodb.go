package dynamodb

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"os"
	"sync"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

var tableName string = os.Getenv("DYNAMODB_TABLE_NAME")
var secretKeyParam string = os.Getenv("LEK_SECRET_KEY")

// Cached secret key with one-time fetch from SSM
var (
	secretKey     string
	secretKeyOnce sync.Once
	secretKeyErr  error
)

// getSecretKey fetches the encryption key from SSM once, caching the result
func getSecretKey() (string, error) {
	secretKeyOnce.Do(func() {
		region := os.Getenv("REGION")
		cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
		if err != nil {
			secretKeyErr = err
			return
		}

		ssmClient := ssm.NewFromConfig(cfg)
		withDecryption := true
		output, err := ssmClient.GetParameter(context.TODO(), &ssm.GetParameterInput{
			Name:           &secretKeyParam,
			WithDecryption: &withDecryption,
		})
		if err != nil {
			secretKeyErr = err
			return
		}

		secretKey = *output.Parameter.Value
	})

	return secretKey, secretKeyErr
}

type dynamo struct {
	client *dynamodb.Client
}

func NewDynamoDB(region string) *dynamo {
	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	client := dynamodb.NewFromConfig(config)
	return &dynamo{
		client: client,
	}
}

func serializeLek(lek map[string]types.AttributeValue) (*string, error) {
	var inputMap map[string]interface{}
	err := attributevalue.UnmarshalMap(lek, &inputMap)
	if err != nil {
		return nil, err
	}
	bytesJSON, err := json.Marshal(inputMap)
	if err != nil {
		return nil, err
	}

	key, err := getSecretKey()
	if err != nil {
		return nil, err
	}

	aes, err := aes.NewCipher([]byte(key))
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(aes)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	_, err = rand.Read(nonce)
	if err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nonce, nonce, bytesJSON, nil)
	output := base64.StdEncoding.EncodeToString(ciphertext)

	return &output, nil
}

func deserializeLek(lek string) (map[string]types.AttributeValue, error) {
	dec, err := base64.StdEncoding.DecodeString(lek)
	if err != nil {
		return nil, err
	}

	key, err := getSecretKey()
	if err != nil {
		return nil, err
	}

	aes, err := aes.NewCipher([]byte(key))
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(aes)
	if err != nil {
		return nil, err
	}

	// Since we know the ciphertext is actually nonce+ciphertext
	// And len(nonce) == NonceSize(). We can separate the two.
	nonceSize := gcm.NonceSize()
	nonce, ciphertext := dec[:nonceSize], dec[nonceSize:]

	plaintext, err := gcm.Open(nil, []byte(nonce), []byte(ciphertext), nil)
	if err != nil {
		return nil, err
	}

	outputJSON := map[string]interface{}{}
	err = json.Unmarshal(plaintext, &outputJSON)
	if err != nil {
		return nil, err
	}

	return attributevalue.MarshalMap(outputJSON)
}
