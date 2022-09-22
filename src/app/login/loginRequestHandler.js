const { Session } = require('@gemeentenijmegen/session');
const { OpenIDConnect } = require('./shared/OpenIDConnect');
const { render } = require('./shared/render');

function redirectResponse(location, status = 302, cookies) {
    const response = {
        'statusCode': status,
        'headers': {
            'Location': location
        },
        'cookies': cookies
    };
    return response;
}

async function handleLoginRequest(cookies, dynamoDBClient) {
    let session = new Session(cookies, dynamoDBClient);
    await session.init();
    if (session.isLoggedIn() === true) {
        console.debug('redirect to home');
        return redirectResponse('/');
    }
    let OIDC = new OpenIDConnect();
    const state = OIDC.generateState();
    await session.createSession({ 
        loggedin: { BOOL: false },
        state: { S: state }
    });
    const authUrl = OIDC.getLoginUrl(state);
    
    const newCookies = [session.getCookie()];
    return redirectResponse(authUrl, 302, newCookies);
}
exports.handleLoginRequest = handleLoginRequest;
