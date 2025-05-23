import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Issuer, generators } from 'openid-client';

export class OpenIDConnect {
  issuer;
  clientSecret: string|undefined = undefined;

  /**
     * Helper class for our OIDC auth flow
     */
  constructor() {
    this.issuer = this.getIssuer();
  }

  /**
     * Retrieve client secret from secrets manager
     *
     * @returns string the client secret
     */
  async getOidcClientSecret() {
    if (!this.clientSecret) {
      const secretsManagerClient = new SecretsManagerClient({});
      const command = new GetSecretValueCommand({ SecretId: process.env.CLIENT_SECRET_ARN });
      const data = await secretsManagerClient.send(command);
      // Depending on whether the secret is a string or binary, one of these fields will be populated.
      if ('SecretString' in data) {
        this.clientSecret = data.SecretString;
      } else {
        console.log('no secret value found');
      }
    }
    return this.clientSecret;
  }

  /**
     * setup the oidc issuer. For now using env. parameters & hardcoded urls
     * Issuer could also be discovered based on file in .well-known, this
     * should be cached somehow.
     *
     * @returns openid-client Issuer
     */
  getIssuer() {
    const issuer = new Issuer({
      issuer: `${process.env.AUTH_URL_BASE}`,
      authorization_endpoint: `${process.env.AUTH_URL_BASE}/auth`,
      token_endpoint: `${process.env.AUTH_URL_BASE}/token`,
    });
    return issuer;
  }

  /**
     * Get the login url for the OIDC-provider.
     * @param {string} state A string parameter that gets returned in the auth callback.
     * This should be checked before accepting the login response.
     * @returns {string} the login url
     */
  getLoginUrl(state: string): string {
    if (process.env?.APPLICATION_URL_BASE == undefined || process.env.OIDC_CLIENT_ID == undefined) {
      throw Error('All environment variables should be set');
    }
    const base_url = new URL(process.env.APPLICATION_URL_BASE);
    const redirect_uri = new URL('/auth', base_url);
    const client = new this.issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID,
      redirect_uris: [redirect_uri.toString()],
      response_types: ['code'],
    });
    const authUrl = client.authorizationUrl({
      scope: process.env.OIDC_SCOPE,
      resource: process.env.AUTH_URL_BASE,
      state: state,
      organization_id: process.env.AUTH_ORG_ID, // TODO check if this is needer (it is never set in cdk)
    });
    return authUrl;
  }

  /**
     * Use the returned code from the OIDC-provider and stored state param
     * to complete the login flow.
     *
     * @param {string} code
     * @param {string} state
     * @returns {Promise<any | false>} returns a promise which resolves to a claims object on succesful auth
     */
  async authorize(code: string, state: string, returnedState: string): Promise<any | false> {
    const redirect_uri = this.getRedirectUri();
    const client = await this.createClient(redirect_uri);

    const params = client.callbackParams(redirect_uri + '/?code=' + code);
    if (state !== returnedState) {
      throw new Error('state does not match session state');
    }
    let tokenSet;
    try {
      console.debug(redirect_uri, params, state);
      tokenSet = await client.oauthCallback(redirect_uri.toString(), params);
      console.debug(tokenSet);
      return tokenSet;
    } catch (err: any) {
      console.debug(err);
      throw new Error(`${err.error} ${err.error_description} ${err?.error_hint}`);
    }
  }

  /**
   * Refreshes the access token at the OIDC-provider using the given refresh token.
   * @param refreshToken refresh_token in session
   * @returns a new TokenSet to be parsed/stored in the session
   */
  async refresh(refreshToken: string) {
    const client = await this.createClient(this.getRedirectUri());
    let tokenSet;
    try {
      console.debug('Using oAuth refresh token');
      tokenSet = await client.refresh(refreshToken);
      console.debug(tokenSet);
      return tokenSet;
    } catch (err: any) {
      console.debug(err);
      throw new Error(`${err.error} ${err.error_description} ${err?.error_hint}`);
    }
  }

  generateState() {
    return generators.state();
  }

  private getRedirectUri() {
    if (process.env?.APPLICATION_URL_BASE == undefined) {
      throw Error('APPLICATION_URL_BASE env variable must be set');
    }
    const base_url = new URL(process.env.APPLICATION_URL_BASE);
    return new URL('/auth', base_url);
  }

  private getOidcClientId() {
    if (process.env.OIDC_CLIENT_ID == undefined) {
      throw Error('OIDC_CLIENT_ID env variable must be set');
    }
    return process.env.OIDC_CLIENT_ID;
  }

  private async createClient(redirect_uri: URL) {
    const client_id = this.getOidcClientId();
    const client_secret = await this.getOidcClientSecret();
    const client = new this.issuer.Client({
      client_id: client_id,
      redirect_uris: [redirect_uri.toString()],
      client_secret: client_secret,
      token_endpoint_auth_method: 'client_secret_post',
      response_types: ['code'],
    });
    return client;
  }

}