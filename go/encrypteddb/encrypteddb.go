package encrypteddb

import (
	"fmt"

	"github.com/keybase/client/go/libkb"
	"github.com/keybase/go-codec/codec"
	"golang.org/x/crypto/nacl/secretbox"
	"golang.org/x/net/context"
)

type DbFn func(g *libkb.GlobalContext) *libkb.JSONLocalDb
type KeyFn func(context.Context) ([32]byte, error)

type boxedData struct {
	V int
	N [24]byte
	E []byte
}

// ***
// If we change this, make sure to update the key derivation reason for all callers of EncryptedDB!
// ***
const cryptoVersion = 1

// Handle to a db that encrypts values using nacl secretbox.
// Does not encrypt keys.
// Not threadsafe.
type EncryptedDB struct {
	libkb.Contextified

	getSecretBoxKey KeyFn
	getDB           DbFn
}

func New(g *libkb.GlobalContext, getDB DbFn, getSecretBoxKey KeyFn) *EncryptedDB {
	return &EncryptedDB{
		Contextified:    libkb.NewContextified(g),
		getDB:           getDB,
		getSecretBoxKey: getSecretBoxKey,
	}
}

// Get a value
// Decodes into res
// Returns (found, err). Res is valid only if (found && err == nil)
func (i *EncryptedDB) Get(ctx context.Context, key libkb.DbKey, res interface{}) (bool, error) {
	var err error
	db := i.getDB(i.G())
	b, found, err := db.GetRaw(key)
	if err != nil {
		return false, err
	}
	if !found {
		return false, nil
	}

	// Decode encrypted box
	var boxed boxedData
	if err := decode(b, &boxed); err != nil {
		return true, err
	}
	if boxed.V > cryptoVersion {
		return true, fmt.Errorf("bad crypto version: %d current: %d", boxed.V,
			cryptoVersion)
	}
	enckey, err := i.getSecretBoxKey(ctx)
	if err != nil {
		return true, err
	}
	pt, ok := secretbox.Open(nil, boxed.E, &boxed.N, &enckey)
	if !ok {
		return true, fmt.Errorf("failed to decrypt item")
	}

	if err = decode(pt, res); err != nil {
		return true, err
	}

	return true, nil
}

func (i *EncryptedDB) Put(ctx context.Context, key libkb.DbKey, data interface{}) error {
	db := i.getDB(i.G())
	dat, err := encode(data)
	if err != nil {
		return err
	}

	enckey, err := i.getSecretBoxKey(ctx)
	if err != nil {
		return err
	}
	var nonce []byte
	nonce, err = libkb.RandBytes(24)
	if err != nil {
		return err
	}
	var fnonce [24]byte
	copy(fnonce[:], nonce)
	sealed := secretbox.Seal(nil, dat, &fnonce, &enckey)
	boxed := boxedData{
		V: cryptoVersion,
		E: sealed,
		N: fnonce,
	}

	// Encode encrypted box
	if dat, err = encode(boxed); err != nil {
		return err
	}

	// Write out
	return db.PutRaw(key, dat)
}

func (i *EncryptedDB) Delete(ctx context.Context, key libkb.DbKey) error {
	db := i.getDB(i.G())
	return db.Delete(key)
}

func encode(input interface{}) ([]byte, error) {
	mh := codec.MsgpackHandle{WriteExt: true}
	var data []byte
	enc := codec.NewEncoderBytes(&data, &mh)
	if err := enc.Encode(input); err != nil {
		return nil, err
	}
	return data, nil
}

func decode(data []byte, res interface{}) error {
	mh := codec.MsgpackHandle{WriteExt: true}
	dec := codec.NewDecoderBytes(data, &mh)
	err := dec.Decode(res)
	return err
}
