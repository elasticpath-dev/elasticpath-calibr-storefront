import {
  configureClient,
  postV2AccountMembersTokens,
  getV2AccountMembersAccountMemberId,
} from "@epcc-sdk/sdks-shopper";
import { getSelectedCurrency } from "../currency";

export type EpConnectionConfig = {
  endpointUrl: string;
  clientId: string;
  epContextTag?: string;
  environmentId?: string;
  storeId?: string;
};

export function getAuthClient(connection: EpConnectionConfig) {
  const { client } = configureClient(
    {
      baseUrl: `https://${connection.endpointUrl}`,
      headers: {
        "X-MOLTIN-CURRENCY": getSelectedCurrency(),
        ...(connection.epContextTag
          ? { "EP-Context-Tag": connection.epContextTag }
          : {}),
        ...(connection.environmentId
          ? { "X-REQUEST-ENVIRONMENT-ID": connection.environmentId }
          : {}),
        ...(connection.storeId
          ? { "X-REQUEST-STORE-ID": connection.storeId }
          : {}),
      },
    },

    {
      clientId: connection.clientId,
      storage: "localStorage",
    },
  );
  return client;
}

export type AccountMemberCredential = {
  account_id: string;
  account_name: string;
  token: string;
  expires: string;
};

export type AccountMemberCredentials = {
  accounts: Record<string, AccountMemberCredential>;
  selected: string;
  accountMemberId: string;
  member_name?: string;
  member_email?: string;
};

export function buildCredentials(
  result: Awaited<ReturnType<typeof postV2AccountMembersTokens>>,
): AccountMemberCredentials {
  const tokens = result.data?.data;
  if (!tokens?.length) {
    const errDetail =
      (result as any)?.error?.errors?.[0]?.detail ?? "Authentication failed.";
    throw new Error(errDetail);
  }
  const accountMemberId = (result.data?.meta as any)?.account_member_id ?? "";

  const accounts = tokens.reduce(
    (acc, t) => ({
      ...acc,
      [t.account_id!]: {
        account_id: t.account_id!,
        account_name: t.account_name!,
        token: t.token!,
        expires: t.expires as unknown as string,
      },
    }),
    {} as Record<string, AccountMemberCredential>,
  );

  return {
    accounts,
    selected: tokens[0]!.account_id!,
    accountMemberId,
  };
}

export async function fetchMemberProfile(
  amToken: string,
  accountMemberId: string,
  connection: EpConnectionConfig,
): Promise<{ name: string; email: string }> {
  try {
    const client = getAuthClient(connection);
    const interceptorFn = (req: Request) => {
      req.headers.set("EP-Account-Management-Authentication-Token", amToken);
      return req;
    };
    client.interceptors.request.use(interceptorFn);
    try {
      const result = await getV2AccountMembersAccountMemberId({
        client,
        path: { accountMemberID: accountMemberId },
      });
      return {
        name: result.data?.data?.name ?? "",
        email: result.data?.data?.email ?? "",
      };
    } finally {
      client.interceptors.request.eject(interceptorFn);
    }
  } catch {
    return { name: "", email: "" };
  }
}

export async function loginWithAccountManagement(
  email: string,
  password: string,
  passwordProfileId: string,
  connection: EpConnectionConfig,
): Promise<AccountMemberCredentials> {
  const client = getAuthClient(connection);
  const result = await postV2AccountMembersTokens({
    client,
    body: {
      data: {
        type: "account_management_authentication_token",
        authentication_mechanism: "password",
        password_profile_id: passwordProfileId,
        username: email.toLowerCase(), // Known bug: EP AM tokens fail for uppercase usernames
        password,
      },
    },
  });
  const credentials = buildCredentials(result);

  const firstToken = Object.values(credentials.accounts)[0]?.token ?? "";
  if (credentials.accountMemberId && firstToken) {
    const profile = await fetchMemberProfile(
      firstToken,
      credentials.accountMemberId,
      connection,
    );
    credentials.member_name = profile.name;
    credentials.member_email = profile.email || email;
  } else {
    credentials.member_email = email;
  }

  return credentials;
}

export async function registerWithAccountManagement(
  name: string,
  email: string,
  password: string,
  passwordProfileId: string,
  connection: EpConnectionConfig,
): Promise<AccountMemberCredentials> {
  const client = getAuthClient(connection);
  const result = await postV2AccountMembersTokens({
    client,
    body: {
      data: {
        type: "account_management_authentication_token",
        authentication_mechanism: "self_signup",
        password_profile_id: passwordProfileId,
        username: email.toLowerCase(),
        password,
        name,
        email,
      } as any,
    },
  });
  const credentials = buildCredentials(result);
  credentials.member_name = name;
  credentials.member_email = email;
  return credentials;
}

export async function requestPasswordReset(_email: string): Promise<void> {
  // EP Account Management password reset requires OTP setup at the realm level.
  // For now this is a no-op; integrate createOneTimePasswordTokenRequest when OTP is configured.
  await new Promise((resolve) => setTimeout(resolve, 500));
}
