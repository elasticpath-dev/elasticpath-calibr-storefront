import { generateCodeVerifierAndS256Challenge } from "./pkce-utils";

function generateStateToken(): string {
  const array = new Uint8Array(20);
  window.crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateRedirectUri(): string {
  return `${window.location.origin}/oidc`;
}

export const generateOidcLoginRedirectUrl = (
  baseRedirectUrl: string,
  cId: string,
  prevLocation: string,
): Promise<string> => {
  const stateToken = generateStateToken();
  localStorage.setItem("state", stateToken);
  localStorage.setItem("location", prevLocation);
  return generateCodeVerifierAndS256Challenge().then((pkceParameters) => {
    localStorage.setItem("code_verifier", pkceParameters.codeVerifier);
    const url = new URL(baseRedirectUrl);
    url.searchParams.append("client_id", cId);
    url.searchParams.append("redirect_uri", generateRedirectUri());
    url.searchParams.append("state", stateToken);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "openid email profile");
    url.searchParams.append("code_challenge_method", "S256");
    url.searchParams.append("code_challenge", pkceParameters.codeChallenge);
    return url.toString();
  });
};

export function getStoredOidcState(): {
  state: string | null;
  codeVerifier: string | null;
  location: string | null;
} {
  return {
    state: localStorage.getItem("state"),
    codeVerifier: localStorage.getItem("code_verifier"),
    location: localStorage.getItem("location"),
  };
}

export function clearStoredOidcState(): void {
  localStorage.removeItem("state");
  localStorage.removeItem("code_verifier");
  localStorage.removeItem("location");
}
