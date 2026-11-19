import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

// A local test authenticator uses ephemeral ES256 keys; nothing is persisted on a device.
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest();
export function makeTestPasskey(rpId = "localhost") {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const { x, y } = publicKey.export({format: "jwk"});
  const cose = isoCBOR.encode(new Map<number, number | Uint8Array>([
    [1, 2], [3, -7], [-1, 1], [-2, Uint8Array.from(Buffer.from(x!, "base64url"))],
    [-3, Uint8Array.from(Buffer.from(y!, "base64url"))],
  ]));
  const id = randomBytes(32);
  const credential = { id: id.toString("base64url"), rawId: id.toString("base64url"), type: "public-key" as const,
    clientExtensionResults: { credProps: {rk:true} } };
  const authData = (flags: number, seq: number) => {
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(seq);
    return Buffer.concat([hash(rpId), Buffer.from([flags]), counter]);
  };
  return {
    register(challenge: string, origin = "http://localhost:5173", uv = true): RegistrationResponseJSON {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(id.length);
      const data = Buffer.concat([authData(uv ? 0x45 : 0x41, 0), Buffer.alloc(16), length, id, cose]);
      const attestation = isoCBOR.encode(new Map<string, string | Map<never, never> | Uint8Array>([
        ["fmt", "none"], ["attStmt", new Map<never, never>()], ["authData", Uint8Array.from(data)],
      ]));
      const client = JSON.stringify({type:"webauthn.create", challenge, origin, crossOrigin:false});
      return {...credential, response:{clientDataJSON: Buffer.from(client).toString("base64url"), attestationObject: Buffer.from(attestation).toString("base64url")}};
    },
    authenticate(challenge: string, userHandle: string, counter: number, origin = "http://localhost:5173", uv = true): AuthenticationResponseJSON {
      const client = Buffer.from(JSON.stringify({type:"webauthn.get", challenge, origin, crossOrigin:false}));
      const data = authData(uv ? 0x05 : 0x01, counter);
      const signature = sign("sha256", Buffer.concat([data, hash(client)]), privateKey);
      return {...credential, response:{clientDataJSON: client.toString("base64url"), authenticatorData: data.toString("base64url"),
        signature: signature.toString("base64url"), userHandle}};
    },
  };
}
