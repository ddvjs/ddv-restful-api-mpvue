// eslint-disable-next-line no-undef
module.exports = request
// 发送请求
function request (url, body, method, headers, api) {
  method = method || 'GET'

  return requestRun(url, body, method, headers, api)
    .catch(function (e) {
      e.uri = url
      e.method = method
      e.headers = headers
      url = body = method = headers = void 0
      return Promise.reject(e)
    })
    .then(function (res) {
      url = body = method = headers = void 0
      return res
    })
}

// 执行发送请求
function requestRun (url, body, method, headers, api) {
  var hostSame = false
  // 是否有长链接地址
  if (api && api.webSocketUrl && typeof api.webSocketUrl === 'string') {
    // 地址是否一致
    hostSame = api.url.parse(api.webSocketUrl).host === api.url.parse(url).host
  }

  if (api && typeof api.wsRequest === 'function' && api.socketState === 1 && hostSame) {
    var cb = api.wsRequest(url, body, method, headers)

    if (cb && (typeof cb.then === 'function')) {
      return cb
    }
    return Promise.resolve(cb || {})
  } else {
    var _headers = {}

    for (var key in headers) {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        _headers[key] = headers[key]
      }
    }
    var serverRes = {}
    return new Promise(function (resolve, reject) {
      wx.request({
        url: url,
        data: body,
        method: method,
        header: _headers,
        success: function (res) {
          serverRes.status = res.status || serverRes.status
          serverRes.body = res.data
          serverRes.statusCode = res.statusCode
          serverRes.statusMessage = res.statusText || res.statusMessage
          serverRes.status = serverRes.statusMessage

          serverRes.statusCode >= 200 && serverRes.statusCode < 300 ? resolve(serverRes) : reject(serverRes)
        },
        fail: function (res) {
          serverRes.statusCode = 0
          serverRes.statusMessage = res.errMsg
          serverRes.status = 'wx request fail'
          reject(serverRes)
        }
      })
    })
  }
}
