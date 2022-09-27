const { render } = require('./shared/render');
const { BrpApi } = require('./BrpApi');
const { Session } = require('@gemeentenijmegen/session');

function redirectResponse(location, code = 302) {
    return {
        'statusCode': code,
        'body': '',
        'headers': { 
            'Location': location
        }
    }
}

exports.homeRequestHandler = async (params, apiClient, dynamoDBClient) => {
    let session = new Session(params.cookies, dynamoDBClient);
    await session.init();
    if (session.isLoggedIn() == true) {
        return await handleLoggedinRequest(session, apiClient, params.contact_id);
    }
    return redirectResponse(`/login?contact_id=${params.contact_id}`);
}

async function handleLoggedinRequest(session, apiClient, contact_id) {
    // const bsn = session.getValue('bsn');
    data = {
        title: 'overzicht',
        shownav: true
    };

    // render page
    const html = await render(data, __dirname + '/templates/home.mustache', {
        'header': `${__dirname}/shared/header.mustache`,
        'footer': `${__dirname}/shared/footer.mustache`
    });
    response = {
        'statusCode': 200,
        'body': html,
        'headers': {
            'Content-type': 'text/html'
        },
        'cookies': [
            session.getCookie(),
        ]
    };
    return response;
}

