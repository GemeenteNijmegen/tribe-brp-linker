export class Response {
  static redirectResponse(location: string, code = 302) {
    return {
      statusCode: code,
      body: '',
      headers: {
        Location: location,
      },
    };
  }

  static htmlResponse(body: string, cookies: string[]|string|undefined) {
    if(cookies != undefined && !Array.isArray(cookies)) {
      cookies = [cookies];
    }
    return {
      statusCode: 200,
      body,
      headers: {
        'Content-type': 'text/html',
      },
      cookies,
    };
  }

  static errorResponse(code = 500) {
    return {
      statusCode: code,
    };
  }
}