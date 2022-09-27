const { Session } = require('@gemeentenijmegen/session');
const { OpenIDConnect } = require('./shared/OpenIDConnect');

function redirectResponse(location, code = 302, cookies) {
    return {
        'statusCode': code,
        'body': '',
        'headers': {
            'Location': location
        },
        'cookies': cookies
    };
}

async function handleRequest(cookies, queryStringParamCode, queryStringParamState, dynamoDBClient) {
    let session = new Session(cookies, dynamoDBClient);
    await session.init();
    if (session.sessionId === false) {
        return redirectResponse('/login');
    }
    const state = session.getValue('state');
    const contact_id = session.getValue('contact_id');
    const OIDC = new OpenIDConnect(); 
    try {
        const tokenSet = await OIDC.authorize(queryStringParamCode, state, queryStringParamState, queryStringParamState);    
        if (tokenSet) {
            await session.createSession({ 
                loggedin: { BOOL: true },
                access_token: { S: tokenSet.access_token },
                refresh_token: { S: tokenSet.refresh_token },
                expires_in: { N: `${tokenSet.expires_in}` },
            });
        } else {
            return { 'statusCode': 500 }
        }
    } catch (error) {
        console.debug('test2', error);
        console.error(error.message);
        return redirectResponse('/login');
    }
    const url = contact_id ? `/?contact_id=${contact_id}` : '/';
    return redirectResponse(url, 302, [session.getCookie()]);
}
exports.handleRequest = handleRequest;
