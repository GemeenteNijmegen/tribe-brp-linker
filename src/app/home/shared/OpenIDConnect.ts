import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Issuer, generators } from 'openid-client';

export class OpenIDConnect {
  issuer;
  clientSecret : string|undefined = undefined;

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
      organization_id: process.env.AUTH_ORG_ID,
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

    const client = await this.createClient();

    const params = client.client.callbackParams(client.redirect_uri + '/?code=' + code);
    if (state !== returnedState) {
      throw new Error('state does not match session state');
    }
    let tokenSet;
    try {
      console.debug(client.redirect_uri, params, state);
      tokenSet = await client.client.oauthCallback(client.redirect_uri.toString(), params);
      console.debug(tokenSet);
      return tokenSet;
    } catch (err: any) {
      console.debug(err);
      throw new Error(`${err.error} ${err.error_description} ${err?.error_hint}`);
    }
  }

  private async createClient() {
    if (process.env?.APPLICATION_URL_BASE == undefined || process.env.OIDC_CLIENT_ID == undefined) {
      throw Error('All environment variables should be set');
    }
    const base_url = new URL(process.env.APPLICATION_URL_BASE);
    const redirect_uri = new URL('/auth', base_url);
    const client_secret = await this.getOidcClientSecret();
    const client = new this.issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID,
      redirect_uris: [redirect_uri.toString()],
      client_secret: client_secret,
      token_endpoint_auth_method: 'client_secret_post',
      response_types: ['code'],
    });
    return {
      client: client,
      redirect_uri: redirect_uri,
    };
  }

  async refresh(refreshToken: string) {
    const client = await this.createClient();
    let tokenSet;
    try {
      console.debug('Using oAuth refresh token');
      tokenSet = await client.client.refresh(refreshToken);
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
}