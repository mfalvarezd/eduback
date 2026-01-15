import * as ip from 'ip'

export class ClientInfo {
  static getClientInfo(req: any) {
    let ip =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection.remoteAddress ||
      'unknown'

    if (ip === '::1') {
      ip = '127.0.0.1'
    }

    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7)
    }

    return {
      ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      origin: req.headers.origin || 'unknown',
      host: req.headers.host || 'localhost',
    }
  }
}
